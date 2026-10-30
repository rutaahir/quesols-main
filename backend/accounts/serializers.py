from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from accounts.models import UserInvite

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Allow username or email in the primary field
        self.fields[self.username_field].required = False
        self.fields['username'] = serializers.CharField(required=False)
        self.fields['identifier'] = serializers.CharField(required=False)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['username'] = user.username or ""
        token['role'] = user.role
        token['company_id'] = user.company_id
        token['branch_id'] = user.branch_id
        return token

    def validate(self, attrs):
        # Map username or identifier to the expected username_field ('email')
        identifier = attrs.get("email") or attrs.get("username") or attrs.get("identifier")
        if not identifier:
            raise serializers.ValidationError({"email": "Please enter your email or username."})
        attrs[self.username_field] = identifier.strip()

        request = self.context.get("request")
        company_slug = None
        if request:
            if hasattr(request, "data") and request.data:
                company_slug = request.data.get("company_slug")
            elif hasattr(request, "POST") and request.POST:
                company_slug = request.POST.get("company_slug")

            if not company_slug:
                if hasattr(request, "query_params") and request.query_params:
                    company_slug = request.query_params.get("company_slug")
                elif hasattr(request, "GET") and request.GET:
                    company_slug = request.GET.get("company_slug")

            if not company_slug:
                if hasattr(request, "headers") and request.headers:
                    company_slug = request.headers.get("X-Company-Slug")
                elif hasattr(request, "META") and request.META:
                    company_slug = request.META.get("HTTP_X_COMPANY_SLUG")

        # Standard authentication checks credentials against email or username
        data = super().validate(attrs)
        user = self.user

        if company_slug:
            # Scoping constraint: Staff/Admin users must belong to the resolved company
            if user.role != "super_admin":
                if not user.company or user.company.slug != company_slug:
                    raise serializers.ValidationError("These credentials aren't associated with this company.")

        has_purchased = True
        company_status = ""
        company_name = ""
        if user.role != "super_admin" and user.company:
            # Self-healing sync: If user was marked 'plan_purchased' in candidate records, activate company and branch
            from companies.models import InterestedCandidate
            cand = InterestedCandidate.objects.filter(email=user.email).first()
            if cand and cand.status == "plan_purchased" and user.company.onboarding_status != "active":
                user.company.onboarding_status = "active"
                user.company.status = "active"
                user.company.save()
                from billing.models import Subscription, PlanPurchase
                Subscription.objects.filter(company=user.company).update(status="active")
                PlanPurchase.objects.filter(company=user.company, payment_status="pending").update(payment_status="paid")
                from branches.models import Branch
                if not Branch.objects.filter(company=user.company).exists():
                    Branch.objects.create(
                        company=user.company,
                        name="Main Branch",
                        slug="main-branch",
                        city=user.company.city or "Default City",
                        address=user.company.address or "Default Address",
                        status="active"
                    )

            has_purchased = (user.company.onboarding_status == "active")
            company_status = user.company.status
            company_name = user.company.name

        data['user'] = {
            'email': user.email,
            'username': user.username or "",
            'role': user.role,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'name': f"{user.first_name} {user.last_name}".strip(),
            'companyId': str(user.company.id) if user.company else "",
            'companyName': company_name,
            'branchId': str(user.branch.id) if user.branch else "",
            'deskId': "",
            'hasPurchasedPlan': has_purchased,
            'onboardingStatus': user.company.onboarding_status if user.company else "",
            'companyStatus': company_status,
            'companySlug': user.company.slug if user.company else "",
        }
        return data

class UserSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    password = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})
    username = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'role',
            'phone', 'is_active', 'branch', 'branch_name', 'company',
            'password', 'password_confirm',
        )

    def validate_username(self, value):
        if value:
            val = str(value).strip()
            if len(val) < 3:
                raise serializers.ValidationError("Username must be at least 3 characters long.")
            if len(val) > 30:
                raise serializers.ValidationError("Username cannot exceed 30 characters.")
            import re
            if not re.match(r'^[a-zA-Z0-9_.-]+$', val):
                raise serializers.ValidationError("Username can only contain letters, numbers, underscores (_), hyphens (-), and periods (.).")
            
            RESERVED = {"admin", "superadmin", "administrator", "root", "system", "api", "support", "help", "login", "signup"}
            if val.lower() in RESERVED:
                raise serializers.ValidationError("This username is reserved. Please choose another.")

            qs = User.objects.filter(username__iexact=val)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError("This username is already taken. Please choose another.")
            return val
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")

        # Required during creation
        if self.instance is None:
            if not password:
                raise serializers.ValidationError({"password": "This field is required."})
            if not password_confirm:
                raise serializers.ValidationError({"password_confirm": "This field is required."})

        # Validate if either is provided
        if password or password_confirm:
            if password != password_confirm:
                raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
            if len(password) < 8:
                raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
            if not any(c.isalpha() for c in password):
                raise serializers.ValidationError({"password": "Password must contain at least one letter."})
            if not any(c.isdigit() for c in password):
                raise serializers.ValidationError({"password": "Password must contain at least one number."})

        return attrs


    def create(self, validated_data):
        validated_data.pop("password_confirm", None)
        password = validated_data.pop("password")
        username = validated_data.pop("username", None)
        email = validated_data.pop("email")
        user = User.objects.create_user(email=email, password=password, username=username, **validated_data)
        return user

    def update(self, instance, validated_data):
        # Password is not updatable via this serializer — use change-password endpoint
        validated_data.pop("password", None)
        validated_data.pop("password_confirm", None)
        return super().update(instance, validated_data)


class UserReadSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing/retrieving users — no password fields exposed."""
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'role',
            'phone', 'is_active', 'branch', 'branch_name', 'company',
        )


class UserInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserInvite
        fields = "__all__"
        read_only_fields = ("company", "token", "status", "expires_at")


