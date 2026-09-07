import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, ShieldAlert, Building2, HelpCircle } from "lucide-react";
import { apiFetch } from "@/lib/quesole/store";

export const Route = createFileRoute("/$companySlug")({
  component: CompanyLayout,
});

function CompanyLayout() {
  const { companySlug } = Route.useParams();
  const [company, setCompany] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<"not_found" | "inactive" | null>(null);

  useEffect(() => {
    const resolveCompany = async () => {
      setIsLoading(true);
      setErrorType(null);
      try {
        const res = await apiFetch(`/api/companies/by-slug/${companySlug}/`);
        setCompany(res);
      } catch (err: any) {
        console.error("Company slug resolution failed:", err);
        if (err.message?.includes("inactive") || err.message?.includes("suspended") || err.status === 403) {
          setErrorType("inactive");
        } else {
          setErrorType("not_found");
        }
      } finally {
        setIsLoading(false);
      }
    };
    resolveCompany();
  }, [companySlug]);

  // Dynamically set CSS variables for primary branding color
  useEffect(() => {
    if (company?.brand_colors?.primary) {
      const primary = company.brand_colors.primary;
      document.documentElement.style.setProperty("--color-brand", primary);
      document.documentElement.style.setProperty("--color-brand-hover", `${primary}cc`);
    } else {
      document.documentElement.style.setProperty("--color-brand", "#6366F1"); // Fallback violet
    }
  }, [company]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resolving Company Details...</p>
        </div>
      </div>
    );
  }

  // 404: Company Not Found Error UI
  if (errorType === "not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">We couldn't find that company</h2>
            <p className="text-sm text-muted-foreground leading-normal">
              The URL slug <code className="px-1.5 py-0.5 rounded bg-accent font-mono font-bold">/{companySlug}</code> doesn't match any registered organization on our platform.
            </p>
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

  // 403: Company Suspended/Inactive Error UI
  if (errorType === "inactive") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Account currently inactive</h2>
            <p className="text-sm text-muted-foreground leading-normal">
              The corporate portal for <strong className="text-foreground">{companySlug?.toUpperCase() || ""}</strong> has been suspended or is currently inactive. Please contact your company administrator to resolve billing or subscription issues.
            </p>
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

  return <Outlet context={{ company }} />;
}
