import time
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from display.models import DisplayTerminal

_sequence_counter = 0

def get_next_sequence_num():
    global _sequence_counter
    _sequence_counter += 1
    # Fallback / monotonic counter combined with microsecond timestamp
    return int(time.time() * 1000) * 100 + (_sequence_counter % 100)

def broadcast_call_next_to_displays(ticket, desk):
    """
    Broadcasts a 'now_calling' announcement event to all active DisplayTerminals in the branch
    that have the specified desk assigned to any of their configured slots.
    """
    if not desk or not desk.branch:
        return

    # Find active terminals in desk's branch that have this desk in any configured slot
    terminals = DisplayTerminal.objects.filter(
        branch=desk.branch,
        status="active",
        slots__desks=desk
    ).distinct()

    if not terminals.exists():
        return

    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    now_iso = timezone.now().isoformat()
    seq = get_next_sequence_num()

    ticket_id = str(ticket.id) if ticket else ""
    token_number = ticket.token_number if ticket else ""
    customer_name = getattr(ticket, "customer_name", "Guest") or "Guest"
    service_name = ticket.service.name if (ticket and ticket.service) else ""

    for terminal in terminals:
        payload = {
            "type": "display.announcement",
            "event": "now_calling",
            "timestamp": now_iso,
            "seq_num": seq,
            "data": {
                "terminal_id": terminal.id,
                "terminal_identifier": terminal.terminal_identifier,
                "ticket_id": ticket_id,
                "token_number": token_number,
                "customer_name": customer_name,
                "desk_id": str(desk.id),
                "desk_name": desk.name,
                "service_name": service_name,
                "called_at": now_iso,
                "sequence": seq
            }
        }
        try:
            async_to_sync(channel_layer.group_send)(
                f"display_{terminal.id}",
                payload
            )
        except Exception as e:
            print(f"Failed to broadcast call-next announcement to DisplayTerminal {terminal.id}: {e}")
