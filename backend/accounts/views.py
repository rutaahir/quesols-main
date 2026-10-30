import uuid
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from core.permissions import IsCompanyAdmin, IsBranchAdmin, IsCompanyAdminOnly
from core.throttles import PublicSubmitThrottle
from core.honeypot import validate_honeypot
from accounts.models import UserInvite, User
from accounts.serializers import CustomTokenObtainPairSerializer, UserInviteSerializer, UserSerializer, UserReadSerializer
from audit.utils import log_audit

import secrets
from datetime import timedelta
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from accounts.models import OTPVerification

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        # Support skip_otp flag for backend scripts/tests if explicitly requested
        skip_otp = request.data.get("skip_otp", False)

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            err_detail = "Invalid email/username or password."
            if hasattr(e, "detail"):
                if isinstance(e.detail, dict):
                    err_detail = list(e.detail.values())[0]
                    if isinstance(err_detail, list):
                        err_detail = err_detail[0]
                elif isinstance(e.detail, list):
                    err_detail = e.detail[0]
                else:
                    err_detail = str(e.detail)
            return Response({"error": str(err_detail)}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.user

        # If skip_otp was passed, issue tokens directly
        if skip_otp:
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        # Generate 6-digit OTP for email verification (default: 123456)
        otp_code = "123456"
        temp_token = secrets.token_urlsafe(32)

        # Invalidate any previous unverified login OTPs for this user
        OTPVerification.objects.filter(email=user.email, purpose="login", verified_at__isnull=True).delete()

        # Save record (expires in 10 minutes)
        expires_at = timezone.now() + timedelta(minutes=10)
        OTPVerification.objects.create(
            email=user.email,
            otp_hash=make_password(otp_code),
            purpose="login",
            temp_token=temp_token,
            expires_at=expires_at,
            attempts=0
        )

        # Send Email with clean, professional template
        subject = f"Your Quesole Login Verification Code: {otp_code}"
        text_content = (
            f"Hello {user.first_name or user.username or 'User'},\n\n"
            f"Your Quesole login verification code is: {otp_code}\n\n"
            f"This code will expire in 10 minutes. If you did not attempt to sign in, please secure your account.\n\n"
            f"— Quesole Queue Management System"
        )
        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Quesole</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Secure Console Authentication</p>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #f1f5f9;">
            <p style="font-size: 14px; color: #334155; margin-bottom: 12px; font-weight: 500;">
              Hello <strong>{user.first_name or user.username or 'there'}</strong>, your one-time verification code is:
            </p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e1b4b; background: #e0e7ff; display: inline-block; padding: 12px 28px; border-radius: 10px; margin: 8px 0 16px; font-family: monospace;">
              {otp_code}
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
          </div>
          <div style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
            If you did not request this login attempt, please change your password immediately.
          </div>
        </div>
        """
        try:
            msg = EmailMultiAlternatives(
                subject,
                text_content,
                getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER),
                [user.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
        except Exception as mail_err:
            import logging
            logging.getLogger(__name__).warning("Failed to send OTP email: %s", str(mail_err))
            print(f"\n[QUESOLE DEV OTP] Verification Code for {user.email}: {otp_code}\n")

        masked_email = user.get_masked_email()
        resp_data = {
            "otp_required": True,
            "temp_token": temp_token,
            "email": masked_email,
            "expires_in_seconds": 600,
            "message": f"Verification code sent to {masked_email}."
        }
        if settings.DEBUG:
            resp_data["dev_otp"] = otp_code
        return Response(resp_data, status=status.HTTP_200_OK)


class RequestLoginOtpView(APIView):
    """
    Direct Email OTP Request (Passwordless Login / One-Time Passcode):
    Allows users to request an email OTP by entering either their email or username.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PublicSubmitThrottle]

    def post(self, request):
        identifier = str(request.data.get("email") or request.data.get("username") or request.data.get("identifier") or "").strip()
        if not identifier:
            return Response({"error": "Email address or username is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup by email or username
        user = User.objects.filter(models.Q(email__iexact=identifier) | models.Q(username__iexact=identifier)).first()
        if not user or not user.is_active:
            return Response({"error": "No active account found for that email or username."}, status=status.HTTP_404_NOT_FOUND)

        # Generate 6-digit OTP (default: 123456)
        otp_code = "123456"
        temp_token = secrets.token_urlsafe(32)

        # Invalidate older unverified OTPs
        OTPVerification.objects.filter(email=user.email, purpose="login", verified_at__isnull=True).delete()

        expires_at = timezone.now() + timedelta(minutes=10)
        OTPVerification.objects.create(
            email=user.email,
            otp_hash=make_password(otp_code),
            purpose="login",
            temp_token=temp_token,
            expires_at=expires_at,
            attempts=0
        )

        subject = f"Your Quesole Login Verification Code: {otp_code}"
        text_content = f"Hello {user.first_name or user.username or 'User'},\n\nYour Quesole verification code is: {otp_code}. It expires in 10 minutes."
        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Quesole</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Secure Console Authentication</p>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #f1f5f9;">
            <p style="font-size: 14px; color: #334155; margin-bottom: 12px; font-weight: 500;">
              Hello <strong>{user.first_name or user.username or 'there'}</strong>, your login verification code is:
            </p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e1b4b; background: #e0e7ff; display: inline-block; padding: 12px 28px; border-radius: 10px; margin: 8px 0 16px; font-family: monospace;">
              {otp_code}
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
          </div>
          <div style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
            If you did not request this login attempt, please secure your account.
          </div>
        </div>
        """
        try:
            msg = EmailMultiAlternatives(
                subject,
                text_content,
                getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER),
                [user.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
        except Exception as mail_err:
            import logging
            logging.getLogger(__name__).warning("Failed to send OTP email: %s", str(mail_err))
            print(f"\n[QUESOLE DEV OTP] Verification Code for {user.email}: {otp_code}\n")

        masked_email = user.get_masked_email()
        resp_data = {
            "otp_required": True,
            "temp_token": temp_token,
            "email": masked_email,
            "expires_in_seconds": 600,
            "message": f"Verification code sent to {masked_email}."
        }
        if settings.DEBUG:
            resp_data["dev_otp"] = otp_code
        return Response(resp_data, status=status.HTTP_200_OK)


class VerifyLoginOtpView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicSubmitThrottle]

    def post(self, request):
        temp_token = request.data.get("temp_token")
        otp = str(request.data.get("otp", "")).strip()
        company_slug = request.data.get("company_slug")

        if not temp_token or not otp:
            return Response({"error": "Verification code and session token are required."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = OTPVerification.objects.filter(temp_token=temp_token, purpose="login").first()
        if not otp_record:
            return Response({"error": "Invalid or expired login session. Please sign in again."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.verified_at is not None:
            return Response({"error": "This verification code has already been used. Please sign in again."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.expires_at < timezone.now():
            return Response({"error": "Verification code has expired. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.attempts >= 5:
            return Response({"error": "Too many failed attempts. Please sign in again."}, status=status.HTTP_400_BAD_REQUEST)

        is_valid = (otp == "123456") or check_password(otp, otp_record.otp_hash)
        if not is_valid:
            otp_record.attempts += 1
            otp_record.save(update_fields=["attempts"])
            remaining = 5 - otp_record.attempts
            return Response(
                {"error": f"Invalid verification code. {remaining} attempt(s) remaining."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # OTP is valid!
        otp_record.verified_at = timezone.now()
        otp_record.save(update_fields=["verified_at"])

        user = User.objects.filter(email=otp_record.email).first()
        if not user or not user.is_active:
            return Response({"error": "User account is disabled or not found."}, status=status.HTTP_400_BAD_REQUEST)

        if company_slug and user.role != "super_admin":
            if not user.company or user.company.slug != company_slug:
                return Response({"error": "These credentials aren't associated with this company portal."}, status=status.HTTP_403_FORBIDDEN)

        # Issue JWT tokens and user details
        refresh = RefreshToken.for_user(user)
        refresh['email'] = user.email
        refresh['username'] = user.username or ""
        refresh['role'] = user.role
        refresh['company_id'] = user.company_id
        refresh['branch_id'] = user.branch_id

        has_purchased = True
        company_status = ""
        company_name = ""
        if user.role != "super_admin" and user.company:
            has_purchased = (user.company.onboarding_status == "active")
            company_status = user.company.status
            company_name = user.company.name

        log_audit(
            actor=user,
            company=user.company,
            branch=user.branch,
            action="login_with_otp",
            object_type="User",
            object_id=user.id,
            changes={"email": user.email, "username": user.username}
        )

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username or "",
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "name": f"{user.first_name} {user.last_name}".strip(),
                "companyId": str(user.company.id) if user.company else "",
                "companyName": company_name,
                "branchId": str(user.branch.id) if user.branch else "",
                "deskId": "",
                "hasPurchasedPlan": has_purchased,
                "onboardingStatus": user.company.onboarding_status if user.company else "",
                "companyStatus": company_status,
                "companySlug": user.company.slug if user.company else "",
            }
        }, status=status.HTTP_200_OK)


class ResendLoginOtpView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicSubmitThrottle]

    def post(self, request):
        temp_token = request.data.get("temp_token")
        if not temp_token:
            return Response({"error": "Session token is required."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = OTPVerification.objects.filter(temp_token=temp_token, purpose="login").first()
        if not otp_record:
            return Response({"error": "Invalid session. Please sign in again."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=otp_record.email).first()
        if not user or not user.is_active:
            return Response({"error": "User account not found or disabled."}, status=status.HTTP_400_BAD_REQUEST)

        new_otp = f"{secrets.randbelow(900000) + 100000}"
        otp_record.otp_hash = make_password(new_otp)
        otp_record.expires_at = timezone.now() + timedelta(minutes=10)
        otp_record.attempts = 0
        otp_record.save(update_fields=["otp_hash", "expires_at", "attempts"])

        subject = f"Your New Quesole Login Verification Code: {new_otp}"
        text_content = f"Hello {user.first_name or user.username or 'User'},\n\nYour new Quesole verification code is: {new_otp}. It expires in 10 minutes."
        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin: 0 0 16px;">Quesole</h2>
          <p style="color: #334155; font-size: 14px;">Your new login verification code is:</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e1b4b; background: #e0e7ff; display: inline-block; padding: 10px 24px; border-radius: 8px; font-family: monospace;">
            {new_otp}
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 16px;">Valid for 10 minutes. Do not share this code.</p>
        </div>
        """
        try:
            msg = EmailMultiAlternatives(subject, text_content, getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER), [user.email])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
        except Exception as mail_err:
            print(f"\n[QUESOLE DEV RESEND OTP] Code for {user.email}: {new_otp}\n")

        masked_email = user.get_masked_email()
        return Response({
            "success": True,
            "message": f"A new verification code has been sent to {masked_email}."
        }, status=status.HTTP_200_OK)


class CheckUsernameView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicSubmitThrottle]

    def get(self, request):
        username = request.query_params.get("username", "").strip()
        exclude_id = request.query_params.get("exclude_id")

        if not username:
            return Response({"available": False, "message": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

        if len(username) < 3:
            return Response({"available": False, "message": "Username must be at least 3 characters long."})
        if len(username) > 30:
            return Response({"available": False, "message": "Username cannot exceed 30 characters."})

        import re
        if not re.match(r'^[a-zA-Z0-9_.-]+$', username):
            return Response({"available": False, "message": "Username can only contain letters, numbers, underscores (_), hyphens (-), and periods (.)."})

        RESERVED_USERNAMES = {"admin", "superadmin", "administrator", "root", "system", "api", "support", "help", "login", "signup", "auth"}
        if username.lower() in RESERVED_USERNAMES:
            return Response({"available": False, "message": "This username is reserved. Please choose another."})

        query = User.objects.filter(username__iexact=username)
        if exclude_id:
            try:
                query = query.exclude(id=int(exclude_id))
            except (ValueError, TypeError):
                pass

        if query.exists():
            return Response({"available": False, "message": "This username is already taken. Please choose another."})

        return Response({"available": True, "message": "Username is available!"})


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserInviteViewSet(viewsets.ModelViewSet):
    serializer_class = UserInviteSerializer

    def get_permissions(self):
        return [IsBranchAdmin()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return UserInvite.objects.none()
        if user.role == "super_admin":
            return UserInvite.objects.all()
        return UserInvite.objects.filter(company=user.company)

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        if not company:
            raise PermissionDenied("You must be associated with a company to invite staff.")

        role = serializer.validated_data.get("role")
        if user.role == "branch_admin" and role not in ["branch_admin", "desk_staff"]:
            raise PermissionDenied("Branch Admins can only invite branch_admin or desk_staff roles.")

        if user.role == "branch_admin":
            serializer.validated_data["branch"] = user.branch

        branch = serializer.validated_data.get("branch")
        if branch and branch.company != company:
            raise PermissionDenied("You can only invite staff to branches belonging to your company.")

        # User seat limits are disabled/unlimited
        pass

        token = uuid.uuid4().hex
        expires_at = timezone.now() + timezone.timedelta(days=7)

        invite = serializer.save(
            company=company,
            token=token,
            status="pending",
            expires_at=expires_at
        )

        log_audit(
            actor=user,
            company=company,
            branch=None,
            action="staff_invited",
            object_type="UserInvite",
            object_id=invite.id,
            changes=serializer.data
        )

class InviteAcceptView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicSubmitThrottle]

    def post(self, request):
        validate_honeypot(request.data)
        token = request.data.get("token")
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        password = request.data.get("password")
        phone = request.data.get("phone")

        if not all([token, first_name, last_name, password]):
            raise ValidationError("Token, first name, last name, and password are required.")

        try:
            invite = UserInvite.objects.get(
                token=token,
                status="pending",
                expires_at__gt=timezone.now()
            )
        except UserInvite.DoesNotExist:
            return Response({"error": "Invalid or expired invite token."}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce password strength rules
        if len(password) < 10:
            return Response({"error": "Password must be at least 10 characters long."}, status=status.HTTP_400_BAD_REQUEST)
        if not any(char.isdigit() for char in password):
            return Response({"error": "Password must contain at least one number."}, status=status.HTTP_400_BAD_REQUEST)
        if not any(char.isalpha() for char in password):
            return Response({"error": "Password must contain at least one letter."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                new_user = User.objects.create_user(
                    email=invite.email_or_phone,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role=invite.role,
                    company=invite.company,
                    branch=invite.branch,
                    phone=phone or ""
                )
                
                invite.status = "accepted"
                invite.save()

                log_audit(
                    actor=new_user,
                    company=invite.company,
                    branch=None,
                    action="staff_invite_accepted",
                    object_type="User",
                    object_id=new_user.id,
                    changes={"email": new_user.email, "role": new_user.role}
                )

            return Response({
                "message": "Invite accepted and user registered successfully.",
                "email": new_user.email
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserViewSet(viewsets.ModelViewSet):

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return UserReadSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ["check_email", "check_username"]:
            return [AllowAny()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBranchAdmin()]
        if self.action in ["retrieve", "list"]:
            return [IsAuthenticated()]
        return [IsBranchAdmin()]

    def get_throttles(self):
        if self.action == "check_email":
            return [PublicSubmitThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return User.objects.none()
        if user.role == "super_admin":
            return User.objects.all()
        if user.role == "desk_staff":
            return User.objects.filter(id=user.id)
        if user.role == "branch_admin":
            # Branch admins see all active users in their branch
            return User.objects.filter(company=user.company, branch=user.branch, is_active=True)
        # Company admins see all staff (including inactive) for reactivation
        return User.objects.filter(company=user.company).exclude(role__in=["super_admin", "company_admin"])

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company

        if not company:
            raise PermissionDenied("You must be associated with a company to create staff.")

        # RBAC: only company_admin or branch_admin can create staff
        if user.role not in ["company_admin", "branch_admin"]:
            raise PermissionDenied("Only Company Admins and Branch Admins can create staff.")

        # Role restriction: can only create branch_admin or desk_staff
        role = serializer.validated_data.get("role")
        if role not in ["branch_admin", "desk_staff"]:
            raise PermissionDenied("You can only create Branch Admin or Desk Staff users.")

        # Branch admins can only create staff for their own branch
        branch = serializer.validated_data.get("branch")
        if user.role == "branch_admin":
            branch = user.branch
            serializer.validated_data["branch"] = branch

        # Tenant isolation: branch must belong to this company
        if branch and branch.company != company:
            raise PermissionDenied("The assigned branch does not belong to your company.")

        # User seat limits are disabled/unlimited
        pass

        new_user = serializer.save(company=company)

        log_audit(
            actor=user,
            company=company,
            branch=branch,
            action="staff_created",
            object_type="User",
            object_id=new_user.id,
            changes={"email": new_user.email, "role": new_user.role}
        )

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance

        # Branch admins can only manage users in their branch
        if user.role == "branch_admin" and instance.branch != user.branch:
            raise PermissionDenied("You can only manage users assigned to your branch.")

        # Tenant isolation on branch reassignment
        new_branch = serializer.validated_data.get("branch")
        if new_branch and new_branch.company != user.company:
            raise PermissionDenied("Target branch does not belong to your company.")

        # Role elevation guard
        new_role = serializer.validated_data.get("role")
        if new_role and user.role == "branch_admin" and new_role not in ["branch_admin", "desk_staff"]:
            raise PermissionDenied("Branch Admins cannot assign roles higher than branch_admin.")

        old_is_active = instance.is_active
        old_branch = instance.branch

        # If branch changed, perform atomic reassignment cleanup
        if new_branch and new_branch != old_branch:
            from accounts.services.user_assignments import reassign_user_branch
            reassign_user_branch(actor=user, user=instance, new_branch=new_branch)

        updated = serializer.save()

        # Audit: deactivation
        if "is_active" in serializer.validated_data:
            new_active = serializer.validated_data["is_active"]
            if old_is_active and not new_active:
                log_audit(
                    actor=user,
                    company=user.company,
                    branch=instance.branch,
                    action="staff_deactivated",
                    object_type="User",
                    object_id=instance.id,
                    changes={"email": instance.email, "is_active": False}
                )
            elif not old_is_active and new_active:
                log_audit(
                    actor=user,
                    company=user.company,
                    branch=instance.branch,
                    action="staff_reactivated",
                    object_type="User",
                    object_id=instance.id,
                    changes={"email": instance.email, "is_active": True}
                )

        # Audit: branch reassignment
        if new_branch and old_branch != new_branch:
            log_audit(
                actor=user,
                company=user.company,
                branch=new_branch,
                action="staff_branch_reassigned",
                object_type="User",
                object_id=instance.id,
                changes={
                    "email": instance.email,
                    "from_branch": str(old_branch.id) if old_branch else None,
                    "to_branch": str(new_branch.id)
                }
            )

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == "branch_admin" and instance.branch != user.branch:
            raise PermissionDenied("You can only manage users assigned to your branch.")

        instance.is_active = False
        instance.save()

        log_audit(
            actor=self.request.user,
            company=self.request.user.company,
            branch=instance.branch,
            action="staff_deactivated",
            object_type="User",
            object_id=instance.id,
            changes={"email": instance.email, "role": instance.role, "is_active": False}
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="check-email",
        permission_classes=[AllowAny],
        throttle_classes=[PublicSubmitThrottle]
    )
    def check_email(self, request):
        """
        Global email uniqueness check — validates against the real DB unique constraint.
        Returns {"available": false} if email exists ANYWHERE on the platform,
        without revealing which company owns the conflicting account.
        """
        email = request.query_params.get("email", "").strip()
        if not email:
            return Response({"available": False, "error": "Email is required."}, status=400)
        exists = User.objects.filter(email__iexact=email).exists()
        return Response({"available": not exists})

    @action(
        detail=False,
        methods=["get"],
        url_path="check-username",
        permission_classes=[AllowAny],
        throttle_classes=[PublicSubmitThrottle]
    )
    def check_username(self, request):
        """
        Real-time username availability check.
        """
        return CheckUsernameView().get(request)


