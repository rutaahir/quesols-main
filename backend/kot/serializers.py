from rest_framework import serializers
from kot.models import Printer, KotPrintJob

class PrinterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Printer
        fields = ["id", "branch", "company", "name", "connection_type", "last_status", "last_checked_at", "token", "created_at", "updated_at"]
        read_only_fields = ["id", "company", "token", "created_at", "updated_at"]

class KotPrintJobSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source="ticket.token_number", read_only=True)
    service_name = serializers.CharField(source="ticket.service.name", read_only=True)
    customer_name = serializers.CharField(source="ticket.customer_name", read_only=True)
    created_at = serializers.DateTimeField(source="ticket.created_at", read_only=True)
    escpos_payload = serializers.SerializerMethodField()

    class Meta:
        model = KotPrintJob
        fields = ["id", "ticket", "printer", "status", "printed_at", "ticket_number", "service_name", "customer_name", "created_at", "escpos_payload"]
        read_only_fields = ["id", "printed_at"]

    def get_escpos_payload(self, obj):
        ticket = obj.ticket
        branch_name = ticket.branch.name if ticket.branch else "Quesole Branch"
        service_name = ticket.service.name if ticket.service else "General Service"
        created_time = ticket.created_at.strftime('%d-%m-%Y %H:%M') if ticket.created_at else ""
        return (
            f"[ESC_POS_RAW]\n"
            f"SIZE: 80mm\n"
            f"ALIGN: CENTER\n"
            f"TEXT: {branch_name.upper()}\n"
            f"TEXT: ------------------------\n"
            f"TEXT: TOKEN NUMBER: {ticket.token_number}\n"
            f"TEXT: Service: {service_name}\n"
            f"TEXT: Visitor: {ticket.customer_name}\n"
            f"TEXT: Date: {created_time}\n"
            f"TEXT: ------------------------\n"
            f"CUT: PAPER\n"
        )

from kot.models import Kiosk

class KioskSerializer(serializers.ModelSerializer):
    is_logged_in = serializers.SerializerMethodField()
    pin = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Kiosk
        fields = [
            "id",
            "company",
            "branch",
            "kiosk_identifier",
            "username",
            "pin",
            "status",
            "session_token",
            "connected_at",
            "last_seen",
            "is_logged_in",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "company", "session_token", "connected_at", "last_seen", "created_at", "updated_at"]
        validators = []

    def validate(self, attrs):
        branch = attrs.get("branch") or getattr(self.instance, "branch", None)
        kiosk_identifier = attrs.get("kiosk_identifier")
        if branch and kiosk_identifier:
            qs = Kiosk.objects.filter(branch=branch, kiosk_identifier__iexact=kiosk_identifier.strip())
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"kiosk_identifier": f"A kiosk named '{kiosk_identifier}' already exists in this branch. Please choose a different name."})

        username = attrs.get("username")
        if branch and username:
            qs_u = Kiosk.objects.filter(branch=branch, username__iexact=username.strip())
            if self.instance:
                qs_u = qs_u.exclude(pk=self.instance.pk)
            if qs_u.exists():
                raise serializers.ValidationError({"username": f"Username '{username}' is already in use by another kiosk in this branch."})
        return attrs

    def create(self, validated_data):
        import re
        if not validated_data.get("username"):
            ident = validated_data.get("kiosk_identifier", "kiosk")
            clean_user = re.sub(r'[^a-zA-Z0-9_-]', '', ident.lower().replace(' ', '-')) or "kiosk"
            branch = validated_data.get("branch")
            candidate = clean_user
            idx = 1
            while Kiosk.objects.filter(branch=branch, username__iexact=candidate).exists():
                candidate = f"{clean_user}-{idx}"
                idx += 1
            validated_data["username"] = candidate

        if not validated_data.get("pin"):
            import random
            validated_data["pin"] = "".join(str(random.randint(0, 9)) for _ in range(4))
        return super().create(validated_data)

    def get_is_logged_in(self, obj):
        return obj.is_session_active()

class PublicKioskSerializer(serializers.ModelSerializer):
    is_logged_in = serializers.SerializerMethodField()

    class Meta:
        model = Kiosk
        fields = [
            "id",
            "kiosk_identifier",
            "username",
            "status",
            "is_logged_in",
        ]

    def get_is_logged_in(self, obj):
        return obj.is_session_active()


from kot.models import KotTerminal

class KotTerminalSerializer(serializers.ModelSerializer):
    is_logged_in = serializers.SerializerMethodField()
    pin = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = KotTerminal
        fields = [
            "id",
            "company",
            "branch",
            "terminal_identifier",
            "username",
            "pin",
            "status",
            "session_token",
            "connected_at",
            "last_seen",
            "is_logged_in",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "company", "session_token", "connected_at", "last_seen", "created_at", "updated_at"]
        validators = []

    def validate(self, attrs):
        branch = attrs.get("branch") or getattr(self.instance, "branch", None)
        username = attrs.get("username")
        if branch and username:
            qs_u = KotTerminal.objects.filter(branch=branch, username__iexact=username.strip())
            if self.instance:
                qs_u = qs_u.exclude(pk=self.instance.pk)
            if qs_u.exists():
                raise serializers.ValidationError({"username": f"Username '{username}' is already in use by another KOT terminal in this branch."})
        return attrs

    def create(self, validated_data):
        import re
        if not validated_data.get("username"):
            ident = validated_data.get("terminal_identifier", "kot")
            clean_user = re.sub(r'[^a-zA-Z0-9_-]', '', ident.lower().replace(' ', '-')) or "kot"
            branch = validated_data.get("branch")
            candidate = clean_user
            idx = 1
            while KotTerminal.objects.filter(branch=branch, username__iexact=candidate).exists():
                candidate = f"{clean_user}-{idx}"
                idx += 1
            validated_data["username"] = candidate

        if not validated_data.get("pin"):
            import random
            validated_data["pin"] = "".join(str(random.randint(0, 9)) for _ in range(4))
        return super().create(validated_data)

    def get_is_logged_in(self, obj):
        return obj.is_session_active()

class PublicKotTerminalSerializer(serializers.ModelSerializer):
    is_logged_in = serializers.SerializerMethodField()

    class Meta:
        model = KotTerminal
        fields = [
            "id",
            "terminal_identifier",
            "username",
            "status",
            "is_logged_in",
        ]

    def get_is_logged_in(self, obj):
        return obj.is_session_active()

