from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from core.models import BaseModel
from core.managers import TenantManager

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, username=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        
        if not username:
            base_user = email.split('@')[0]
            clean_base = ''.join(c for c in base_user if c.isalnum() or c in '_-') or 'user'
            candidate = clean_base
            count = 1
            while self.model.objects.filter(username__iexact=candidate).exists():
                candidate = f"{clean_base}_{count}"
                count += 1
            username = candidate

        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, username=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'super_admin')
        return self.create_user(email, password, username=username, **extra_fields)

from encrypted_model_fields.fields import EncryptedCharField

class User(AbstractUser):
    ROLE_CHOICES = [
        ("super_admin", "Platform Super Admin"),
        ("company_admin", "Company Admin"),
        ("branch_admin", "Branch Admin"),
        ("desk_staff", "Desk Staff"),
    ]

    username = models.CharField(max_length=150, unique=True, null=True, blank=True, db_index=True)
    email = models.EmailField(unique=True)
    phone = EncryptedCharField(max_length=50, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="desk_staff")
    company = models.ForeignKey("companies.Company", on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    branch = models.ForeignKey("branches.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    is_2fa_enabled = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def get_masked_email(self):
        if not self.email or '@' not in self.email:
            return self.email or ""
        name, domain = self.email.split('@', 1)
        if len(name) <= 2:
            masked_name = name[0] + "*"
        else:
            masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
        return f"{masked_name}@{domain}"

    def __str__(self):
        return f"{self.email} ({self.username or 'no-username'}) ({self.role})"

class UserInvite(BaseModel):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("expired", "Expired"),
    ]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="invites")
    branch = models.ForeignKey("branches.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="invites")
    email_or_phone = EncryptedCharField(max_length=255)
    role = models.CharField(max_length=20, choices=User.ROLE_CHOICES)
    token = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    expires_at = models.DateTimeField()

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Invite for {self.email_or_phone} as {self.role}"

class OTPVerification(BaseModel):
    PURPOSE_CHOICES = [
        ("booking", "Booking Verification"),
        ("login", "Login Verification"),
    ]

    phone = EncryptedCharField(max_length=50, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    otp_hash = models.CharField(max_length=255)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)
    temp_token = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)

    def __str__(self):
        return f"OTP for {self.email or self.phone} ({self.purpose})"

