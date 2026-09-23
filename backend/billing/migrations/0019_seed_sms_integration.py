from django.db import migrations
from decimal import Decimal

def seed_sms_integration(apps, schema_editor):
    PlanComponent = apps.get_model("billing", "PlanComponent")

    sms_seed = {
        "key": "sms_integration",
        "label": "SMS Integration",
        "category": "ADDON",
        "branch_mode_scope": "BOTH",
        "pricing_type": "FLAT",
        "default_included_qty": 0,
        "price_per_unit": Decimal("500.00"),
        "unit_label": "SMS Addon",
        "description": "Enable SMS OTP verification and text message notifications for your organization.",
        "is_mandatory": False,
        "is_active": True,
        "is_toggle": True,
        "icon_key": "message-square",
        "display_order": 12,
    }

    PlanComponent.objects.update_or_create(key="sms_integration", defaults=sms_seed)

def reverse_sms_integration(apps, schema_editor):
    PlanComponent = apps.get_model("billing", "PlanComponent")
    PlanComponent.objects.filter(key="sms_integration").delete()

class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0018_package_max_kot_terminals'),
    ]

    operations = [
        migrations.RunPython(seed_sms_integration, reverse_sms_integration),
    ]
