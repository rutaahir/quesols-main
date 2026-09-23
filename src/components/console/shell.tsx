import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Radio,
  X,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { useQuesole } from "@/lib/quesole/store";
import type { Role } from "@/lib/quesole/types";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Platform Super Admin",
  company_admin: "Company Admin",
  branch_admin: "Branch Admin",
  operator: "Desk Operator",
  customer: "Customer",
};

export interface NavItem {
  id: string;
  label: string;
  icon: typeof Bell;
}

export function ConsoleShell({
  nav,
  active,
  onNavigate,
  children,
}: {
  nav: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
}) {
  const { session, signOut, state, actions, simulating, setSimulating } = useQuesole();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const unread = state.alerts.filter((a) => !a.read).length;

  const activeItem = nav.find((n) => n.id === active) || nav[0];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-surface text-foreground">
      {/* Mobile Sticky Top Navigation Header Bar */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/80 bg-background/95 px-3.5 sm:px-5 backdrop-blur-md lg:hidden shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-surface text-foreground shadow-2xs hover:bg-accent active:scale-95 transition-all"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4.5 w-4.5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Logo size={26} />
            {session && (
              <span className="truncate max-w-[120px] sm:max-w-[180px] text-xs font-bold text-muted-foreground border-l border-border/60 pl-2">
                {session.companyId || "Console"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Simulation Indicator Mini Badge */}
          <button
            onClick={() => setSimulating(!simulating)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all active:scale-95",
              simulating
                ? "bg-emerald/10 border-emerald/30 text-emerald shadow-2xs"
                : "bg-muted/40 border-border/50 text-muted-foreground"
            )}
            title="Toggle Live Simulation"
          >
            <Radio className={cn("h-3 w-3", simulating && "text-emerald animate-pulse")} />
            <span className="hidden sm:inline">{simulating ? "SIM LIVE" : "PAUSED"}</span>
          </button>

          {/* User Avatar */}
          {session && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 text-brand font-black text-xs shrink-0 select-none shadow-2xs">
              {session.name ? session.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "US"}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sticky Sidebar Navigation (Desktop & Mobile Drawer) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shrink-0 border-r border-border/80 bg-white dark:bg-slate-900 transition-transform duration-300 ease-in-out lg:z-30 lg:h-screen lg:w-64 lg:overflow-y-auto lg:translate-x-0 flex flex-col justify-between shadow-xl lg:shadow-xs",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex h-14 lg:h-16 items-center justify-between border-b border-border/60 px-4 shrink-0 bg-background/50 backdrop-blur-xs">
            <div className="flex items-center gap-2.5">
              <Logo size={30} />
            </div>
            <button
              className="lg:hidden rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-3 py-3.5 flex-1 overflow-y-auto space-y-1">
            <div className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 select-none flex items-center justify-between">
              <span>{session ? ROLE_LABEL[session.role] : "Console Navigation"}</span>
            </div>
            <nav className="grid gap-1">
              {nav.map((item) => {
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all group w-full text-left font-medium",
                      isActive
                        ? "bg-brand/10 text-brand font-bold shadow-2xs border border-brand/20"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-0.5"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-gradient-to-b from-brand to-purple-500 shadow-xs" />
                    )}
                    <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-brand" : "text-muted-foreground")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Details */}
        <div className="border-t border-border bg-background/80 p-3.5 space-y-3 shrink-0 backdrop-blur-xs">
          {/* Live Simulation Control */}
          <button
            onClick={() => setSimulating(!simulating)}
            className="flex w-full items-center justify-between rounded-xl bg-accent/50 hover:bg-accent px-3 py-2 text-xs font-semibold transition-all border border-border/40 active:scale-98"
          >
            <span className="flex items-center gap-2">
              <Radio className={cn("h-3.5 w-3.5", simulating ? "text-emerald animate-pulse" : "text-muted-foreground")} />
              Live simulation
            </span>
            <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border", simulating ? "bg-emerald/10 border-emerald/30 text-emerald" : "bg-muted border-border/50 text-muted-foreground")}>
              {simulating ? "ON" : "PAUSED"}
            </span>
          </button>

          {/* System Alerts */}
          <div className="relative">
            <button
              onClick={() => setBell((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border border-border/80 px-3 py-2 text-xs font-semibold bg-background hover:bg-accent transition-all",
                bell && "bg-accent"
              )}
              aria-label="Alerts"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                System Alerts
              </span>
              {unread > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-primary-foreground shadow-2xs animate-pulse">
                  {unread}
                </span>
              ) : (
                <span className="text-muted-foreground text-[10px] font-normal">None</span>
              )}
            </button>
            <AnimatePresence>
              {bell ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="panel absolute left-0 bottom-12 z-50 w-[240px] overflow-hidden p-0 border border-border bg-background shadow-2xl rounded-2xl"
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-accent/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Alerts</span>
                    <button
                      className="text-[10px] text-brand hover:underline font-bold"
                      onClick={() => actions.readAllAlerts()}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
                    {state.alerts.slice(0, 5).map((a) => (
                       <button
                         key={a.id}
                         onClick={() => actions.readAlert(a.id)}
                         className={cn(
                           "block w-full px-3 py-2.5 text-left hover:bg-accent/40 text-xs transition-colors",
                           !a.read && "bg-accent/20",
                         )}
                       >
                         <div className="flex items-center gap-1.5">
                           <span
                             className={cn(
                               "h-1.5 w-1.5 shrink-0 rounded-full",
                               a.severity === "critical"
                                 ? "bg-coral"
                                 : a.severity === "warning"
                                   ? "bg-amber"
                                   : "bg-emerald",
                             )}
                           />
                           <span className="truncate font-semibold text-foreground">{a.title}</span>
                         </div>
                         <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                           {a.detail}
                         </p>
                       </button>
                    ))}
                    {state.alerts.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No alerts to report.
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* User Profile details */}
          {session && (
            <div className="flex items-center gap-2.5 p-2 bg-accent/30 rounded-xl border border-border/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 text-brand font-bold text-xs shrink-0 select-none shadow-2xs">
                {session.name ? session.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "US"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-foreground leading-none">{session.name}</div>
                <div className="truncate text-[10px] text-muted-foreground mt-1 leading-none">{session.email}</div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <Button asChild variant="ghost" size="sm" className="w-full justify-start text-xs rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all">
            <Link to="/" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /> Sign out
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main Content Area with Desktop Sticky Header */}
      <div className="min-w-0 flex-1 flex flex-col min-h-0 lg:pl-64">
        {/* Desktop Sticky Top Header Bar */}
        <header className="sticky top-0 z-30 hidden lg:flex h-16 w-full items-center justify-between border-b border-border/70 bg-background/85 backdrop-blur-md px-6 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            {activeItem && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 text-brand shadow-2xs">
                  <activeItem.icon className="h-4.5 w-4.5 text-brand" />
                </div>
                <div>
                  <h1 className="font-display text-sm font-bold text-foreground leading-none">{activeItem.label}</h1>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-none">
                    {session ? ROLE_LABEL[session.role] : "Dashboard"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Live Simulation Control */}
            <button
              onClick={() => setSimulating(!simulating)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all hover:scale-102 active:scale-98 shadow-2xs",
                simulating
                  ? "bg-emerald/10 border-emerald/30 text-emerald"
                  : "bg-muted/40 border-border/50 text-muted-foreground"
              )}
              title="Toggle Live Simulation"
            >
              <Radio className={cn("h-3.5 w-3.5", simulating && "text-emerald animate-pulse")} />
              <span>{simulating ? "SIM LIVE" : "PAUSED"}</span>
            </button>

            {/* User Profile Badge */}
            {session && (
              <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-surface px-3 py-1.5 shadow-2xs">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand font-black text-xs select-none">
                  {session.name ? session.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "US"}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-foreground leading-none">{session.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-none capitalize">{session.role.replace("_", " ")}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="w-full px-3 py-3 sm:px-6 sm:py-5 max-w-none flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

// Role switcher removed for database-backed role model.


export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="panel p-3.5 sm:p-5 min-w-0">
      <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </div>
      <div className="mt-1 sm:mt-2 font-display text-xl sm:text-3xl font-bold tabular-nums truncate">{value}</div>
      {hint ? <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground truncate">{hint}</div> : null}
    </div>
  );
}
