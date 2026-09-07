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

    class Meta:
        model = DisplayTerminal
        fields = [
            "id", "company", "branch", "terminal_identifier", "passcode", "status",
            "session_token", "connected_at", "last_seen", "desks_per_slot",
            "rotation_seconds", "slots", "is_logged_in", "created_at", "updated_at"
        ]

    def get_is_logged_in(self, obj):
        return obj.is_session_active()

class PublicDisplayTerminalSerializer(serializers.ModelSerializer):
    slots = DisplayTerminalSlotSerializer(many=True, read_only=True)

    class Meta:
        model = DisplayTerminal
        fields = [
            "id", "branch", "terminal_identifier", "status", "desks_per_slot",
            "rotation_seconds", "slots"
        ]
