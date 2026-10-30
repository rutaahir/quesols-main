from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from core.permissions import IsBranchAdmin, IsBranchAdminOnly

from branches.models import Branch
from queuing.models import Service, Ticket, QueueMethod
from queuing.views import broadcast_queue_update
from kot.models import Printer, KotPrintJob
from kot.serializers import PrinterSerializer, KotPrintJobSerializer
from notifications.tasks import dispatch_notification

class KioskJoinView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        branch_id = request.data.get("branch_id")
        service_id = request.data.get("service_id")
        customer_name = request.data.get("customer_name") or "Kiosk Guest"

        if not branch_id or not service_id:
            return Response({"error": "Branch ID and Service ID are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            branch = Branch.objects.get(id=branch_id)
            service = Service.objects.get(id=service_id, branch=branch)
        except (Branch.DoesNotExist, Service.DoesNotExist):
            return Response({"error": "Invalid branch or service."}, status=status.HTTP_400_BAD_REQUEST)

        qm = QueueMethod.objects.filter(branch=branch, is_enabled=True).first()
        numbering_style = qm.config.get("numbering_style", "sequential") if qm else "sequential"

        try:
            with transaction.atomic():
                from queuing.models import TokenSequence
                next_seq = TokenSequence.get_unique_token_number(branch, prefix=service.prefix if numbering_style == "prefix" else "")
                token_number = str(next_seq)

                ticket = Ticket.objects.create(
                    branch=branch,
                    company=branch.company,
                    service=service,
                    method="2",
                    token_number=token_number,
                    customer_name=customer_name,
                    source="kiosk",
                    source_method="KOT_PRINT",
                    status="waiting"
                )

                # Get first branch printer to assign print job
                printer = Printer.objects.filter(branch=branch).first()
                if printer:
                    KotPrintJob.objects.create(
                        ticket=ticket,
                        printer=printer,
                        status="queued"
                    )

                # Broadcast live updates to operators
                broadcast_queue_update(branch.id, ticket)

                return Response({
                    "id": ticket.id,
                    "token_number": ticket.token_number,
                    "customer_name": ticket.customer_name,
                    "service_name": service.name,
                    "source": ticket.source
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PrinterHeartbeatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        printer_id = request.data.get("printer_id")
        status_val = request.data.get("status")

        if not printer_id or not status_val:
            return Response({"error": "printer_id and status are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            printer = Printer.objects.get(id=printer_id)
            printer.last_status = status_val
            printer.last_checked_at = timezone.now()
            printer.save()

            if status_val == "offline":
                # Trigger Notification for branch/company admins
                from accounts.models import User
                branch_admins = User.objects.filter(company=printer.company, role="branch_admin", branch=printer.branch)
                for admin in branch_admins:
                    dispatch_notification(
                        user=admin,
                        company=printer.company,
                        branch=printer.branch,
                        trigger_type="device_offline",
                        title="Printer Offline Alert",
                        body=f"The printer '{printer.name}' is currently offline."
                    )

            return Response({"message": "Heartbeat updated successfully."}, status=status.HTTP_200_OK)
        except Printer.DoesNotExist:
            return Response({"error": "Printer not found."}, status=status.HTTP_404_NOT_FOUND)

class PrinterJobsView(APIView):
    permission_classes = [AllowAny]

    def get_authenticated_printer(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("PrinterToken "):
            return None
        token_str = auth_header.split(" ")[1]
        try:
            return Printer.objects.get(token=token_str)
        except Printer.DoesNotExist:
            return None

    def get(self, request):
        printer = self.get_authenticated_printer(request)
        if not printer:
            return Response({"error": "Device token authorization required."}, status=status.HTTP_401_UNAUTHORIZED)

        jobs = KotPrintJob.objects.filter(printer=printer, status="queued").order_by("created_at")
        return Response(KotPrintJobSerializer(jobs, many=True).data, status=status.HTTP_200_OK)

class PrinterJobCompleteView(APIView):
    permission_classes = [AllowAny]

    def get_authenticated_printer(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("PrinterToken "):
            return None
        token_str = auth_header.split(" ")[1]
        try:
            return Printer.objects.get(token=token_str)
        except Printer.DoesNotExist:
            return None

    def post(self, request, job_id):
        printer = self.get_authenticated_printer(request)
        if not printer:
            return Response({"error": "Device token authorization required."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            job = KotPrintJob.objects.get(id=job_id, printer=printer)
            job.status = "printed"
            job.printed_at = timezone.now()
            job.save()
            return Response({"message": "Job printed successfully."}, status=status.HTTP_200_OK)
        except KotPrintJob.DoesNotExist:
            return Response({"error": "Print job not found for this device."}, status=status.HTTP_404_NOT_FOUND)

class PrinterViewSet(viewsets.ModelViewSet):
    queryset = Printer.objects.all()
    serializer_class = PrinterSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBranchAdminOnly()]
        return [IsBranchAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role == "super_admin":
            return Printer.objects.all()
        return Printer.objects.filter(company=user.company)

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        from billing.models import CompanyPlanAllocation
        from django.db.models import Sum

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
            raise ValidationError("You must specify a valid branch to create printers.")

        # Enforce kiosks branch-scoped plan limit
        alloc = CompanyPlanAllocation.objects.filter(company=company, branch=branch, plan_component__key="paper_roll_screens").first()
        if alloc:
            purchased_qty = alloc.purchased_qty
            current_total = Printer.objects.filter(branch=branch).count()
            limit_msg = f"Branch plan limit reached ({purchased_qty} kiosks allocated for this branch). Please purchase an add-on."
        else:
            # Fallback to company-wide pooled limit (legacy fallback)
            res = CompanyPlanAllocation.objects.filter(company=company, plan_component__key="paper_roll_screens").aggregate(total=Sum('purchased_qty'))
            purchased_qty = res['total'] if res['total'] is not None else 1
            current_total = Printer.objects.filter(company=company).count()
            limit_msg = f"Plan limit reached ({purchased_qty} kiosks allocated). Please purchase an add-on."

        if current_total >= purchased_qty:
            raise ValidationError({
                "limit_reached": True,
                "message": limit_msg
            })

        serializer.save(company=company, branch=branch)

import uuid
import random
from django.core.cache import cache
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from kot.models import Kiosk
from kot.serializers import KioskSerializer, PublicKioskSerializer

class KioskViewSet(viewsets.ModelViewSet):
    serializer_class = KioskSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "check_username"]:
            return [IsBranchAdmin()]
        return [IsBranchAdminOnly()]

    @action(detail=False, methods=["get"], url_path="check-username")
    def check_username(self, request):
        username = (request.query_params.get("username") or "").strip().lower()
        exclude_id = request.query_params.get("exclude_id")
        branch_id = request.query_params.get("branch_id") or request.query_params.get("branch")

        if not username:
            return Response({"available": False, "message": "Username cannot be empty."}, status=status.HTTP_200_OK)

        if len(username) < 2:
            return Response({"available": False, "message": "Username must be at least 2 characters."}, status=status.HTTP_200_OK)

        import re
        if not re.match(r'^[a-z0-9_-]+$', username):
            return Response({"available": False, "message": "Username can only contain lowercase letters, numbers, hyphens, and underscores."}, status=status.HTTP_200_OK)

        user = request.user
        qs = Kiosk.all_objects.all()

        if branch_id and str(branch_id).lower() not in ["undefined", "null", "none"]:
            if str(branch_id).isdigit():
                qs = qs.filter(branch_id=int(branch_id))
            else:
                qs = qs.filter(branch__slug=branch_id)
        elif getattr(user, "company", None):
            qs = qs.filter(company=user.company)

        if exclude_id and str(exclude_id).isdigit():
            qs = qs.exclude(id=int(exclude_id))

        taken = qs.filter(username__iexact=username).exists()
        if taken:
            return Response({"available": False, "message": f"Username '{username}' is already taken in this branch."}, status=status.HTTP_200_OK)

        return Response({"available": True, "message": f"Username '{username}' is available!"}, status=status.HTTP_200_OK)

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Kiosk.objects.none()
        if user.role == "super_admin":
            return Kiosk.objects.all()
        if user.role == "branch_admin":
            return Kiosk.objects.filter(company=user.company, branch=user.branch)
        return Kiosk.objects.filter(company=user.company)

    def perform_create(self, serializer):
        user = self.request.user
        company = getattr(user, "company", None)
        branch = serializer.validated_data.get("branch") or getattr(user, "branch", None)
        if not branch:
            branch_id = self.request.data.get("branch") or self.request.data.get("branch_id")
            if branch_id:
                from branches.models import Branch
                branch = Branch.objects.filter(id=branch_id).first()

        if not branch:
            raise ValidationError("You must specify a branch to create a kiosk.")

        if not company:
            company = branch.company

        # If a kiosk with same identifier already exists in this branch, reactivate or inform
        kiosk_identifier = serializer.validated_data.get("kiosk_identifier", "").strip()
        existing_kiosk = Kiosk.objects.filter(branch=branch, kiosk_identifier__iexact=kiosk_identifier).first()
        if existing_kiosk:
            if existing_kiosk.status != "active":
                existing_kiosk.status = "active"
                if serializer.validated_data.get("pin"):
                    existing_kiosk.pin = serializer.validated_data.get("pin")
                existing_kiosk.save()
                serializer.instance = existing_kiosk
                return
            else:
                raise ValidationError(f"A kiosk with the name '{kiosk_identifier}' already exists in this branch. Please choose a different name.")

        # Determine quota from branch allocations, pooled company allocations, or fallback
        from billing.models import CompanyPlanAllocation
        alloc = CompanyPlanAllocation.objects.filter(
            company=company, branch=branch, plan_component__key__in=["paper_roll_screens", "kiosks"]
        ).first()
        if alloc and alloc.purchased_qty is not None and alloc.purchased_qty > 0:
            quota = alloc.purchased_qty
        else:
            comp_alloc = CompanyPlanAllocation.objects.filter(
                company=company, branch__isnull=True, plan_component__key__in=["paper_roll_screens", "kiosks"]
            ).first()
            if comp_alloc and comp_alloc.purchased_qty is not None and comp_alloc.purchased_qty > 0:
                quota = comp_alloc.purchased_qty
            else:
                from django.db.models import Sum
                res = CompanyPlanAllocation.objects.filter(
                    company=company, plan_component__key__in=["paper_roll_screens", "kiosks"]
                ).aggregate(total=Sum('purchased_qty'))
                if res['total'] is not None and res['total'] > 0:
                    quota = res['total']
                else:
                    pkg = None
                    try:
                        pkg = getattr(company, "package", None)
                    except Exception:
                        pkg = None
                    quota = getattr(pkg, "max_kiosks", 2) if pkg else 2

        username = (serializer.validated_data.get("username") or self.request.data.get("username") or "").strip().lower()
        if username and Kiosk.all_objects.filter(branch=branch, username__iexact=username).exists():
            raise ValidationError(f"Username '{username}' is already in use by another kiosk in this branch.")

        current_count = Kiosk.objects.filter(branch=branch, status="active").count()
        if current_count >= quota:
            raise ValidationError(f"Plan limit reached: you cannot create more than {quota} active kiosks for this branch. Please purchase an add-on.")

        serializer.save(company=company, branch=branch)

    @action(detail=True, methods=["post"], url_path="regenerate-pin")
    def regenerate_pin(self, request, pk=None):
        kiosk = self.get_object()
        
        # Generate new random 4-digit PIN
        new_pin = "".join(str(random.randint(0, 9)) for _ in range(4))
        kiosk.pin = new_pin
        
        # Evict any active session
        old_token = kiosk.session_token
        kiosk.session_token = None
        kiosk.connected_at = None
        kiosk.last_seen = None
        kiosk.save()

        if old_token:
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"kiosk_{kiosk.id}",
                        {
                            "type": "kiosk.force_logout",
                            "session_token": "evicted_by_admin"
                        }
                    )
                except Exception as e:
                    print(f"Failed to send force logout broadcast: {e}")

        return Response(KioskSerializer(kiosk).data, status=status.HTTP_200_OK)

class PublicKioskListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id")
        if not branch_id:
            return Response({"error": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        kiosks = Kiosk.objects.filter(branch_id=branch_id, status="active").order_by("kiosk_identifier")
        return Response(PublicKioskSerializer(kiosks, many=True).data, status=status.HTTP_200_OK)

class KioskLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        kiosk_id = request.data.get("kiosk_id")
        branch_id = request.data.get("branch_id")
        username = (request.data.get("username") or "").strip()
        pin = str(request.data.get("pin") or "").strip()

        if not pin:
            return Response({"error": "PIN is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not username and not kiosk_id:
            return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup kiosk
        kiosk = None
        if kiosk_id:
            try:
                kiosk = Kiosk.objects.get(id=kiosk_id, status="active")
            except Kiosk.DoesNotExist:
                return Response({"error": "Kiosk terminal not found or inactive."}, status=status.HTTP_404_NOT_FOUND)
        elif branch_id and username:
            kiosk = Kiosk.objects.filter(branch_id=branch_id, username__iexact=username, status="active").first()
            if not kiosk:
                kiosk = Kiosk.objects.filter(branch_id=branch_id, kiosk_identifier__iexact=username, status="active").first()
        elif username:
            kiosk = Kiosk.objects.filter(username__iexact=username, status="active").first()

        if not kiosk:
            return Response({"error": "No active kiosk terminal found matching this username."}, status=status.HTTP_404_NOT_FOUND)

        # Scoped failed attempts lockout key
        lockout_key = f"kiosk_lockout_{kiosk.id}"
        cooldown_key = f"kiosk_cooldown_{kiosk.id}"

        # Check cooldown
        if cache.get(cooldown_key):
            return Response({
                "error": "Too many failed attempts. Please try again after 60 seconds."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Validate username match if both provided
        if username and kiosk.username and kiosk.username.lower() != username.lower():
            if kiosk.kiosk_identifier.lower() != username.lower():
                fails = cache.get(lockout_key, 0) + 1
                cache.set(lockout_key, fails, timeout=300)
                return Response({"error": "Invalid username or PIN."}, status=status.HTTP_400_BAD_REQUEST)

        if str(kiosk.pin).strip() == pin:
            current_token = request.data.get("session_token")
            if kiosk.is_session_active() and kiosk.session_token != current_token:
                return Response({
                    "error": f"'{kiosk.kiosk_identifier}' is currently active on another device. Please log out or close it on the other device first."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Reset fails
            cache.delete(lockout_key)

            # Generate new session token
            new_session_token = str(uuid.uuid4())
            kiosk.session_token = new_session_token
            kiosk.connected_at = timezone.now()
            kiosk.last_seen = timezone.now()
            kiosk.save()

            # Evict any other active session
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"kiosk_{kiosk.id}",
                        {
                            "type": "kiosk.force_logout",
                            "session_token": new_session_token
                        }
                    )
                except Exception as e:
                    print(f"Eviction failed: {e}")

            return Response({
                "session_token": new_session_token,
                "kiosk_id": str(kiosk.id),
                "kiosk_identifier": kiosk.kiosk_identifier,
                "username": kiosk.username,
            }, status=status.HTTP_200_OK)
        else:
            # Increment failed attempts
            fails = cache.get(lockout_key, 0) + 1
            cache.set(lockout_key, fails, timeout=300) # 5 minutes lockout tracking window
            
            if fails >= 5:
                # Lock out kiosk for 60 seconds
                cache.set(cooldown_key, True, timeout=60)
                cache.delete(lockout_key)
                return Response({
                    "error": "Too many failed attempts. Please try again after 60 seconds."
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            return Response({"error": f"Invalid username or PIN. {5 - fails} attempts remaining."}, status=status.HTTP_400_BAD_REQUEST)

class KioskLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        kiosk_id = request.data.get("kiosk_id")
        session_token = request.data.get("session_token")

        if not kiosk_id:
            return Response({"error": "kiosk_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            kiosk = None
            if session_token:
                kiosk = Kiosk.objects.filter(id=kiosk_id, session_token=session_token).first()
            if not kiosk:
                kiosk = Kiosk.objects.filter(id=kiosk_id).first()

            if kiosk:
                kiosk.session_token = None
                kiosk.connected_at = None
                kiosk.last_seen = None
                kiosk.save()
                return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)
            return Response({"error": "Kiosk not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


from kot.models import KotTerminal
from kot.serializers import KotTerminalSerializer, PublicKotTerminalSerializer

class KotTerminalViewSet(viewsets.ModelViewSet):
    serializer_class = KotTerminalSerializer
    permission_classes = [IsBranchAdmin]

    @action(detail=False, methods=["get"], url_path="check-username")
    def check_username(self, request):
        username = (request.query_params.get("username") or "").strip().lower()
        exclude_id = request.query_params.get("exclude_id")
        branch_id = request.query_params.get("branch_id") or request.query_params.get("branch")

        if not username:
            return Response({"available": False, "message": "Username cannot be empty."}, status=status.HTTP_200_OK)

        if len(username) < 2:
            return Response({"available": False, "message": "Username must be at least 2 characters."}, status=status.HTTP_200_OK)

        import re
        if not re.match(r'^[a-z0-9_-]+$', username):
            return Response({"available": False, "message": "Username can only contain lowercase letters, numbers, hyphens, and underscores."}, status=status.HTTP_200_OK)

        user = request.user
        qs = KotTerminal.all_objects.all()

        if branch_id and str(branch_id).lower() not in ["undefined", "null", "none"]:
            if str(branch_id).isdigit():
                qs = qs.filter(branch_id=int(branch_id))
            else:
                qs = qs.filter(branch__slug=branch_id)
        elif getattr(user, "company", None):
            qs = qs.filter(company=user.company)

        if exclude_id and str(exclude_id).isdigit():
            qs = qs.exclude(id=int(exclude_id))

        taken = qs.filter(username__iexact=username).exists()
        if taken:
            return Response({"available": False, "message": f"Username '{username}' is already taken in this branch."}, status=status.HTTP_200_OK)

        return Response({"available": True, "message": f"Username '{username}' is available!"}, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        branch_id = request.query_params.get("branch_id") or request.query_params.get("branch")
        if branch_id and str(branch_id).lower() not in ["undefined", "null", "none"]:
            from branches.models import Branch
            from kot.provisioning import provision_kot_terminals_for_branch
            try:
                if str(branch_id).isdigit():
                    branch = Branch.objects.get(id=branch_id)
                else:
                    branch = Branch.objects.get(slug=branch_id, company=request.user.company)
                provision_kot_terminals_for_branch(branch)
            except Exception as e:
                print(f"Failed to auto-provision KOT terminals for branch {branch_id}: {e}")
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        qs = KotTerminal.all_objects.none()
        if getattr(user, "role", None) == "super_admin":
            qs = KotTerminal.all_objects.all()
        elif getattr(user, "role", None) in ["company_admin", "branch_admin"] or (hasattr(user, "company") and user.company):
            qs = KotTerminal.all_objects.filter(company=user.company)

        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id and str(branch_id).lower() not in ["undefined", "null", "none"]:
            if str(branch_id).isdigit():
                qs = qs.filter(branch_id=branch_id)
            else:
                qs = qs.filter(branch__slug=branch_id)
        elif getattr(user, "role", None) == "branch_admin" and getattr(user, "branch_id", None):
            qs = qs.filter(branch_id=user.branch_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        branch = serializer.validated_data.get("branch")
        if not branch:
            branch_id = self.request.data.get("branch") or self.request.data.get("branch_id")
            if branch_id and str(branch_id).lower() not in ["undefined", "null", "none"]:
                from branches.models import Branch
                if str(branch_id).isdigit():
                    branch = Branch.objects.filter(id=branch_id, company=user.company).first()
                else:
                    branch = Branch.objects.filter(slug=branch_id, company=user.company).first()

        if not branch:
            raise ValidationError("You must specify a valid branch to create a KOT terminal.")
        
        current_count = KotTerminal.all_objects.filter(branch=branch, status="active").count()
        
        from billing.models import CompanyPlanAllocation, PlanComponent
        alloc = CompanyPlanAllocation.objects.filter(
            company=user.company, branch=branch, plan_component__key="kot_terminals"
        ).first()
        if alloc and alloc.purchased_qty > 0:
            quota = alloc.purchased_qty
        else:
            comp_alloc = CompanyPlanAllocation.objects.filter(
                company=user.company, branch__isnull=True, plan_component__key="kot_terminals"
            ).first()
            if comp_alloc and comp_alloc.purchased_qty > 0:
                quota = comp_alloc.purchased_qty
            else:
                pc = PlanComponent.objects.filter(key="kot_terminals", is_active=True).first()
                quota = pc.default_included_qty if pc else 1

        if current_count >= quota:
            raise ValidationError(f"Plan limit reached: you cannot create more than {quota} active KOT terminals.")

        # If an inactive terminal exists for this branch, reactivate it
        inactive_term = KotTerminal.all_objects.filter(branch=branch, status="inactive").order_by("id").first()
        if inactive_term:
            inactive_term.status = "active"
            if not inactive_term.pin:
                inactive_term.pin = "".join(str(random.randint(0, 9)) for _ in range(4))
            inactive_term.save()
            serializer.instance = inactive_term
            return

        # Ensure terminal_identifier does not conflict with existing ones
        requested_identifier = serializer.validated_data.get("terminal_identifier")
        existing_identifiers = set(KotTerminal.all_objects.filter(branch=branch).values_list("terminal_identifier", flat=True))

        if not requested_identifier or requested_identifier in existing_identifiers:
            next_num = 1
            while f"KOT {next_num}" in existing_identifiers:
                next_num += 1
            requested_identifier = f"KOT {next_num}"

        username = (serializer.validated_data.get("username") or self.request.data.get("username") or "").strip().lower()
        if username and KotTerminal.all_objects.filter(branch=branch, username__iexact=username).exists():
            raise ValidationError(f"Username '{username}' is already in use by another KOT terminal in this branch.")

        pin = serializer.validated_data.get("pin") or "".join(str(random.randint(0, 9)) for _ in range(4))
        serializer.save(company=user.company, branch=branch, terminal_identifier=requested_identifier, pin=pin)

    @action(detail=True, methods=["post"], url_path="regenerate-pin")
    def regenerate_pin(self, request, pk=None):
        terminal = self.get_object()
        
        new_pin = "".join(str(random.randint(0, 9)) for _ in range(4))
        terminal.pin = new_pin
        
        old_token = terminal.session_token
        terminal.session_token = None
        terminal.connected_at = None
        terminal.last_seen = None
        terminal.save()

        if old_token:
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"kot_{terminal.id}",
                        {
                            "type": "kot.force_logout",
                            "session_token": "evicted_by_admin"
                        }
                    )
                except Exception as e:
                    print(f"Failed to send force logout broadcast: {e}")

        return Response(KotTerminalSerializer(terminal).data, status=status.HTTP_200_OK)

class PublicKotTerminalListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id")
        if not branch_id:
            return Response({"error": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        from branches.models import Branch
        from kot.provisioning import provision_kot_terminals_for_branch
        try:
            branch = Branch.objects.get(id=branch_id)
            provision_kot_terminals_for_branch(branch)
        except Exception:
            pass

        terminals = KotTerminal.all_objects.filter(branch_id=branch_id, status="active").order_by("id")
        return Response(PublicKotTerminalSerializer(terminals, many=True).data, status=status.HTTP_200_OK)

class KotTerminalLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        terminal_id = request.data.get("terminal_id") or request.data.get("kot_id")
        branch_id = request.data.get("branch_id")
        username = (request.data.get("username") or "").strip()
        pin = str(request.data.get("pin") or "").strip()

        if not pin:
            return Response({"error": "PIN is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not username and not terminal_id:
            return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup terminal
        terminal = None
        if terminal_id:
            try:
                terminal = KotTerminal.objects.get(id=terminal_id, status="active")
            except KotTerminal.DoesNotExist:
                return Response({"error": "KOT terminal not found or inactive."}, status=status.HTTP_404_NOT_FOUND)
        elif branch_id and username:
            terminal = KotTerminal.objects.filter(branch_id=branch_id, username__iexact=username, status="active").first()
            if not terminal:
                terminal = KotTerminal.objects.filter(branch_id=branch_id, terminal_identifier__iexact=username, status="active").first()
        elif username:
            terminal = KotTerminal.objects.filter(username__iexact=username, status="active").first()

        if not terminal:
            return Response({"error": "No active KOT terminal found matching this username."}, status=status.HTTP_404_NOT_FOUND)

        lockout_key = f"kot_lockout_{terminal.id}"
        cooldown_key = f"kot_cooldown_{terminal.id}"

        if cache.get(cooldown_key):
            return Response({
                "error": "Too many failed attempts. Please try again after 60 seconds."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Validate username match if provided
        if username and terminal.username and terminal.username.lower() != username.lower():
            if terminal.terminal_identifier.lower() != username.lower():
                fails = cache.get(lockout_key, 0) + 1
                cache.set(lockout_key, fails, timeout=300)
                return Response({"error": "Invalid username or PIN."}, status=status.HTTP_400_BAD_REQUEST)

        if str(terminal.pin).strip() == pin:
            cache.delete(lockout_key)

            new_session_token = str(uuid.uuid4())
            terminal.session_token = new_session_token
            terminal.connected_at = timezone.now()
            terminal.last_seen = timezone.now()
            terminal.save()

            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"kot_{terminal.id}",
                        {
                            "type": "kot.force_logout",
                            "session_token": new_session_token
                        }
                    )
                except Exception as e:
                    print(f"Eviction failed: {e}")

            return Response({
                "session_token": new_session_token,
                "terminal_id": str(terminal.id),
                "terminal_identifier": terminal.terminal_identifier,
                "username": terminal.username or "",
            }, status=status.HTTP_200_OK)
        else:
            fails = cache.get(lockout_key, 0) + 1
            cache.set(lockout_key, fails, timeout=300)
            
            if fails >= 5:
                cache.set(cooldown_key, True, timeout=60)
                cache.delete(lockout_key)
                return Response({
                    "error": "Too many failed attempts. Please try again after 60 seconds."
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            return Response({"error": f"Invalid PIN. {5 - fails} attempts remaining."}, status=status.HTTP_400_BAD_REQUEST)

class KotTerminalLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        terminal_id = request.data.get("terminal_id") or request.data.get("kot_id") or request.data.get("kiosk_id")
        session_token = request.data.get("session_token")

        if not terminal_id:
            return Response({"error": "terminal_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            terminal = None
            if session_token:
                terminal = KotTerminal.objects.filter(id=terminal_id, session_token=session_token).first()
            if not terminal:
                terminal = KotTerminal.objects.filter(id=terminal_id).first()

            if terminal:
                terminal.session_token = None
                terminal.connected_at = None
                terminal.last_seen = None
                terminal.save()
                return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)
            return Response({"error": "KOT terminal not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

