import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  MonitorPlay,
  ScrollText,
  TrendingUp,
  Users,
  Settings,
} from "lucide-react";
import { ConsoleShell, type NavItem } from "@/components/console/shell";
import { SuperAdminView } from "@/components/console/super-admin";
import { CompanyAdminView } from "@/components/console/company-admin";
import { BranchConsoleView } from "@/components/console/branch-console";
import { BranchDesksServicesManager } from "@/components/console/branch-desks-services";
import { useQuesole } from "@/lib/quesole/store";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Operations console — Quesole" },
      {
        name: "description",
        content:
          "Run queues, desks, staff and appointments across every branch from one live Quesole console.",
      },
      { property: "og:title", content: "Quesole operations console" },
      {
        property: "og:description",
        content: "Live queue dashboards for platform, company, branch and desk roles.",
      },
    ],
  }),
  component: ConsolePage,
});

const NAV: Record<string, NavItem[]> = {
  super_admin: [
    { id: "overview", label: "Platform overview", icon: LayoutDashboard },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "upgrades", label: "Plan requests", icon: TrendingUp },
    { id: "packages", label: "Packages", icon: CreditCard },
    { id: "audit", label: "Audit log", icon: ScrollText },
  ],
  company_admin: [
    { id: "overview", label: "Company overview", icon: LayoutDashboard },
    { id: "branches", label: "Branches", icon: Building2 },
    { id: "online_booking_fields", label: "Online Booking Form", icon: FileText },
    { id: "staff", label: "Team", icon: Users },
    { id: "alerts", label: "Alert rules", icon: Bell },
    { id: "branding", label: "Branding", icon: Settings },
    { id: "billing", label: "Plan & usage", icon: CreditCard },
  ],
  branch_admin: [
    { id: "overview", label: "Branch overview", icon: LayoutDashboard },
    { id: "desks", label: "Desks & Services", icon: MonitorPlay },
    { id: "staff", label: "Team", icon: Users },
    { id: "methods", label: "Queue Methods", icon: Settings },
    { id: "appointments", label: "Appointments", icon: CalendarDays },
    { id: "desk", label: "Desk console", icon: Users },
  ],
  operator: [
    { id: "desk", label: "Desk console", icon: Users },
    { id: "overview", label: "Branch overview", icon: LayoutDashboard },
    { id: "appointments", label: "Appointments", icon: CalendarDays },
  ],
};

function ConsolePage() {
  const { session, state } = useQuesole();
  const navigate = useNavigate();
  const role = session?.role ?? "company_admin";
  const nav = NAV[role] ?? NAV["company_admin"]!;
  const [active, setActive] = useState(nav[0]!.id);

  useEffect(() => {
    if (!session) {
      void navigate({ to: "/login" });
      return;
    }

    if (session.role === "super_admin") {
      return;
    }

    const company = state.companies.find((c) => String(c.id) === String(session.companyId));
    const branch = state.branches.find((b) => String(b.id) === String(session.branchId));

    if (session.role === "company_admin" && company?.slug) {
      void navigate({ to: "/$companySlug/admin", params: { companySlug: company.slug } });
    } else if (
      (session.role === "branch_admin" || session.role === "operator") &&
      company?.slug &&
      branch?.slug
    ) {
      void navigate({
        to: "/$companySlug/branches/$branchSlug",
        params: { companySlug: company.slug, branchSlug: branch.slug },
      });
    }
  }, [session, state.companies, state.branches, navigate]);

  if (!session || session.role !== "super_admin") {
    return null;
  }

  const validSubViews = ["branch_desks"];
  const isNav = nav.some((n) => n.id === active);
  const current = isNav || validSubViews.includes(active) ? active : nav[0]!.id;
  const activeNav = isNav ? active : (active === "branch_desks" ? "branches" : nav[0]!.id);

  return (
    <ConsoleShell nav={nav} active={activeNav} onNavigate={setActive}>
      {role === "super_admin" ? <SuperAdminView view={current} /> : null}
      {role === "company_admin" ? (
        session.companyId ? (
          <CompanyAdminView view={current} companyId={session.companyId} setView={setActive} />
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
            Loading your company data…
          </div>
        )
      ) : null}
      {role === "branch_admin" || role === "operator" ? (
        (current === "desks" || current === "services") ? (
          <BranchDesksServicesManager branchId={session?.branchId || "11"} />
        ) : current === "staff" ? (
          session?.companyId ? (
            <CompanyAdminView
              view="staff"
              companyId={session.companyId}
              setView={setActive}
              branchId={session.branchId}
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
              Loading your branch data…
            </div>
          )
        ) : (
          <BranchConsoleView
            view={current}
            branchId={session?.branchId ?? "11"}
            deskId={session?.deskId}
          />
        )
      ) : null}
    </ConsoleShell>
  );
}
