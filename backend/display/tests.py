from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

from companies.models import Company
from branches.models import Branch
from billing.models import Package, PlanComponent, CompanyPlanAllocation, UpgradeRequest
from accounts.models import User
from queuing.models import Desk, Ticket, Service
from display.models import DisplayTerminal, DisplayTerminalSlot
from display.provisioning import provision_displays_for_branch
from display.utils import broadcast_call_next_to_displays

class LiveDisplayTerminalSystemTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Fetch or create package
        self.package = Package.objects.first()
        if not self.package:
            self.package = Package.objects.create(
                name="Display Test Package",
                max_branches=10,
                max_users=50,
                max_kiosks=5,
                max_displays=5,
                price_monthly=Decimal("999.00"),
                price_yearly=Decimal("9999.00")
            )
        self.package.max_displays = 5
        self.package.save()

        # Create company
        self.company = Company.objects.create(
            name="Test Corp",
            slug="test-corp",
            package=self.package,
            status="active"
        )

        # Create branch
        self.branch = Branch.objects.create(
            company=self.company,
            name="Main Branch",
            slug="main-branch",
            status="active"
        )

        # Create plan components
        self.display_comp, _ = PlanComponent.objects.get_or_create(
            key="live_display_screens",
            defaults={
                "label": "Live Display Screens",
                "category": "ADDON",
                "price_per_unit": Decimal("25.00"),
                "is_active": True
            }
        )

        # Create user
        self.user = User.objects.create_user(
            email="admin@testcorp.com",
            password="password123",
            role="company_admin",
            company=self.company,
            branch=self.branch
        )

        # Create desks
        self.desk1 = Desk.objects.create(branch=self.branch, company=self.company, name="Desk 1", status="open", is_active=True)
        self.desk2 = Desk.objects.create(branch=self.branch, company=self.company, name="Desk 2", status="open", is_active=True)
        self.desk3 = Desk.objects.create(branch=self.branch, company=self.company, name="Unassigned Desk", status="open", is_active=True)

        # Create service
        self.service = Service.objects.create(branch=self.branch, company=self.company, name="General Service", prefix="A", is_active=True)

    def test_01_provisioning_from_quota(self):
        """Purchase 2 display screens -> exactly 2 DisplayTerminal records get provisioned"""
        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch,
            plan_component=self.display_comp,
            purchased_qty=2
        )

        terminals = DisplayTerminal.objects.filter(branch=self.branch, status="active")
        self.assertEqual(terminals.count(), 2)
        self.assertEqual(terminals[0].terminal_identifier, "Display 1")
        self.assertEqual(terminals[1].terminal_identifier, "Display 2")

    def test_02_passcode_login_and_eviction(self):
        """Passcode login, PIN regeneration eviction, and downgrade eviction work as expected"""
        # Provision 2 terminals
        provision_displays_for_branch(self.branch)
        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch,
            plan_component=self.display_comp,
            purchased_qty=2
        )
        term1 = DisplayTerminal.objects.get(branch=self.branch, terminal_identifier="Display 1")

        # 1. Login with passcode
        login_res1 = self.client.post("/api/public/display-terminals/login/", {
            "terminal_id": term1.id,
            "passcode": term1.passcode
        }, format="json")
        self.assertEqual(login_res1.status_code, status.HTTP_200_OK)
        token1 = login_res1.data["session_token"]
        self.assertIsNotNone(token1)

        # 2. Login again on same terminal -> evicts previous active session
        login_res2 = self.client.post("/api/public/display-terminals/login/", {
            "terminal_id": term1.id,
            "passcode": term1.passcode
        }, format="json")
        self.assertEqual(login_res2.status_code, status.HTTP_200_OK)
        token2 = login_res2.data["session_token"]
        self.assertNotEqual(token1, token2)

        # 3. Passcode regeneration -> evicts active session
        self.client.force_authenticate(user=self.user)
        regen_res = self.client.post(f"/api/display-terminals/{term1.id}/regenerate-passcode/")
        self.assertEqual(regen_res.status_code, status.HTTP_200_OK)
        term1.refresh_from_db()
        self.assertIsNone(term1.session_token)

        # 4. Downgrade eviction: set allocation to 0 -> deactivates terminal and clears session
        alloc = CompanyPlanAllocation.objects.get(company=self.company, branch=self.branch, plan_component=self.display_comp)
        alloc.purchased_qty = 0
        alloc.save()

        term1.refresh_from_db()
        self.assertEqual(term1.status, "inactive")
        self.assertIsNone(term1.session_token)

    def test_03_per_terminal_rate_limiting(self):
        """Rate limiting is scoped per-terminal (lockout on terminal 1 doesn't affect terminal 2)"""
        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch,
            plan_component=self.display_comp,
            purchased_qty=2
        )
        term1 = DisplayTerminal.objects.get(branch=self.branch, terminal_identifier="Display 1")
        term2 = DisplayTerminal.objects.get(branch=self.branch, terminal_identifier="Display 2")

        # Fail login 5 times on term1
        for _ in range(5):
            res = self.client.post("/api/public/display-terminals/login/", {
                "terminal_id": term1.id,
                "passcode": "INVALID"
            }, format="json")

        self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # Confirm term2 is NOT locked out
        term2_res = self.client.post("/api/public/display-terminals/login/", {
            "terminal_id": term2.id,
            "passcode": term2.passcode
        }, format="json")
        self.assertEqual(term2_res.status_code, status.HTTP_200_OK)

    def test_04_call_next_broadcast_routing_and_ordering(self):
        """Call-next on desk assigned to 2 display terminals broadcasts to both; desk assigned to 0 broadcasts to none"""
        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch,
            plan_component=self.display_comp,
            purchased_qty=2
        )
        term1 = DisplayTerminal.objects.get(branch=self.branch, terminal_identifier="Display 1")
        term2 = DisplayTerminal.objects.get(branch=self.branch, terminal_identifier="Display 2")

        # Slot 1 on term1 has desk1 & desk2
        slot1_t1 = DisplayTerminalSlot.objects.create(terminal=term1, order=1)
        slot1_t1.desks.set([self.desk1, self.desk2])

        # Slot 1 on term2 has desk1
        slot1_t2 = DisplayTerminalSlot.objects.create(terminal=term2, order=1)
        slot1_t2.desks.set([self.desk1])

        ticket = Ticket.objects.create(
            company=self.company,
            branch=self.branch,
            service=self.service,
            token_number="A001",
            customer_name="John Doe",
            status="called"
        )

        with patch("display.utils.async_to_sync") as mock_async_to_sync:
            # Broadcast call next for desk1 (assigned to BOTH term1 & term2)
            broadcast_call_next_to_displays(ticket, self.desk1)
            self.assertEqual(mock_async_to_sync.call_count, 2)

        with patch("display.utils.async_to_sync") as mock_async_to_sync:
            # Broadcast call next for desk3 (assigned to NONE)
            broadcast_call_next_to_displays(ticket, self.desk3)
            self.assertEqual(mock_async_to_sync.call_count, 0)

    def test_05_checkout_max_displays_ceiling_validation(self):
        """CheckoutUpgradeView validates max_displays ceiling and creates UpgradeRequest on breach"""
        self.client.force_authenticate(user=self.user)

        payload = {
            "duration_months": 12,
            "branches": [
                {
                    "name": "Main Branch",
                    "mode": "SERVICE_BASED",
                    "channel_type": "ONSITE_ONLY",
                    "service_qty": 2,
                    "operator_qty": 3,
                    "kiosk_qty": 1,
                    "display_qty": 10  # Exceeds max_displays (5)
                }
            ]
        }

        res = self.client.post("/api/billing/checkout-upgrade/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "approval_required")
        self.assertIn("upgrade_request_id", res.data)

        req = UpgradeRequest.objects.get(id=res.data["upgrade_request_id"])
        self.assertIn("displays_requested", str(req.details))
