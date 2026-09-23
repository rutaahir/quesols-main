import secrets
import random
from django.utils import timezone
from django.core.cache import cache
from rest_framework import viewsets, status
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
        passcode = request.data.get("passcode")

        if not terminal_id or not passcode:
            return Response({"error": "terminal_id and passcode are required."}, status=status.HTTP_400_BAD_REQUEST)

        lockout_key = f"display_lockout_{terminal_id}"
        cooldown_key = f"display_cooldown_{terminal_id}"

        if cache.get(cooldown_key):
            return Response(
                {"error": "Too many failed passcode attempts on this display terminal. Please try again in 1 minute."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            terminal = DisplayTerminal.objects.get(id=terminal_id, status="active")
        except DisplayTerminal.DoesNotExist:
            return Response({"error": "Display terminal not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

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
                "terminal": PublicDisplayTerminalSerializer(terminal).data
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
        branch_id = request.query_params.get("branch") or request.query_params.get("branch_id")
        if branch_id:
            from branches.models import Branch
            from display.provisioning import provision_displays_for_branch
            try:
                branch = Branch.objects.get(id=branch_id)
                provision_displays_for_branch(branch)
            except Exception as e:
                print(f"Auto-provisioning displays error: {e}")
        elif request.user.is_authenticated and getattr(request.user, "company", None):
            from branches.models import Branch
            from display.provisioning import provision_displays_for_branch
            for b in Branch.objects.filter(company=request.user.company):
                try:
                    provision_displays_for_branch(b)
                except Exception:
                    pass

        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DisplayTerminal.objects.none()
        if user.role == "super_admin":
            return DisplayTerminal.objects.all()
        if user.role in ["company_admin", "branch_admin", "operator"]:
            if user.branch:
                return DisplayTerminal.objects.filter(company=user.company, branch=user.branch)
            return DisplayTerminal.objects.filter(company=user.company)
        return DisplayTerminal.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        branch = serializer.validated_data.get("branch")
        if not branch:
            raise ValidationError("You must specify a branch to create a display terminal.")

        from billing.models import CompanyPlanAllocation
        comp_alloc = CompanyPlanAllocation.objects.filter(
            company=user.company, branch=branch, plan_component__key="live_display_screens"
        ).first()
        if not comp_alloc:
            comp_alloc = CompanyPlanAllocation.objects.filter(
                company=user.company, branch__isnull=True, plan_component__key="live_display_screens"
            ).first()

        quota = comp_alloc.purchased_qty if comp_alloc else getattr(user.company.package, "max_displays", 0)
        current_count = DisplayTerminal.objects.filter(branch=branch, status="active").count()
        if current_count >= quota:
            raise ValidationError(f"Plan limit reached: you cannot create more than {quota} active display terminals.")

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
