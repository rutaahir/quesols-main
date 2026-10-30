import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'queuing_solutions.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
import random

from companies.models import Company
from branches.models import Branch
from queuing.models import Desk, Service, Ticket, DeskService
from accounts.models import User
from audit.models import AuditLog
from appointments.models import OnlineBooking

company = Company.objects.first()
if not company:
    company = Company.objects.create(name="Quesole Demo Corp", is_active=True)

branches = list(Branch.objects.filter(company=company))
if len(branches) >= 2:
    head_office, branch_2 = branches[0], branches[1]
elif len(branches) == 1:
    head_office = branches[0]
    branch_2 = Branch.objects.create(company=company, name="Branch 2", is_active=True)
else:
    head_office = Branch.objects.create(company=company, name="Head Office", is_active=True)
    branch_2 = Branch.objects.create(company=company, name="Branch 2", is_active=True)

owner = User.objects.filter(company=company, role='company_admin').first() or User.objects.filter(company=company).first()
if not owner:
    owner = User.objects.filter(is_superuser=True).first()

# 1. Update/Create Services for Head Office
s1, _ = Service.all_objects.get_or_create(
    branch=head_office, prefix="A",
    defaults={'company': company, 'name': 'General Consultation', 'est_service_minutes': 15, 'is_active': True}
)
s2, _ = Service.all_objects.get_or_create(
    branch=head_office, prefix="B",
    defaults={'company': company, 'name': 'Account Advisory', 'est_service_minutes': 20, 'is_active': True}
)
s3, _ = Service.all_objects.get_or_create(
    branch=head_office, prefix="C",
    defaults={'company': company, 'name': 'Document Verification', 'est_service_minutes': 10, 'is_active': True}
)
s4, _ = Service.all_objects.get_or_create(
    branch=head_office, prefix="P",
    defaults={'company': company, 'name': 'Priority Counter Access', 'est_service_minutes': 8, 'is_active': True}
)

# Services for Branch 2
b2_s1, _ = Service.all_objects.get_or_create(
    branch=branch_2, prefix="A",
    defaults={'company': company, 'name': 'General Consultation', 'est_service_minutes': 15, 'is_active': True}
)
b2_s2, _ = Service.all_objects.get_or_create(
    branch=branch_2, prefix="B",
    defaults={'company': company, 'name': 'Account Advisory', 'est_service_minutes': 20, 'is_active': True}
)
b2_s3, _ = Service.all_objects.get_or_create(
    branch=branch_2, prefix="C",
    defaults={'company': company, 'name': 'Document Verification', 'est_service_minutes': 10, 'is_active': True}
)

# 2. Desks
# Head office desks
d_ho1, _ = Desk.all_objects.get_or_create(
    branch=head_office, name="Desk 01 (General)",
    defaults={'company': company, 'status': 'open', 'is_active': True, 'current_operator': owner}
)
d_ho2, _ = Desk.all_objects.get_or_create(
    branch=head_office, name="Desk 02 (Advisory)",
    defaults={'company': company, 'status': 'open', 'is_active': True, 'current_operator': owner}
)
d_ho3, _ = Desk.all_objects.get_or_create(
    branch=head_office, name="Desk 03 (Cash & Verification)",
    defaults={'company': company, 'status': 'open', 'is_active': True, 'current_operator': owner}
)
d_ho4, _ = Desk.all_objects.get_or_create(
    branch=head_office, name="Desk 04 (Express Support)",
    defaults={'company': company, 'status': 'open', 'is_active': True, 'current_operator': owner}
)

# Branch 2 desks
d_b1, _ = Desk.all_objects.get_or_create(
    branch=branch_2, name="Desk 01 (Main Counter)",
    defaults={'company': company, 'status': 'open', 'is_active': True, 'current_operator': owner}
)
d_b2, _ = Desk.all_objects.get_or_create(
    branch=branch_2, name="Desk 02 (Advisory Desk)",
    defaults={'company': company, 'status': 'open', 'is_active': True, 'current_operator': owner}
)

# Map desk services
all_desks = [d_ho1, d_ho2, d_ho3, d_ho4, d_b1, d_b2]
all_svcs = [s1, s2, s3, s4, b2_s1, b2_s2, b2_s3]
for d in all_desks:
    if not d:
        continue
    for s in all_svcs:
        if s and s.branch_id == d.branch_id:
            DeskService.objects.get_or_create(desk=d, service=s)

# 3. Seed Live Tickets across today
now = timezone.now()

# Customers list
customers = [
    ("Amit Patel", "+919876543210", "amit.patel@example.com", "A", s1, d_ho1, head_office),
    ("Neha Shah", "+919822011223", "neha.shah@example.com", "B", s2, d_ho2, head_office),
    ("Rahul Mehta", "+919711233445", "rahul.mehta@example.com", "A", b2_s1, d_b1, branch_2),
    ("Priya Desai", "+919900122334", "priya.desai@example.com", "C", s3, d_ho3, head_office),
    ("Ketan Joshi", "+919899044556", "ketan.joshi@example.com", "B", b2_s2, d_b2, branch_2),
    ("Deepak Sharma", "+919877712345", "deepak@example.com", "A", s1, d_ho1, head_office),
    ("Ananya Roy", "+919811122334", "ananya@example.com", "B", s2, d_ho2, head_office),
    ("Vikram Singh", "+919833344556", "vikram@example.com", "P", s4, d_ho4, head_office),
    ("Pooja Nair", "+919844455667", "pooja@example.com", "A", b2_s1, d_b1, branch_2),
    ("Rohan Verma", "+919855566778", "rohan@example.com", "C", s3, d_ho3, head_office),
    ("Suresh Reddy", "+919866677889", "suresh@example.com", "A", s1, d_ho1, head_office),
    ("Kavita Rao", "+919877788990", "kavita@example.com", "B", b2_s2, d_b2, branch_2),
    ("Manish Gupta", "+919888899001", "manish@example.com", "P", s4, d_ho4, head_office),
    ("Bhavin Choksi", "+919899900112", "bhavin@example.com", "A", s1, d_ho1, head_office),
    ("Drashti Vora", "+919812345678", "drashti@example.com", "C", s3, d_ho3, head_office),
]

# Clean up older tickets if any
Ticket.all_objects.filter(company=company).delete()

# Create 8 served tickets earlier today
for i in range(8):
    c_name, c_phone, c_email, pfx, svc, dsk, br = customers[i]
    t_joined = now - timedelta(hours=random.randint(2, 6), minutes=random.randint(5, 50))
    t_called = t_joined + timedelta(minutes=random.randint(3, 11))
    t_served = t_called + timedelta(minutes=random.randint(6, 14))
    t = Ticket.all_objects.create(
        company=company,
        branch=br,
        service=svc,
        desk=dsk,
        method="1",
        token_number=f"{pfx}-{101 + i}",
        customer_name=c_name,
        customer_phone=c_phone,
        customer_email=c_email,
        source="kiosk",
        channel="kiosk",
        source_method="KOT_PRINT",
        status="served",
        called_at=t_called,
        served_at=t_served,
        closed_at=t_served,
        served_by=owner,
        feedback_rating=5 if i % 4 != 0 else 4,
        feedback_text="Seamless and efficient service at the branch desk.",
        feedback_submitted_at=t_served + timedelta(minutes=2),
    )
    # Set created_at to t_joined
    Ticket.all_objects.filter(id=t.id).update(created_at=t_joined)

# Create 2 tickets currently serving
c_name, c_phone, c_email, pfx, svc, dsk, br = customers[8]
t_joined = now - timedelta(minutes=15)
t_called = now - timedelta(minutes=4)
t_serving1 = Ticket.all_objects.create(
    company=company,
    branch=br,
    service=svc,
    desk=dsk,
    method="1",
    token_number=f"{pfx}-109",
    customer_name=c_name,
    customer_phone=c_phone,
    customer_email=c_email,
    source="qr",
    channel="qr",
    source_method="QR_SCAN",
    status="serving",
    called_at=t_called,
    served_by=owner,
)
Ticket.all_objects.filter(id=t_serving1.id).update(created_at=t_joined)

c_name, c_phone, c_email, pfx, svc, dsk, br = customers[9]
t_joined = now - timedelta(minutes=12)
t_called = now - timedelta(minutes=2)
t_serving2 = Ticket.all_objects.create(
    company=company,
    branch=br,
    service=svc,
    desk=dsk,
    method="1",
    token_number=f"{pfx}-110",
    customer_name=c_name,
    customer_phone=c_phone,
    customer_email=c_email,
    source="kiosk",
    channel="kiosk",
    source_method="KOT_PRINT",
    status="serving",
    called_at=t_called,
    served_by=owner,
)
Ticket.all_objects.filter(id=t_serving2.id).update(created_at=t_joined)

# Create 5 waiting tickets
for i in range(10, 15):
    c_name, c_phone, c_email, pfx, svc, dsk, br = customers[i]
    t_joined = now - timedelta(minutes=random.randint(2, 9))
    t = Ticket.all_objects.create(
        company=company,
        branch=br,
        service=svc,
        desk=None,
        method="1",
        token_number=f"{pfx}-{101 + i}",
        customer_name=c_name,
        customer_phone=c_phone,
        customer_email=c_email,
        source="kiosk" if i % 2 == 0 else "qr",
        channel="kiosk" if i % 2 == 0 else "qr",
        source_method="KOT_PRINT" if i % 2 == 0 else "QR_SCAN",
        status="waiting",
    )
    Ticket.all_objects.filter(id=t.id).update(created_at=t_joined)

# 4. Audit Log Entries
AuditLog.all_objects.filter(company=company).delete()
audit_events = [
    ("TICKET_CALLED", "Ticket", f"{s1.name} Token #A-109 called to Desk 01", now - timedelta(minutes=4)),
    ("TICKET_SERVED", "Ticket", "Token #P-108 completed by operator Rutvika Jinjala", now - timedelta(minutes=9)),
    ("KIOSK_HEARTBEAT", "Kiosk", "Kiosk 01 (Entrance Lobby) ping telemetry healthy (14ms)", now - timedelta(minutes=14)),
    ("APPOINTMENT_SCHEDULED", "Appointment", "Online booking QS-8425 confirmed for Ketan Joshi", now - timedelta(minutes=22)),
    ("BRANCH_DESK_OPENED", "Desk", "Desk 04 (Express Support) opened for active customer triage", now - timedelta(minutes=45)),
]
for action, obj_type, changes_str, created_time in audit_events:
    log = AuditLog.all_objects.create(
        company=company,
        branch=head_office,
        actor=owner,
        action=action,
        object_type=obj_type,
        changes={"summary": changes_str},
    )
    AuditLog.all_objects.filter(id=log.id).update(created_at=created_time)

print(f"Successfully seeded: {Ticket.all_objects.filter(company=company).count()} tickets, {AuditLog.all_objects.filter(company=company).count()} audit logs.")
