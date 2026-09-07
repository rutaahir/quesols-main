import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  MonitorPlay,
  Users,
  Settings,
  Loader2,
  HelpCircle,
  ShieldAlert,
  MessageSquare
} from "lucide-react";
import { ConsoleShell, type NavItem } from "@/components/console/shell";
import { BranchConsoleView } from "@/components/console/branch-console";
import { BranchDesksServicesManager } from "@/components/console/branch-desks-services";
import { CompanyAdminView } from "@/components/console/company-admin";
import { useQuesole, apiFetch } from "@/lib/quesole/store";

export const Route = createFileRoute("/$companySlug/branches/$branchSlug/")({
  component: BranchConsole,
});

const NAV: Record<string, NavItem[]> = {
  branch_admin: [
    { id: "overview", label: "Branch overview", icon: LayoutDashboard },
    { id: "desks", label: "Desks & Services", icon: MonitorPlay },
    { id: "queries", label: "Query History & Replies", icon: MessageSquare },
    { id: "staff", label: "Team", icon: Users },
    { id: "methods", label: "Queue Methods", icon: Settings },
    { id: "appointments", label: "Appointments", icon: CalendarDays },
    { id: "desk", label: "Desk console", icon: Users },
  ],
  operator: [
    { id: "desk", label: "Desk console", icon: Users },
    { id: "queries", label: "Query History & Replies", icon: MessageSquare },
    { id: "overview", label: "Branch overview", icon: LayoutDashboard },
    { id: "appointments", label: "Appointments", icon: CalendarDays },
  ],
};

function BranchConsole() {
  const { companySlug, branchSlug } = Route.useParams();
  const { session } = useQuesole();
  const navigate = useNavigate();

  const [branch, setBranch] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<"company_not_found" | "branch_not_found" | "branch_inactive" | null>(null);

  // Resolve branch and company slugs
  useEffect(() => {
    const resolveSlugs = async () => {
      setIsLoading(true);
      setErrorType(null);
      try {
        // 1. Resolve Company
        const resolvedCompany = await apiFetch(`/api/companies/by-slug/${companySlug}/`);
        setCompany(resolvedCompany);

        // 2. Resolve Branch scoped to company
        const resolvedBranch = await apiFetch(`/api/companies/${companySlug}/branches/by-slug/${branchSlug}/`);
        setBranch(resolvedBranch);
      } catch (err: any) {
        console.error("Slug resolution error:", err);
        if (err.status === 404) {
          if (err.message?.includes("Branch") || err.message?.includes("branch")) {
            setErrorType("branch_not_found");
          } else {
            setErrorType("company_not_found");
          }
        } else if (err.status === 403) {
          setErrorType("branch_inactive");
        } else {
          setErrorType("branch_not_found");
        }
      } finally {
        setIsLoading(false);
      }
    };
    resolveSlugs();
  }, [companySlug, branchSlug]);

  const role = session?.role ?? "branch_admin";
  const navItems = NAV[role] ?? NAV["branch_admin"]!;
  const [active, setActive] = useState(navItems[0]!.id);

  // Auth scoping check
  useEffect(() => {
    if (!session) {
      void navigate({ to: "/$companySlug/login", params: { companySlug } });
    }
  }, [session, navigate, companySlug]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resolving Branch Console...</p>
        </div>
      </div>
    );
  }

  // Error 1: Company not found
  if (errorType === "company_not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">We couldn't find that company</h2>
            <p className="text-sm text-muted-foreground">The organization slug matches no active account.</p>
          </div>
          <div className="pt-4 border-t border-border/60">
            <Link to="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 font-bold text-sm text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/10">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error 2: Branch not found under resolved company
  if (errorType === "branch_not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Branch not found</h2>
            <p className="text-sm text-muted-foreground leading-normal">
              We couldn't find that branch for <strong className="text-foreground">{company?.name || companySlug.toUpperCase()}</strong>.
            </p>
          </div>
          <div className="pt-4 border-t border-border/60">
            <Link to="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 font-bold text-sm text-white hover:bg-indigo-700 transition-colors">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error 3: Branch is suspended or inactive
  if (errorType === "branch_inactive") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Branch inactive</h2>
            <p className="text-sm text-muted-foreground leading-normal">
              The branch <strong className="text-foreground">{branchSlug}</strong> is currently deactivated or suspended.
            </p>
          </div>
          <div className="pt-4 border-t border-border/60">
            <Link to="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 font-bold text-sm text-white hover:bg-indigo-700 transition-colors">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const current = navItems.some((n) => n.id === active) ? active : navItems[0]!.id;

  return (
    <ConsoleShell nav={navItems} active={active} onNavigate={setActive}>
      {current === "desks" || current === "services" ? (
        <BranchDesksServicesManager branchId={String(branch.id)} />
      ) : current === "staff" ? (
        <CompanyAdminView
          view="staff"
          companyId={session.companyId}
          setView={setActive}
          branchId={String(branch.id)}
        />
      ) : (
        <BranchConsoleView
          view={current}
          branchId={String(branch.id)}
          deskId={session.deskId}
        />
      )}
    </ConsoleShell>
  );
}
