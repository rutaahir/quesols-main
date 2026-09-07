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
        return Response(PublicDisplayTerminalSerializer(terminals, many=True).data, status=status.HTTP_200_OK)


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
            # Reset failed attempts on success
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

        # Ensure user has access to terminal company
        if request.user.role != "super_admin" and terminal.company_id != request.user.company_id:
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        new_passcode = "".join(str(random.randint(0, 9)) for _ in range(4))
        terminal.passcode = new_passcode

        # Clear session & evict active connection
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
                except Exception as e:
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

        # Check display quota
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
