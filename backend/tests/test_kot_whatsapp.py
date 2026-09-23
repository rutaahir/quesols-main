import pytest
from django.core import mail
from rest_framework import status
from rest_framework.test import APIClient
from branches.models import Branch
from companies.models import Company
from queuing.models import Service, QueueMethod, Ticket, KotNotificationLog

@pytest.mark.django_db
def test_kot_whatsapp_token_generation():
    mail.outbox = []
    client = APIClient()
    company = Company.objects.create(name="KOT Corp", slug="kot-corp")
    branch = Branch.objects.create(company=company, name="Main Office", city="Vadodara", status="active")
    service = Service.objects.create(company=company, branch=branch, name="prepaid", prefix="A", is_active=True)

    payload = {
        "branch_id": branch.id,
        "customer_name": "Rahul Sharma",
        "customer_phone": "9876543210",
        "customer_email": "rahul@example.com",
        "service_id": service.id,
        "channel": "whatsapp",
        "consent": True
    }

    res = client.post("/api/public/join/", payload)
    assert res.status_code == status.HTTP_201_CREATED
    assert "wa.me/919876543210" in res.data.get("wa_me_url", "") or "wa.me/919876543210" in res.data.get("whatsapp_url", "") or "919876543210" in res.data.get("whatsapp_url", "")

    # Verify ticket in DB
    ticket = Ticket.objects.get(id=res.data["id"])
    assert ticket.customer_name == "Rahul Sharma"
    assert ticket.method == "4"
    assert ticket.channel == "whatsapp"

    # Verify NO email was sent for WhatsApp channel selection
    assert len(mail.outbox) == 0

    # Verify KotNotificationLog created for whatsapp channel
    log_entry = KotNotificationLog.objects.filter(ticket=ticket, channel="whatsapp").first()
    assert log_entry is not None
