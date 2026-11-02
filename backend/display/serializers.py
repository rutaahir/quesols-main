from rest_framework import serializers
from display.models import DisplayTerminal, DisplayTerminalSlot
from queuing.models import Desk

class DeskBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Desk
        fields = ["id", "branch", "name", "status", "is_active"]

class DisplayTerminalSlotSerializer(serializers.ModelSerializer):
    desks_detail = DeskBriefSerializer(source="desks", many=True, read_only=True)
    desk_ids = serializers.PrimaryKeyRelatedField(
        queryset=Desk.objects.all(), source="desks", many=True, required=False
    )

    class Meta:
        model = DisplayTerminalSlot
        fields = ["id", "terminal", "order", "desks", "desk_ids", "desks_detail", "created_at", "updated_at"]

class DisplayTerminalSerializer(serializers.ModelSerializer):
    slots = DisplayTerminalSlotSerializer(many=True, read_only=True)
    is_logged_in = serializers.SerializerMethodField()
    username = serializers.CharField(required=False, allow_blank=True)
    passcode = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = DisplayTerminal
        fields = [
            "id", "company", "branch", "terminal_identifier", "username", "passcode", "status",
            "session_token", "connected_at", "last_seen", "desks_per_slot",
            "rotation_seconds", "slots", "is_logged_in", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "company", "session_token", "connected_at", "last_seen", "created_at", "updated_at"]

    def validate(self, attrs):
        branch = attrs.get("branch") or getattr(self.instance, "branch", None)
        username = attrs.get("username")
        if branch and username:
            qs_u = DisplayTerminal.objects.filter(branch=branch, username__iexact=username.strip())
            if self.instance:
                qs_u = qs_u.exclude(pk=self.instance.pk)
            if qs_u.exists():
                raise serializers.ValidationError({"username": f"Username '{username}' is already in use by another display terminal in this branch."})
        return attrs

    def create(self, validated_data):
        import re, random
        branch = validated_data.get("branch")
        if not validated_data.get("company") and branch:
            validated_data["company"] = getattr(branch, "company", None)

        if not validated_data.get("username"):
            ident = validated_data.get("terminal_identifier", "display")
            clean_user = re.sub(r'[^a-zA-Z0-9_-]', '', ident.lower().replace(' ', '-')) or "display"
            candidate = clean_user
            idx = 1
            while DisplayTerminal.objects.filter(branch=branch, username__iexact=candidate).exists():
                candidate = f"{clean_user}-{idx}"
                idx += 1
            validated_data["username"] = candidate

        if not validated_data.get("passcode"):
            validated_data["passcode"] = "".join(str(random.randint(0, 9)) for _ in range(4))
        return super().create(validated_data)

    def get_is_logged_in(self, obj):
        return obj.is_session_active()

class PublicDisplayTerminalSerializer(serializers.ModelSerializer):
    slots = DisplayTerminalSlotSerializer(many=True, read_only=True)

    class Meta:
        model = DisplayTerminal
        fields = [
            "id", "branch", "terminal_identifier", "username", "status", "desks_per_slot",
            "rotation_seconds", "slots"
        ]
