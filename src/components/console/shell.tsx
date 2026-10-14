import { Link } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode, useRef } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Radio,
  X,
  Search,
  Crown,
  HelpCircle,
  Sparkles,
  ArrowRight,
  User,
  Sliders,
  Check,
  Building2,
  Calendar,
  Monitor,
  ExternalLink,
  Headphones,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { useQuesole } from "@/lib/quesole/store";
import type { Role } from "@/lib/quesole/types";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import mascotImg from "@/assets/mascot-sidebar.jpg";

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
  icon: any;
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const unreadAlerts = state.alerts.filter((a) => !a.read);
  const displayAlertCount = unreadAlerts.length > 0 ? unreadAlerts.length : 3;

  const activeItem = nav.find((n) => n.id === active) || nav[0];

  // Global Ctrl + K search shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setHelpOpen(false);
        setBell(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  // Search filter across navigation, branches, and sample queries
  const searchResults = searchQuery.trim()
    ? [
        ...nav
          .filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((n) => ({ type: "nav", id: n.id, title: n.label, icon: n.icon })),
        ...state.branches
          .filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.city?.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((b) => ({ type: "branch", id: b.id, title: b.name, subtitle: `${b.city || "Branch Location"}`, icon: Building2 })),
        ...state.tickets
          .filter((t) => t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 4)
          .map((t) => ({ type: "ticket", id: t.id, title: `${t.ticketNumber} · ${t.customerName}`, subtitle: `Status: ${t.status}`, icon: Calendar })),
      ]
    : [];

  // Initials for avatar
  const displayName = session?.name || "Rutvika Jinjala";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "RJ";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#F8FAFC] dark:bg-slate-950 text-foreground font-sans antialiased">
      {/* Mobile Sticky Top Navigation Header Bar */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/80 bg-white/95 dark:bg-slate-900/95 px-3.5 sm:px-5 backdrop-blur-md lg:hidden shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-surface text-foreground shadow-2xs hover:bg-accent active:scale-95 transition-all"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4.5 w-4.5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Logo size={24} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* User Avatar */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-white font-bold text-xs shrink-0 select-none shadow-xs">
            {userInitials}
          </div>
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
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-300 ease-in-out lg:z-30 lg:h-screen lg:w-68 lg:overflow-y-auto lg:translate-x-0 flex flex-col justify-between shadow-xl lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo & Brand Header */}
          <div className="flex h-16 sm:h-20 items-center justify-between px-5 shrink-0 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <div className="hidden sm:block leading-tight">
                <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight">Queue Management Made Smarter</span>
              </div>
            </div>
            <button
              className="lg:hidden rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links List */}
          <div className="px-3.5 py-4 flex-1 overflow-y-auto space-y-1">
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
                      "relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 group w-full text-left font-medium select-none",
                      isActive
                        ? "bg-[#5B50EB] text-white font-semibold shadow-sm shadow-[#5B50EB]/30 translate-x-0.5"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-0.5"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Cards: Upgrade Plan & Need Help matching Reference Mock */}
        <div className="p-3.5 space-y-3 shrink-0 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Upgrade Plan Card */}
          <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-slate-850 dark:to-slate-850 p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Crown className="h-4 w-4 fill-amber-500 text-amber-500" />
              </div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Upgrade Plan</h4>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Get more features and scale your operations.
            </p>
            <button
              onClick={() => onNavigate("billing")}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5B50EB] hover:bg-[#4a3fe0] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              View Plans <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Need Help? Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
                <Headphones className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Need Help?</h4>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              We're here to support you.
            </p>
            <button
              onClick={() => {
                window.location.href = "mailto:support@quesols.com?subject=Quesols%20Support%20Request";
              }}
              className="mt-3 w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all text-center cursor-pointer"
            >
              Contact Support
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Desktop Sticky Header */}
      <div className="min-w-0 flex-1 flex flex-col min-h-0 lg:pl-68">
        {/* Desktop Sticky Top Header Bar */}
        <header className="sticky top-0 z-30 hidden lg:flex h-16 w-full items-center justify-between border-b border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-7 shrink-0 shadow-2xs">
          {/* Left: Global Search Input Pill */}
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center justify-between rounded-full border border-slate-200 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-800/60 px-4 py-2 text-xs text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 transition-all shadow-2xs text-left"
            >
              <span className="flex items-center gap-2.5 truncate">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">Search branches, bookings, or anything...</span>
              </span>
              <kbd className="inline-flex h-5 items-center rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-300 shrink-0 select-none shadow-2xs">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Actions, Notifications, Help & User Profile */}
          <div className="flex items-center gap-3">
            {/* Live Simulation Control */}
            <button
              onClick={() => setSimulating(!simulating)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider border transition-all hover:scale-102 active:scale-98 shadow-2xs",
                simulating
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
              )}
              title="Toggle Live Telemetry Simulation"
            >
              <Radio className={cn("h-3 w-3", simulating && "text-emerald-500 animate-pulse")} />
              <span>{simulating ? "SIM LIVE" : "PAUSED"}</span>
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setBell((v) => !v)}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-2xs",
                  bell && "bg-slate-100 dark:bg-slate-700 border-indigo-300"
                )}
                aria-label="System Notifications"
              >
                <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-black text-white shadow-2xs">
                  {displayAlertCount}
                </span>
              </button>

              {/* Notification Popover */}
              <AnimatePresence>
                {bell && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 z-50 w-80 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden p-0"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-850">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-[#5B50EB]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          Alerts & Notifications
                        </span>
                      </div>
                      <button
                        className="text-[11px] font-bold text-[#5B50EB] hover:underline"
                        onClick={() => actions.readAllAlerts()}
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {state.alerts.length > 0 ? (
                        state.alerts.slice(0, 5).map((a) => (
                          <div
                            key={a.id}
                            className="p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            onClick={() => actions.readAlert(a.id)}
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                              <span>{a.title}</span>
                              <span className="text-[10px] text-slate-400 capitalize">{a.severity}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {a.detail}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                            <div className="font-semibold text-purple-900 dark:text-purple-300">Desk 3 peak load warning</div>
                            <div className="text-[11px] text-purple-700 dark:text-purple-400">Head Office has 9 active customers waiting.</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                            <div className="font-semibold text-emerald-900 dark:text-emerald-300">New online booking confirmed</div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Amit Patel booked General Consultation for 11:30 AM.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Help Question Mark Icon */}
            <button
              onClick={() => setHelpOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-2xs"
              aria-label="Quick Help"
            >
              <HelpCircle className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
            </button>

            {/* User Profile Badge & Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-1 pr-3 py-1 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"
              >
                <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-[#1D4ED8] text-white font-black text-xs select-none shadow-2xs">
                  {userInitials}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-400 mt-1 leading-none font-medium">
                    Company Admin
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 z-50 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden p-1.5"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{displayName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{session?.email || "admin@quesols.com"}</p>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate("branding");
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Sliders className="h-3.5 w-3.5 text-slate-400" />
                      Branding & Settings
                    </button>

                    <button
                      onClick={() => {
                        onNavigate("billing");
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                      Subscription Plan
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <Link
                      to="/"
                      onClick={signOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 text-rose-500" />
                      Sign out
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Search Modal / Command Palette Dialog */}
        <AnimatePresence>
          {searchOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-xs p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <Search className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search branches, bookings, kiosks, navigation..."
                    className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                  {searchQuery.trim() === "" ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Type to search across your system, or press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-[10px]">Esc</kbd> to close.
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No matching records found for "{searchQuery}".
                    </div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <button
                        key={`${item.type}-${item.id}-${idx}`}
                        onClick={() => {
                          if (item.type === "nav") {
                            onNavigate(item.id);
                          } else if (item.type === "branch") {
                            onNavigate("branches");
                          } else {
                            onNavigate("overview");
                          }
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
                      >
                        <item.icon className="h-4 w-4 text-[#5B50EB] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[10px] text-slate-400 truncate">{item.subtitle}</div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Quick Help Dialog */}
        <AnimatePresence>
          {helpOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-[#5B50EB]" />
                    <h3 className="font-display text-sm font-bold">Quesols Help & Support</h3>
                  </div>
                  <button onClick={() => setHelpOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    <strong>Company Owner Dashboard</strong> allows full control over multi-branch queue throughput, self-ticketing kiosks, staff allocation, and online customer appointments.
                  </p>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-1.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Quick Tips:</div>
                    <div>• Press <kbd className="px-1 py-0.5 rounded border bg-white dark:bg-slate-700">Ctrl + K</kbd> anywhere to search instantly.</div>
                    <div>• Toggle <strong>SIM LIVE</strong> to pause or simulate live telemetry queue events.</div>
                    <div>• Click any kiosk or appointment to open its live management modal.</div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button variant="default" size="sm" onClick={() => setHelpOpen(false)} className="rounded-xl text-xs bg-[#5B50EB] hover:bg-[#4E43E0]">
                    Got it
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Application Body */}
        <main className="w-full px-3 py-4 sm:px-7 sm:py-6 max-w-none flex-1 overflow-x-clip">
          {children}
        </main>
      </div>
    </div>
  );
}

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
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
        {label}
      </div>
      <div className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{hint}</div> : null}
    </div>
  );
}

