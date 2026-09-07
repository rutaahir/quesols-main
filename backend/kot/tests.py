from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from companies.models import Company
from branches.models import Branch
from billing.models import Package, PlanComponent, CompanyPlanAllocation, UpgradeRequest
from kot.models import KotTerminal
from kot.provisioning import provision_kot_terminals_for_branch

class KotTerminalArchitectureTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.package = Package.objects.create(
            name="Starter Package",
            max_branches=5,
            max_users=10,
            max_kiosks=2,
            max_displays=2,
            max_kot_terminals=2,
            price_monthly=999.00,
            price_yearly=9999.00,
        )
        self.company = Company.objects.create(
            name="Food Court Express",
            industry="Restaurant",
            contact_email="admin@foodcourtexpress.com",
            contact_phone="9876543210",
            package=self.package,
            status="active"
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Main Outlet",
            slug="main-outlet"
        )
        Branch.objects.filter(id=self.branch.id).update(kiosk_password_hash="9999")
        PlanComponent.objects.get_or_create(key="branches", defaults={"label": "Branches", "unit_label": "branch", "price_per_unit": 0, "default_included_qty": 1, "category": "DESK"})
        PlanComponent.objects.get_or_create(key="operator_screens", defaults={"label": "Operator Screens", "unit_label": "desk", "price_per_unit": 500, "default_included_qty": 3, "category": "DESK"})
        PlanComponent.objects.get_or_create(key="services", defaults={"label": "Services", "unit_label": "service", "price_per_unit": 0, "default_included_qty": 0, "category": "DESK"})
        PlanComponent.objects.get_or_create(key="paper_roll_screens", defaults={"label": "Paper Roll Screens", "unit_label": "kiosk", "price_per_unit": 200, "default_included_qty": 1, "category": "KIOSK"})
        self.component_kot, _ = PlanComponent.objects.get_or_create(
            key="kot_terminals",
            defaults={
                "label": "Digital KOT Terminals",
                "unit_label": "terminal",
                "price_per_unit": 100.00,
                "category": "KIOSK"
            }
        )

    def test_backfill_and_provisioning_preserves_existing_pin(self):
        KotTerminal.objects.filter(branch=self.branch).delete()
        self.branch.kiosk_password_hash = "9999"
        self.branch.save()

        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch,
            plan_component=self.component_kot,
            purchased_qty=2
        )
        provision_kot_terminals_for_branch(self.branch)

        terminals = KotTerminal.objects.filter(branch=self.branch, status="active").order_by("id")
        self.assertEqual(terminals.count(), 2)
        self.assertEqual(terminals[0].terminal_identifier, "KOT 1")
        self.assertEqual(terminals[0].pin, self.branch.kiosk_password_hash)
        self.assertEqual(terminals[1].terminal_identifier, "KOT 2")
        self.assertTrue(len(terminals[1].pin) == 4)

    def test_pin_login_logout_and_session_eviction(self):
        provision_kot_terminals_for_branch(self.branch)
        terminal = KotTerminal.objects.get(branch=self.branch, terminal_identifier="KOT 1")

        res = self.client.post("/api/public/kot-terminals/login/", {"terminal_id": str(terminal.id), "pin": terminal.pin}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        token_1 = res.data["session_token"]
        self.assertIsNotNone(token_1)

        res2 = self.client.post("/api/public/kot-terminals/login/", {"terminal_id": str(terminal.id), "pin": terminal.pin}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        token_2 = res2.data["session_token"]
        self.assertNotEqual(token_1, token_2)

        terminal.refresh_from_db()
        self.assertEqual(terminal.session_token, token_2)

    def test_per_terminal_rate_limiting(self):
        provision_kot_terminals_for_branch(self.branch)
        terminal = KotTerminal.objects.get(branch=self.branch, terminal_identifier="KOT 1")

        for _ in range(5):
            self.client.post("/api/public/kot-terminals/login/", {"terminal_id": str(terminal.id), "pin": "invalid_pin"}, format="json")

        res_blocked = self.client.post("/api/public/kot-terminals/login/", {"terminal_id": str(terminal.id), "pin": terminal.pin}, format="json")
        self.assertEqual(res_blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_downgrade_deactivates_excess_terminals(self):
        alloc = CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch,
            plan_component=self.component_kot,
            purchased_qty=3
        )
        provision_kot_terminals_for_branch(self.branch)
        self.assertEqual(KotTerminal.objects.filter(branch=self.branch, status="active").count(), 3)

        alloc.purchased_qty = 1
        alloc.save()
        provision_kot_terminals_for_branch(self.branch)
        self.assertEqual(KotTerminal.objects.filter(branch=self.branch, status="active").count(), 1)
        self.assertEqual(KotTerminal.objects.filter(branch=self.branch, status="inactive").count(), 2)

    def test_max_kot_terminals_enforced_in_checkout(self):
        from accounts.models import User
        admin_user = User.objects.create(
            email="admin@foodcourtexpress.com",
            company=self.company,
            role="company_admin"
        )
        self.client.force_authenticate(user=admin_user)

        payload = {
            "branches": [
                {
                    "mode": "NON_SERVICE_BASED",
                    "channel_type": "ONSITE_ONLY",
                    "kot_qty": 4,
                    "service_qty": 1,
                    "operator_qty": 3,
                    "kiosk_qty": 1,
                    "addons": {"kot_terminals": 4}
                }
            ],
            "duration_months": 1
        }
        res = self.client.post("/api/billing/checkout-upgrade/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get("status"), "approval_required")
        self.assertTrue(UpgradeRequest.objects.filter(company=self.company, status="pending").exists())


