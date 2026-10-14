from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from queuing.models import Ticket, Desk, Service, DeskService, UserService, DeskStaffAssignment
from audit.utils import log_audit

def is_no_service_mode(company):
    """
    Returns True if the company is in No-Service Mode (purchased_qty of services is explicitly 0).
    """
    if not company:
        return False
    from billing.models import CompanyPlanAllocation
    try:
        from django.db.models import Sum
        res = CompanyPlanAllocation.objects.filter(
            company=company,
            plan_component__key="services"
        ).aggregate(total=Sum('purchased_qty'))
        if res['total'] is not None and res['total'] == 0:
            return True
        return False
    except Exception:
        return False

def get_eligible_desks_for_service(service):
    """
    Returns desks in service.branch that are active and support the given service.
    """
    return Desk.objects.filter(
        branch=service.branch,
        is_active=True,
        desk_services__service=service
    ).distinct()

def get_eligible_staff_for_desk_and_service(desk, service):
    """
    Returns active staff users assigned to desk AND qualified for service via UserService.
    """
    from accounts.models import User
    return User.objects.filter(
        branch=desk.branch,
        is_active=True,
        desk_assignments__desk=desk,
        desk_assignments__is_active=True,
        user_services__service=service
    ).distinct()

def claim_next_ticket(desk, user):
    """
    Atomically claims the next eligible ticket for an operator desk and user.
    Uses select_for_update(skip_locked=True) inside a database transaction to prevent
    double-claiming by concurrent operators.
    """
    if user.role not in ["company_admin", "super_admin"]:
        if user.branch and desk.branch != user.branch:
            raise PermissionDenied("Operator and Desk must belong to the same branch.")
    if user.company and desk.company != user.company:
        raise PermissionDenied("Operator and Desk must belong to the same company.")

    if desk.current_operator and desk.current_operator != user:
        if desk.status == "open":
            raise ValidationError("This desk is already in use by another operator.")

    if not desk.is_active or desk.status == "offline" or desk.current_operator != user:
        desk.is_active = True
        desk.status = "open"
        desk.current_operator = user
        desk.save(update_fields=["is_active", "status", "current_operator"])

    no_service = is_no_service_mode(desk.company)
    eligible_service_ids = []

    if not no_service:
        # Get services handled by this desk
        desk_service_ids = list(DeskService.objects.filter(desk=desk).values_list("service_id", flat=True))
        if not desk_service_ids:
            # Fallback to all active services in this branch if desk isn't explicitly restricted
            desk_service_ids = list(Service.objects.filter(branch=desk.branch, is_active=True).values_list("id", flat=True))

        # Get services user is qualified for
        qualified_service_ids = list(UserService.objects.filter(user=user).values_list("service_id", flat=True))
        
        # Intersection of desk services and user qualifications
        if qualified_service_ids:
            eligible_service_ids = [sid for sid in desk_service_ids if sid in qualified_service_ids]
        else:
            eligible_service_ids = desk_service_ids

        if not eligible_service_ids:
            return None

    now = timezone.now()

    with transaction.atomic():
        if no_service:
            waiting_qs = Ticket.objects.filter(
                Q(scheduled_for__isnull=True) | Q(scheduled_for__lte=now),
                branch=desk.branch,
                status="waiting"
            ).order_by("created_at")
        else:
            waiting_qs = Ticket.objects.filter(
                Q(scheduled_for__isnull=True) | Q(scheduled_for__lte=now),
                branch=desk.branch,
                service_id__in=eligible_service_ids,
                status="waiting"
            ).order_by("created_at")

        # Get tickets that belong to this desk (either predicted or explicitly assigned)
        desk_qs = waiting_qs.filter(Q(predicted_desk=desk) | Q(desk=desk))

        # Atomic row lock on waiting ticket
        from django.db.utils import NotSupportedError
        try:
            ticket = desk_qs.select_for_update(skip_locked=True).first()
        except NotSupportedError:
            ticket = desk_qs.select_for_update().first()

        if not ticket:
            return None

        # Update ticket status atomically
        ticket.status = "called"
        ticket.called_at = now
        ticket.desk = desk
        ticket.served_by = user
        ticket.save()

        log_audit(
            actor=user,
            company=desk.company,
            branch=desk.branch,
            action="ticket_called",
            object_type="Ticket",
            object_id=ticket.id,
            changes={"token": ticket.token_number, "desk": desk.name, "served_by": user.email}
        )

        return ticket


def assign_predicted_desk_for_ticket(ticket):
    """
    Assigns a predicted desk to a waiting ticket based on load balancing.
    Uses select_for_update() inside a transaction to prevent race conditions.
    """
    from queuing.models import DeskService, Desk, Ticket
    
    no_service = is_no_service_mode(ticket.company)

    if no_service:
        eligible_desk_ids = list(Desk.objects.filter(
            branch=ticket.branch,
            is_active=True
        ).values_list("id", flat=True))
    else:
        if not ticket.service:
            return
        # 1. Find eligible desks (is_active=True and supports this service)
        eligible_desk_ids = list(DeskService.objects.filter(
            service=ticket.service,
            desk__branch=ticket.branch,
            desk__is_active=True
        ).values_list("desk_id", flat=True))

    if not eligible_desk_ids:
        return

    # Use select_for_update to lock eligible desks and serialize calculation
    with transaction.atomic():
        desks = list(Desk.objects.filter(id__in=eligible_desk_ids).select_for_update().order_by("id"))
        if not desks:
            return

        best_desk = None
        min_load = float("inf")
        min_services_count = float("inf")
        cutoff = timezone.now() - timezone.timedelta(hours=24)

        for d in desks:
            load = Ticket.objects.filter(
                predicted_desk=d,
                status="waiting",
                created_at__gte=cutoff
            ).count()

            # Count assigned services to prioritize specialized counters over multi-service counters
            services_count = d.desk_services.count()

            # Prefer lower queue load; if load is equal, prefer more specialized desk (fewer assigned services)
            if load < min_load or (load == min_load and services_count < min_services_count):
                min_load = load
                min_services_count = services_count
                best_desk = d

        if best_desk:
            ticket.predicted_desk = best_desk


def rebalance_branch_queue(branch):
    """
    Intelligently re-balances all active waiting tickets across eligible desks in the branch.
    Ensures specialized and idle desks receive tickets first, preventing bottlenecking at multi-service desks.
    """
    from queuing.models import Ticket, Desk, DeskService
    from queuing.views import broadcast_queue_update

    cutoff = timezone.now() - timezone.timedelta(hours=24)
    with transaction.atomic():
        waiting_tickets = list(
            Ticket.objects.filter(
                branch=branch,
                status="waiting",
                created_at__gte=cutoff
            ).select_for_update().order_by("created_at")
        )

        if not waiting_tickets:
            return

        # Track simulated load during redistribution
        active_desks = list(Desk.objects.filter(branch=branch, is_active=True).order_by("id"))
        desk_load = {d.id: 0 for d in active_desks}
        desk_services_map = {
            d.id: set(DeskService.objects.filter(desk=d).values_list("service_id", flat=True))
            for d in active_desks
        }

        # 1. First pass: Assign tickets whose service can only be served by a single desk
        unassigned_tickets = []
        for t in waiting_tickets:
            if not t.service_id:
                unassigned_tickets.append(t)
                continue
            eligible = [d for d in active_desks if t.service_id in desk_services_map.get(d.id, set())]
            if len(eligible) == 1:
                target_desk = eligible[0]
                if t.predicted_desk_id != target_desk.id:
                    t.predicted_desk = target_desk
                    t.save(update_fields=["predicted_desk"])
                    try:
                        broadcast_queue_update(branch.id, t)
                    except Exception:
                        pass
                desk_load[target_desk.id] += 1
            else:
                unassigned_tickets.append(t)

        # 2. Second pass: Assign tickets with multiple eligible desks, prioritizing lowest load & specialist counters
        for t in unassigned_tickets:
            if not t.service_id:
                eligible = active_desks
            else:
                eligible = [d for d in active_desks if t.service_id in desk_services_map.get(d.id, set())]

            if not eligible:
                continue

            # Sort candidate desks by: (current simulated load ASC, service count ASC [specialist first], desk id ASC)
            best_desk = min(
                eligible,
                key=lambda d: (
                    desk_load.get(d.id, 0),
                    len(desk_services_map.get(d.id, set())),
                    d.id
                )
            )

            if t.predicted_desk_id != best_desk.id:
                t.predicted_desk = best_desk
                t.save(update_fields=["predicted_desk"])
                try:
                    broadcast_queue_update(branch.id, t)
                except Exception:
                    pass

            desk_load[best_desk.id] += 1


def redistribute_tickets_for_deactivated_desk(desk):
    """
    Redistributes all waiting tickets predicted to a deactivated desk.
    """
    if desk and desk.branch:
        rebalance_branch_queue(desk.branch)


def reevaluate_predictions_for_desk(desk):
    """
    Re-evaluates waiting tickets predicted to a desk or when desk services change.
    """
    if desk and desk.branch:
        rebalance_branch_queue(desk.branch)


