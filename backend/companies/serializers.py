import re
from rest_framework import serializers
from companies.models import Company
from billing.models import Package
from django.contrib.auth import get_user_model

User = get_user_model()

class CompanyRegistrationSerializer(serializers.Serializer):
    company_name = serializers.CharField(min_length=2, max_length=120, required=True)
    industry = serializers.CharField(max_length=255, required=False, default="Education", allow_blank=True)
    contact_email = serializers.EmailField(required=True)
    contact_phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    logo = serializers.FileField(required=False, allow_null=True)
    brand_primary_color = serializers.CharField(max_length=7, required=False, default="#6366F1")
    estimated_branch_count = serializers.IntegerField(min_value=1, required=True)
    package = serializers.PrimaryKeyRelatedField(queryset=Package.objects.filter(is_active=True), required=True)
    billing_cycle = serializers.ChoiceField(choices=[("monthly", "Monthly"), ("yearly", "Yearly")], required=True)
    slug = serializers.CharField(max_length=255, required=False, allow_blank=True)
    website = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    # Admin details
    admin_first_name = serializers.CharField(max_length=150, required=True)
    admin_last_name = serializers.CharField(max_length=150, required=True)
    admin_username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    admin_email = serializers.EmailField(required=True)
    admin_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    admin_confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    admin_phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    terms_consent = serializers.BooleanField(required=True)

    def validate_admin_username(self, value):
        if value:
            import re
            val = str(value).strip()
            if len(val) < 3:
                raise serializers.ValidationError("Username must be at least 3 characters long.")
            if len(val) > 30:
                raise serializers.ValidationError("Username cannot exceed 30 characters.")
            if not re.match(r'^[a-zA-Z0-9_.-]+$', val):
                raise serializers.ValidationError("Username can only contain letters, numbers, underscores, hyphens, and periods.")
            existing = User.objects.filter(username__iexact=val).first()
            if existing and not (existing.company and existing.company.onboarding_status in ["pending_payment", "pending_invoice_approval"]):
                raise serializers.ValidationError("This username is already taken. Please choose another.")
            return val
        return value

    def validate_contact_email(self, value):
        existing = Company.objects.filter(contact_email=value).first()
        if existing and existing.onboarding_status not in ["pending_payment", "pending_invoice_approval"]:
            raise serializers.ValidationError("A company is already registered with this contact email.")
        return value

    def validate_slug(self, value):
        if value:
            import re
            if not re.match(r'^[a-z0-9-]+$', value):
                raise serializers.ValidationError("Slug must only contain lowercase alphanumeric characters and hyphens.")
            existing = Company.objects.filter(slug=value).first()
            if existing and existing.onboarding_status not in ["pending_payment", "pending_invoice_approval"]:
                raise serializers.ValidationError("This company URL slug is already taken.")
        return value

    def validate_admin_email(self, value):
        existing = User.objects.filter(email=value).first()
        if existing:
            if not (existing.company and existing.company.onboarding_status in ["pending_payment", "pending_invoice_approval"]):
                raise serializers.ValidationError("A user account is already registered with this login email.")
        return value

    def validate_brand_primary_color(self, value):
        if not re.match(r"^#[0-9a-fA-F]{6}$", value):
            raise serializers.ValidationError("Enter a valid HEX color code (e.g. #FF5733).")
        return value

    def validate_logo(self, value):
        if value:
            # Validate size (max 2MB)
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError("Logo file size must not exceed 2MB.")
            # Validate format png/jpg/jpeg/svg
            ext = value.name.split('.')[-1].lower()
            if ext not in ['png', 'jpg', 'jpeg', 'svg']:
                raise serializers.ValidationError("Logo must be a PNG, JPG, JPEG or SVG file.")
        return value

    def validate_admin_password(self, value):
        if value:
            if len(value) < 6:
                raise serializers.ValidationError("Password must be at least 6 characters.")
            if not any(char.isdigit() for char in value):
                raise serializers.ValidationError("Password must contain at least one number.")
            if not any(char.isalpha() for char in value):
                raise serializers.ValidationError("Password must contain at least one letter.")
        return value

    def validate_terms_consent(self, value):
        if not value:
            raise serializers.ValidationError("You must consent to the Terms of Service and Privacy Policy.")
        return value

    def validate(self, data):
        admin_email = data.get("admin_email")
        existing_user = User.objects.filter(email=admin_email).first()
        is_pending = existing_user and existing_user.company and existing_user.company.onboarding_status in ["pending_payment", "pending_invoice_approval"]

        password = data.get("admin_password")
        confirm = data.get("admin_confirm_password")

        if not is_pending and not password:
            raise serializers.ValidationError({"admin_password": "Password is required."})

        if password or confirm:
            if password != confirm:
                raise serializers.ValidationError({"admin_confirm_password": "Passwords do not match."})
        return data


from companies.models import InterestedCandidate

class InterestedCandidateSerializer(serializers.ModelSerializer):
    company_slug = serializers.CharField(source="company.slug", read_only=True)
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = InterestedCandidate
        fields = [
            "id", "company_name", "industry", "custom_industry",
            "country", "state", "city", "address",
            "contact_name", "email", "phone", "country_code",
            "website", "status", "notes", "created_at", "updated_at",
            "company_slug", "company_id", "user_id", "plan_config"
        ]

