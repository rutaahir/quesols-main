import secrets
from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class DisplayDevice(BaseModel):
    STATUS_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline"),
    ]

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="display_devices")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="display_devices")
    pairing_code = models.CharField(max_length=20, unique=True)
    desk_group = models.JSONField(default=list, blank=True)
    layout = models.CharField(max_length=100, default="default")
    last_seen_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="offline")

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"{self.branch.name} - Device {self.pairing_code} ({self.status})"

class DisplayTerminal(BaseModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="display_terminals")
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="display_terminals")
    terminal_identifier = models.CharField(max_length=255)
    passcode = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    session_token = models.CharField(max_length=255, null=True, blank=True)
    connected_at = models.DateTimeField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    # Configurable timing & desk layout settings
    desks_per_slot = models.PositiveIntegerField(default=4)
    rotation_seconds = models.PositiveIntegerField(default=10)

    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = ("branch", "terminal_identifier")

    def is_session_active(self):
        if self.status != "active":
            return False
        if not self.session_token:
            return False
        if not self.last_seen:
            return False
        from django.utils import timezone
        # Expire session if no heartbeat for more than 45 seconds
        if (timezone.now() - self.last_seen).total_seconds() > 45:
            self.session_token = None
            self.connected_at = None
            self.last_seen = None
            self.save()
            return False
        return True

    def __str__(self):
        return f"{self.branch.name} - {self.terminal_identifier}"


class DisplayTerminalSlot(BaseModel):
    terminal = models.ForeignKey(DisplayTerminal, on_delete=models.CASCADE, related_name="slots")
    order = models.PositiveIntegerField(default=1)
    desks = models.ManyToManyField("queuing.Desk", related_name="display_slots", blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Slot #{self.order} for {self.terminal.terminal_identifier}"
