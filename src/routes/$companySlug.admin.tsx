import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
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
  { id: "online_booking_fields", label: "Online Booking Form", icon: FileText },
  { id: "staff", label: "Team", icon: Users },
  { id: "alerts", label: "Alert rules", icon: Bell },
  { id: "branding", label: "Branding", icon: Settings },
  { id: "billing", label: "Plan & usage", icon: CreditCard },
];

function CompanyAdminDashboard() {
  const { companySlug } = Route.useParams();
  const { session } = useQuesole();
  const navigate = useNavigate();

  const [active, setActive] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get("view");
      if (urlView) return urlView;
      const saved = sessionStorage.getItem(`admin_active_view_${companySlug}`) || localStorage.getItem(`admin_active_view_${companySlug}`);
      if (saved) return saved;
    }
    return NAV[0]!.id;
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlBranchId = params.get("branchId");
      if (urlBranchId) return urlBranchId;
      return sessionStorage.getItem(`admin_selected_branch_${companySlug}`) || localStorage.getItem(`admin_selected_branch_${companySlug}`) || null;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && companySlug) {
      sessionStorage.setItem(`admin_active_view_${companySlug}`, active);
      localStorage.setItem(`admin_active_view_${companySlug}`, active);
      if (selectedBranchId) {
        sessionStorage.setItem(`admin_selected_branch_${companySlug}`, selectedBranchId);
        localStorage.setItem(`admin_selected_branch_${companySlug}`, selectedBranchId);
      }
      const params = new URLSearchParams(window.location.search);
      params.set("view", active);
      if (selectedBranchId) params.set("branchId", selectedBranchId);
      const newSearch = params.toString();
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [active, selectedBranchId, companySlug]);

  useEffect(() => {
    if (!session) {
      void navigate({ to: "/$companySlug/login", params: { companySlug } });
    } else if (session.role === "super_admin") {
      void navigate({ to: "/app" });
    } else if (session.role !== "company_admin") {
      // Branch admins/operators shouldn't access company admin console
      const branch = session.branchId;
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
