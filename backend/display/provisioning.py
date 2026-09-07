import random
from display.models import DisplayTerminal
from billing.models import CompanyPlanAllocation
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def provision_displays_for_branch(branch):
    """
    Provisions exactly N live display terminal slots for the given branch based on allocations or package limits.
    """
    # 1. Determine N (display screen quota for this branch)
    alloc = CompanyPlanAllocation.objects.filter(
        company=branch.company, branch=branch, plan_component__key="live_display_screens"
    ).first()
    if alloc:
        N = alloc.purchased_qty
    else:
        # Fallback to company-wide allocation
        comp_alloc = CompanyPlanAllocation.objects.filter(
            company=branch.company, branch__isnull=True, plan_component__key="live_display_screens"
        ).first()
        if comp_alloc:
            N = comp_alloc.purchased_qty
        else:
            # Fallback to package max_displays (default 1 for out-of-the-box usability)
            pkg = getattr(branch.company, "package", None)
            pkg_displays = getattr(pkg, "max_displays", 1) if pkg else 1
            N = pkg_displays if pkg_displays > 0 else 1

    if N < 0:
        N = 0

    # 2. Sync DisplayTerminal records
    terminals = list(DisplayTerminal.objects.filter(branch=branch).order_by("id"))
    channel_layer = get_channel_layer()

    for idx, terminal in enumerate(terminals):
        if idx < N:
            if terminal.status != "active":
                terminal.status = "active"
                terminal.save()
        else:
            # Evict and deactivate excess terminals on quota reduction
            if terminal.status != "inactive":
                terminal.status = "inactive"
                session_token = terminal.session_token

                # Clear session details
                terminal.session_token = None
                terminal.connected_at = None
                terminal.last_seen = None
                terminal.save()

                # Trigger real-time WebSocket eviction on downgrade
                if session_token and channel_layer:
                    try:
                        async_to_sync(channel_layer.group_send)(
                            f"display_{terminal.id}",
                            {
                                "type": "display.force_logout",
                                "session_token": "evicted_by_deactivation",
                                "message": "This display terminal was deactivated due to plan quota downgrade"
                            }
                        )
                    except Exception as ex:
                        print(f"WebSocket force-logout failed for DisplayTerminal {terminal.id}: {ex}")

    # 3. Create missing display terminals
    if len(terminals) < N:
        for i in range(len(terminals) + 1, N + 1):
            passcode = "".join(str(random.randint(0, 9)) for _ in range(4))
            DisplayTerminal.objects.create(
                company=branch.company,
                branch=branch,
                terminal_identifier=f"Display {i}",
                passcode=passcode,
                status="active"
            )
