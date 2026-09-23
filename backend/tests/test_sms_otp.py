import pytest
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import OTPVerification
from billing.models import PlanComponent, CompanyPlanAllocation
from companies.models import Company

@pytest.mark.django_db
def test_sms_otp_send_and_verify():
    client = APIClient()
    phone_number = "+919876543210"

    # 1. Send SMS OTP
    res_send = client.post("/api/public/appointments/otp/send/", {
        "phone": phone_number,
        "channel": "sms",
        "purpose": "booking"
    })
    assert res_send.status_code == status.HTTP_200_OK
    assert res_send.data["channel"] == "sms"
    assert "otp" in res_send.data

    otp_code = res_send.data["otp"]

    # Retrieve OTP record from DB
    otp_rec = next(o for o in OTPVerification.objects.filter(purpose="booking") if o.phone == phone_number)
    assert otp_rec is not None

    # 2. Verify wrong OTP code
    res_fail = client.post("/api/public/appointments/otp/verify/", {
        "phone": phone_number,
        "channel": "sms",
        "code": "000000"
    })
    assert res_fail.status_code == status.HTTP_400_BAD_REQUEST

    # 3. Verify correct OTP code
    res_ok = client.post("/api/public/appointments/otp/verify/", {
        "phone": phone_number,
        "channel": "sms",
        "code": otp_code
    })
    assert res_ok.status_code == status.HTTP_200_OK
    assert res_ok.data["channel"] == "sms"

    otp_rec.refresh_from_db()
    assert otp_rec.verified_at is not None

@pytest.mark.django_db
def test_public_company_sms_enabled_flag():
    client = APIClient()
    company = Company.objects.create(name="SMS Test Corp", slug="sms-test-corp")

    # Without addon
    res1 = client.get(f"/api/public/company/{company.slug}/")
    assert res1.status_code == status.HTTP_200_OK
    assert res1.data["sms_enabled"] is False

    # Add SMS Integration addon allocation
    comp, _ = PlanComponent.objects.get_or_create(key="sms_integration", defaults={"label": "SMS Integration"})
    CompanyPlanAllocation.objects.create(
        company=company,
        plan_component=comp,
        purchased_qty=1
    )

    res2 = client.get(f"/api/public/company/{company.slug}/")
    assert res2.status_code == status.HTTP_200_OK
    assert res2.data["sms_enabled"] is True
