from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.db import transaction
from django.core.files.storage import default_storage
from core.permissions import IsSuperAdmin
from core.authentication import SafeJWTAuthentication
from core.models import PlatformSetting
from core.throttles import CompanySignupThrottle
from core.honeypot import validate_honeypot
from companies.models import Company
from billing.models import Subscription
from accounts.models import User
from companies.serializers import CompanyRegistrationSerializer
from audit.utils import log_audit

class CompanyRegistrationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CompanySignupThrottle]

    def post(self, request):
        validate_honeypot(request.data)
        
        # Map frontend payload fields to serializer expectations
        raw_data = request.data.copy()
        
        if "name" in raw_data and "company_name" not in raw_data:
            raw_data["company_name"] = raw_data["name"]
            
        if "email" in raw_data:
            if "contact_email" not in raw_data:
                raw_data["contact_email"] = raw_data["email"]
            if "admin_email" not in raw_data:
                raw_data["admin_email"] = raw_data["email"]
                
        if "contact" in raw_data:
            parts = raw_data["contact"].strip().split(maxsplit=1)
            first_name = parts[0] if parts else "Admin"
            last_name = parts[1] if len(parts) > 1 else "User"
            if "admin_first_name" not in raw_data:
                raw_data["admin_first_name"] = first_name
            if "admin_last_name" not in raw_data:
                raw_data["admin_last_name"] = last_name
                
        plan_name = raw_data.get("plan", "Starter").lower()
        db_plan_name = "Starter"
        if "growth" in plan_name or "standard" in plan_name or "advanced" in plan_name:
            db_plan_name = "Standard"
        elif "enterprise" in plan_name:
            db_plan_name = "Enterprise"
        
        from billing.models import Package
        pkg = Package.objects.filter(name__iexact=db_plan_name, is_active=True).first()
        if not pkg:
            pkg = Package.objects.filter(is_active=True).first()
        if pkg and "package" not in raw_data:
            raw_data["package"] = pkg.id
                
        if "password" in raw_data:
            if "admin_password" not in raw_data:
                raw_data["admin_password"] = raw_data["password"]
            if "admin_confirm_password" not in raw_data:
                raw_data["admin_confirm_password"] = raw_data["password"]

        existing_company_pre = Company.objects.filter(contact_email=raw_data.get("email") or raw_data.get("contact_email")).first()

        phone_val = str(raw_data.get("phone") or raw_data.get("contact_phone") or "").strip()
        if not phone_val and existing_company_pre:
            phone_val = str(existing_company_pre.contact_phone or "").strip()
        if not phone_val:
            phone_val = "9999999999"

        raw_data["phone"] = phone_val
        raw_data["contact_phone"] = phone_val
        raw_data["admin_phone"] = phone_val
                
        # Sensible defaults for required fields
        if not raw_data.get("address"):
            raw_data["address"] = (existing_company_pre.address if existing_company_pre else "") or "Main Office Address"
        if not raw_data.get("city"):
            raw_data["city"] = (existing_company_pre.city if existing_company_pre else "") or "Default City"
        if "estimated_branch_count" not in raw_data:
            raw_data["estimated_branch_count"] = 1
        if "billing_cycle" not in raw_data:
            raw_data["billing_cycle"] = "monthly"
        if "industry" not in raw_data or not raw_data["industry"]:
            raw_data["industry"] = (existing_company_pre.industry if existing_company_pre else "") or "Education"
        if "terms_consent" not in raw_data:
            raw_data["terms_consent"] = True
            
        if "branches" not in raw_data or not raw_data["branches"]:
            raw_data["branches"] = [{
                "name": "Primary Branch",
                "mode": "NON_SERVICE_BASED",
                "channel_type": "HYBRID",
                "service_qty": 1,
                "operator_qty": 1,
                "kiosk_qty": 1,
                "token_delivery_selections": ["SCREEN_ONLY"],
                "addons": {}
            }]

        serializer = CompanyRegistrationSerializer(data=raw_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Validate branches mandatory component constraints
        from billing.models import PlanComponent
        branches_comp = PlanComponent.objects.filter(key="branches", is_active=True).first()
        branches_data = raw_data.get("branches", [])
        if branches_comp and getattr(branches_comp, "is_mandatory", False):
            if not branches_data or len(branches_data) < 1:
                return Response(
                    {"branches": ["At least 1 branch is required — please allocate at least 1 branch."]},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Validate each branch configuration against PricingEngine limits and mandatory components
        from billing.services.pricing_engine import PricingEngine
        for b_cfg in branches_data:
            b_mode = b_cfg.get("mode", "NON_SERVICE_BASED")
            service_qty = int(b_cfg.get("service_qty", 0))
            operator_qty = int(b_cfg.get("operator_qty", 0))
            kiosk_qty = int(b_cfg.get("kiosk_qty", 0))
            addons = b_cfg.get("addons", {})
            extra_desks = int(addons.get("operator_screens", 0))
            extra_kiosks = int(addons.get("paper_roll_screens", 0))
            extra_services = int(addons.get("services", 0))

            total_services = service_qty + extra_services
            total_operators = operator_qty + extra_desks
            total_kiosks = kiosk_qty + extra_kiosks
            total_qr = int(addons.get("printed_qr", 0))

            token_delivery_selections = b_cfg.get("token_delivery_selections", [])

            try:
                PricingEngine.calculate_quote(
                    mode=b_mode,
                    service_qty=total_services,
                    operator_qty=total_operators,
                    kiosk_qty=total_kiosks,
                    token_delivery_selections=token_delivery_selections,
                    addons={"printed_qr": total_qr}
                )
            except (ValidationError, DjangoValidationError) as ve:
                return Response(ve.detail if hasattr(ve, "detail") else {"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for duplicate name warning
        duplicate_warning = Company.objects.filter(name=data["company_name"]).exists()
        
        # Check payment mode
        is_invoice_request = (
            raw_data.get("payment_mode") == "invoice_request" or
            request.data.get("payment_mode") == "invoice_request" or
            raw_data.get("is_invoice_request") is True or
            request.data.get("is_invoice_request") is True
        )
        
        # Check platform setting auto-approve toggle
        auto_approve_setting = PlatformSetting.objects.filter(key="auto_approve_registrations").first()
        auto_approve = auto_approve_setting.value.get("enabled", False) if auto_approve_setting else False
        
        if is_invoice_request:
            company_status = "pending"
            onboarding_status = "pending_invoice_approval"
            payment_status = "pending"
            payment_reference = f"INV_REQ_{int(timezone.now().timestamp())}"
        else:
            company_status = "active" if auto_approve else "pending"
            onboarding_status = "active"
            payment_status = "paid"
            payment_reference = f"REG_TXN_{int(timezone.now().timestamp())}"
        
        # Handle logo upload if provided
        logo_url = ""
        logo_file = data.get("logo")
        if logo_file:
            path = default_storage.save(f"logos/{logo_file.name}", logo_file)
            logo_url = f"/media/{path}"
            
        try:
            with transaction.atomic():
                # 1. Create or update Company
                existing_company = Company.objects.filter(contact_email=data["contact_email"]).first()
                if existing_company and existing_company.onboarding_status in ["pending_payment", "pending_invoice_approval"]:
                    company = existing_company
                    company.name = data["company_name"]
                    if data.get("slug"):
                        company.slug = data["slug"]
                    company.website = data.get("website") or company.website
                    company.industry = data["industry"]
                    company.custom_industry = request.data.get("custom_industry") or company.custom_industry
                    company.contact_phone = data["contact_phone"]
                    company.address = data["address"]
                    company.city = data["city"]
                    company.state = request.data.get("state") or company.state
                    company.country = request.data.get("country", "India")
                    if logo_url:
                        company.logo_url = logo_url
                    company.status = company_status
                    company.onboarding_status = onboarding_status
                    company.package = data["package"]
                    company.solution = request.data.get("solution", "ONSITE_ONLINE")
                    company.save()

                    # Clean up existing pending allocations, branches, and subscriptions for this company to prevent unique collisions
                    from branches.models import Branch
                    from billing.models import CompanyPlanAllocation, Subscription
                    Branch.objects.filter(company=company).delete()
                    CompanyPlanAllocation.objects.filter(company=company).delete()
                    Subscription.objects.filter(company=company, status__in=["pending", "pending_payment"]).delete()
                else:
                    company = Company.objects.create(
                        name=data["company_name"],
                        slug=data.get("slug") or None,
                        website=data.get("website") or None,
                        industry=data["industry"],
                        custom_industry=request.data.get("custom_industry"),
                        contact_email=data["contact_email"],
                        contact_phone=data["contact_phone"],
                        address=data["address"],
                        city=data["city"],
                        state=request.data.get("state"),
                        country=request.data.get("country", "India"),
                        logo_url=logo_url,
                        brand_colors={"primary": data.get("brand_primary_color", "#6366F1")},
                        status=company_status,
                        onboarding_status=onboarding_status,
                        package=data["package"],
                        solution=request.data.get("solution", "ONSITE_ONLINE")
                    )

                # Initialize BookingPageConfig for the company with submitted or default portal customization details
                from appointments.models import BookingPageConfig
                portal_color = request.data.get("primary_color") or request.data.get("primaryColor") or data.get("brand_primary_color") or "#7C3AED"
                BookingPageConfig.objects.update_or_create(
                    company=company,
                    defaults={
                        "logo_url": logo_url or request.data.get("logo_url") or request.data.get("logoUrl") or "",
                        "portal_name": request.data.get("portal_name") or request.data.get("portalName") or company.name,
                        "primary_color": portal_color,
                        "display_address": request.data.get("display_address") or request.data.get("displayAddress") or company.address or "",
                        "enabled_customer_fields": request.data.get("enabled_customer_fields") or request.data.get("enabledCustomerFields") or ["name", "email", "phone"],
                        "enabled_booking_fields": request.data.get("enabled_booking_fields") or request.data.get("enabledBookingFields") or ["date_slot", "message"],
                        "enabled_notification_channels": request.data.get("enabled_notification_channels") or request.data.get("enabledNotificationChannels") or ["email"],
                    }
                )

                # Create itemized PlanComponent allocations and PlanPurchase
                from billing.models import PlanComponent, CompanyPlanAllocation, PlanPurchase, TokenDeliveryMethod, SubscriptionDurationTier
                from billing.services.pricing_engine import PricingEngine
                from django.core import signing
                
                # Fetch quote_id
                quote_id = request.data.get("quote_id")
                quote_data = None
                if quote_id:
                    try:
                        quote_data = signing.loads(quote_id, max_age=900)
                    except signing.SignatureExpired:
                        raise serializers.ValidationError({"quote_id": ["Registration checkout session expired. Please review your pricing proposal and retry."]})
                    except signing.BadSignature:
                        raise serializers.ValidationError({"quote_id": ["Invalid registration quote signature. Please try again."]})

                # Map branches configurations for PricingEngine
                branches_data = raw_data.get("branches", [])
                company_addons = request.data.get("company_addons", {})
                duration_months = int(request.data.get("duration_months", 1))

                has_online = any(b.get("channel_type") in ["ONLINE_ONLY", "HYBRID"] for b in branches_data)
                has_onsite = any(b.get("channel_type") in ["ONSITE_ONLY", "HYBRID"] for b in branches_data)

                branches_payload = []
                for b_cfg in branches_data:
                    service_qty = int(b_cfg.get("service_qty", b_cfg.get("serviceQty", 0)))
                    operator_qty = int(b_cfg.get("operator_qty", b_cfg.get("operatorQty", 0)))
                    kiosk_qty = int(b_cfg.get("kiosk_qty", b_cfg.get("kioskQty", 0)))
                    token_delivery_selections = b_cfg.get("token_delivery_selections", b_cfg.get("tokenDeliverySelections", []))
                    addons = b_cfg.get("addons", {})
                    extra_desks = int(addons.get("operator_screens", 0))
                    extra_kiosks = int(addons.get("paper_roll_screens", 0))
                    extra_services = int(addons.get("services", 0))

                    total_services = service_qty + extra_services
                    total_operators = operator_qty + extra_desks
                    total_kiosks = kiosk_qty + extra_kiosks
                    total_qr = int(addons.get("printed_qr", 0))

                    branches_payload.append({
                        "mode": b_cfg.get("mode", "NON_SERVICE_BASED"),
                        "channel_type": b_cfg.get("channel_type", "ONSITE_ONLY"),
                        "service_qty": total_services,
                        "operator_qty": total_operators,
                        "kiosk_qty": total_kiosks,
                        "token_delivery_selections": token_delivery_selections,
                        "addons": {"printed_qr": total_qr}
                    })

                # authorative backend quote calculation
                quote_res = PricingEngine.calculate_company_quote(
                    branches=branches_payload,
                    company_addons=company_addons,
                    duration_months=duration_months,
                    online_module_enabled=has_online,
                    onsite_module_enabled=has_onsite
                )

                # Validate signed quote matches recalculated total to prevent client-side tampering
                if quote_id and quote_data:
                    signed_total = quote_data.get("grand_total")
                    recalc_total = float(quote_res["grand_total"])
                    if abs(signed_total - recalc_total) > 0.01:
                        raise serializers.ValidationError({"quote_id": ["Pricing has been updated by administration since your quote was calculated. Please review the new pricing and retry."]})

                # Build allocations & line items
                active_pcs = {pc.key: pc for pc in PlanComponent.objects.filter(is_active=True)}
                allocated_qtys = {
                    "branches": len(branches_payload),
                    "online_module": sum(1 for b in branches_payload if b["channel_type"] in ["ONLINE_ONLY", "HYBRID"]) if has_online else 0,
                    "operator_screens": sum(b["operator_qty"] for b in branches_payload) if has_onsite else 0,
                    "services": sum(b["service_qty"] for b in branches_payload) if has_onsite else 0,
                    "paper_roll_screens": sum(b["kiosk_qty"] for b in branches_payload) if has_onsite else 0,
                    "printed_qr": sum(b["addons"]["printed_qr"] for b in branches_payload) if has_onsite else 0,
                }
                
                for key, qty in company_addons.items():
                    allocated_qtys[key] = qty

                line_items = []
                itemized = quote_res["itemized"]

                for key, pc in active_pcs.items():
                    qty = allocated_qtys.get(key, 0)
                    if key not in allocated_qtys:
                        qty = pc.default_included_qty

                    CompanyPlanAllocation.objects.create(
                        company=company,
                        branch=None,
                        plan_component=pc,
                        purchased_qty=qty,
                        unit_price_at_purchase=pc.price_per_unit
                    )

                    sub = float(itemized.get(f"{key}_subtotal", 0.0))
                    if key in ["branches", "online_module", "operator_screens", "services", "paper_roll_screens", "printed_qr"]:
                        line_items.append({
                            "component_key": key,
                            "component_label": pc.label,
                            "quantity": qty,
                            "unit_price": float(pc.price_per_unit),
                            "subtotal": sub
                        })
                    else:
                        qty_addon = company_addons.get(key, 0)
                        if qty_addon > 0:
                            sub_addon = float(PricingEngine._calculate_component_cost(pc, qty_addon))
                            line_items.append({
                                "component_key": key,
                                "component_label": pc.label,
                                "quantity": qty_addon,
                                "unit_price": float(pc.price_per_unit),
                                "subtotal": sub_addon
                            })

                if float(itemized.get("delivery_subtotal", 0.0)) > 0:
                    line_items.append({
                        "component_key": "delivery_methods",
                        "component_label": "Token Delivery Methods",
                        "quantity": 1,
                        "unit_price": float(itemized["delivery_subtotal"]),
                        "subtotal": float(itemized["delivery_subtotal"])
                    })

                total_amount = quote_res["grand_total"]

                PlanPurchase.objects.create(
                    company=company,
                    type="initial_registration",
                    line_items=line_items,
                    total_amount=total_amount,
                    payment_status=payment_status,
                    payment_reference=payment_reference
                )
                
                # 2. Create Subscription
                Subscription.objects.create(
                    company=company,
                    package=data["package"],
                    billing_cycle=data["billing_cycle"],
                    start_date=timezone.now().date(),
                    end_date=timezone.now().date() + timezone.timedelta(days=30 * duration_months),
                    status=company_status
                )
                
                # 3. Create or update Admin User
                admin_username = data.get("admin_username") or raw_data.get("admin_username") or raw_data.get("username")
                existing_admin = User.objects.filter(email=data["admin_email"]).first()
                if existing_admin:
                    admin_user = existing_admin
                    admin_user.first_name = data["admin_first_name"]
                    admin_user.last_name = data["admin_last_name"]
                    admin_user.role = "company_admin"
                    admin_user.company = company
                    admin_user.phone = data["admin_phone"]
                    if admin_username:
                        admin_user.username = admin_username
                    if data.get("admin_password"):
                        admin_user.set_password(data["admin_password"])
                    admin_user.save()
                else:
                    admin_user = User.objects.create_user(
                        email=data["admin_email"],
                        username=admin_username,
                        password=data.get("admin_password") or "TempPass123!",
                        first_name=data["admin_first_name"],
                        last_name=data["admin_last_name"],
                        role="company_admin",
                        company=company,
                        phone=data["admin_phone"]
                    )

                # 4. Create branches
                from branches.models import Branch
                from queuing.models import QueueMethod
                from billing.models import TokenDeliveryMethod
                
                # Retrieve active delivery methods for mapping
                active_methods = TokenDeliveryMethod.objects.filter(is_active=True)
                method_map = {m.key: m.queue_method_code for m in active_methods if m.queue_method_code}

                branches_data = raw_data.get("branches", [])
                
                if branches_data:
                    first_branch = None
                    for b_cfg in branches_data:
                        b_name = b_cfg.get("name", "Main Branch")
                        b_mode = b_cfg.get("mode", "NON_SERVICE_BASED")
                        channel_type = b_cfg.get("channel_type", "ONSITE_ONLY")
                        br = Branch.objects.create(
                            company=company,
                            name=b_name,
                            slug=b_name.lower().replace(" ", "-"),
                            city=b_cfg.get("city") or company.city or "Default City",
                            address=b_cfg.get("address") or company.address or "Default Address",
                            mode=b_mode,
                            channel_type=channel_type,
                            status="active"
                        )
                        if not first_branch:
                            first_branch = br
                        
                        # Set up allocations for this branch
                        service_qty = int(b_cfg.get("service_qty", 0))
                        operator_qty = int(b_cfg.get("operator_qty", 0))
                        kiosk_qty = int(b_cfg.get("kiosk_qty", 0))
                        addons = b_cfg.get("addons", {})
                        extra_desks = int(addons.get("operator_screens", 0))
                        extra_kiosks = int(addons.get("paper_roll_screens", 0))
                        extra_services = int(addons.get("services", 0))

                        total_services = service_qty + extra_services
                        total_operators = operator_qty + extra_desks
                        total_kiosks = kiosk_qty + extra_kiosks
                        total_qr = int(addons.get("printed_qr", 0))

                        if channel_type == "ONLINE_ONLY":
                            if b_mode != "SERVICE_BASED":
                                total_services = 0
                            total_operators = 0
                            total_kiosks = 0
                            total_qr = 0

                        branch_qtys = {
                            "operator_screens": total_operators,
                            "services": total_services,
                            "paper_roll_screens": total_kiosks,
                            "printed_qr": total_qr,
                        }

                        for key, qty in branch_qtys.items():
                            comp = PlanComponent.objects.filter(key=key, is_active=True).first()
                            if comp:
                                CompanyPlanAllocation.objects.create(
                                    company=company,
                                    branch=br,
                                    plan_component=comp,
                                    purchased_qty=qty,
                                    unit_price_at_purchase=comp.price_per_unit
                                )
                        
                        # Sync token delivery methods with QueueMethod
                        token_delivery_selections = b_cfg.get("token_delivery_selections", [])
                        if channel_type == "ONLINE_ONLY":
                            token_delivery_selections = []

                        enabled_methods = {method_map.get(k) for k in token_delivery_selections if k in method_map}
                        if channel_type != "ONLINE_ONLY":
                            enabled_methods.add("2")
                        if channel_type in ["ONLINE_ONLY", "HYBRID"]:
                            enabled_methods.add("4")
                        
                        for m_code, _ in QueueMethod.METHOD_CHOICES:
                            is_enabled = m_code in enabled_methods
                            QueueMethod.objects.create(
                                company=company,
                                branch=br,
                                method=m_code,
                                is_enabled=is_enabled,
                                config={"numbering_style": "prefix"} if m_code == "2" else {}
                            )
                    branch = first_branch
                else:
                    # Fallback to default single branch
                    branch_name = request.data.get("branchName", f"{company.city} Main Branch" if company.city else "Main Branch")
                    branch = Branch.objects.create(
                        company=company,
                        name=branch_name,
                        slug=branch_name.lower().replace(" ", "-"),
                        city=company.city or "Default City",
                        address=company.address or "Default Address",
                        status="active"
                    )

                    # Associate branch-level allocations with the default created branch
                    CompanyPlanAllocation.objects.filter(company=company, branch__isnull=True).exclude(plan_component__key="branches").update(branch=branch)

                    # Enable Method 2 by default in the database
                    QueueMethod.objects.create(
                        branch=branch,
                        company=company,
                        method="2",
                        is_enabled=True,
                        config={"numbering_style": "prefix"}
                    )
                
                # Log audit event
                log_audit(
                    actor=admin_user,
                    company=company,
                    branch=branch,
                    action="company_registered",
                    object_type="Company",
                    object_id=company.id,
                    changes={
                        "company_name": company.name,
                        "status": company.status,
                        "package": company.package.name,
                        "admin_email": admin_user.email
                    }
                )

                # Save invoice_details and plan configuration on Company
                invoice_details = raw_data.get("invoice_details") or request.data.get("invoice_details") or {}
                comp_plan_cfg = company.plan_config or {}
                comp_plan_cfg["branches"] = branches_data
                comp_plan_cfg["duration_months"] = duration_months
                if is_invoice_request and invoice_details:
                    comp_plan_cfg["invoice_details"] = invoice_details
                company.plan_config = comp_plan_cfg
                company.save(update_fields=["plan_config"])

                # Update InterestedCandidate status and invoice details
                from companies.models import InterestedCandidate
                candidate_status = "invoice_requested" if is_invoice_request else "plan_purchased"
                candidate_notes = f"Requested Proforma Invoice for INR {total_amount:.2f} ({duration_months} mo). Awaiting Superadmin clearance." if is_invoice_request else f"Plan purchased (INR {total_amount:.2f})"
                if is_invoice_request and invoice_details:
                    b_name = invoice_details.get("billing_name") or company.name
                    gst_val = invoice_details.get("gst_number")
                    c_pers = invoice_details.get("contact_person")
                    c_ph = invoice_details.get("contact_phone")
                    candidate_notes += f" | Billed To: {b_name}"
                    if gst_val:
                        candidate_notes += f" | GST: {gst_val}"
                    if c_pers:
                        candidate_notes += f" | Contact: {c_pers} ({c_ph})"
                    if invoice_details.get("further_instructions"):
                        candidate_notes += f" | Notes: {invoice_details.get('further_instructions')}"

                cand = InterestedCandidate.objects.filter(email=data["contact_email"]).first()
                if cand:
                    cand_plan_cfg = cand.plan_config or {}
                    cand_plan_cfg["branches"] = branches_data
                    cand_plan_cfg["duration_months"] = duration_months
                    if is_invoice_request and invoice_details:
                        cand_plan_cfg["invoice_details"] = invoice_details
                    cand.plan_config = cand_plan_cfg
                    cand.status = candidate_status
                    cand.company = company
                    cand.user = admin_user
                    cand.notes = candidate_notes
                    cand.save()
                
            response_data = {
                "message": "Invoice inquiry registered successfully. Superadmin review is pending." if is_invoice_request else "Company registered successfully.",
                "companyId": company.id,
                "branchId": branch.id,
                "payment_mode": "invoice_request" if is_invoice_request else "online",
                "onboarding_status": onboarding_status,
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "status": company.status,
                    "onboarding_status": onboarding_status,
                    "package": company.package.name,
                    "admin_email": admin_user.email
                }
            }
            if duplicate_warning:
                response_data["warning"] = "A company with this name is already registered."
                
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except serializers.ValidationError as ve:
            return Response(ve.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CompanyDetailSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    subscription_status = serializers.SerializerMethodField()
    branch_count = serializers.SerializerMethodField()
    admin_name = serializers.SerializerMethodField()
    admin_email = serializers.SerializerMethodField()
    admin_phone = serializers.SerializerMethodField()
    plan_purchase = serializers.SerializerMethodField()
    branches_detail = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = "__all__"

    def get_subscription_status(self, obj):
        sub = obj.subscriptions.first()
        return sub.status if sub else "None"

    def get_branch_count(self, obj):
        return obj.branches.count()

    def get_admin_name(self, obj):
        u = obj.users.filter(role="company_admin").first()
        if u:
            return f"{u.first_name} {u.last_name}".strip()
        cand = obj.candidate_leads.first()
        return cand.contact_name if cand else ""

    def get_admin_email(self, obj):
        u = obj.users.filter(role="company_admin").first()
        return u.email if u else obj.contact_email

    def get_admin_phone(self, obj):
        u = obj.users.filter(role="company_admin").first()
        return u.phone if u else obj.contact_phone

    def get_plan_purchase(self, obj):
        purchase = obj.plan_purchases.order_by("-created_at").first()
        if not purchase:
            return None
        return {
            "id": purchase.id,
            "type": purchase.type,
            "line_items": purchase.line_items,
            "total_amount": float(purchase.total_amount),
            "payment_status": purchase.payment_status,
            "payment_reference": purchase.payment_reference,
            "created_at": purchase.created_at.isoformat() if purchase.created_at else None,
        }

    def get_branches_detail(self, obj):
        res = []
        for b in obj.branches.all():
            res.append({
                "id": b.id,
                "name": b.name,
                "mode": b.mode,
                "channel_type": b.channel_type,
                "operator_count": b.desks.count(),
                "service_count": b.services.count(),
                "city": b.city,
            })
        return res

from rest_framework.permissions import IsAuthenticated

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanyDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if self.action == "invoice_pdf":
            return Company.objects.all()
        if not user or not user.is_authenticated:
            return Company.objects.none()
        if self.action == "list" and user.role != "super_admin":
            if hasattr(user, "company") and user.company:
                return Company.objects.filter(id=user.company.id)
            raise PermissionDenied("Only Super Admins can list companies.")
        if user.role == "super_admin":
            qs = Company.objects.all().order_by("-created_at")
            status_filter = self.request.query_params.get("status")
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs
        if user.company:
            return Company.objects.filter(id=user.company.id)
        return Company.objects.none()

    def _approve_company_internal(self, company, actor):
        company.status = "active"
        company.onboarding_status = "active"
        company.save()
        sub = company.subscriptions.first()
        if sub:
            sub.status = "active"
            sub.save()
        
        from billing.models import PlanPurchase
        PlanPurchase.objects.filter(company=company, payment_status="pending").update(payment_status="paid")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        User.objects.filter(company=company).update(is_active=True)

        from companies.models import InterestedCandidate
        InterestedCandidate.objects.filter(company=company).update(status="plan_purchased")

        log_audit(
            actor=actor,
            company=company,
            branch=None,
            action="company_approved",
            object_type="Company",
            object_id=company.id,
            changes={"status": "active", "onboarding_status": "active"}
        )

    def partial_update(self, request, *args, **kwargs):
        company = self.get_object()
        action = request.data.get("action")
        new_status = request.data.get("status")

        # Handle quick approve via PATCH status: active by superadmin
        if not action and new_status == "active" and request.user.role == "super_admin" and company.status == "pending":
            with transaction.atomic():
                self._approve_company_internal(company, request.user)
            return Response(CompanyDetailSerializer(company).data, status=status.HTTP_200_OK)
        
        if not action:
            # Check if user is company_admin of this company or super_admin
            if request.user.role != "super_admin" and (request.user.role != "company_admin" or request.user.company != company):
                return Response({"detail": "You do not have permission to edit this company."}, status=status.HTTP_403_FORBIDDEN)
            return super().partial_update(request, *args, **kwargs)

        if request.user.role != "super_admin":
            return Response({"detail": "Only Super Admins can perform company lifecycle actions."}, status=status.HTTP_403_FORBIDDEN)

        old_status = company.status
        
        try:
            with transaction.atomic():
                if action in ["approve", "approve_invoice"]:
                    if company.status != "pending":
                        return Response({"error": "Only pending companies can be approved."}, status=status.HTTP_400_BAD_REQUEST)
                    self._approve_company_internal(company, request.user)
                    
                elif action == "suspend":
                    if company.status != "active":
                        return Response({"error": "Only active companies can be suspended."}, status=status.HTTP_400_BAD_REQUEST)
                    company.status = "suspended"
                    company.save()
                    log_audit(
                        actor=request.user,
                        company=company,
                        branch=None,
                        action="company_suspended",
                        object_type="Company",
                        object_id=company.id,
                        changes={"old_status": old_status, "new_status": "suspended"}
                    )
                    
                elif action == "reactivate":
                    if company.status != "suspended":
                        return Response({"error": "Only suspended companies can be reactivated."}, status=status.HTTP_400_BAD_REQUEST)
                    company.status = "active"
                    company.save()
                    log_audit(
                        actor=request.user,
                        company=company,
                        branch=None,
                        action="company_reactivated",
                        object_type="Company",
                        object_id=company.id,
                        changes={"old_status": old_status, "new_status": "active"}
                    )
                    
                elif action == "reject":
                    if company.status != "pending":
                        return Response({"error": "Only pending companies can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
                    company.status = "rejected"
                    company.save()
                    sub = company.subscriptions.first()
                    if sub:
                        sub.status = "rejected"
                        sub.save()
                    log_audit(
                        actor=request.user,
                        company=company,
                        branch=None,
                        action="company_rejected",
                        object_type="Company",
                        object_id=company.id,
                        changes={"old_status": old_status, "new_status": "rejected", "reason": request.data.get("reason", "")}
                    )
                else:
                    return Response({"error": f"Invalid action: {action}"}, status=status.HTTP_400_BAD_REQUEST)
                    
            return Response(CompanyDetailSerializer(company).data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], url_path="approve-invoice")
    def approve_invoice(self, request, pk=None):
        company = self.get_object()
        if request.user.role != "super_admin":
            return Response({"detail": "Only Super Admins can approve invoices."}, status=status.HTTP_403_FORBIDDEN)
        with transaction.atomic():
            self._approve_company_internal(company, request.user)
        return Response(CompanyDetailSerializer(company).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="invoice-pdf", permission_classes=[AllowAny])
    def invoice_pdf(self, request, pk=None):
        company = self.get_object()
        from io import BytesIO
        from django.http import HttpResponse
        buffer = BytesIO()
        self._render_company_invoice_pdf(buffer, company)
        buffer.seek(0)
        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="Invoice_{company.slug or company.id}.pdf"'
        return response

    @staticmethod
    def _render_company_invoice_pdf(buffer, company):
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor('#4f46e5'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#64748b'),
            spaceAfter=15
        )

        story.append(Paragraph("QUESOLE PROFORMA INVOICE", title_style))
        story.append(Paragraph(f"Smart Queue Intelligence | Reference: INV-{company.id}", subtitle_style))
        story.append(Spacer(1, 10))

        admin_u = company.users.filter(role="company_admin").first()
        admin_name = f"{admin_u.first_name} {admin_u.last_name}".strip() if admin_u else "Administrator"
        admin_email = admin_u.email if admin_u else company.contact_email
        admin_phone = admin_u.phone if admin_u else company.contact_phone

        details_data = [
            [Paragraph("<b>Company Name:</b>", styles['Normal']), Paragraph(company.name, styles['Normal'])],
            [Paragraph("<b>Admin Contact:</b>", styles['Normal']), Paragraph(f"{admin_name} ({admin_email}, {admin_phone})", styles['Normal'])],
            [Paragraph("<b>Location:</b>", styles['Normal']), Paragraph(f"{company.city or ''}, {company.country or 'India'}", styles['Normal'])],
            [Paragraph("<b>Status:</b>", styles['Normal']), Paragraph(company.onboarding_status.replace('_', ' ').upper(), styles['Normal'])],
        ]
        t_details = Table(details_data, colWidths=[130, 390])
        t_details.setStyle(TableStyle([
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#1e293b')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t_details)
        story.append(Spacer(1, 15))

        purchase = company.plan_purchases.order_by("-created_at").first()
        items_data = [
            [Paragraph("<b>Component Description</b>", styles['Normal']), Paragraph("<b>Qty</b>", styles['Normal']), Paragraph("<b>Subtotal (INR)</b>", styles['Normal'])],
        ]
        if purchase and purchase.line_items:
            for itm in purchase.line_items:
                desc = itm.get("component_label") or itm.get("component_key") or "Item"
                qty = str(itm.get("quantity", 1))
                sub = f"INR {float(itm.get('subtotal', 0)):.2f}"
                items_data.append([Paragraph(desc, styles['Normal']), Paragraph(qty, styles['Normal']), Paragraph(sub, styles['Normal'])])
        else:
            items_data.append([Paragraph("Enterprise Queue Management Plan", styles['Normal']), Paragraph("1", styles['Normal']), Paragraph(f"INR {purchase.total_amount if purchase else 0}", styles['Normal'])])

        total_val = float(purchase.total_amount) if purchase else 0.0
        items_data.append([Paragraph("<b>Grand Total</b>", styles['Normal']), Paragraph("", styles['Normal']), Paragraph(f"<b>INR {total_val:.2f}</b>", styles['Normal'])])

        t_items = Table(items_data, colWidths=[300, 80, 140])
        t_items.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4f46e5')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-2), 0.5, colors.HexColor('#cbd5e1')),
            ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor('#1e293b')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t_items)

        doc.build(story)


class CheckSlugView(APIView):
    permission_classes = [AllowAny]

    def _check(self, slug):
        slug = (slug or "").strip().lower()
        if not slug:
            return Response({"available": False, "error": "Slug parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        import re
        if not re.match(r'^[a-z0-9-]+$', slug):
            return Response({"available": False, "error": "Slug must only contain lowercase alphanumeric characters and hyphens."}, status=status.HTTP_400_BAD_REQUEST)
            
        exists = Company.objects.filter(slug=slug).exists()
        return Response({"available": not exists, "slug": slug})

    def get(self, request):
        slug = request.query_params.get("slug", "")
        return self._check(slug)

    def post(self, request):
        slug = request.data.get("slug") if isinstance(request.data, dict) else None
        if not slug:
            slug = request.query_params.get("slug", "")
        return self._check(slug)


class CompanyBySlugView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, company_slug):
        company_slug = company_slug.strip().lower()
        company = Company.objects.filter(slug=company_slug).first()
        if not company:
            return Response({
                "error_code": "COMPANY_NOT_FOUND",
                "message": "Company not found."
            }, status=status.HTTP_404_NOT_FOUND)

        if company.status != "active" or company.onboarding_status != "active":
            return Response({
                "error_code": "COMPANY_INACTIVE",
                "message": "This company is currently inactive or suspended.",
                "status": company.status,
                "onboarding_status": company.onboarding_status
            }, status=status.HTTP_403_FORBIDDEN)

        # Return company details
        return Response({
            "id": company.id,
            "name": company.name,
            "slug": company.slug,
            "logo_url": company.logo_url,
            "tagline": company.tagline,
            "brand_colors": company.brand_colors,
            "support_phone": company.support_phone,
            "support_email": company.support_email,
            "solution": company.solution,
            "address": company.address,
            "city": company.city,
            "website": company.website
        }, status=status.HTTP_200_OK)


class BranchBySlugView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, company_slug, branch_slug):
        company_slug = company_slug.strip().lower()
        branch_slug = branch_slug.strip().lower()

        company = Company.objects.filter(slug=company_slug).first()
        if not company:
            return Response({
                "error_code": "COMPANY_NOT_FOUND",
                "message": "Company not found."
            }, status=status.HTTP_404_NOT_FOUND)

        if company.status != "active" or company.onboarding_status != "active":
            return Response({
                "error_code": "COMPANY_INACTIVE",
                "message": "This company is currently inactive or suspended.",
                "status": company.status,
                "onboarding_status": company.onboarding_status
            }, status=status.HTTP_403_FORBIDDEN)

        from branches.models import Branch
        branch = Branch.all_objects.filter(company=company, slug=branch_slug).first()
        if not branch:
            return Response({
                "error_code": "BRANCH_NOT_FOUND",
                "message": "Branch not found for this company."
            }, status=status.HTTP_404_NOT_FOUND)

        if branch.status != "active":
            return Response({
                "error_code": "BRANCH_INACTIVE",
                "message": "This branch is currently inactive.",
                "status": branch.status
            }, status=status.HTTP_403_FORBIDDEN)

        enabled_methods = list(branch.queue_methods.filter(is_enabled=True).values_list("method", flat=True))
        if enabled_methods:
            enabled_methods = [int(m) for m in enabled_methods]
        else:
            enabled_methods = [1, 2, 3, 4]

        # Return branch details
        return Response({
            "id": branch.id,
            "company_id": branch.company.id,
            "name": branch.name,
            "slug": branch.slug,
            "address": branch.address,
            "city": branch.city,
            "geo_lat": branch.geo_lat,
            "geo_lng": branch.geo_lng,
            "geofence_radius_meters": branch.geofence_radius_meters,
            "geofence_enabled": branch.geofence_enabled,
            "timezone": branch.timezone,
            "operating_hours": branch.operating_hours,
            "status": branch.status,
            "mode": branch.mode,
            "channel_type": branch.channel_type,
            "enabled_methods": enabled_methods,
            "enabledMethods": enabled_methods
        }, status=status.HTTP_200_OK)


from rest_framework_simplejwt.tokens import RefreshToken
from companies.models import InterestedCandidate
from companies.serializers import InterestedCandidateSerializer

class RegisterStep1View(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get("email", "").strip().lower()
        if not email:
            return Response({"available": False, "error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        existing = User.objects.filter(email=email).first()
        if existing and existing.company and existing.company.onboarding_status not in ["pending_payment", "pending_invoice_approval"]:
            return Response({"available": False, "message": "This email is already registered. Please sign in."})
        if existing and existing.company:
            comp = existing.company
            cand = InterestedCandidate.objects.filter(email=email).first()
            raw_phone = str(comp.contact_phone or existing.phone or "").strip()
            c_code = "+91"
            phone_num = raw_phone
            if raw_phone.startswith("+"):
                parts = raw_phone.split(" ", 1)
                if len(parts) == 2:
                    c_code, phone_num = parts[0], parts[1]
                else:
                    c_code = raw_phone[:3]
                    phone_num = raw_phone[3:].strip()
            elif cand and cand.country_code:
                c_code = cand.country_code
                phone_num = cand.phone

            return Response({
                "available": True,
                "is_pending_resume": True,
                "company": {
                    "company_name": comp.name,
                    "contact_name": f"{existing.first_name} {existing.last_name}".strip(),
                    "contact_phone": comp.contact_phone or existing.phone or "",
                    "phone": phone_num,
                    "country_code": c_code,
                    "address": comp.address or "",
                    "city": comp.city or "",
                    "state": comp.state or "",
                    "country": comp.country or "India",
                    "industry": comp.industry or "Healthcare",
                    "custom_industry": comp.custom_industry or "",
                    "website": comp.website or "",
                }
            })
        return Response({"available": True})

    def post(self, request):
        data = request.data
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        company_name = data.get("company_name", "").strip()
        contact_name = data.get("contact_name", "").strip()
        industry = data.get("industry", "Healthcare").strip()
        custom_industry = data.get("custom_industry", "").strip() or None
        country = data.get("country", "India").strip()
        state = data.get("state", "").strip()
        city = data.get("city", "").strip()
        address = data.get("address", "").strip()
        phone = data.get("phone", "").strip()
        country_code = data.get("country_code", "+91").strip()
        website = data.get("website", "").strip() or None
        username = data.get("username", "").strip() or data.get("admin_username", "").strip() or None

        if username:
            import re
            if len(username) < 3 or len(username) > 30 or not re.match(r'^[a-zA-Z0-9_.-]+$', username):
                return Response(
                    {"error": "Username must be 3-30 characters and only contain letters, numbers, underscores, hyphens, and periods.", "field": "username"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            u_existing = User.objects.filter(username__iexact=username).first()
            if u_existing and u_existing.email != email:
                if not (u_existing.company and u_existing.company.onboarding_status in ["pending_payment", "pending_invoice_approval"]):
                    return Response(
                        {"error": "This username is already taken. Please choose another.", "field": "username"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        existing_user = User.objects.filter(email=email).first()
        is_pending = existing_user and existing_user.company and existing_user.company.onboarding_status in ["pending_payment", "pending_invoice_approval"]

        if not email or not company_name:
            return Response(
                {"error": "Company name and administrator email are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not is_pending and not password:
            return Response(
                {"error": "Company name, administrator email, and password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password:
            if len(password) < 6:
                return Response(
                    {"error": "Password must be at least 6 characters.", "field": "password"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not any(char.isalpha() for char in password):
                return Response(
                    {"error": "Password must contain at least one letter.", "field": "password"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not any(char.isdigit() for char in password):
                return Response(
                    {"error": "Password must contain at least one number.", "field": "password"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if existing_user and existing_user.company and existing_user.company.onboarding_status not in ["pending_payment", "pending_invoice_approval"]:
            return Response(
                {"error": "A company account is already registered with this login email. Please sign in.", "field": "email"},
                status=status.HTTP_400_BAD_REQUEST
            )

        name_parts = contact_name.split(" ", 1)
        first_name = name_parts[0] if name_parts else "Admin"
        last_name = name_parts[1] if len(name_parts) > 1 else "User"

        effective_industry = custom_industry if (industry == "Other" and custom_industry) else industry

        with transaction.atomic():
            # 1. Company
            company = Company.objects.filter(contact_email=email).first()
            if not company:
                company = Company.objects.create(
                    name=company_name,
                    industry=effective_industry,
                    custom_industry=custom_industry,
                    contact_email=email,
                    contact_phone=f"{country_code} {phone}".strip(),
                    address=address,
                    city=city,
                    state=state,
                    country=country,
                    website=website,
                    status="pending",
                    onboarding_status="pending_payment",
                )
            else:
                company.name = company_name
                company.industry = effective_industry
                company.custom_industry = custom_industry
                company.contact_phone = f"{country_code} {phone}".strip()
                company.address = address
                company.city = city
                company.state = state
                company.country = country
                company.website = website
                company.save()

            # 2. User
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role="company_admin",
                    company=company,
                    phone=f"{country_code} {phone}".strip()
                )
            else:
                user.first_name = first_name
                user.last_name = last_name
                user.company = company
                user.role = "company_admin"
                if username:
                    user.username = username
                if password:
                    user.set_password(password)
                user.save()

            # 3. InterestedCandidate record
            candidate, _ = InterestedCandidate.objects.update_or_create(
                email=email,
                defaults={
                    "company_name": company_name,
                    "industry": effective_industry,
                    "custom_industry": custom_industry,
                    "country": country,
                    "state": state,
                    "city": city,
                    "address": address,
                    "contact_name": contact_name,
                    "phone": phone,
                    "country_code": country_code,
                    "website": website,
                    "status": "interested" if company.onboarding_status == "pending_payment" else "plan_purchased",
                    "user": user,
                    "company": company,
                }
            )

            # Generate tokens
            refresh = RefreshToken.for_user(user)
            refresh['email'] = user.email
            refresh['role'] = user.role
            refresh['company_id'] = user.company.id
            refresh['branch_id'] = user.branch.id if user.branch else None

            return Response({
                "message": "Step 1 profile saved successfully.",
                "candidate_id": candidate.id,
                "company_id": company.id,
                "company_slug": company.slug,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "email": user.email,
                    "name": f"{user.first_name} {user.last_name}".strip(),
                    "role": user.role,
                    "companyId": str(company.id),
                    "branchId": "",
                    "deskId": "",
                    "hasPurchasedPlan": False,
                    "onboardingStatus": company.onboarding_status,
                }
            }, status=status.HTTP_201_CREATED)


class InterestedCandidateViewSet(viewsets.ModelViewSet):
    queryset = InterestedCandidate.objects.all().order_by("-created_at")
    serializer_class = InterestedCandidateSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = InterestedCandidate.objects.all().order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        q = self.request.query_params.get("search")
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(company_name__icontains=q) |
                Q(contact_name__icontains=q) |
                Q(email__icontains=q) |
                Q(industry__icontains=q) |
                Q(city__icontains=q)
            )
        return qs

    def perform_update(self, serializer):
        instance = serializer.save()
        new_status = serializer.validated_data.get("status") or self.request.data.get("status")

        if new_status == "plan_purchased":
            comp = instance.company
            if not comp and instance.email:
                comp = Company.objects.filter(contact_email=instance.email).first()
            if comp:
                comp.status = "active"
                comp.onboarding_status = "active"
                comp.save()

                from billing.models import Subscription, PlanPurchase
                Subscription.objects.filter(company=comp).update(status="active")
                PlanPurchase.objects.filter(company=comp, payment_status="pending").update(payment_status="paid")

                from django.contrib.auth import get_user_model
                User = get_user_model()
                User.objects.filter(company=comp).update(is_active=True)

                from branches.models import Branch
                if not Branch.objects.filter(company=comp).exists():
                    Branch.objects.create(
                        company=comp,
                        name="Main Branch",
                        slug="main-branch",
                        city=comp.city or "Default City",
                        address=comp.address or "Default Address",
                        status="active"
                    )

                log_audit(
                    actor=self.request.user if self.request.user.is_authenticated else None,
                    company=comp,
                    branch=None,
                    action="candidate_converted_to_active",
                    object_type="Company",
                    object_id=comp.id,
                    changes={"status": "active", "onboarding_status": "active"}
                )
        elif new_status == "invoice_requested":
            comp = instance.company or (Company.objects.filter(contact_email=instance.email).first() if instance.email else None)
            if comp:
                comp.onboarding_status = "pending_invoice_approval"
                comp.status = "pending"
                comp.save()
        elif new_status in ["interested", "plan_pending"]:
            comp = instance.company or (Company.objects.filter(contact_email=instance.email).first() if instance.email else None)
            if comp and comp.onboarding_status != "active":
                comp.onboarding_status = "pending_payment"
                comp.status = "pending"
                comp.save()



def _resolve_company_from_request(request):
    """Helper to locate company from auth token or query/body parameters"""
    if request.user and request.user.is_authenticated and getattr(request.user, "company", None):
        return request.user.company

    company_id = request.data.get("company_id") or request.query_params.get("company_id")
    if company_id:
        try:
            return Company.objects.filter(id=company_id).first()
        except Exception:
            pass

    company_slug = request.data.get("company_slug") or request.query_params.get("company_slug")
    if company_slug:
        comp = Company.objects.filter(slug=company_slug).first()
        if comp:
            return comp

    email = request.data.get("email") or request.query_params.get("email")
    if email:
        candidate = InterestedCandidate.objects.filter(email=email).first()
        if candidate and candidate.company:
            return candidate.company
        comp = Company.objects.filter(contact_email=email).first()
        if comp:
            return comp

    return None


class CompanyPlanConfigView(APIView):
    """
    Dynamic autosave and retrieval of Build Your Plan configuration.
    Stores complete multi-branch, onsite, online, and addon state in the DB.
    """
    permission_classes = [AllowAny]
    authentication_classes = [SafeJWTAuthentication]

    def get(self, request):
        company = _resolve_company_from_request(request)
        if not company:
            # Check candidate by email
            email = request.query_params.get("email")
            if email:
                candidate = InterestedCandidate.objects.filter(email=email).first()
                if candidate and candidate.plan_config:
                    return Response({
                        "plan_config": candidate.plan_config,
                        "company_id": candidate.company_id if candidate.company else None,
                        "company_name": candidate.company_name
                    })
            return Response({"plan_config": {}}, status=status.HTTP_200_OK)

        config = company.plan_config or {}

        # Also populate booking config if present
        try:
            if hasattr(company, "booking_config") and company.booking_config:
                bc = company.booking_config
                config.setdefault("branding", {
                    "portal_name": bc.portal_name,
                    "logo_url": bc.logo_url,
                    "primary_color": bc.primary_color,
                    "display_address": bc.display_address,
                    "enabled_customer_fields": bc.enabled_customer_fields,
                    "enabled_booking_fields": bc.enabled_booking_fields,
                    "enabled_notification_channels": bc.enabled_notification_channels,
                })
        except Exception:
            pass

        return Response({
            "plan_config": config,
            "company_id": company.id,
            "company_name": company.name,
            "company_slug": company.slug,
            "address": company.address,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        company = _resolve_company_from_request(request)
        plan_data = request.data.get("plan_config") or request.data

        if not company:
            # Try saving on candidate record if company not yet associated
            email = request.data.get("email") or plan_data.get("email")
            if email:
                candidate, _ = InterestedCandidate.objects.get_or_create(
                    email=email,
                    defaults={
                        "company_name": plan_data.get("company_name", "Draft Company"),
                        "contact_name": "Admin",
                        "phone": "9999999999",
                        "industry": "Healthcare",
                        "plan_config": plan_data
                    }
                )
                candidate.plan_config = plan_data
                candidate.save(update_fields=["plan_config"])
                return Response({
                    "status": "success",
                    "message": "Plan configuration saved to candidate profile.",
                    "plan_config": candidate.plan_config
                }, status=status.HTTP_200_OK)
            return Response(
                {"status": "success", "message": "Draft plan config received."},
                status=status.HTTP_200_OK
            )

        with transaction.atomic():
            company.plan_config = plan_data
            if "solution" in plan_data:
                company.solution = plan_data["solution"]
            company.save(update_fields=["plan_config", "solution"] if "solution" in plan_data else ["plan_config"])

            # Also update candidate if exists
            InterestedCandidate.objects.filter(company=company).update(plan_config=plan_data)

            # Sync booking config if provided
            branding = plan_data.get("branding") or plan_data.get("portal_config") or {}
            if branding:
                from appointments.models import BookingPageConfig
                bc, _ = BookingPageConfig.objects.get_or_create(company=company)
                if branding.get("portal_name") or branding.get("portalName"):
                    bc.portal_name = branding.get("portal_name") or branding.get("portalName")
                if branding.get("logo_url") or branding.get("logoUrl"):
                    bc.logo_url = branding.get("logo_url") or branding.get("logoUrl")
                if branding.get("primary_color") or branding.get("primaryColor"):
                    bc.primary_color = branding.get("primary_color") or branding.get("primaryColor")
                if branding.get("display_address") or branding.get("displayAddress"):
                    bc.display_address = branding.get("display_address") or branding.get("displayAddress")
                if branding.get("enabled_customer_fields") or branding.get("enabledCustomerFields"):
                    bc.enabled_customer_fields = branding.get("enabled_customer_fields") or branding.get("enabledCustomerFields")
                if branding.get("enabled_booking_fields") or branding.get("enabledBookingFields"):
                    bc.enabled_booking_fields = branding.get("enabled_booking_fields") or branding.get("enabledBookingFields")
                if branding.get("enabled_notification_channels") or branding.get("enabledNotificationChannels"):
                    bc.enabled_notification_channels = branding.get("enabled_notification_channels") or branding.get("enabledNotificationChannels")
                bc.save()

        return Response({
            "status": "success",
            "message": "Plan configuration saved successfully.",
            "plan_config": company.plan_config
        }, status=status.HTTP_200_OK)


class CompanyLogoUploadView(APIView):
    """
    Dedicated logo uploader endpoint. Validates image type and size (<= 2MB),
    saves to default storage, and returns static/media URL.
    """
    permission_classes = [AllowAny]
    authentication_classes = [SafeJWTAuthentication]

    def post(self, request):
        logo_file = request.FILES.get("logo")
        if not logo_file:
            return Response({"error": "No logo file provided."}, status=status.HTTP_400_BAD_REQUEST)

        # File size validation (<= 2MB)
        if logo_file.size > 2 * 1024 * 1024:
            return Response({"error": "File size exceeds 2MB limit."}, status=status.HTTP_400_BAD_REQUEST)

        # Extension validation
        allowed_extensions = ["png", "jpg", "jpeg", "svg", "webp"]
        ext = logo_file.name.split(".")[-1].lower() if "." in logo_file.name else ""
        if ext not in allowed_extensions:
            return Response({
                "error": f"Invalid image format (.{ext}). Supported formats: PNG, JPG, JPEG, SVG, WEBP."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            import uuid
            safe_name = f"logo_{uuid.uuid4().hex[:12]}.{ext}"
            saved_path = default_storage.save(f"logos/{safe_name}", logo_file)
            logo_url = f"/media/{saved_path}"

            # Optionally link to company/booking config if company resolved
            company = _resolve_company_from_request(request)
            if company:
                company.logo_url = logo_url
                company.save(update_fields=["logo_url"])
                try:
                    from appointments.models import BookingPageConfig
                    bc, _ = BookingPageConfig.objects.get_or_create(company=company)
                    bc.logo_url = logo_url
                    bc.save(update_fields=["logo_url"])
                except Exception:
                    pass

            return Response({
                "status": "success",
                "logo_url": logo_url,
                "message": "Logo uploaded successfully."
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Failed to upload logo: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompanyBranchAddView(APIView):
    """
    Instantly adds a new branch with sensible defaults in DB and returns it.
    """
    permission_classes = [AllowAny]
    authentication_classes = [SafeJWTAuthentication]

    def post(self, request):
        company = _resolve_company_from_request(request)
        branch_name = request.data.get("name")
        current_branches = (company.plan_config.get("branches") if company else None) or []
        count = len(current_branches) + 1
        name = branch_name or f"Branch {count}"

        new_branch = {
            "name": name,
            "address": request.data.get("address") or (company.address if company else "") or f"Location {count}",
            "mode": "NON_SERVICE_BASED",
            "channel_type": "ONSITE_ONLY",
            "serviceQty": 1,
            "operatorQty": 1,
            "kioskQty": 0,
            "kotQty": 0,
            "tokenDeliverySelections": ["SCREEN_ONLY"],
            "activeMethods": ["1"],
            "serviceAssignments": {},
            "addons": {
                "operator_screens": 0,
                "paper_roll_screens": 0,
                "services": 0,
                "printed_qr": 0
            },
            "branding": {
                "portal_name": name,
                "primary_color": "#7C3AED",
                "display_address": request.data.get("address") or "",
                "enabled_customer_fields": ["name", "email", "phone"],
                "enabled_booking_fields": ["date_slot", "message"]
            }
        }

        if company:
            current_branches.append(new_branch)
            plan_cfg = company.plan_config or {}
            plan_cfg["branches"] = current_branches
            plan_cfg["branchesCount"] = len(current_branches)
            company.plan_config = plan_cfg
            company.save(update_fields=["plan_config"])
            InterestedCandidate.objects.filter(company=company).update(plan_config=plan_cfg)

        return Response({
            "status": "success",
            "branch": new_branch,
            "branches_count": len(current_branches),
            "branches": current_branches,
            "message": f"{name} added successfully."
        }, status=status.HTTP_201_CREATED)


class CompanyBranchDeleteView(APIView):
    """
    Deletes branch, strictly guarding against removing the last branch.
    """
    permission_classes = [AllowAny]
    authentication_classes = [SafeJWTAuthentication]

    def delete(self, request, branch_idx=None):
        return self._handle_delete(request, branch_idx)

    def post(self, request, branch_idx=None):
        return self._handle_delete(request, branch_idx)

    def _handle_delete(self, request, branch_idx):
        idx = branch_idx
        if idx is None:
            idx = request.data.get("index")

        try:
            idx = int(idx)
        except (TypeError, ValueError):
            return Response({"error": "Valid branch index is required."}, status=status.HTTP_400_BAD_REQUEST)

        company = _resolve_company_from_request(request)
        branches = (company.plan_config.get("branches") if company else None) or []

        if len(branches) <= 1:
            return Response(
                {"error": "Cannot delete the last remaining headquarters branch. At least 1 branch is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if idx < 0 or idx >= len(branches):
            return Response({"error": "Branch index out of range."}, status=status.HTTP_400_BAD_REQUEST)

        removed = branches.pop(idx)
        if company:
            plan_cfg = company.plan_config or {}
            plan_cfg["branches"] = branches
            plan_cfg["branchesCount"] = len(branches)
            company.plan_config = plan_cfg
            company.save(update_fields=["plan_config"])
            InterestedCandidate.objects.filter(company=company).update(plan_config=plan_cfg)

        return Response({
            "status": "success",
            "message": f"{removed.get('name', 'Branch')} removed successfully.",
            "branches": branches,
            "branches_count": len(branches)
        }, status=status.HTTP_200_OK)


class CompanyApplyToAllView(APIView):
    """
    Copies source branch settings (onsite/online modes, steppers, addons) to all branches.
    Preserves branch names and individual addresses.
    """
    permission_classes = [AllowAny]
    authentication_classes = [SafeJWTAuthentication]

    def post(self, request):
        company = _resolve_company_from_request(request)
        source_idx = int(request.data.get("source_index", 0))
        branches = request.data.get("branches") or (company.plan_config.get("branches") if company else [])

        if not branches or len(branches) <= 1:
            return Response({"message": "No additional branches to synchronize.", "branches": branches})

        source = branches[source_idx] if 0 <= source_idx < len(branches) else branches[0]

        updated_branches = []
        for i, b in enumerate(branches):
            if i == source_idx:
                updated_branches.append(b)
                continue
            copied = {
                **source,
                "name": b.get("name", f"Branch {i + 1}"),
                "address": b.get("address", source.get("address", ""))
            }
            updated_branches.append(copied)

        if company:
            plan_cfg = company.plan_config or {}
            plan_cfg["branches"] = updated_branches
            company.plan_config = plan_cfg
            company.save(update_fields=["plan_config"])
            InterestedCandidate.objects.filter(company=company).update(plan_config=plan_cfg)

        return Response({
            "status": "success",
            "message": "Settings copied to all branch locations.",
            "branches": updated_branches
        }, status=status.HTTP_200_OK)



