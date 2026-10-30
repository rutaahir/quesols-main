import secrets
import random
from django.utils import timezone
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from display.models import DisplayTerminal, DisplayTerminalSlot
from display.serializers import (
    DisplayTerminalSerializer,
    PublicDisplayTerminalSerializer,
    DisplayTerminalSlotSerializer,
)


class PublicDisplayTerminalListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id")
        if not branch_id:
            return Response({"error": "branch_id parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        terminals = DisplayTerminal.objects.filter(branch_id=branch_id, status="active").order_by("terminal_identifier")

        # Auto-provision default slots for terminals that have no slots
        for terminal in terminals:
            if not terminal.slots.exists():
                self._auto_provision_default_slot(terminal)

        return Response(PublicDisplayTerminalSerializer(terminals, many=True).data, status=status.HTTP_200_OK)

    def _auto_provision_default_slot(self, terminal):
        """Create one default slot containing all branch desks if none exist."""
        try:
            from queuing.models import Desk
            branch_desks = Desk.objects.filter(branch=terminal.branch)
            if branch_desks.exists():
                slot = DisplayTerminalSlot.objects.create(terminal=terminal, order=1)
                slot.desks.set(branch_desks)
                slot.save()
        except Exception as e:
            print(f"Auto-provision slot error for terminal {terminal.id}: {e}")


class PublicDisplayDataView(APIView):
    """Returns desks, services and active tickets for a branch - used by the display board."""
    permission_classes = [AllowAny]

    def get(self, request, branch_id):
        try:
            from queuing.models import Desk, Ticket

            desks = Desk.objects.filter(branch_id=branch_id)
            desks_data = []
            for d in desks:
                service_ids = []
                try:
                    service_ids = list(d.desk_services.values_list("service_id", flat=True))
                except Exception:
                    pass
                desks_data.append({
                    "id": str(d.id),
                    "label": d.name,
                    "name": d.name,
                    "status": d.status,
                    "branchId": str(d.branch_id),
                    "is_active": getattr(d, "is_active", True),
                    "serviceIds": [str(sid) for sid in service_ids],
                })

            # Services
            services_data = []
            try:
                from services.models import Service
                services = Service.objects.filter(branch_id=branch_id)
                services_data = [
                    {"id": str(s.id), "name": s.name, "prefix": getattr(s, "prefix", "")}
                    for s in services
                ]
            except Exception:
                pass

            # Active tickets
            active_tickets = Ticket.objects.filter(
                branch_id=branch_id,
                status__in=["waiting", "serving", "called"]
            )
            tickets_data = []
            for t in active_tickets:
                tickets_data.append({
                    "id": str(t.id),
                    "branch": str(t.branch_id),
                    "token_number": t.token_number,
                    "status": t.status,
                    "service": str(t.service_id) if getattr(t, "service_id", None) else "",
                    "desk": str(t.desk_id) if getattr(t, "desk_id", None) else None,
                    "predicted_desk": str(t.predicted_desk_id) if getattr(t, "predicted_desk_id", None) else None,
                    "created_at": t.created_at.isoformat() if getattr(t, "created_at", None) else None,
                    "called_at": t.called_at.isoformat() if getattr(t, "called_at", None) else None,
                    "served_at": t.served_at.isoformat() if getattr(t, "served_at", None) else None,
                })

            return Response({
                "desks": desks_data,
                "services": services_data,
                "tickets": tickets_data,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PublicVerifyDisplaySessionView(APIView):
    """Validates a display terminal session token server-side on page load to prevent localStorage bypass."""
    permission_classes = [AllowAny]

    def post(self, request):
        terminal_id = request.data.get("terminal_id")
        session_token = request.data.get("session_token")

        if not terminal_id or not session_token:
            return Response({"valid": False, "reason": "Missing credentials."}, status=status.HTTP_200_OK)

        try:
            terminal = DisplayTerminal.objects.get(id=terminal_id, status="active")
        except DisplayTerminal.DoesNotExist:
            return Response({"valid": False, "reason": "Terminal not found."}, status=status.HTTP_200_OK)

        if terminal.session_token != session_token:
            return Response({"valid": False, "reason": "Session token mismatch."}, status=status.HTTP_200_OK)

        if not terminal.is_session_active():
            return Response({"valid": False, "reason": "Session expired."}, status=status.HTTP_200_OK)

        # Refresh last_seen to keep session alive
        terminal.last_seen = timezone.now()
        terminal.save(update_fields=["last_seen"])

        return Response({"valid": True}, status=status.HTTP_200_OK)


class DisplayTerminalLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        terminal_id = request.data.get("terminal_id")
        branch_id = request.data.get("branch_id")
        username = (request.data.get("username") or "").strip()
        passcode = request.data.get("passcode") or request.data.get("pin")

        if not passcode:
            return Response({"error": "Passcode / PIN is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not username and not terminal_id:
            return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup terminal
        terminal = None
        if terminal_id:
            try:
                terminal = DisplayTerminal.objects.get(id=terminal_id, status="active")
            except DisplayTerminal.DoesNotExist:
                return Response({"error": "Display terminal not found or inactive."}, status=status.HTTP_404_NOT_FOUND)
        elif branch_id and username:
            terminal = DisplayTerminal.objects.filter(branch_id=branch_id, username__iexact=username, status="active").first()
            if not terminal:
                terminal = DisplayTerminal.objects.filter(branch_id=branch_id, terminal_identifier__iexact=username, status="active").first()
        elif username:
            terminal = DisplayTerminal.objects.filter(username__iexact=username, status="active").first()

        if not terminal:
            return Response({"error": "No active display terminal found matching this username."}, status=status.HTTP_404_NOT_FOUND)

        lockout_key = f"display_lockout_{terminal.id}"
        cooldown_key = f"display_cooldown_{terminal.id}"

        if cache.get(cooldown_key):
            return Response(
                {"error": "Too many failed passcode attempts on this display terminal. Please try again in 1 minute."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Validate username match if provided
        if username and terminal.username and terminal.username.lower() != username.lower():
            if terminal.terminal_identifier.lower() != username.lower():
                attempts = cache.get(lockout_key, 0) + 1
                cache.set(lockout_key, attempts, timeout=300)
                return Response({"error": "Invalid username or passcode."}, status=status.HTTP_400_BAD_REQUEST)

        if str(terminal.passcode).strip() == str(passcode).strip():
            cache.delete(lockout_key)

            old_token = terminal.session_token
            new_session_token = secrets.token_hex(32)

            terminal.session_token = new_session_token
            terminal.connected_at = timezone.now()
            terminal.last_seen = timezone.now()
            terminal.save()

            # Single-active-session: Evict old active session via WebSocket if token changed
            if old_token and old_token != new_session_token:
                channel_layer = get_channel_layer()
                if channel_layer:
                    try:
                        async_to_sync(channel_layer.group_send)(
                            f"display_{terminal.id}",
                            {
                                "type": "display.force_logout",
                                "session_token": new_session_token,
                                "message": "This display terminal was opened on another screen"
                            }
                        )
                    except Exception as e:
                        print(f"WebSocket force logout error: {e}")

            return Response({
                "message": "Login successful",
                "session_token": new_session_token,
                "terminal": PublicDisplayTerminalSerializer(terminal).data,
                "username": terminal.username or "",
            }, status=status.HTTP_200_OK)
        else:
            attempts = cache.get(lockout_key, 0) + 1
            cache.set(lockout_key, attempts, timeout=300)

            if attempts >= 5:
                cache.set(cooldown_key, True, timeout=60)
                return Response(
                    {"error": "Too many failed passcode attempts. Locked out for 60 seconds."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            return Response(
                {"error": f"Invalid passcode. {5 - attempts} attempts remaining."},
                status=status.HTTP_401_UNAUTHORIZED
            )


class DisplayTerminalLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        terminal_id = request.data.get("terminal_id")
        session_token = request.data.get("session_token")

        if not terminal_id or not session_token:
            return Response({"error": "terminal_id and session_token are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            terminal = DisplayTerminal.objects.get(id=terminal_id, session_token=session_token)
            terminal.session_token = None
            terminal.connected_at = None
            terminal.last_seen = None
            terminal.save()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        except DisplayTerminal.DoesNotExist:
            return Response({"message": "Session not found or already ended."}, status=status.HTTP_200_OK)


class RegenerateDisplayPasscodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            terminal = DisplayTerminal.objects.get(pk=pk)
        except DisplayTerminal.DoesNotExist:
            return Response({"error": "Display terminal not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != "super_admin" and terminal.company_id != request.user.company_id:
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        new_passcode = "".join(str(random.randint(0, 9)) for _ in range(4))
        terminal.passcode = new_passcode

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
                        f"display_{terminal.id}",
                        {
                            "type": "display.force_logout",
                            "session_token": "evicted_by_passcode_regen",
                            "message": "This display terminal's passcode was regenerated by an administrator"
                        }
                    )
                except Exception as e:
                    print(f"WebSocket force logout error on passcode regen: {e}")

        return Response(DisplayTerminalSerializer(terminal).data, status=status.HTTP_200_OK)


class DisplayTerminalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DisplayTerminalSerializer

    def list(self, request, *args, **kwargs):
        # Auto-provision default slot for existing terminals that don't have slots yet
        terminals = self.get_queryset()
        for terminal in terminals:
            if not terminal.slots.exists():
                try:
                    from queuing.models import Desk
                    from display.models import DisplayTerminalSlot
                    branch_desks = list(Desk.objects.filter(branch=terminal.branch, is_active=True))
                    if not branch_desks:
                        branch_desks = list(Desk.objects.filter(branch=terminal.branch))
                    slot = DisplayTerminalSlot.objects.create(terminal=terminal, order=1)
                    if branch_desks:
                        slot.desks.set(branch_desks)
                    slot.save()
                except Exception as e:
                    print(f"Error provisioning default slot for terminal {terminal.id}: {e}")

        return super().list(request, *args, **kwargs)

    def perform_destroy(self, instance):
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"display_{instance.id}",
                    {
                        "type": "display.force_logout",
                        "session_token": "deleted",
                        "message": "This display terminal was removed by an administrator."
                    }
                )
            except Exception as e:
                print(f"Eviction on terminal delete error: {e}")
        instance.delete()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DisplayTerminal.all_objects.none()
        if user.role == "super_admin":
            branch_id = self.request.query_params.get("branch") or self.request.query_params.get("branch_id")
            if branch_id:
                return DisplayTerminal.all_objects.filter(branch_id=branch_id)
            return DisplayTerminal.all_objects.all()
        if user.role in ["company_admin", "branch_admin", "operator"]:
            branch_id = self.request.query_params.get("branch") or self.request.query_params.get("branch_id")
            if branch_id:
                return DisplayTerminal.all_objects.filter(company=user.company, branch_id=branch_id)
            if user.branch:
                return DisplayTerminal.all_objects.filter(company=user.company, branch=user.branch)
            return DisplayTerminal.all_objects.filter(company=user.company)
        return DisplayTerminal.all_objects.none()

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
        qs = DisplayTerminal.all_objects.all()

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

    def perform_create(self, serializer):
        user = self.request.user
        branch = serializer.validated_data.get("branch")
        if not branch:
            raise ValidationError("You must specify a branch to create a display terminal.")

        username = (serializer.validated_data.get("username") or self.request.data.get("username") or "").strip().lower()
        if username and DisplayTerminal.all_objects.filter(branch=branch, username__iexact=username).exists():
            raise ValidationError(f"Username '{username}' is already in use by another display screen in this branch.")

        from billing.models import CompanyPlanAllocation
        comp_alloc = CompanyPlanAllocation.objects.filter(
            company=user.company, branch=branch, plan_component__key="live_display_screens"
        ).first()
        if not comp_alloc:
            comp_alloc = CompanyPlanAllocation.objects.filter(
                company=user.company, branch__isnull=True, plan_component__key="live_display_screens"
            ).first()

        if comp_alloc:
            quota = comp_alloc.purchased_qty
        else:
            try:
                pkg = getattr(user.company, "package", None)
                quota = getattr(pkg, "max_displays", 1) if pkg else 1
            except Exception:
                quota = 1
        if not quota or quota <= 0:
            quota = 1

        current_count = DisplayTerminal.all_objects.filter(branch=branch, status="active").count()
        if current_count >= quota:
            raise ValidationError(f"Plan limit reached: you cannot create more than {quota} active display terminals.")

        passcode = (self.request.data.get("passcode") or serializer.validated_data.get("passcode") or "").strip()
        if not passcode:
            passcode = "".join(str(random.randint(0, 9)) for _ in range(4))
        serializer.save(company=user.company, passcode=passcode)


class DisplayTerminalSlotViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DisplayTerminalSlotSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DisplayTerminalSlot.objects.none()
        if user.role == "super_admin":
            return DisplayTerminalSlot.objects.all()
        if user.role in ["company_admin", "branch_admin", "operator"]:
            return DisplayTerminalSlot.objects.filter(terminal__company=user.company)
        return DisplayTerminalSlot.objects.none()
