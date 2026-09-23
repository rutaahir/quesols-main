import os
import qrcode
import qrcode.image.svg
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core.files.storage import default_storage
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.permissions import IsBranchAdmin, IsDeskStaff, IsBranchAdminOnly
from core.throttles import PublicBurstThrottle, PublicSubmitThrottle
from core.honeypot import validate_honeypot
from queuing.models import Desk, Service, DeskService, UserService, DeskStaffAssignment, QueueMethod, QrCode, Ticket, TicketNote, KotMessageTemplate, KotNotificationLog, OperatorAttendance, OperatorBreakLog
from queuing.serializers import (
    DeskSerializer,
    ServiceSerializer,
    DeskServiceSerializer,
    UserServiceSerializer,
    DeskStaffAssignmentSerializer,
    QueueMethodSerializer,
    QrCodeSerializer,
    TicketSerializer,
    TicketNoteSerializer,
    KotMessageTemplateSerializer,
    KotNotificationLogSerializer,
    OperatorAttendanceSerializer,
    OperatorBreakLogSerializer
)
from audit.utils import log_audit

class JoinQueueRateThrottle(PublicSubmitThrottle):
    pass

def broadcast_queue_update(branch_id, ticket):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
        
    # 1. Staff Payload (PII Included)
    staff_payload = {
        "type": "queue.update",
        "event": "ticket_updated",
        "data": TicketSerializer(ticket).data
    }
    
    # 2. Public Payload (Include customer_name for live display boards)
    public_data = TicketSerializer(ticket).data.copy()
    public_data.pop("customer_phone", None)
    public_data.pop("message", None)
    public_data.pop("note", None)
    
    # Calculate position ahead in queue
    position = Ticket.objects.filter(
        branch_id=branch_id,
        service_id=ticket.service_id,
        status__in=["waiting", "called"],
        created_at__lt=ticket.created_at
    ).count()
    
    # Count currently staffed open desks for this service
    active_desks = DeskService.objects.filter(
        service_id=ticket.service_id,
        desk__status="open",
        desk__is_active=True
    ).count()
    
    avg_mins = ticket.service.est_service_minutes if ticket.service else 15
    if active_desks > 0:
        eta = (position / active_desks) * avg_mins
        no_operator = False
    else:
        eta = position * avg_mins
        no_operator = True
        
    public_data["position"] = position
    public_data["estimated_wait_time"] = eta
    public_data["no_operator"] = no_operator
    
    public_payload = {
        "type": "queue.update",
        "event": "ticket_updated",
        "data": public_data
    }
    
    try:
        async_to_sync(channel_layer.group_send)(f"branch_{branch_id}_staff", staff_payload)
        async_to_sync(channel_layer.group_send)(f"branch_{branch_id}_public", public_payload)
    except Exception as ws_err:
        import logging
        logging.getLogger(__name__).warning(f"WebSocket queue update broadcast failed: {ws_err}")


class DeskViewSet(viewsets.ModelViewSet):
    queryset = Desk.objects.all()
    serializer_class = DeskSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsBranchAdminOnly()]
        return [IsDeskStaff()]

    def get_queryset(self):
        user = self.request.user
        if user.role == "super_admin":
            return Desk.objects.all()
        return Desk.objects.filter(company=user.company)

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        branch = serializer.validated_data.get("branch") or getattr(user, "branch", None)
        if not branch:
            branch_id = self.request.data.get("branch") or self.request.data.get("branch_id")
            if branch_id:
                from branches.models import Branch
                try:
                    branch = Branch.objects.get(id=branch_id, company=company)
                except Branch.DoesNotExist:
                    raise ValidationError("Specified branch not found in your company.")

        if not branch:
            raise ValidationError("You must specify a valid branch to create desks.")
        
        # Enforce operator_screens branch-scoped or company plan limit
        from billing.models import CompanyPlanAllocation
        # 1. Check branch-specific allocation
        alloc = CompanyPlanAllocation.objects.filter(company=company, branch=branch, plan_component__key="operator_screens").first()
        if alloc:
            purchased_qty = alloc.purchased_qty
            current_total = Desk.objects.filter(branch=branch, is_active=True).count()
            limit_msg = f"Branch plan limit reached ({purchased_qty} operator screens allocated for this branch). Please purchase an add-on."
        else:
            # 2. Fallback to company-wide pooled limit (legacy fallback)
            from django.db.models import Sum
            res = CompanyPlanAllocation.objects.filter(company=company, plan_component__key="operator_screens").aggregate(total=Sum('purchased_qty'))
            purchased_qty = res['total'] if res['total'] is not None else 1
            current_total = Desk.objects.filter(company=company, is_active=True).count()
            limit_msg = f"Plan limit reached ({purchased_qty} operator screens allocated). Please purchase an add-on."

        if current_total >= purchased_qty:
            raise ValidationError(limit_msg)

        desk = serializer.save(company=company, branch=branch)
        log_audit(
            actor=user,
            company=company,
            branch=branch,
            action="desk_created",
            object_type="Desk",
            object_id=desk.id,
            changes=serializer.data
        )

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        
        status = self.request.data.get("status")
        
        # Check if the desk operator has an active "on_break" attendance session
        op_user = instance.current_operator or user
        active_break = None
        if op_user and op_user.is_authenticated:
            active_break = OperatorAttendance.objects.filter(
                user=op_user,
                branch=instance.branch,
                status="on_break"
            ).first()

        if active_break and status == "open":
            # Operator is actively on break; preserve break status in DB!
            serializer.validated_data["status"] = "break"
        elif status == "open":
            # Check if desk is already open by someone else
            if instance.current_operator and instance.current_operator != user:
                op_name = instance.current_operator.get_full_name() or instance.current_operator.email
                raise ValidationError(f"Desk '{instance.name}' is currently active and logged in by operator '{op_name}'. Only 1 operator can log into this desk at a time. Please wait for '{op_name}' to log out before opening this desk.")
            serializer.validated_data["current_operator"] = user
        elif status == "offline":
            if instance.current_operator == user and not active_break:
                serializer.validated_data["current_operator"] = None

        updated_desk = serializer.save()

        # Broadcast desk status update over WebSockets to public display screens & staff
        channel_layer = get_channel_layer()
        if channel_layer:
            payload = {
                "type": "queue.update",
                "event": "desk_updated",
                "data": DeskSerializer(updated_desk).data
            }
            try:
                async_to_sync(channel_layer.group_send)(f"branch_{updated_desk.branch.id}_staff", payload)
                async_to_sync(channel_layer.group_send)(f"branch_{updated_desk.branch.id}_public", payload)
            except Exception as ws_err:
                pass

    def perform_destroy(self, instance):
        log_audit(
            actor=self.request.user,
            company=instance.company,
            branch=instance.branch,
            action="desk_deleted",
            object_type="Desk",
            object_id=instance.id,
            changes=DeskSerializer(instance).data
        )
        instance.delete()

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBranchAdminOnly()]
        return [AllowAny()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Service.objects.all()
        if getattr(user, "role", None) == "super_admin":
            return Service.objects.all()
        if hasattr(user, "company") and user.company:
            return Service.objects.filter(company=user.company)
        return Service.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        branch = serializer.validated_data.get("branch") or getattr(user, "branch", None)
        if not branch:
            branch_id = self.request.data.get("branch") or self.request.data.get("branch_id")
            if branch_id:
                from branches.models import Branch
                try:
                    branch = Branch.objects.get(id=branch_id, company=company)
                except Branch.DoesNotExist:
                    raise ValidationError("Specified branch not found in your company.")

        if not branch:
            raise ValidationError("You must specify a valid branch to create services.")

        if getattr(branch, "mode", None) == "NON_SERVICE_BASED":
            raise ValidationError("Cannot create services on a non-service-based branch.")

        # Enforce services branch-scoped or company plan limit
        from billing.models import CompanyPlanAllocation
        # 1. Check branch-specific allocation
        alloc = CompanyPlanAllocation.objects.filter(company=company, branch=branch, plan_component__key="services").first()
        if alloc:
            purchased_qty = alloc.purchased_qty
            current_total = Service.objects.filter(branch=branch, is_active=True).count()
            limit_msg = f"Branch plan limit reached ({purchased_qty} services allocated for this branch). Please purchase an add-on."
        else:
            # 2. Fallback to company-wide pooled limit (legacy fallback)
            from django.db.models import Sum
            res = CompanyPlanAllocation.objects.filter(company=company, plan_component__key="services").aggregate(total=Sum('purchased_qty'))
            purchased_qty = res['total'] if res['total'] is not None else 1
            current_total = Service.objects.filter(company=company, is_active=True).count()
            limit_msg = f"Plan limit reached ({purchased_qty} services allocated). Please purchase an add-on."

        if current_total >= purchased_qty:
            raise ValidationError(limit_msg)
            
        service = serializer.save(company=company, branch=branch)
        log_audit(
            actor=user,
            company=company,
            branch=branch,
            action="service_created",
            object_type="Service",
            object_id=service.id,
            changes=serializer.data
        )

    def perform_destroy(self, instance):
        log_audit(
            actor=self.request.user,
            company=instance.company,
            branch=instance.branch,
            action="service_deleted",
            object_type="Service",
            object_id=instance.id,
            changes=ServiceSerializer(instance).data
        )
        instance.delete()

class DeskServiceViewSet(viewsets.ModelViewSet):
    queryset = DeskService.objects.all()
    serializer_class = DeskServiceSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBranchAdminOnly()]
        return [IsDeskStaff()]

class UserServiceViewSet(viewsets.ModelViewSet):
    queryset = UserService.objects.all()
    serializer_class = UserServiceSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBranchAdminOnly()]
        return [IsDeskStaff()]

class DeskStaffAssignmentViewSet(viewsets.ModelViewSet):
    queryset = DeskStaffAssignment.objects.all()
    serializer_class = DeskStaffAssignmentSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBranchAdminOnly()]
        return [IsDeskStaff()]

class QueueMethodViewSet(viewsets.ModelViewSet):
    queryset = QueueMethod.objects.all()
    serializer_class = QueueMethodSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsBranchAdmin()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return QueueMethod.objects.filter(is_enabled=True)
        if getattr(user, "role", None) == "super_admin":
            return QueueMethod.objects.all()
        if hasattr(user, "company") and user.company:
            return QueueMethod.objects.filter(company=user.company)
        return QueueMethod.objects.filter(is_enabled=True)

    def _apply_method_toggle(self, user, company, branch, method, is_enabled, config, serializer):
        """Shared logic for create and update — atomic method switching."""

        # Verify package feature flags
        feature_key = f"method{method}"
        sub = company.subscriptions.first()
        has_feature = (
            company.package.feature_flags.get(feature_key, False) or
            (sub.feature_overrides.get(feature_key, False) if sub else False) or
            (method == "4" and branch.channel_type in ["ONLINE_ONLY", "HYBRID"])
        )
        if not has_feature:
            raise PermissionDenied(f"Method {method} is not unlocked by your package. Please request an upgrade.")

        if is_enabled:
            if method == "1":
                # Atomically disable Method 2 and 3 (auto-switch, not block)
                QueueMethod.objects.filter(branch=branch, method__in=["2", "3"]).update(is_enabled=False)
            elif method == "2":
                # Atomically disable Method 1 (auto-switch, not block)
                QueueMethod.objects.filter(branch=branch, method="1").update(is_enabled=False)
            elif method == "3":
                # Method 3 requires Method 2 to be active — BLOCK if it isn't
                m2_active = QueueMethod.objects.filter(
                    branch=branch, method="2", is_enabled=True
                ).exists()
                if not m2_active:
                    raise ValidationError(
                        "Display boards (Method 3) requires Multi-desk routing (Method 2) to be active first."
                    )
            # Method 4 is fully independent — no exclusivity rules

        with transaction.atomic():
            q_method, _ = QueueMethod.objects.update_or_create(
                branch=branch,
                method=method,
                defaults={
                    "company": company,
                    "is_enabled": is_enabled,
                    "config": config or {}
                }
            )

        log_audit(
            actor=user,
            company=company,
            branch=branch,
            action="queue_method_enabled" if is_enabled else "queue_method_disabled",
            object_type="QueueMethod",
            object_id=q_method.id,
            changes={"method": method, "is_enabled": is_enabled, "config": q_method.config}
        )

        return q_method

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company

        branch = serializer.validated_data.get("branch")
        if user.role != "super_admin":
            if user.role == "company_admin":
                if not branch or branch.company != company:
                    raise ValidationError("Invalid branch specified for your company.")
            else:
                branch = user.branch
                if not branch:
                    raise ValidationError("You must be assigned to a branch to manage queue methods.")
        else:
            if not branch:
                raise ValidationError("Super Admin must specify a branch.")

        method = serializer.validated_data.get("method")
        is_enabled = serializer.validated_data.get("is_enabled", True)
        config = serializer.validated_data.get("config", {})

        q_method = self._apply_method_toggle(user, company, branch, method, is_enabled, config, serializer)
        serializer.instance = q_method

    def perform_update(self, serializer):
        user = self.request.user
        company = user.company
        instance = serializer.instance
        branch = instance.branch

        # Company admin can update methods for any of their branches
        if user.role == "company_admin" and branch.company != company:
            raise PermissionDenied("You can only manage queue methods for your own branches.")
        # Branch admin can only update methods for their own branch
        if user.role == "branch_admin" and branch != user.branch:
            raise PermissionDenied("You can only manage queue methods for your assigned branch.")

        method = instance.method
        is_enabled = serializer.validated_data.get("is_enabled", instance.is_enabled)
        config = serializer.validated_data.get("config", instance.config)

        q_method = self._apply_method_toggle(user, company, branch, method, is_enabled, config, serializer)
        serializer.instance = q_method


class QrCodeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = QrCode.objects.all()
    serializer_class = QrCodeSerializer
    permission_classes = [IsBranchAdmin]

class QrCodeGenerateView(APIView):
    permission_classes = [IsBranchAdminOnly]

    def post(self, request, branch_id):
        try:
            method = request.data.get("method")
            if not method:
                return Response({"error": "Method number is required."}, status=status.HTTP_400_BAD_REQUEST)

            from branches.models import Branch
            try:
                branch = Branch.all_objects.get(id=branch_id)
            except Branch.DoesNotExist:
                return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

            company_slug = branch.company.slug
            branch_slug = branch.slug

            # Map method to the correct route based on the TARGET URL SCHEME
            if method == "1":
                url_target = f"/{company_slug}/branches/{branch_slug}/join"
            elif method == "2":
                url_target = f"/{company_slug}/branches/{branch_slug}/kiosk"
            elif method == "3":
                url_target = f"/{company_slug}/branches/{branch_slug}/display"
            else:
                url_target = f"/{company_slug}"

            # Setup pure python SvgImage backend
            qr = qrcode.QRCode(
                version=1,
                box_size=10,
                border=4,
                image_factory=qrcode.image.svg.SvgImage
            )
            qr.add_data(url_target)
            qr.make(fit=True)
            img = qr.make_image()
            
            # Save SVG to local storage
            svg_filename = f"qrcodes/branch_{branch_id}_m{method}.svg"
            os.makedirs(os.path.join(settings.MEDIA_ROOT, "qrcodes"), exist_ok=True)
            full_path = os.path.join(settings.MEDIA_ROOT, svg_filename)
            
            with open(full_path, "wb") as f:
                img.save(f)
                
            # Branded fill color substitution: read XML and inject hex brand color if exists
            user = request.user
            brand_color = user.company.brand_colors.get("primary", "#6366F1")
            
            with open(full_path, "r", encoding="utf-8") as f:
                svg_data = f.read()
                
            # Replace default black fill with brand hex color code
            svg_data = svg_data.replace('fill="#000000"', f'fill="{brand_color}"')
            
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(svg_data)
                
            image_url = f"/media/{svg_filename}"

            # Save QrCode record
            qr_obj, _ = QrCode.objects.update_or_create(
                branch_id=branch_id,
                method=method,
                defaults={"company": branch.company, "image_url": image_url, "generated_at": timezone.now()}
            )
            
            log_audit(
                actor=user,
                company=user.company,
                branch=qr_obj.branch,
                action="qrcode_generated",
                object_type="QrCode",
                object_id=qr_obj.id,
                changes={"method": method, "image_url": image_url}
            )
            
            return Response(QrCodeSerializer(qr_obj).data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

import math

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lon2) - float(lon1))

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return int(round(R * c))

class VerifyLocationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        branch_id = request.data.get("branch") or request.data.get("branch_id")
        user_lat = request.data.get("lat")
        user_lng = request.data.get("lng")

        if not branch_id:
            return Response({"error": "Branch ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        from branches.models import Branch
        branch = Branch.objects.filter(id=branch_id).first()
        if not branch:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

        qm = QueueMethod.objects.filter(branch_id=branch_id, is_active=True).first()
        if not qm:
            qm = QueueMethod.objects.filter(company=branch.company, is_active=True).first()
        method_code = qm.method if qm else "1"

        # Method 4 (remote booking) or geofence disabled -> Always pass
        if method_code == "4" or not branch.geofence_enabled or branch.geo_lat is None or branch.geo_lng is None:
            return Response({
                "is_within_geofence": True,
                "distance_meters": 0,
                "radius_meters": branch.geofence_radius_meters,
                "geofence_enabled": False,
                "method": method_code
            })

        if user_lat is None or user_lng is None:
            return Response({
                "is_within_geofence": False,
                "distance_meters": None,
                "radius_meters": branch.geofence_radius_meters,
                "geofence_enabled": True,
                "method": method_code,
                "error": "Location coordinates are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        dist = calculate_haversine_distance(user_lat, user_lng, branch.geo_lat, branch.geo_lng)
        is_within = dist <= branch.geofence_radius_meters

        return Response({
            "is_within_geofence": is_within,
            "distance_meters": dist,
            "radius_meters": branch.geofence_radius_meters,
            "geofence_enabled": True,
            "method": method_code
        })

class PublicJoinQueueView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [JoinQueueRateThrottle]

    def post(self, request):
        validate_honeypot(request.data)
        
        consent = request.data.get("consent")
        if not consent or str(consent).lower() != "true":
            return Response({"error": "Consent to data processing is required to join the queue."}, status=status.HTTP_400_BAD_REQUEST)
        
        branch_id = request.data.get("branch") or request.data.get("branch_id")
        name = request.data.get("customer_name") or request.data.get("name")
        contact = request.data.get("customer_phone") or request.data.get("contact") or request.data.get("phone")
        email = request.data.get("customer_email") or request.data.get("email") or ""
        channel_param = request.data.get("channel") or request.data.get("source") or "qr"
        message = request.data.get("message", "")
        service_id = request.data.get("service") or request.data.get("service_id")
        user_lat = request.data.get("lat") or request.data.get("user_lat")
        user_lng = request.data.get("lng") or request.data.get("user_lng")
        customer_photo = request.data.get("customer_photo") or request.data.get("photo") or ""
        
        if not branch_id or not name or not contact:
            return Response({"error": "Branch, customer name, and contact phone are required."}, status=status.HTTP_400_BAD_REQUEST)

        from branches.models import Branch
        branch = Branch.objects.filter(id=branch_id).first()
        if not branch:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

        # Resolve correct method and source_method based on channel
        if channel_param == "qr":
            target_method = "1"
            src_method = "QR_SCAN"
        elif channel_param == "kiosk":
            target_method = "2"
            src_method = "KOT_PRINT"
        elif channel_param == "sms":
            target_method = "3"
            src_method = "SMS_SEND"
        elif channel_param == "whatsapp":
            target_method = "4"
            src_method = "WHATSAPP_SEND"
        else:
            target_method = "3"
            src_method = "ON_SCREEN"

        # Check backend entitlement
        is_method_enabled = QueueMethod.objects.filter(branch_id=branch_id, method=target_method, is_enabled=True).exists()
        if not is_method_enabled:
            qm, _ = QueueMethod.objects.get_or_create(
                company=branch.company,
                branch=branch,
                method=target_method,
                defaults={"is_enabled": True, "config": {"single_queue_enabled": True, "max_daily_tickets": 150}}
            )
            if not qm.is_enabled:
                qm.is_enabled = True
                qm.save()
            is_method_enabled = True

        if not is_method_enabled:
            return Response(
                {"error": f"The requested channel '{channel_param}' is not enabled or purchased on your current plan."},
                status=status.HTTP_403_FORBIDDEN
            )

        method = target_method
        qm = QueueMethod.objects.filter(branch_id=branch_id, method=method).first()
        if not qm:
            qm = QueueMethod.objects.create(
                company=branch.company,
                branch=branch,
                method=method,
                is_enabled=True,
                config={"single_queue_enabled": True, "max_daily_tickets": 150}
            )

        # Server-side Geofence Enforcement (Methods 1-3 when geofence_enabled is True and not kiosk channel)
        checkin_distance = None
        if channel_param != "kiosk" and method in ["1", "2", "3"] and branch.geofence_enabled and branch.geo_lat is not None and branch.geo_lng is not None:
            if user_lat is None or user_lng is None:
                return Response({
                    "error": "Your physical location is required to join this branch queue."
                }, status=status.HTTP_400_BAD_REQUEST)

            checkin_distance = calculate_haversine_distance(user_lat, user_lng, branch.geo_lat, branch.geo_lng)
            if checkin_distance > branch.geofence_radius_meters:
                return Response({
                    "error": f"You must be at {branch.name} to join this queue. You appear to be about {checkin_distance}m away."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Resolve Service
        from queuing.services.queue_routing import is_no_service_mode
        no_service = is_no_service_mode(branch.company)

        service = None
        if not no_service:
            if service_id:
                service = Service.objects.filter(id=service_id, branch=branch, is_active=True).first()

            if not service and method in ["2", "3"]:
                service = Service.objects.filter(branch=branch, is_active=True).first()
                if not service:
                    raise ValidationError("Service selection is required for this queue method.")

            if not service:
                service = Service.objects.filter(branch=branch, is_active=True).first()

            if not service:
                existing_prefixes = set(Service.objects.filter(branch=branch).values_list("prefix", flat=True))
                default_prefix = "A"
                for char in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                    if char not in existing_prefixes:
                        default_prefix = char
                        break

                service, _ = Service.objects.get_or_create(
                    branch=branch,
                    name="General Service",
                    defaults={"company": branch.company, "prefix": default_prefix, "est_service_minutes": 15, "is_active": True}
                )

        # Enforce daily caps
        if no_service:
            today_count = Ticket.objects.filter(
                branch_id=branch_id,
                created_at__date=timezone.now().date()
            ).count()
            max_cap = qm.config.get("max_daily_tickets", 150)
            if today_count >= max_cap:
                return Response({"error": "Today's ticket limit for this branch has been reached."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if service and service.est_service_minutes:
                today_count = Ticket.objects.filter(
                    service=service,
                    created_at__date=timezone.now().date()
                ).count()
                max_cap = qm.config.get("max_daily_tickets", 150)
                if today_count >= max_cap:
                    return Response({"error": "Today's ticket limit for this service has been reached."}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve numbering style configuration from QueueMethod config
        # Default to "prefix" if method is 2 or 3, or if the branch has multiple active services configured
        has_multiple_services = Service.objects.filter(branch_id=branch_id, is_active=True).count() > 1
        default_style = "prefix" if (method in ["2", "3"] or has_multiple_services) else "sequential"
        numbering_style = qm.config.get("numbering_style", default_style)

        # Resolve correct method and source_method based on resolved method (pre-validated)
        pass

        try:
            with transaction.atomic():
                from queuing.models import TokenSequence
                prefix = (service.prefix or "A") if (numbering_style == "prefix" and service) else ""
                token_number = TokenSequence.get_unique_token_number(branch, prefix=prefix)

                ticket = Ticket.objects.create(
                    branch_id=branch_id,
                    company=qm.company,
                    service=service,
                    method=method,
                    token_number=token_number,
                    customer_name=name,
                    customer_email=email if email else None,
                    customer_phone=contact,
                    customer_photo=customer_photo,
                    message=message,
                    source=channel_param,
                    channel=channel_param,
                    source_method=src_method,
                    status="waiting",
                    customer_consented_at=timezone.now(),
                    distance_at_checkin_meters=checkin_distance
                )
                
            broadcast_queue_update(branch_id, ticket)
            
            # Predict desk assignment on ticket creation
            from queuing.services.queue_routing import assign_predicted_desk_for_ticket
            assign_predicted_desk_for_ticket(ticket)
            ticket.save(update_fields=["predicted_desk"])

            if ticket.customer_email and channel_param not in ["sms", "whatsapp"] and method not in ["3", "4"]:
                try:
                    # Calculate queue position & ETA
                    position = Ticket.objects.filter(
                        branch_id=branch_id,
                        service_id=ticket.service_id,
                        status="waiting",
                        created_at__lt=ticket.created_at
                    ).count()
                    avg_mins = ticket.service.est_service_minutes if ticket.service else 15
                    active_desks = DeskService.objects.filter(
                        service_id=ticket.service_id,
                        desk__status="open",
                        desk__is_active=True
                    ).count()
                    if active_desks > 0:
                        eta = (position / active_desks) * avg_mins
                    else:
                        eta = position * avg_mins

                    desk_name = ticket.predicted_desk.name if ticket.predicted_desk else "Counter Assigned Upon Call"

                    email_body = (
                        f"Hi {ticket.customer_name},\n\n"
                        f"You have successfully joined the queue at {branch.name}.\n\n"
                        f"Token Number: {ticket.token_number}\n"
                        f"Assigned Counter: {desk_name}\n"
                        f"People Ahead: {position}\n"
                        f"Estimated Wait Time: ~{int(eta)} minutes\n\n"
                        f"Branch Address:\n"
                        f"{branch.address}, {branch.city}\n\n"
                        f"Thank you,\n"
                        f"Quesole Team"
                    )
                    from django.core.mail import send_mail
                    send_mail(
                        "Walk-in Queue Check-In - Quesole",
                        email_body,
                        "noreply@quesole.com",
                        [ticket.customer_email],
                        fail_silently=True
                    )
                except Exception:
                    pass

            if ticket.customer_phone and (method in ["3", "4"] or channel_param in ["sms", "whatsapp"]):
                try:
                    # Calculate queue position & ETA
                    position = Ticket.objects.filter(
                        branch_id=branch_id,
                        service_id=ticket.service_id,
                        status="waiting",
                        created_at__lt=ticket.created_at
                    ).count()
                    avg_mins = ticket.service.est_service_minutes if ticket.service else 15
                    active_desks = DeskService.objects.filter(
                        service_id=ticket.service_id,
                        desk__status="open",
                        desk__is_active=True
                    ).count()
                    if active_desks > 0:
                        eta = (position / active_desks) * avg_mins
                    else:
                        eta = position * avg_mins

                    desk_name = ticket.predicted_desk.name if ticket.predicted_desk else "Counter Assigned Upon Call"

                    # Load message template or fallback to default
                    from queuing.models import KotMessageTemplate, KotNotificationLog

                    tracking_link = f"http://{request.get_host()}/track/{ticket.tracking_code}" if getattr(ticket, "tracking_code", None) else ""
                    service_name = ticket.service.name if ticket.service else "General"

                    context = {
                        "customer_name": ticket.customer_name,
                        "token_number": ticket.token_number,
                        "service_name": service_name,
                        "desk_name": desk_name,
                        "position": position,
                        "eta": int(eta),
                        "branch_name": ticket.branch.name,
                        "tracking_link": tracking_link
                    }

                    def format_template_safely(template_str, ctx):
                        res = template_str
                        for k, v in ctx.items():
                            res = res.replace("{" + k + "}", str(v))
                        return res

                    if method == "3" or channel_param == "sms":
                        # SMS
                        template = KotMessageTemplate.objects.filter(branch=ticket.branch, channel="sms").first()
                        if template and template.template_text.strip():
                            body = format_template_safely(template.template_text, context)
                        else:
                            body = (
                                f"Hi {ticket.customer_name},\n"
                                f"Your token is {ticket.token_number} (Service: {service_name}).\n"
                                f"Desk: {desk_name}\n"
                                f"People ahead: {position}\n"
                                f"Est wait: ~{int(eta)} mins.\n"
                                f"Quesole Team"
                            )
                        
                        log_status = "delivered"
                        error_msg = None
                        try:
                            from notifications.tasks import _dispatch_sms
                            _dispatch_sms(ticket.customer_phone, body)
                        except Exception as e:
                            log_status = "failed"
                            error_msg = str(e)
                            raise

                        finally:
                            KotNotificationLog.objects.create(
                                company=ticket.company,
                                branch=ticket.branch,
                                ticket=ticket,
                                channel="sms",
                                recipient=ticket.customer_phone or "",
                                message_body=body,
                                status=log_status,
                                error_message=error_msg
                            )

                    elif method == "4" or channel_param == "whatsapp":
                        # WhatsApp
                        template = KotMessageTemplate.objects.filter(branch=ticket.branch, channel="whatsapp").first()
                        if template and template.template_text.strip():
                            body = format_template_safely(template.template_text, context)
                        else:
                            body = (
                                f"🎫 *Quesole Digital Token*\n\n"
                                f"Hello {ticket.customer_name}!\n"
                                f"Your queue token for *{ticket.branch.name}* is confirmed.\n\n"
                                f"• *Token Number:* {ticket.token_number}\n"
                                f"• *Service:* {service_name}\n"
                                f"• *Assigned Counter:* {desk_name}\n"
                                f"• *People Ahead:* {position}\n"
                                f"• *Estimated Wait:* ~{int(eta)} mins\n\n"
                                f"📱 *Track Live Queue:* {tracking_link}\n\n"
                                f"Thank you for choosing {ticket.company.name}!"
                            )

                        log_status = "sent"
                        error_msg = None
                        try:
                            from notifications.tasks import send_whatsapp_notification
                            send_whatsapp_notification(ticket.customer_phone, body)
                        except Exception as wa_err:
                            log_status = "failed"
                            error_msg = str(wa_err)

                        KotNotificationLog.objects.create(
                            company=ticket.company,
                            branch=ticket.branch,
                            ticket=ticket,
                            channel="whatsapp",
                            recipient=ticket.customer_phone or "",
                            message_body=body,
                            status=log_status,
                            error_message=error_msg
                        )
                except Exception as alert_err:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send ticket delivery alert: {alert_err}")
            
            resp_data = TicketSerializer(ticket).data
            if method == "4" or channel_param == "whatsapp":
                import urllib.parse
                clean_phone = (ticket.customer_phone or "").replace(" ", "").replace("-", "")
                if not clean_phone.startswith("+") and len(clean_phone) == 10:
                    clean_phone = f"+91{clean_phone}"
                msg_text = body if 'body' in locals() else f"🎫 *Quesole Digital Token*\n\nHello {ticket.customer_name}!\nYour queue token for *{ticket.branch.name}* is {ticket.token_number}."
                encoded_msg = urllib.parse.quote(msg_text)
                resp_data["whatsapp_url"] = f"https://api.whatsapp.com/send?phone={clean_phone.lstrip('+')}&text={encoded_msg}"
                resp_data["wa_me_url"] = f"https://wa.me/{clean_phone.lstrip('+')}?text={encoded_msg}"
                resp_data["whatsapp_body"] = msg_text

            return Response(resp_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ManualTicketIssueView(APIView):
    permission_classes = [IsDeskStaff]

    def post(self, request):
        branch_id = request.data.get("branch") or request.data.get("branch_id")
        name = request.data.get("customer_name") or request.data.get("name") or "Walk-in Visitor"
        contact = request.data.get("customer_phone") or request.data.get("contact") or "Walk-in"
        service_id = request.data.get("service") or request.data.get("service_id")
        desk_id = request.data.get("desk") or request.data.get("desk_id")

        if not branch_id:
            return Response({"error": "Branch ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        from branches.models import Branch
        branch = Branch.objects.filter(id=branch_id).first()
        if not branch:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

        qm = QueueMethod.objects.filter(branch_id=branch_id, is_active=True).first()
        if not qm:
            qm = QueueMethod.objects.filter(company=branch.company, is_active=True).first()
        method = qm.method if qm else "1"

        from queuing.services.queue_routing import is_no_service_mode
        no_service = is_no_service_mode(branch.company)

        service = None
        if not no_service:
            if service_id:
                service = Service.objects.filter(id=service_id, branch=branch).first()
            if not service:
                service = Service.objects.filter(branch=branch, is_active=True).first()

        with transaction.atomic():
            from queuing.models import TokenSequence
            prefix = service.prefix if (not no_service and service and service.prefix) else ""
            token_number = TokenSequence.get_unique_token_number(branch, prefix=prefix)

            ticket = Ticket.objects.create(
                branch_id=branch_id,
                company=branch.company,
                service=service,
                desk_id=desk_id,
                method=method,
                token_number=token_number,
                customer_name=name,
                customer_phone=contact,
                source="counter",
                source_method="COUNTER",
                status="waiting",
                customer_consented_at=timezone.now()
            )

        broadcast_queue_update(branch_id, ticket)
        
        # Predict desk assignment
        from queuing.services.queue_routing import assign_predicted_desk_for_ticket
        assign_predicted_desk_for_ticket(ticket)
        ticket.save(update_fields=["predicted_desk"])
        
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsDeskStaff]

    def get_queryset(self):
        user = self.request.user
        from django.db.models.functions import Coalesce
        from django.db.models import Q
        from django.utils import timezone
        
        now = timezone.now()
        from datetime import timedelta
        cutoff = now - timedelta(hours=24)
        Ticket.objects.filter(status__in=["waiting", "called"], created_at__lt=cutoff).update(status="cancelled")

        qs = Ticket.objects.annotate(
            priority_time=Coalesce('scheduled_for', 'created_at')
        )
        qs = qs.filter(~Q(status="waiting", priority_time__gt=now))
        
        if user.role == "super_admin":
            return qs.order_by("priority_time")
        return qs.filter(company=user.company).order_by("priority_time")

    def perform_update(self, serializer):
        note = self.request.data.get("note") or self.request.data.get("notes") or self.request.data.get("message")
        if note is not None:
            ticket = serializer.save(message=note)
        else:
            ticket = serializer.save()

        if note and self.request.user and self.request.user.is_authenticated:
            try:
                TicketNote.objects.create(
                    ticket=ticket,
                    user=self.request.user,
                    note=note
                )
            except Exception:
                pass

        if ticket.branch:
            broadcast_queue_update(ticket.branch.id, ticket)

    @action(detail=False, methods=["post"], url_path="call-next")
    def call_next(self, request):
        desk_id = request.data.get("desk_id")
        if not desk_id:
            raise ValidationError("Desk ID is required.")

        try:
            if request.user.role in ["company_admin", "super_admin"]:
                desk = Desk.objects.get(id=desk_id, company=request.user.company)
            elif request.user.branch:
                desk = Desk.objects.get(id=desk_id, branch=request.user.branch)
            else:
                desk = Desk.objects.get(id=desk_id)
        except Desk.DoesNotExist:
            return Response({"error": "Desk not found in your branch."}, status=status.HTTP_404_NOT_FOUND)

        try:
            from queuing.services.queue_routing import claim_next_ticket
            next_ticket = claim_next_ticket(desk, request.user)

            if not next_ticket:
                return Response({"message": "No visitors waiting in queue."}, status=status.HTTP_200_OK)

            broadcast_queue_update(desk.branch.id, next_ticket)
            from display.utils import broadcast_call_next_to_displays
            broadcast_call_next_to_displays(next_ticket, desk)
            return Response(TicketSerializer(next_ticket).data, status=status.HTTP_200_OK)

        except ValidationError as ve:
            return Response({"error": ve.detail if hasattr(ve, 'detail') else str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionDenied as pd:
            return Response({"error": str(pd)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], url_path="action")
    def take_action(self, request, pk=None):
        ticket = self.get_object()
        act = request.data.get("action")

        if act not in ["recall", "serve", "complete", "skip", "hold", "transfer"]:
            raise ValidationError("Invalid action.")

        old_status = ticket.status
        try:
            with transaction.atomic():
                if act == "recall":
                    ticket.called_at = timezone.now()
                    ticket.save()
                    action_tag = "ticket_recalled"
                    from display.utils import broadcast_call_next_to_displays
                    if ticket.desk:
                        broadcast_call_next_to_displays(ticket, ticket.desk)

                elif act == "serve":
                    ticket.status = "serving"
                    ticket.served_at = timezone.now()
                    ticket.save()
                    action_tag = "ticket_serving_started"

                elif act == "complete":
                    ticket.status = "served"
                    ticket.closed_at = timezone.now()
                    ticket.save()
                    action_tag = "ticket_served"

                elif act == "skip":
                    ticket.status = "no_show"
                    ticket.closed_at = timezone.now()
                    ticket.save()
                    action_tag = "ticket_skipped"

                elif act in ["hold", "escalate"]:
                    ticket.status = "hold"
                    ticket.save()
                    action_tag = "ticket_held"

                elif act == "transfer":
                    target_desk_id = request.data.get("target_desk_id")
                    target_service_id = request.data.get("target_service_id")

                    if target_desk_id:
                        desk = Desk.objects.get(id=target_desk_id, branch=ticket.branch)
                        ticket.desk = desk
                    if target_service_id:
                        service = Service.objects.get(id=target_service_id, branch=ticket.branch)
                        ticket.service = service
                        
                    ticket.status = "waiting"
                    ticket.save()
                    action_tag = "ticket_transferred"

                log_audit(
                    actor=request.user,
                    company=ticket.company,
                    branch=ticket.branch,
                    action=action_tag,
                    object_type="Ticket",
                    object_id=ticket.id,
                    changes={"old_status": old_status, "new_status": ticket.status}
                )

                broadcast_queue_update(ticket.branch.id, ticket)

                if act in ["complete", "hold", "escalate"]:
                    notes = request.data.get("notes") or request.data.get("note") or ""
                    if notes:
                        ticket.message = notes
                        ticket.save(update_fields=["message"])
                        if request.user and request.user.is_authenticated:
                            try:
                                TicketNote.objects.create(
                                    ticket=ticket,
                                    user=request.user,
                                    note=notes
                                )
                            except Exception:
                                pass
                    disposition = "resolved" if act == "complete" else "escalated"
                    t_id = ticket.id
                    a_id = request.user.id if request.user and request.user.is_authenticated else None
                    try:
                        from queuing.services.email_notifications import dispatch_disposition_email_async
                        dispatch_disposition_email_async(
                            ticket_id=t_id,
                            disposition=disposition,
                            actor_id=a_id,
                            notes=notes
                        )
                    except Exception as email_err:
                        import logging
                        logging.getLogger(__name__).error(f"Failed to dispatch disposition email: {email_err}")

            return Response(TicketSerializer(ticket).data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PublicTicketFeedbackView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicBurstThrottle]

    def get(self, request, tracking_code):
        ticket = Ticket.all_objects.filter(tracking_code=tracking_code).first()
        if not ticket and str(tracking_code).isdigit():
            ticket = Ticket.all_objects.filter(id=tracking_code).first()
        if not ticket:
            from appointments.models import OnlineBooking
            booking = OnlineBooking.objects.filter(booking_reference=tracking_code).first()
            if not booking and str(tracking_code).isdigit():
                booking = OnlineBooking.objects.filter(id=tracking_code).first()
            if booking:
                desk_name = booking.desk.name if booking.desk else "Appointment Counter"
                branch_name = booking.branch.name if booking.branch else "Branch Office"
                service_name = booking.service.name if booking.service else "General Service"
                company = booking.branch.company if (booking.branch and booking.branch.company) else None
                company_name = company.name if company else "Company"
                company_logo = getattr(company, "logo_url", None) if company else None
                return Response({
                    "id": booking.id,
                    "tracking_code": booking.booking_reference,
                    "token_number": booking.booking_reference,
                    "customer_name": booking.customer_name,
                    "customer_email": booking.customer_email or "",
                    "status": booking.status,
                    "desk_name": desk_name,
                    "branch_name": branch_name,
                    "company_name": company_name,
                    "company_logo": company_logo,
                    "service_name": service_name,
                    "feedback_rating": booking.feedback_rating,
                    "feedback_text": booking.feedback_text,
                    "feedback_submitted_at": booking.feedback_submitted_at,
                    "is_appointment": True,
                })
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        desk_name = ticket.desk.name if ticket.desk else "Counter Desk"
        branch_name = ticket.branch.name if ticket.branch else "Branch Office"
        service_name = ticket.service.name if ticket.service else "General Service"
        company_name = ticket.company.name if ticket.company else "Company"
        company_logo = getattr(ticket.company, "logo_url", None) if ticket.company else None

        return Response({
            "id": ticket.id,
            "tracking_code": ticket.tracking_code,
            "token_number": ticket.token_number,
            "customer_name": ticket.customer_name,
            "customer_email": ticket.customer_email or "",
            "status": ticket.status,
            "desk_name": desk_name,
            "branch_name": branch_name,
            "company_name": company_name,
            "company_logo": company_logo,
            "service_name": service_name,
            "feedback_rating": ticket.feedback_rating,
            "feedback_text": ticket.feedback_text,
            "feedback_submitted_at": ticket.feedback_submitted_at,
        })

    def post(self, request, tracking_code):
        ticket = Ticket.all_objects.filter(tracking_code=tracking_code).first()
        if not ticket and str(tracking_code).isdigit():
            ticket = Ticket.all_objects.filter(id=tracking_code).first()
        
        rating = request.data.get("rating") or request.data.get("feedback_rating")
        feedback_text = request.data.get("feedback_text") or request.data.get("message") or request.data.get("reply") or ""

        if not ticket:
            from appointments.models import OnlineBooking
            booking = OnlineBooking.objects.filter(booking_reference=tracking_code).first()
            if not booking and str(tracking_code).isdigit():
                booking = OnlineBooking.objects.filter(id=tracking_code).first()
            if booking:
                if rating:
                    booking.feedback_rating = int(rating)
                booking.feedback_text = str(feedback_text).strip()
                booking.feedback_submitted_at = timezone.now()
                booking.save(update_fields=["feedback_rating", "feedback_text", "feedback_submitted_at"])
                return Response({
                    "message": "Feedback submitted successfully for appointment!",
                    "feedback_rating": booking.feedback_rating,
                    "feedback_text": booking.feedback_text,
                    "feedback_submitted_at": booking.feedback_submitted_at
                }, status=status.HTTP_200_OK)

            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        rating = request.data.get("rating") or request.data.get("feedback_rating")
        feedback_text = request.data.get("feedback_text") or request.data.get("message") or request.data.get("reply") or ""

        try:
            if rating:
                ticket.feedback_rating = int(rating)
            ticket.feedback_text = str(feedback_text).strip()
            ticket.feedback_submitted_at = timezone.now()
            ticket.save(update_fields=["feedback_rating", "feedback_text", "feedback_submitted_at"])

            # Broadcast update via WebSocket to update Operator & Branch Admin consoles live
            broadcast_queue_update(ticket.branch.id, ticket)

            return Response({
                "message": "Feedback and reply message submitted successfully!",
                "feedback_rating": ticket.feedback_rating,
                "feedback_text": ticket.feedback_text,
                "feedback_submitted_at": ticket.feedback_submitted_at
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PublicTrackingView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicBurstThrottle]

    def get(self, request, tracking_code):
        try:
            ticket = Ticket.all_objects.get(tracking_code=tracking_code)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)

        # Calculate position ahead in queue
        position = Ticket.all_objects.filter(
            branch=ticket.branch,
            service=ticket.service,
            status__in=["waiting", "called"],
            created_at__lt=ticket.created_at
        ).count()

        # Count active open desks serving this service
        active_desks = DeskService.objects.filter(
            service=ticket.service,
            desk__status="open",
            desk__is_active=True
        ).count()

        avg_mins = ticket.service.est_service_minutes if ticket.service else 15
        if active_desks > 0:
            eta = (position / active_desks) * avg_mins
            no_operator = False
        else:
            eta = position * avg_mins
            no_operator = True

        data = TicketSerializer(ticket).data.copy()
        # Strictly omit customer PII from public tracking endpoint response
        data.pop("customer_name", None)
        data.pop("customer_phone", None)
        data.pop("message", None)
        data.pop("note", None)
        data.pop("tracking_code", None) # strictly omit tracking code from output payload

        data["position"] = position
        data["estimated_wait_time"] = eta
        data["no_operator"] = no_operator

        return Response(data, status=status.HTTP_200_OK)

class PublicTicketDetailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicBurstThrottle]

    def get(self, request, ticket_id):
        from django.db.models import Q
        ticket = Ticket.objects.filter(
            Q(tracking_code=ticket_id) | Q(id=ticket_id if str(ticket_id).isdigit() else -1)
        ).first()

        if not ticket:
            from appointments.models import OnlineBooking
            booking = OnlineBooking.all_objects.filter(
                Q(booking_reference=ticket_id) | Q(id=ticket_id if str(ticket_id).isdigit() else -1)
            ).first()

            if booking:
                slot_str = str(booking.slot_time)[:5] if booking.slot_time else ""
                date_str = str(booking.date) if booking.date else ""
                return Response({
                    "id": str(booking.id),
                    "tracking_code": booking.booking_reference,
                    "branchId": str(booking.branch.id) if booking.branch else "",
                    "companyId": str(booking.branch.company.id) if (booking.branch and booking.branch.company) else "",
                    "serviceId": str(booking.service.id) if booking.service else "",
                    "serviceName": booking.service.name if booking.service else "General Service",
                    "branchName": booking.branch.name if booking.branch else "",
                    "deskId": None,
                    "deskLabel": "Appointment Counter",
                    "number": booking.booking_reference,
                    "customerName": booking.customer_name or "Valued Customer",
                    "customerPhoto": booking.customer_photo or "",
                    "customer_photo": booking.customer_photo or "",
                    "contact": booking.customer_phone or "",
                    "note": f"Appointment: {date_str} @ {slot_str}".strip(),
                    "status": booking.status or "confirmed",
                    "ahead": 0,
                    "eta": 0,
                    "joinedAt": int(booking.created_at.timestamp() * 1000) if booking.created_at else 0,
                    "calledAt": None,
                    "servedAt": None,
                    "isAppointment": True,
                    "appointmentDate": date_str,
                    "slotTime": slot_str,
                }, status=status.HTTP_200_OK)

            return Response({"error": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)

        if ticket.branch and ticket.created_at:
            ahead_kwargs = {
                "branch": ticket.branch,
                "status": "waiting",
                "created_at__lt": ticket.created_at
            }
            if ticket.service:
                ahead_kwargs["service"] = ticket.service
            ahead = Ticket.objects.filter(**ahead_kwargs).count()
        else:
            ahead = 0

        avg_mins = ticket.service.est_service_minutes if (ticket.service and ticket.service.est_service_minutes) else 15
        eta = round(ahead * avg_mins * 0.8) + (0 if ticket.status == "serving" else 2)

        return Response({
            "id": str(ticket.id),
            "tracking_code": ticket.tracking_code,
            "branchId": str(ticket.branch.id) if ticket.branch else "",
            "companyId": str(ticket.company.id) if ticket.company else (str(ticket.branch.company.id) if ticket.branch and ticket.branch.company else ""),
            "serviceId": str(ticket.service.id) if ticket.service else "",
            "serviceName": ticket.service.name if ticket.service else "General Service",
            "branchName": ticket.branch.name if ticket.branch else "",
            "deskId": str(ticket.desk.id) if ticket.desk else None,
            "deskLabel": ticket.desk.name if ticket.desk else None,
            "number": ticket.token_number,
            "customerName": ticket.customer_name or "Guest",
            "customerPhoto": ticket.customer_photo or "",
            "customer_photo": ticket.customer_photo or "",
            "contact": ticket.customer_phone or "",
            "note": ticket.message or "",
            "status": ticket.status,
            "ahead": ahead,
            "eta": eta,
            "joinedAt": int(ticket.created_at.timestamp() * 1000) if ticket.created_at else 0,
            "calledAt": int(ticket.called_at.timestamp() * 1000) if ticket.called_at else None,
            "servedAt": int(ticket.served_at.timestamp() * 1000) if ticket.served_at else None,
        }, status=status.HTTP_200_OK)

class PublicDisplayView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicBurstThrottle]

    def get(self, request, branch_id):
        from branches.models import Branch
        from queuing.models import Desk, Service, DeskService, QueueMethod

        # 1. Fetch branch and verify it exists
        branch = Branch.objects.filter(id=branch_id).first()
        if not branch:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

        # 2. Extract company branding
        company = branch.company
        from queuing.services.queue_routing import is_no_service_mode
        company_data = {
            "name": company.name,
            "logoUrl": company.logo_url or "",
            "brandColors": company.brand_colors or {"primary": "#6366F1"},
            "has_services_enabled": not is_no_service_mode(company)
        }

        # 3. Extract branch details
        # Resolve active QueueMethods and enabled methods list
        active_methods = list(
            QueueMethod.objects.filter(branch=branch, is_enabled=True)
            .values_list("method", flat=True)
        )
        active_methods = [int(m) for m in active_methods]
        
        active_walkin = 2  # Default fallback
        if 3 in active_methods:
            active_walkin = 3
        elif 2 in active_methods:
            active_walkin = 2
        elif 1 in active_methods:
            active_walkin = 1

        branch_data = {
            "id": str(branch.id),
            "companyId": str(company.id),
            "name": branch.name,
            "city": branch.city or "",
            "address": branch.address or "",
            "method": active_walkin,
            "enabledMethods": active_methods,
            "openHours": branch.operating_hours.get("display") or "09:00 – 18:00",
            "status": branch.status,
            "slug": branch.slug or ""
        }

        # 4. Extract active desks
        desks = Desk.objects.filter(branch=branch, is_active=True)
        desks_data = []
        for d in desks:
            service_ids = list(
                DeskService.objects.filter(desk=d).values_list("service_id", flat=True)
            )
            # Check if there is any active DeskStaffAssignment
            assignment = d.staff_assignments.filter(is_active=True).first()
            staff_id = str(assignment.user.id) if assignment else None
            
            desks_data.append({
                "id": str(d.id),
                "branchId": str(branch.id),
                "label": d.name,
                "serviceIds": [str(sid) for sid in service_ids],
                "staffId": staff_id,
                "status": d.status,
                "isActive": d.is_active
            })

        # 5. Extract active services
        services = Service.objects.filter(branch=branch, is_active=True)
        services_data = [{
            "id": str(s.id),
            "branchId": str(branch.id),
            "name": s.name,
            "prefix": s.prefix or "A",
            "avgMinutes": s.est_service_minutes
        } for s in services]

        # 6. Fetch active tickets (waiting, called, serving) with customer PII stripped
        tickets = Ticket.objects.filter(
            branch=branch,
            status__in=["waiting", "called", "serving"]
        ).order_by("created_at")

        serializer = TicketSerializer(tickets, many=True)
        clean_tickets = []
        for t in serializer.data:
            c = t.copy()
            cust_name = c.get("customer_name") or "Customer"
            c.pop("customer_phone", None)
            c.pop("customer_email", None)
            c.pop("message", None)
            c.pop("note", None)
            c.pop("tracking_code", None)
            # Map snake_case to camelCase expected by the React route
            clean_tickets.append({
                "id": str(c["id"]),
                "branchId": str(c["branch"]),
                "serviceId": str(c["service"]) if c.get("service") else "",
                "deskId": str(c["desk"]) if c.get("desk") else None,
                "predictedDeskId": str(c["predicted_desk"]) if c.get("predicted_desk") else None,
                "number": c["token_number"],
                "customerName": cust_name,
                "status": c["status"],
                "joinedAt": int(timezone.datetime.fromisoformat(c["created_at"].replace('Z', '+00:00')).timestamp() * 1000) if c.get("created_at") else 0,
                "calledAt": int(timezone.datetime.fromisoformat(c["called_at"].replace('Z', '+00:00')).timestamp() * 1000) if c.get("called_at") else None,
                "servedAt": int(timezone.datetime.fromisoformat(c["served_at"].replace('Z', '+00:00')).timestamp() * 1000) if c.get("served_at") else None
            })

        payload = {
            "branch": branch_data,
            "company": company_data,
            "desks": desks_data,
            "services": services_data,
            "tickets": clean_tickets
        }

        return Response(payload, status=status.HTTP_200_OK)

class PublicTicketCancelView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicSubmitThrottle]

    def patch(self, request, tracking_code):
        try:
            ticket = Ticket.objects.get(tracking_code=tracking_code)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)

        if ticket.status not in ["waiting", "called"]:
            return Response({"error": f"Cannot cancel ticket in status: {ticket.status}."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = ticket.status
        try:
            with transaction.atomic():
                # If spawned from booking, cancel the corresponding appointment & slot count
                if ticket.source == "booking" and ticket.scheduled_for:
                    from appointments.models import Appointment, AppointmentSlot
                    appointment = Appointment.objects.filter(
                        branch=ticket.branch,
                        service=ticket.service,
                        customer_name=ticket.customer_name,
                        slot_start=ticket.scheduled_for,
                        status="booked"
                    ).first()
                    if appointment:
                        appointment.status = "cancelled"
                        appointment.save()
                        # Decrement old slot count
                        try:
                            slot = AppointmentSlot.objects.select_for_update().get(
                                branch=appointment.branch,
                                service=appointment.service,
                                slot_start=appointment.slot_start
                            )
                            slot.booked_count = max(0, slot.booked_count - 1)
                            slot.save()
                        except AppointmentSlot.DoesNotExist:
                            pass

                # Cancel ticket
                ticket.status = "cancelled"
                ticket.closed_at = timezone.now()
                ticket.save()

                log_audit(
                    actor=None, # Public request, no actor
                    company=ticket.company,
                    branch=ticket.branch,
                    action="ticket_cancelled_public",
                    object_type="Ticket",
                    object_id=ticket.id,
                    changes={"old_status": old_status, "new_status": "cancelled"}
                )

                broadcast_queue_update(ticket.branch.id, ticket)

            return Response(TicketSerializer(ticket).data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class KotMessageTemplateViewSet(viewsets.ModelViewSet):
    queryset = KotMessageTemplate.objects.all()
    serializer_class = KotMessageTemplateSerializer
    permission_classes = [IsBranchAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return KotMessageTemplate.objects.none()
        if user.role == "super_admin":
            return KotMessageTemplate.objects.all()
        return KotMessageTemplate.objects.filter(company=user.company)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(company=user.company)

    def perform_update(self, serializer):
        user = self.request.user
        serializer.save(company=user.company)

class KotNotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = KotNotificationLog.objects.all()
    serializer_class = KotNotificationLogSerializer
    permission_classes = [IsBranchAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return KotNotificationLog.objects.none()
        if user.role == "super_admin":
            return KotNotificationLog.objects.all()
        qs = KotNotificationLog.objects.filter(company=user.company)
        branch_id = self.request.query_params.get("branch") or self.request.query_params.get("branch_id")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by("-created_at")

class OperatorAttendanceViewSet(viewsets.ModelViewSet):
    queryset = OperatorAttendance.objects.all()
    serializer_class = OperatorAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return OperatorAttendance.objects.none()
        
        if user.role == "super_admin":
            qs = OperatorAttendance.objects.all()
        else:
            qs = OperatorAttendance.objects.filter(company=user.company)
        
        branch_id = self.request.query_params.get("branch") or self.request.query_params.get("branch_id")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        user_id = self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        date_param = self.request.query_params.get("date")
        if date_param:
            qs = qs.filter(check_in_time__date=date_param)

        return qs.order_by("-check_in_time")

    @action(detail=False, methods=["get"], url_path="active")
    def active_attendance(self, request):
        user = request.user
        branch_id = request.query_params.get("branch") or request.query_params.get("branch_id")
        
        qs = OperatorAttendance.objects.filter(
            user=user,
            status__in=["checked_in", "on_break"]
        )
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
            
        attendance = qs.order_by("-check_in_time").first()
        if not attendance:
            return Response({"active": False, "attendance": None})
            
        return Response({
            "active": True,
            "attendance": OperatorAttendanceSerializer(attendance).data
        })

    @action(detail=False, methods=["post"], url_path="check-in")
    def check_in(self, request):
        user = request.user
        branch_id = request.data.get("branch_id") or request.data.get("branch")
        desk_id = request.data.get("desk_id") or request.data.get("desk")

        if not branch_id:
            return Response({"error": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        from branches.models import Branch
        try:
            branch = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

        desk = None
        if desk_id:
            try:
                desk = Desk.objects.get(id=desk_id, branch=branch)
            except Desk.DoesNotExist:
                pass

        active_session = OperatorAttendance.objects.filter(
            user=user,
            branch=branch,
            status__in=["checked_in", "on_break"]
        ).first()

        if active_session:
            if desk and active_session.desk != desk:
                active_session.desk = desk
                active_session.save()
            return Response(OperatorAttendanceSerializer(active_session).data, status=status.HTTP_200_OK)

        with transaction.atomic():
            attendance = OperatorAttendance.objects.create(
                user=user,
                branch=branch,
                company=branch.company,
                desk=desk,
                status="checked_in",
                check_in_time=timezone.now()
            )

            if desk:
                desk.status = "open"
                desk.current_operator = user
                desk.save()
                channel_layer = get_channel_layer()
                if channel_layer:
                    payload = {"type": "queue.update", "event": "desk_updated", "data": DeskSerializer(desk).data}
                    async_to_sync(channel_layer.group_send)(f"branch_{branch.id}_staff", payload)
                    async_to_sync(channel_layer.group_send)(f"branch_{branch.id}_public", payload)

        return Response(OperatorAttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="break-start")
    def break_start(self, request):
        user = request.user
        reason = request.data.get("reason", "Tea / Lunch Break")
        attendance_id = request.data.get("attendance_id")
        desk_id = request.data.get("desk_id") or request.data.get("desk")

        if attendance_id:
            attendance = OperatorAttendance.objects.filter(id=attendance_id, user=user).first()
        else:
            attendance = OperatorAttendance.objects.filter(user=user, status__in=["checked_in", "on_break"]).order_by("-check_in_time").first()

        if not attendance:
            return Response({"error": "No active check-in session found to start break."}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve target desk if missing
        if desk_id and not attendance.desk:
            try:
                attendance.desk = Desk.objects.get(id=desk_id)
            except Desk.DoesNotExist:
                pass
        if not attendance.desk:
            assignment = user.desk_assignments.filter(is_active=True).first()
            if assignment:
                attendance.desk = assignment.desk

        if attendance.status == "on_break":
            if attendance.desk and attendance.desk.status != "break":
                attendance.desk.status = "break"
                attendance.desk.save()
                channel_layer = get_channel_layer()
                if channel_layer:
                    payload = {"type": "queue.update", "event": "desk_updated", "data": DeskSerializer(attendance.desk).data}
                    async_to_sync(channel_layer.group_send)(f"branch_{attendance.branch.id}_staff", payload)
                    async_to_sync(channel_layer.group_send)(f"branch_{attendance.branch.id}_public", payload)
            return Response(OperatorAttendanceSerializer(attendance).data, status=status.HTTP_200_OK)

        now = timezone.now()
        with transaction.atomic():
            attendance.status = "on_break"
            attendance.break_start_time = now
            attendance.save()

            OperatorBreakLog.objects.create(
                attendance=attendance,
                break_start=now,
                reason=reason
            )

            if attendance.desk:
                attendance.desk.status = "break"
                attendance.desk.save()
                channel_layer = get_channel_layer()
                if channel_layer:
                    payload = {"type": "queue.update", "event": "desk_updated", "data": DeskSerializer(attendance.desk).data}
                    async_to_sync(channel_layer.group_send)(f"branch_{attendance.branch.id}_staff", payload)
                    async_to_sync(channel_layer.group_send)(f"branch_{attendance.branch.id}_public", payload)

        return Response(OperatorAttendanceSerializer(attendance).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="break-end")
    def break_end(self, request):
        user = request.user
        attendance_id = request.data.get("attendance_id")
        desk_id = request.data.get("desk_id") or request.data.get("desk")

        if attendance_id:
            attendance = OperatorAttendance.objects.filter(id=attendance_id, user=user).first()
        else:
            attendance = OperatorAttendance.objects.filter(user=user, status="on_break").order_by("-check_in_time").first()

        if not attendance:
            return Response({"error": "No active break session found to end."}, status=status.HTTP_400_BAD_REQUEST)

        if desk_id and not attendance.desk:
            try:
                attendance.desk = Desk.objects.get(id=desk_id)
            except Desk.DoesNotExist:
                pass

        now = timezone.now()
        with transaction.atomic():
            active_break = attendance.breaks.filter(break_end__isnull=True).order_by("-break_start").first()
            duration = 0
            if active_break:
                duration = max(0, int((now - active_break.break_start).total_seconds()))
                active_break.break_end = now
                active_break.duration_seconds = duration
                active_break.save()
            elif attendance.break_start_time:
                duration = max(0, int((now - attendance.break_start_time).total_seconds()))

            attendance.status = "checked_in"
            attendance.total_break_seconds += duration
            attendance.break_count += 1
            attendance.break_start_time = None
            attendance.save()

            if attendance.desk:
                attendance.desk.status = "open"
                attendance.desk.save()
                channel_layer = get_channel_layer()
                if channel_layer:
                    payload = {"type": "queue.update", "event": "desk_updated", "data": DeskSerializer(attendance.desk).data}
                    async_to_sync(channel_layer.group_send)(f"branch_{attendance.branch.id}_staff", payload)
                    async_to_sync(channel_layer.group_send)(f"branch_{attendance.branch.id}_public", payload)

        return Response(OperatorAttendanceSerializer(attendance).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="check-out")
    def check_out(self, request):
        user = request.user
        attendance_id = request.data.get("attendance_id")
        desk_id = request.data.get("desk_id") or request.data.get("desk")
        notes = request.data.get("notes", "")

        if attendance_id:
            attendance = OperatorAttendance.objects.filter(id=attendance_id, user=user).first()
        else:
            attendance = OperatorAttendance.objects.filter(user=user, status__in=["checked_in", "on_break"]).order_by("-check_in_time").first()

        if not attendance:
            return Response({"error": "No active check-in session found to check out."}, status=status.HTTP_400_BAD_REQUEST)

        if desk_id and not attendance.desk:
            try:
                attendance.desk = Desk.objects.get(id=desk_id)
            except Desk.DoesNotExist:
                pass

        now = timezone.now()
        with transaction.atomic():
            if attendance.status == "on_break":
                active_break = attendance.breaks.filter(break_end__isnull=True).order_by("-break_start").first()
                if active_break:
                    duration = max(0, int((now - active_break.break_start).total_seconds()))
                    active_break.break_end = now
                    active_break.duration_seconds = duration
                    active_break.save()
                    attendance.total_break_seconds += duration
                    attendance.break_count += 1

            attendance.status = "checked_out"
            attendance.check_out_time = now
            if notes:
                attendance.notes = notes
            attendance.save()

            if attendance.desk:
                attendance.desk.status = "offline"
                if attendance.desk.current_operator == user:
                    attendance.desk.current_operator = None
                attendance.desk.save()
                channel_layer = get_channel_layer()
                if channel_layer:
                    payload = {"type": "queue.update", "event": "desk_updated", "data": DeskSerializer(attendance.desk).data}
                    async_to_sync(channel_layer.group_send)(f"branch_{attendance.branch.id}_staff", payload)
                    async_to_sync(channel_layer.group_send)(f"branch_{attendance.branch.id}_public", payload)

        return Response(OperatorAttendanceSerializer(attendance).data, status=status.HTTP_200_OK)
