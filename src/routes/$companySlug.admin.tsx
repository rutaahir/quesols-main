import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  Users,
  Settings,
} from "lucide-react";
import { ConsoleShell, type NavItem } from "@/components/console/shell";
import { CompanyAdminView } from "@/components/console/company-admin";
import { useQuesole } from "@/lib/quesole/store";

export const Route = createFileRoute("/$companySlug/admin")({
  component: CompanyAdminDashboard,
});

const NAV: NavItem[] = [
  { id: "overview", label: "Company overview", icon: LayoutDashboard },
  { id: "branches", label: "Branches", icon: Building2 },
  { id: "staff", label: "Team", icon: Users },
  { id: "alerts", label: "Alert rules", icon: Bell },
  { id: "branding", label: "Branding", icon: Settings },
  { id: "billing", label: "Plan & usage", icon: CreditCard },
];

function CompanyAdminDashboard() {
  const { companySlug } = Route.useParams();
  const { session } = useQuesole();
  const navigate = useNavigate();
  const [active, setActive] = useState(NAV[0]!.id);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      void navigate({ to: "/$companySlug/login", params: { companySlug } });
    } else if (session.role === "super_admin") {
      void navigate({ to: "/app" });
    } else if (session.role !== "company_admin") {
      // Branch admins/operators shouldn't access company admin console
      // Redirect to their branch console
      const branch = session.branchId;
      // We will resolve it below or fallback
    }
  }, [session, navigate, companySlug]);

  if (!session || session.role !== "company_admin") {
    return null;
  }

  const validSubViews = ["branch_desks"];
  const isNav = NAV.some((n) => n.id === active);
  const current = isNav || validSubViews.includes(active) ? active : NAV[0]!.id;
  const activeNav = isNav ? active : (active === "branch_desks" ? "branches" : NAV[0]!.id);

  return (
    <ConsoleShell nav={NAV} active={activeNav} onNavigate={setActive}>
      <CompanyAdminView
        view={current}
        companyId={session.companyId}
        branchId={selectedBranchId || undefined}
        onManageDesks={(bId) => {
          setSelectedBranchId(bId);
          setActive("branch_desks");
        }}
        setView={setActive}
        companySlug={companySlug}
      />
    </ConsoleShell>
  );
}
