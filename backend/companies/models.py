import re
from django.core.exceptions import ValidationError
from django.db import models
from core.models import BaseModel

from encrypted_model_fields.fields import EncryptedCharField

RESERVED_SLUGS = {
    "about", "app", "book", "contact", "display", "forgot-password",
    "kiosk", "kot", "live-demo", "login", "partnerships", "pricing",
    "q", "services", "signup", "t", "admin", "healthz", "api", "static", "media"
}

def validate_company_slug(value):
    if not value:
        return
    if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', value):
        raise ValidationError("Slug must be lowercase and contain only letters, numbers, and hyphens.")
    if value in RESERVED_SLUGS:
        raise ValidationError(f"'{value}' is a reserved word and cannot be used as a slug.")

class Company(BaseModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending", "Pending"),
        ("active", "Active"),
        ("suspended", "Suspended"),
        ("rejected", "Rejected"),
    ]

    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=255)
    contact_email = models.EmailField(unique=True)
    contact_phone = EncryptedCharField(max_length=50)
    logo_url = models.TextField(null=True, blank=True)
    tagline = models.CharField(max_length=255, null=True, blank=True)
    support_phone = EncryptedCharField(max_length=50, null=True, blank=True)
    support_email = models.EmailField(null=True, blank=True)
    brand_colors = models.JSONField(default=dict, blank=True)
    address = models.CharField(max_length=500, null=True, blank=True)
    city = models.CharField(max_length=255, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, default="India", null=True, blank=True)
    custom_industry = models.CharField(max_length=255, null=True, blank=True)
    website = models.URLField(max_length=255, null=True, blank=True)
    ONBOARDING_STATUS_CHOICES = [
        ("pending_payment", "Pending Payment"),
        ("pending_invoice_approval", "Pending Invoice Approval"),
        ("active", "Active"),
        ("suspended", "Suspended"),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    onboarding_status = models.CharField(max_length=30, choices=ONBOARDING_STATUS_CHOICES, default="active")
    package = models.ForeignKey("billing.Package", on_delete=models.SET_NULL, null=True, blank=True, related_name="companies")
    slug = models.SlugField(max_length=255, unique=True, null=True, blank=True, validators=[validate_company_slug])
    solution = models.CharField(max_length=50, default="ONSITE_ONLINE")
    plan_config = models.JSONField(default=dict, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.name)
            if not base_slug:
                base_slug = "company"
            
            slug = base_slug
            # Handle reserved words in auto-generation
            if slug in RESERVED_SLUGS:
                slug = f"{slug}-co"
                
            counter = 1
            while Company.objects.filter(slug=slug).exclude(id=self.id).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        else:
            self.slug = self.slug.lower().strip()
            validate_company_slug(self.slug)
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class InterestedCandidate(BaseModel):
    STATUS_CHOICES = [
        ("interested", "Interested (Step 1 Completed)"),
        ("invoice_requested", "Invoice Requested"),
        ("plan_purchased", "Plan Purchased"),
        ("contacted", "Contacted"),
        ("dropped", "Dropped"),
    ]

    company_name = models.CharField(max_length=255)
    industry = models.CharField(max_length=255)
    custom_industry = models.CharField(max_length=255, null=True, blank=True)
    country = models.CharField(max_length=100, default="India")
    state = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=500, blank=True, null=True)
    contact_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = EncryptedCharField(max_length=50)
    country_code = models.CharField(max_length=10, default="+91")
    website = models.URLField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="interested")
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="candidate_records")
    company = models.ForeignKey("companies.Company", on_delete=models.SET_NULL, null=True, blank=True, related_name="candidate_leads")
    notes = models.TextField(blank=True, null=True)
    plan_config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.contact_name} - {self.company_name} ({self.status})"

