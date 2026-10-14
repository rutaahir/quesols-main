import { useState } from "react";
import {
  Check, Search, ShieldAlert, X, Plus, Trash2, Edit2, ArrowUp, ArrowDown,
  HelpCircle, CheckCircle2, AlertTriangle, FileText, Sparkles, Monitor,
  Globe, Printer, Building, CreditCard, Users, Phone, Mail, MapPin, ExternalLink, Clock, MessageSquare,
  Download, Eye, ArrowRight, CheckCircle, Receipt, FileCheck, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuesole, branchStats, planOf } from "@/lib/quesole/store";
import { StatCard } from "@/components/console/shell";
import { CountUp, Reveal } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import { generateAndDownloadInvoicePDF } from "@/lib/quesole/invoice-pdf";

export function SuperAdminView({ view, setView }: { view: string; setView?: (v: string) => void }) {
  const { state, actions } = useQuesole();
  const [q, setQ] = useState("");

  const mrr = state.companies.reduce((a, c) => a + c.monthlySpend, 0);
  const totalWaiting = state.branches.reduce((a, b) => a + branchStats(state, b.id).waiting, 0);
  const openUpgrades = state.upgrades.filter((u) => u.status === "open");

  if (view === "invoice_requests" || view === "invoices") {
    return <InvoiceRequestsManager />;
  }

  if (view === "leads" || view === "candidates") {
    return <InterestedCandidatesManager />;
  }

  if (view === "companies") {
    const rows = state.companies.filter((c) =>
      `${c.name} ${c.city} ${c.industry}`.toLowerCase().includes(q.toLowerCase()),
    );
    return (
      <div className="grid gap-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies, cities, industries"
              className="h-11 rounded-xl pl-9"
            />
          </div>
        </div>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Plan</th>
                <th className="hidden px-5 py-3 sm:table-cell">Branches</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.industry} · {c.city}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">{planOf(c.plan).name}</td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">{c.branchIds.length}</td>
                  <td className="px-5 py-3.5">
                    {c.onboardingStatus === "pending_invoice_approval" ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="h-3 w-3 animate-pulse" /> Invoice Req.
                      </span>
                    ) : (
                      <StatusPill status={c.status} />
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.planPurchase?.line_items?.length ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Download Invoice PDF"
                          onClick={() => {
                            window.open(`/api/companies/${c.id}/invoice-pdf/`, "_blank");
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {c.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="brand"
                          onClick={() => {
                            actions.approveCompany(c.id);
                            toast.success(`${c.name} approved & activated`);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                      ) : c.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            actions.suspendCompany(c.id);
                            toast(`${c.name} suspended`);
                          }}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actions.approveCompany(c.id)}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === "upgrades") {
    return (
      <div className="grid gap-3">
        {state.upgrades.map((u) => {
          const company = state.companies.find((c) => c.id === u.companyId);
          return (
            <div
              key={u.id}
              className="panel flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <div className="font-semibold">{company?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {planOf(u.from).name} → {planOf(u.to).name} · requested {u.requestedAt}
                </div>
              </div>
              {u.status === "open" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="brand"
                    onClick={() => {
                      actions.resolveUpgrade(u.id, "approved");
                      toast.success("Upgrade approved");
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => actions.resolveUpgrade(u.id, "declined")}
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </Button>
                </div>
              ) : (
                <StatusPill status={u.status === "approved" ? "active" : "suspended"} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (view === "audit") {
    return (
      <div className="panel divide-y divide-border/60">
        {state.audit.map((a) => (
          <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-sm">
                <span className="font-medium">{a.actor}</span> — {a.action}
              </div>
              <div className="text-xs text-muted-foreground">
                {a.target} · {new Date(a.at).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === "packages" || view === "plan_builder") {
    return <PlanBuilderManager />;
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Companies" value={<CountUp value={state.companies.length} />} hint="Across all plans" />
        <StatCard
          label="Monthly revenue"
          value={<CountUp value={mrr} prefix="₹" />}
          hint="Simulated MRR"
        />
        <StatCard label="Live waiting" value={<CountUp value={totalWaiting} />} hint="Platform-wide" />
        <StatCard
          label="Open requests"
          value={<CountUp value={openUpgrades.length} />}
          hint="Plan upgrades pending"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <div className="panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Branch load
            </h3>
            <div className="mt-4 grid gap-3">
              {state.branches.map((b) => {
                const s = branchStats(state, b.id);
                const pct = Math.min(100, s.waiting * 9);
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{b.name}</span>
                      <span className="tabular-nums text-muted-foreground">{s.waiting} waiting</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          pct > 70 ? "bg-coral" : pct > 40 ? "bg-amber" : "bg-brand",
                        )}
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent alerts
            </h3>
            <div className="mt-4 grid gap-2.5">
              {state.alerts.slice(0, 6).map((a) => (
                <div key={a.id} className="rounded-xl bg-accent/40 px-3.5 py-2.5">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: "active" | "pending" | "suspended" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
        status === "active"
          ? "bg-emerald/12 text-emerald"
          : status === "pending"
            ? "bg-amber/15 text-amber"
            : "bg-coral/12 text-coral",
      )}
    >
      {status}
    </span>
  );
}

export function PlanBuilderManager() {
  const { state, actions } = useQuesole();
  const [activeTab, setActiveTab] = useState<"solutions" | "components" | "delivery" | "durations">("components");

  // Editing modals states
  const [editingSolution, setEditingSolution] = useState<any | null>(null);
  const [editingComponent, setEditingComponent] = useState<any | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<any | null>(null);
  const [editingDuration, setEditingDuration] = useState<any | null>(null);

  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);

  // Price confirmation dialog
  const [pendingPriceSave, setPendingPriceSave] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);

  // Form states
  const [solutionForm, setSolutionForm] = useState({
    key: "",
    label: "",
    description: "",
    icon_key: "sparkles",
    is_active: true,
    display_order: 0
  });

  const [componentForm, setComponentForm] = useState({
    key: "",
    label: "",
    description: "",
    unit_label: "unit",
    default_included_qty: 0,
    price_per_unit: 0,
    is_toggle: false,
    min_qty: 0,
    max_qty: "",
    category: "ADDON",
    branch_mode_scope: "BOTH",
    pricing_type: "PER_UNIT",
    max_qty_per_branch: "",
    is_addon_only: false,
    display_order: 0,
    icon_key: "",
    is_active: true,
    is_mandatory: false
  });

  const [deliveryForm, setDeliveryForm] = useState({
    key: "",
    label: "",
    price_per_branch: 0,
    is_active: true,
    requires_hardware: false,
    display_order: 0,
    queue_method_code: ""
  });

  const [durationForm, setDurationForm] = useState({
    months: 1,
    discount_percent: 0,
    is_active: true,
    display_order: 0
  });

  // Solutions actions
  const openNewSolution = () => {
    setSolutionForm({ key: "", label: "", description: "", icon_key: "sparkles", is_active: true, display_order: 0 });
    setEditingSolution(null);
    setIsSolutionModalOpen(true);
  };

  const openEditSolution = (st: any) => {
    setEditingSolution(st);
    setSolutionForm({
      key: st.key,
      label: st.label,
      description: st.description || "",
      icon_key: st.icon_key || "sparkles",
      is_active: st.is_active,
      display_order: st.display_order
    });
    setIsSolutionModalOpen(true);
  };

  const handleSaveSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSolution) {
        await actions.updateQueueSolutionType(editingSolution.id, solutionForm);
        toast.success(`Updated Solution Type: ${solutionForm.label}`);
      } else {
        await actions.createQueueSolutionType(solutionForm);
        toast.success(`Created Solution Type: ${solutionForm.label}`);
      }
      setIsSolutionModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save solution type");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSolution = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete solution type "${name}"?`)) {
      try {
        await actions.deleteQueueSolutionType(id);
        toast.success(`Deleted solution type: ${name}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete solution type");
      }
    }
  };

  // Plan components actions
  const openNewComponent = () => {
    setComponentForm({
      key: "",
      label: "",
      description: "",
      unit_label: "unit",
      default_included_qty: 0,
      price_per_unit: 0,
      is_toggle: false,
      min_qty: 0,
      max_qty: "",
      category: "ADDON",
      branch_mode_scope: "BOTH",
      pricing_type: "PER_UNIT",
      max_qty_per_branch: "",
      is_addon_only: false,
      display_order: 0,
      icon_key: "",
      is_active: true,
      is_mandatory: false
    });
    setEditingComponent(null);
    setIsComponentModalOpen(true);
  };

  const openEditComponent = (comp: any) => {
    setEditingComponent(comp);
    setComponentForm({
      key: comp.key,
      label: comp.label,
      description: comp.description || "",
      unit_label: comp.unit_label || "unit",
      default_included_qty: comp.default_included_qty,
      price_per_unit: comp.price_per_unit,
      is_toggle: comp.is_toggle,
      min_qty: comp.min_qty,
      max_qty: comp.max_qty !== null ? String(comp.max_qty) : "",
      category: comp.category || "ADDON",
      branch_mode_scope: comp.branch_mode_scope || "BOTH",
      pricing_type: comp.pricing_type || "PER_UNIT",
      max_qty_per_branch: comp.max_qty_per_branch !== null && comp.max_qty_per_branch !== undefined ? String(comp.max_qty_per_branch) : "",
      is_addon_only: comp.is_addon_only || false,
      display_order: comp.display_order || 0,
      icon_key: comp.icon_key || "",
      is_active: comp.is_active,
      is_mandatory: comp.is_mandatory || false
    });
    setIsComponentModalOpen(true);
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...componentForm,
      max_qty: componentForm.max_qty ? Number(componentForm.max_qty) : null,
      max_qty_per_branch: componentForm.max_qty_per_branch ? Number(componentForm.max_qty_per_branch) : null,
      default_included_qty: Number(componentForm.default_included_qty),
      price_per_unit: Number(componentForm.price_per_unit),
      min_qty: Number(componentForm.min_qty),
      display_order: Number(componentForm.display_order)
    };

    // If editing and price per unit changed, prompt warning modal
    if (editingComponent && Number(editingComponent.price_per_unit) !== payload.price_per_unit) {
      setPendingPriceSave(payload);
      return;
    }

    executeSaveComponent(payload);
  };

  const executeSaveComponent = async (payload: any) => {
    setSaving(true);
    try {
      if (editingComponent) {
        await actions.updatePlanComponent(editingComponent.id, payload);
        toast.success(`Updated ${payload.label}. Price: ₹${editingComponent.price_per_unit} → ₹${payload.price_per_unit}`);
      } else {
        await actions.createPlanComponent(payload);
        toast.success(`Created component: ${payload.label}`);
      }
      setIsComponentModalOpen(false);
      setPendingPriceSave(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan component");
    } finally {
      setSaving(false);
    }
  };

  // Delivery methods actions
  const openNewDelivery = () => {
    setDeliveryForm({ key: "", label: "", price_per_branch: 0, is_active: true, requires_hardware: false, display_order: 0, queue_method_code: "" });
    setEditingDelivery(null);
    setIsDeliveryModalOpen(true);
  };

  const openEditDelivery = (tm: any) => {
    setEditingDelivery(tm);
    setDeliveryForm({
      key: tm.key,
      label: tm.label,
      price_per_branch: tm.price_per_branch || 0,
      is_active: tm.is_active,
      requires_hardware: tm.requires_hardware,
      display_order: tm.display_order,
      queue_method_code: tm.queue_method_code || ""
    });
    setIsDeliveryModalOpen(true);
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...deliveryForm,
        price_per_branch: Number(deliveryForm.price_per_branch)
      };
      if (editingDelivery) {
        await actions.updateTokenDeliveryMethod(editingDelivery.id, payload);
        toast.success(`Updated Delivery Method: ${payload.label}`);
      } else {
        await actions.createTokenDeliveryMethod(payload);
        toast.success(`Created Delivery Method: ${payload.label}`);
      }
      setIsDeliveryModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save delivery method");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDelivery = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete delivery method "${name}"?`)) {
      try {
        await actions.deleteTokenDeliveryMethod(id);
        toast.success(`Deleted delivery method: ${name}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete delivery method");
      }
    }
  };

  // Duration tiers actions
  const openNewDuration = () => {
    setDurationForm({ months: 1, discount_percent: 0, is_active: true, display_order: 0 });
    setEditingDuration(null);
    setIsDurationModalOpen(true);
  };

  const openEditDuration = (dt: any) => {
    setEditingDuration(dt);
    setDurationForm({
      months: dt.months,
      discount_percent: dt.discount_percent,
      is_active: dt.is_active,
      display_order: dt.display_order
    });
    setIsDurationModalOpen(true);
  };

  const handleSaveDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDuration) {
        await actions.updateDurationTier(editingDuration.id, durationForm);
        toast.success(`Updated Duration Tier: ${durationForm.months} Months`);
      } else {
        await actions.createDurationTier(durationForm);
        toast.success(`Created Duration Tier: ${durationForm.months} Months`);
      }
      setIsDurationModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save duration tier");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDuration = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete duration tier "${name}"?`)) {
      try {
        await actions.deleteDurationTier(id);
        toast.success(`Deleted duration tier: ${name}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete duration tier");
      }
    }
  };

  // Reordering helpers
  const handleMoveSolutionOrder = async (st: any, dir: "up" | "down") => {
    const newOrder = dir === "up" ? st.display_order - 1 : st.display_order + 1;
    try {
      await actions.updateQueueSolutionType(st.id, { display_order: Math.max(0, newOrder) });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed to update order");
    }
  };

  const handleMoveComponentOrder = async (comp: any, dir: "up" | "down") => {
    const newOrder = dir === "up" ? comp.display_order - 1 : comp.display_order + 1;
    try {
      await actions.updatePlanComponent(comp.id, { display_order: Math.max(0, newOrder) });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed to update order");
    }
  };

  const handleMoveDeliveryOrder = async (tm: any, dir: "up" | "down") => {
    const newOrder = dir === "up" ? tm.display_order - 1 : tm.display_order + 1;
    try {
      await actions.updateTokenDeliveryMethod(tm.id, { display_order: Math.max(0, newOrder) });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed to update order");
    }
  };

  const handleMoveDurationOrder = async (dt: any, dir: "up" | "down") => {
    const newOrder = dir === "up" ? dt.display_order - 1 : dt.display_order + 1;
    try {
      await actions.updateDurationTier(dt.id, { display_order: Math.max(0, newOrder) });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed to update order");
    }
  };

  return (
    <div className="grid gap-6">
      {/* Superadmin pricing header banner */}
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 text-sm text-brand-foreground flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-brand uppercase tracking-wider text-xs">
            <ShieldAlert className="h-4 w-4" /> Itemized Subscription Pricing Engine
          </div>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Price changes only apply to new purchases and subsequent registrations. Existing clients keep their locked-in purchase pricing, preventing unexpected rate changes.
          </p>
        </div>
        <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-bold text-brand z-10 shrink-0">
          V2 Engine Active
        </span>
      </div>

      {/* Tabs list navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("components")}
          className={cn(
            "px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 relative",
            activeTab === "components" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Branch Components
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold">
            {state.planComponents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("solutions")}
          className={cn(
            "px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 relative",
            activeTab === "solutions" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Solution Types
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold">
            {state.solutionTypes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("delivery")}
          className={cn(
            "px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 relative",
            activeTab === "delivery" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Token Delivery
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold">
            {state.tokenDeliveryMethods.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("durations")}
          className={cn(
            "px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 relative",
            activeTab === "durations" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Subscription Durations
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold">
            {state.durationTiers.length}
          </span>
        </button>
      </div>

      {/* Render Active Tab Content */}

      {/* ── BRANCH COMPONENTS TAB ────────────────────────────────────────────── */}
      {activeTab === "components" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Branch Components</h3>
                <p className="text-xs text-muted-foreground">Manage countable resource limits, toggles, and mode scopes.</p>
              </div>
              <Button variant="brand" onClick={openNewComponent}>
                <Plus className="h-4 w-4 mr-1" /> Add Component
              </Button>
            </div>

            {/* Categories list groups */}
            {["SERVICE", "OPERATOR_DESK", "KIOSK", "ADDON", "BRANCH_SETUP"].map((cat) => {
              const comps = state.planComponents
                .filter((c) => c.category === cat)
                .sort((a, b) => a.display_order - b.display_order);

              if (comps.length === 0) return null;

              return (
                <div key={cat} className="panel p-5 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                    {cat === "SERVICE" ? "Services & Queues" : cat === "OPERATOR_DESK" ? "Operator Desks" : cat === "KIOSK" ? "Kiosks & Hardware" : cat === "BRANCH_SETUP" ? "Setup & Branch Fees" : "Add-ons"}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                          <th className="py-2">Component</th>
                          <th className="py-2">Scope Scope</th>
                          <th className="py-2">Default Included</th>
                          <th className="py-2">Max / Branch</th>
                          <th className="py-2">Price</th>
                          <th className="py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {comps.map((c) => (
                          <tr key={c.id} className="hover:bg-accent/10 transition-colors">
                            <td className="py-3 pr-2">
                              <div className="flex items-center gap-1.5">
                                <div className="font-semibold text-foreground">{c.label}</div>
                                {c.is_mandatory && (
                                  <span className="rounded bg-coral/10 border border-coral/20 px-1.5 py-0.5 text-[8px] font-bold text-coral shrink-0 uppercase tracking-wider">
                                    Required
                                  </span>
                                )}
                              </div>
                              <code className="text-[10px] text-brand">{c.key}</code>
                            </td>
                            <td className="py-3">
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                                c.branch_mode_scope === "SERVICE_BASED"
                                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                  : c.branch_mode_scope === "NON_SERVICE_BASED"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                    : "bg-emerald/15 text-emerald"
                              )}>
                                {c.branch_mode_scope === "BOTH" ? "Both Modes" : c.branch_mode_scope.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3 pl-2 font-medium">{c.default_included_qty} {c.unit_label}</td>
                            <td className="py-3 font-medium">
                              {c.max_qty_per_branch !== null ? c.max_qty_per_branch : "Unlimited"}
                            </td>
                            <td className="py-3 font-bold text-emerald">
                              ₹{c.price_per_unit.toLocaleString("en-IN")}{c.pricing_type === "FLAT" ? " flat" : ` / ${c.unit_label}`}
                            </td>
                            <td className="py-3 text-right">
                              <div className="inline-flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleMoveComponentOrder(c, "up")}>
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleMoveComponentOrder(c, "down")}>
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openEditComponent(c)}>
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Audit Logs */}
          <div className="space-y-6">
            <div className="panel p-5">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-3 flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Price Change Log Audit
              </h3>
              <div className="mt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {state.priceLogs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">No price audit records found yet.</div>
                ) : (
                  state.priceLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-border bg-accent/10 p-3 text-xs space-y-1.5 relative">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{log.component_label || log.component_key}</span>
                        <span className="text-brand">{log.component_key}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground line-through">₹{log.old_price}</span>
                        <span className="text-emerald font-bold">→ ₹{log.new_price}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex justify-between pt-1 border-t border-border/50">
                        <span>By {log.changed_by_email || "System"}</span>
                        <span>{new Date(log.changed_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SOLUTIONS TYPES TAB ────────────────────────────────────────────── */}
      {activeTab === "solutions" && (
        <div className="panel p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Queue Solution Types</h3>
              <p className="text-xs text-muted-foreground">Configure the core business modes offered in step 1 of client signup.</p>
            </div>
            <Button variant="brand" onClick={openNewSolution}>
              <Plus className="h-4 w-4 mr-1" /> Add Solution Type
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2">Solution Key</th>
                  <th className="py-2">Label</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {state.solutionTypes.sort((a,b) => a.display_order - b.display_order).map((st) => (
                  <tr key={st.id} className="hover:bg-accent/10 transition-colors">
                    <td className="py-3 font-semibold text-brand">{st.key}</td>
                    <td className="py-3 font-medium">{st.label}</td>
                    <td className="py-3 text-muted-foreground text-xs">{st.description}</td>
                    <td className="py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        st.is_active ? "bg-emerald/15 text-emerald" : "bg-coral/15 text-coral"
                      )}>
                        {st.is_active ? "Active" : "Retired"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleMoveSolutionOrder(st, "up")}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleMoveSolutionOrder(st, "down")}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditSolution(st)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-coral" onClick={() => handleDeleteSolution(st.id, st.label)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TOKEN DELIVERY METHODS TAB ───────────────────────────────────────── */}
      {activeTab === "delivery" && (
        <div className="panel p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Token Delivery Methods</h3>
              <p className="text-xs text-muted-foreground">Manage ticket notification pathways, branch-level setup costs, and hardware rules.</p>
            </div>
            <Button variant="brand" onClick={openNewDelivery}>
              <Plus className="h-4 w-4 mr-1" /> Add Method
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2">Method Key</th>
                  <th className="py-2">Label</th>
                  <th className="py-2">Price per Branch</th>
                  <th className="py-2">Hardware Required</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {state.tokenDeliveryMethods.sort((a,b) => a.display_order - b.display_order).map((tm) => (
                  <tr key={tm.id} className="hover:bg-accent/10 transition-colors">
                    <td className="py-3 font-semibold text-brand">{tm.key}</td>
                    <td className="py-3 font-medium">{tm.label}</td>
                    <td className="py-3 font-bold text-emerald">
                      {tm.price_per_branch && tm.price_per_branch > 0 ? `₹${tm.price_per_branch}/mo` : "Free"}
                    </td>
                    <td className="py-3">
                      {tm.requires_hardware ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber/10 border border-amber/20 px-2 py-0.5 text-[10px] font-bold text-amber">
                          <Printer className="h-3 w-3" /> Hardware Needed
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        tm.is_active ? "bg-emerald/15 text-emerald" : "bg-coral/15 text-coral"
                      )}>
                        {tm.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleMoveDeliveryOrder(tm, "up")}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleMoveDeliveryOrder(tm, "down")}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDelivery(tm)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-coral" onClick={() => handleDeleteDelivery(tm.id, tm.label)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTION DURATIONS TAB ───────────────────────────────────────── */}
      {activeTab === "durations" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 panel p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Subscription Duration discount Tiers</h3>
                <p className="text-xs text-muted-foreground">Add billing durations and configure percentage discounts to incentivize long contracts.</p>
              </div>
              <Button variant="brand" onClick={openNewDuration}>
                <Plus className="h-4 w-4 mr-1" /> Add Duration
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-2">Months Contract</th>
                    <th className="py-2">Discount Percent</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {state.durationTiers.sort((a,b) => a.display_order - b.display_order).map((dt) => (
                    <tr key={dt.id} className="hover:bg-accent/10 transition-colors">
                      <td className="py-3 font-semibold">{dt.months} Months</td>
                      <td className="py-3 font-bold text-emerald">
                        {dt.discount_percent > 0 ? `${dt.discount_percent}% Off` : "None (List Price)"}
                      </td>
                      <td className="py-3">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          dt.is_active ? "bg-emerald/15 text-emerald" : "bg-coral/15 text-coral"
                        )}>
                          {dt.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleMoveDurationOrder(dt, "up")}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleMoveDurationOrder(dt, "down")}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDuration(dt)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-coral" onClick={() => handleDeleteDuration(dt.id, `${dt.months} Months`)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Discount Selector Preview Card */}
          <div className="space-y-6">
            <div className="panel p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-3">
                Live Customer Selector Preview
              </h3>
              <div className="mt-4 space-y-3">
                {state.durationTiers.filter(dt => dt.is_active).map((dt) => (
                  <div key={dt.id} className={cn(
                    "rounded-xl border border-border p-4 transition-all duration-300 relative overflow-hidden flex items-center justify-between",
                    dt.months === 12 ? "bg-brand/10 border-brand/50 shadow-md" : "bg-accent/20"
                  )}>
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-semibold text-sm">{dt.months} Months Plan</div>
                        <div className="text-xs text-muted-foreground">Billed contractually every {dt.months} months</div>
                      </div>
                    </div>
                    {dt.discount_percent > 0 ? (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                        Save {dt.discount_percent}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-semibold">Standard</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS FOR SOLUTIONS CRUD ──────────────────────────────────────── */}
      {isSolutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold">
                {editingSolution ? `Edit ${editingSolution.label}` : "Add Solution Type"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsSolutionModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveSolution} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Unique Key</label>
                <Input
                  required
                  disabled={Boolean(editingSolution)}
                  value={solutionForm.key}
                  onChange={(e) => setSolutionForm({ ...solutionForm, key: e.target.value })}
                  placeholder="e.g. ONSITE_ONLINE"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <Input
                  required
                  value={solutionForm.label}
                  onChange={(e) => setSolutionForm({ ...solutionForm, label: e.target.value })}
                  placeholder="e.g. Walk-in & Appointments"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input
                  value={solutionForm.description}
                  onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
                  placeholder="Help text shown under card on registration page"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Icon Identifier</label>
                  <Input
                    value={solutionForm.icon_key}
                    onChange={(e) => setSolutionForm({ ...solutionForm, icon_key: e.target.value })}
                    placeholder="sparkles / monitor / globe"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={solutionForm.display_order}
                    onChange={(e) => setSolutionForm({ ...solutionForm, display_order: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs">
                <input
                  type="checkbox"
                  checked={solutionForm.is_active}
                  onChange={(e) => setSolutionForm({ ...solutionForm, is_active: e.target.checked })}
                  className="rounded border-border text-brand"
                />
                <span>Active (Available at registration signup wizard)</span>
              </label>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsSolutionModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving ? "Saving..." : "Save Solution"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS FOR COMPONENTS CRUD ─────────────────────────────────────── */}
      {isComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold">
                {editingComponent ? `Edit ${editingComponent.label}` : "Add Plan Component"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsComponentModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveComponent} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Component Key</label>
                  <Input
                    required
                    disabled={Boolean(editingComponent)}
                    value={componentForm.key}
                    onChange={(e) => setComponentForm({ ...componentForm, key: e.target.value })}
                    placeholder="e.g. services"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                  <Input
                    required
                    value={componentForm.label}
                    onChange={(e) => setComponentForm({ ...componentForm, label: e.target.value })}
                    placeholder="e.g. Service Queues"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input
                  value={componentForm.description}
                  onChange={(e) => setComponentForm({ ...componentForm, description: e.target.value })}
                  placeholder="Help text shown under input"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={componentForm.category}
                    onChange={(e) => setComponentForm({ ...componentForm, category: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                  >
                    <option value="SERVICE">Services</option>
                    <option value="OPERATOR_DESK">Operator Desks</option>
                    <option value="KIOSK">Kiosks & Displays</option>
                    <option value="ADDON">Add-ons</option>
                    <option value="BRANCH_SETUP">Setup / Branch Setup</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Branch Mode Scope</label>
                  <select
                    value={componentForm.branch_mode_scope}
                    onChange={(e) => setComponentForm({ ...componentForm, branch_mode_scope: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                  >
                    <option value="BOTH">Both Modes</option>
                    <option value="SERVICE_BASED">Service-Based Only</option>
                    <option value="NON_SERVICE_BASED">Non-Service-Based Only</option>
                    <option value="N_A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Pricing Type</label>
                  <select
                    value={componentForm.pricing_type}
                    onChange={(e) => setComponentForm({ ...componentForm, pricing_type: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                  >
                    <option value="PER_UNIT">Per Unit</option>
                    <option value="FLAT">Flat Fee</option>
                    <option value="TOGGLE_PAID">Toggle Paid</option>
                    <option value="TOGGLE_FREE">Toggle Free</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Unit Label</label>
                  <Input
                    value={componentForm.unit_label}
                    onChange={(e) => setComponentForm({ ...componentForm, unit_label: e.target.value })}
                    placeholder="branch / screen"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Default Included</label>
                  <Input
                    type="number"
                    min={0}
                    value={componentForm.default_included_qty}
                    onChange={(e) => setComponentForm({ ...componentForm, default_included_qty: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Price per unit (₹)</label>
                  <Input
                    type="number"
                    min={0}
                    value={componentForm.price_per_unit}
                    onChange={(e) => setComponentForm({ ...componentForm, price_per_unit: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Max per Branch</label>
                  <Input
                    type="number"
                    value={componentForm.max_qty_per_branch}
                    onChange={(e) => setComponentForm({ ...componentForm, max_qty_per_branch: e.target.value })}
                    placeholder="e.g. 50"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={componentForm.display_order}
                    onChange={(e) => setComponentForm({ ...componentForm, display_order: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Icon Key</label>
                  <Input
                    value={componentForm.icon_key}
                    onChange={(e) => setComponentForm({ ...componentForm, icon_key: e.target.value })}
                    placeholder="monitor / building"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 rounded-xl border border-border bg-accent/20 p-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_toggle}
                    onChange={(e) => setComponentForm({ ...componentForm, is_toggle: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Binary Toggle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_addon_only}
                    onChange={(e) => setComponentForm({ ...componentForm, is_addon_only: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Add-on Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_mandatory}
                    onChange={(e) => setComponentForm({ ...componentForm, is_mandatory: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Is Mandatory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_active}
                    onChange={(e) => setComponentForm({ ...componentForm, is_active: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsComponentModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving ? "Saving..." : "Save Component"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SAFETY CONFIRMATION MODAL FOR PRICES ───────────────────────────────── */}
      {pendingPriceSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-coral/30 bg-background p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-coral">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold">Warning: Modifying Global Pricing</h3>
            </div>
            <div className="mt-3 text-sm space-y-3 text-muted-foreground">
              <p>
                You are updating the unit price for <strong>{editingComponent?.label}</strong>:
              </p>
              <div className="rounded-xl bg-accent/40 px-4 py-2 text-center font-mono font-bold text-foreground">
                ₹{editingComponent?.price_per_unit} → ₹{pendingPriceSave.price_per_unit}
              </div>
              <p className="text-xs border-l-2 border-brand/50 pl-3 italic">
                "Existing company contracts retain their locked pricing history. This adjustment will only affect new registrations and subsequently purchased add-on packages."
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border/60">
              <Button variant="outline" onClick={() => setPendingPriceSave(null)}>Cancel</Button>
              <Button variant="brand" onClick={() => executeSaveComponent(pendingPriceSave)} disabled={saving}>
                {saving ? "Updating Price..." : "Acknowledge & Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS FOR DELIVERY METHOD CRUD ───────────────────────────────────── */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold">
                {editingDelivery ? `Edit ${editingDelivery.label}` : "Add Token Delivery Method"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsDeliveryModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveDelivery} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Unique Key</label>
                <Input
                  required
                  disabled={Boolean(editingDelivery)}
                  value={deliveryForm.key}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, key: e.target.value })}
                  placeholder="e.g. WHATSAPP"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <Input
                  required
                  value={deliveryForm.label}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, label: e.target.value })}
                  placeholder="e.g. WhatsApp Digital Ticket"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Price per Branch (₹)</label>
                  <Input
                    type="number"
                    value={deliveryForm.price_per_branch}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, price_per_branch: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={deliveryForm.display_order}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, display_order: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Queue Method Code (Mapping Digit)</label>
                <Input
                  value={deliveryForm.queue_method_code}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, queue_method_code: e.target.value })}
                  placeholder="Matches QueueMethod.method (e.g. 1, 2, 3, 4)"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-6 rounded-xl border border-border bg-accent/20 p-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliveryForm.requires_hardware}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, requires_hardware: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Requires Hardware Printer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliveryForm.is_active}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, is_active: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeliveryModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving ? "Saving..." : "Save Method"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS FOR DURATION TIER CRUD ─────────────────────────────────────── */}
      {isDurationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold">
                {editingDuration ? `Edit Duration Tier` : "Add Duration Tier"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsDurationModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveDuration} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Contract Months</label>
                  <Input
                    type="number"
                    required
                    disabled={Boolean(editingDuration)}
                    value={durationForm.months}
                    onChange={(e) => setDurationForm({ ...durationForm, months: Number(e.target.value) })}
                    placeholder="e.g. 12"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Discount (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={durationForm.discount_percent}
                    onChange={(e) => setDurationForm({ ...durationForm, discount_percent: Number(e.target.value) })}
                    placeholder="e.g. 20"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={durationForm.display_order}
                    onChange={(e) => setDurationForm({ ...durationForm, display_order: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs">
                <input
                  type="checkbox"
                  checked={durationForm.is_active}
                  onChange={(e) => setDurationForm({ ...durationForm, is_active: e.target.checked })}
                  className="rounded border-border text-brand"
                />
                <span>Active (Show discount option to client)</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDurationModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving ? "Saving..." : "Save Tier"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function InterestedCandidatesManager() {
  const { state, actions } = useQuesole();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const candidates = state.interestedCandidates || [];

  const counts = {
    total: candidates.length,
    interested: candidates.filter((c) => c.status === "interested").length,
    invoice_requested: candidates.filter((c) => c.status === "invoice_requested").length,
    plan_purchased: candidates.filter((c) => c.status === "plan_purchased").length,
    contacted: candidates.filter((c) => c.status === "contacted").length,
    dropped: candidates.filter((c) => c.status === "dropped").length,
  };

  const filtered = candidates.filter((c) => {
    const query = search.toLowerCase();
    const matchesSearch =
      c.company_name?.toLowerCase().includes(query) ||
      c.contact_name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query) ||
      c.city?.toLowerCase().includes(query) ||
      c.state?.toLowerCase().includes(query) ||
      c.country?.toLowerCase().includes(query) ||
      c.industry?.toLowerCase().includes(query) ||
      c.custom_industry?.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (candidateId: number, newStatus: string) => {
    try {
      await actions.updateCandidateStatus(candidateId, newStatus);
      toast.success("Lead status updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update lead status");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedCandidate) return;
    setSavingNote(true);
    try {
      await actions.updateCandidateStatus(selectedCandidate.id, selectedCandidate.status, noteText);
      toast.success("Notes saved successfully");
      setSelectedCandidate(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save notes");
    } finally {
      setSavingNote(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "plan_purchased":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Plan Purchased
          </span>
        );
      case "contacted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <Phone className="h-3.5 w-3.5" /> Contacted
          </span>
        );
      case "dropped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <X className="h-3.5 w-3.5" /> Dropped
          </span>
        );
      case "invoice_requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5 animate-pulse" /> Invoice Requested
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" /> Plan Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={<CountUp value={counts.total} />}
          hint="Completed Step 1 registration"
        />
        <StatCard
          label="Plan Pending"
          value={<CountUp value={counts.interested} />}
          hint="Registered, plan not bought"
        />
        <StatCard
          label="Plan Purchased"
          value={<CountUp value={counts.plan_purchased} />}
          hint="Converted to active customers"
        />
        <StatCard
          label="Contacted Leads"
          value={<CountUp value={counts.contacted} />}
          hint="Sales followup in progress"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by company, name, email, city..."
            className="h-10 rounded-xl pl-9 bg-card border-border/80"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: `All (${counts.total})` },
            { id: "interested", label: `Plan Pending (${counts.interested})` },
            { id: "invoice_requested", label: `Invoice Req (${counts.invoice_requested})` },
            { id: "plan_purchased", label: `Purchased (${counts.plan_purchased})` },
            { id: "contacted", label: `Contacted (${counts.contacted})` },
            { id: "dropped", label: `Dropped (${counts.dropped})` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border",
                statusFilter === pill.id
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground border-border/80 hover:bg-accent/40"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Panel */}
      <div className="panel overflow-hidden border border-border/60 bg-card rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                <th className="px-5 py-3.5">Company & Industry</th>
                <th className="px-5 py-3.5">Contact Person</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Registered</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    No interested candidates found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((cand) => (
                  <tr key={cand.id} className="hover:bg-muted/20 transition-colors">
                    {/* Company */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {cand.company_name}
                        {cand.website && (
                          <a
                            href={cand.website.startsWith("http") ? cand.website : `https://${cand.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-brand"
                            title="Visit website"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground font-medium">
                          {cand.industry}
                        </span>
                        {cand.custom_industry && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                            {cand.custom_industry}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground">{cand.contact_name}</div>
                      <div className="text-xs text-muted-foreground flex flex-col gap-0.5 mt-0.5">
                        <a href={`mailto:${cand.email}`} className="hover:text-brand flex items-center gap-1 truncate max-w-[200px]">
                          <Mail className="h-3 w-3 shrink-0" /> {cand.email}
                        </a>
                        <a href={`tel:${cand.country_code}${cand.phone}`} className="hover:text-brand flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" /> {cand.country_code} {cand.phone}
                        </a>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {cand.city}, {cand.state}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {cand.address ? `${cand.address}, ` : ""}{cand.country}
                      </div>
                    </td>

                    {/* Registered Date */}
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      <div>{new Date(cand.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                      <div className="text-[10px] text-muted-foreground/70">{new Date(cand.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>

                    {/* Status Pill */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {statusBadge(cand.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={cand.status}
                          onChange={(e) => handleStatusChange(cand.id, e.target.value)}
                          className="h-8 rounded-lg bg-background border border-border text-xs px-2 text-foreground font-medium outline-none cursor-pointer focus:ring-1 focus:ring-brand"
                        >
                          <option value="interested">Plan Pending</option>
                          <option value="invoice_requested">Invoice Requested</option>
                          <option value="contacted">Contacted</option>
                          <option value="plan_purchased">Plan Purchased</option>
                          <option value="dropped">Dropped</option>
                        </select>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setNoteText(cand.notes || "");
                          }}
                          className="h-8 px-2.5 text-xs rounded-lg gap-1"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {cand.notes ? "Note" : "+ Note"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note Editing Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground">Lead Notes</h3>
                <p className="text-xs text-muted-foreground font-medium">{selectedCandidate.company_name} — {selectedCandidate.contact_name}</p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* If lead submitted corporate invoice request */}
            {selectedCandidate.plan_config?.invoice_details && (
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                    Corporate Invoice Details
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {selectedCandidate.plan_config.duration_months || 1} mo
                  </span>
                </div>
                <div className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                  <div><strong>Billed Entity:</strong> {selectedCandidate.plan_config.invoice_details.billing_name}</div>
                  <div><strong>Email:</strong> {selectedCandidate.plan_config.invoice_details.biller_email}</div>
                  <div><strong>Contact:</strong> {selectedCandidate.plan_config.invoice_details.contact_person} ({selectedCandidate.plan_config.invoice_details.contact_phone})</div>
                  <div><strong>GSTIN:</strong> {selectedCandidate.plan_config.invoice_details.gst_number || "Not Applicable"}</div>
                  <div><strong>Address:</strong> {selectedCandidate.plan_config.invoice_details.billing_address}</div>
                  {selectedCandidate.plan_config.invoice_details.further_instructions && (
                    <div className="pt-1 border-t border-indigo-200/40 text-muted-foreground">
                      <strong>Notes:</strong> {selectedCandidate.plan_config.invoice_details.further_instructions}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Internal Remarks / Follow-up Notes
                </label>
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter notes about follow-up call, client needs, demo schedule, etc..."
                  className="w-full rounded-xl bg-background border border-border p-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedCandidate(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                disabled={savingNote}
                onClick={handleSaveNotes}
                className="rounded-xl font-semibold"
              >
                {savingNote ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function InvoiceRequestsManager() {
  const { state, actions } = useQuesole();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"pending" | "approved" | "all">("pending");
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Filter companies that submitted an offline invoice inquiry or have a pending invoice approval
  const invoiceCompanies = state.companies.filter((c) => {
    const isPendingInvoice =
      c.onboardingStatus === "pending_invoice_approval" ||
      (c.status === "pending" && (c.planPurchase?.payment_status === "pending" || c.planPurchase?.total_amount));
    const hasPurchase = Boolean(c.planPurchase?.line_items?.length);
    return isPendingInvoice || hasPurchase;
  });

  const pendingList = invoiceCompanies.filter(
    (c) => c.onboardingStatus === "pending_invoice_approval" || c.status === "pending"
  );
  const approvedList = invoiceCompanies.filter(
    (c) => c.status === "active" && c.onboardingStatus !== "pending_invoice_approval"
  );

  const totalPendingAmount = pendingList.reduce(
    (acc, c) => acc + (c.planPurchase?.total_amount || c.monthlySpend || 0),
    0
  );

  const displayedList = (
    tab === "pending" ? pendingList : tab === "approved" ? approvedList : invoiceCompanies
  ).filter((c) => {
    const term = q.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.adminName || "").toLowerCase().includes(term) ||
      (c.adminEmail || "").toLowerCase().includes(term) ||
      (c.adminPhone || "").toLowerCase().includes(term) ||
      (c.city || "").toLowerCase().includes(term) ||
      (c.industry || "").toLowerCase().includes(term)
    );
  });

  const handleApprove = async (company: any) => {
    setApprovingId(company.id);
    try {
      await actions.approveCompanyInvoice(company.id);
      toast.success("Workspace approved & activated successfully!", {
        description: `${company.name} and administrator ${company.adminEmail || company.email} can now sign in to their console.`
      });
      if (selectedCompany?.id === company.id) {
        setSelectedCompany(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve company invoice.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDownloadPDF = (company: any) => {
    const matchingCandidate = state.interestedCandidates?.find((cand: any) => 
      String(cand.company_id) === String(company.id) || 
      cand.email === company.adminEmail || 
      cand.email === company.email
    );
    const planConfig = company.planConfig || matchingCandidate?.plan_config || {};
    const invDetails = planConfig?.invoice_details || {};
    const durationMonths = Number(planConfig?.duration_months || 1);

    const lineItems = company.planPurchase?.line_items || [];
    const itemizedObj: Record<string, number> = {};
    lineItems.forEach((li: any) => {
      itemizedObj[li.component_key] = Number(li.subtotal || li.unit_price || 0);
    });

    const total = Number(company.planPurchase?.total_amount || company.monthlySpend || 0);
    const contractSubtotal = Math.round(total / 1.18);
    const gstAmount = Math.max(0, total - contractSubtotal);

    generateAndDownloadInvoicePDF({
      companyName: company.name,
      contactName: company.adminName || company.contact || "Authorized Executive",
      email: company.adminEmail || company.email || "support@quesole.com",
      phone: company.adminPhone || company.phone || "—",
      city: company.city,
      country: company.country || "India",
      billingName: invDetails.billing_name || invDetails.billingName || company.name,
      billingAddress: invDetails.billing_address || invDetails.billingAddress || company.address || `${company.city || ""}, ${company.country || "India"}`,
      billerEmail: invDetails.biller_email || invDetails.billerEmail || company.adminEmail || company.email,
      contactPerson: invDetails.contact_person || invDetails.contactPerson || company.adminName || company.contact,
      contactPhone: invDetails.contact_phone || invDetails.contactPhone || company.adminPhone || company.phone,
      gstNumber: invDetails.gst_number || invDetails.gstNumber || "",
      furtherInstructions: invDetails.further_instructions || invDetails.furtherInstructions || "",
      planTiming: {
        termLabel: `${durationMonths} Month${durationMonths > 1 ? "s" : ""} Subscription`,
      },
      branches: company.branchesDetail && company.branchesDetail.length > 0
        ? company.branchesDetail
        : (planConfig?.branches && planConfig.branches.length > 0 ? planConfig.branches : [{ name: `${company.name} Main Branch`, operatorQty: 1, kioskQty: 1, serviceQty: 1 }]),
      durationMonths: durationMonths,
      itemized: itemizedObj,
      monthlyTotal: Math.round(contractSubtotal / Math.max(1, durationMonths)),
      contractSubtotal: contractSubtotal,
      gstPercent: 18,
      gstAmount: gstAmount,
      grandTotal: total,
    });
    toast.success("Proforma Invoice PDF generated & downloaded!");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Invoice Requests & Inquiries
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review offline proforma invoice orders, inspect customer branch requirements, and approve workspace dashboard access.
          </p>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Invoices"
          value={<CountUp value={pendingList.length} />}
          hint="Awaiting executive approval"
        />
        <StatCard
          label="Pending Contract Value"
          value={<CountUp value={totalPendingAmount} prefix="₹" />}
          hint="Receivable upon clearance"
        />
        <StatCard
          label="Activated Workspaces"
          value={<CountUp value={approvedList.length} />}
          hint="Approved & active accounts"
        />
        <StatCard
          label="Total Inquiries"
          value={<CountUp value={invoiceCompanies.length} />}
          hint="Enterprise quote submissions"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company, administrator, email, phone, city..."
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
          <button
            onClick={() => setTab("pending")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              tab === "pending"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>Pending Review</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setTab("approved")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              tab === "approved"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Approved & Active</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
              {approvedList.length}
            </span>
          </button>

          <button
            onClick={() => setTab("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              tab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Inquiries ({invoiceCompanies.length})
          </button>
        </div>
      </div>

      {/* Inquiry List Cards */}
      <div className="space-y-4">
        {displayedList.length === 0 ? (
          <div className="panel p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div className="font-semibold text-foreground">No invoice inquiries found</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {tab === "pending"
                ? "All invoice inquiries have been reviewed and approved. New requests will appear here immediately."
                : "No matching invoice records match your current filters."}
            </p>
          </div>
        ) : (
          displayedList.map((company) => {
            const isPending =
              company.onboardingStatus === "pending_invoice_approval" || company.status === "pending";
            const branches = company.branchesDetail || [];
            const grandTotal = company.planPurchase?.total_amount || company.monthlySpend || 0;

            return (
              <div
                key={company.id}
                className={cn(
                  "panel p-5 sm:p-6 transition-all border space-y-5",
                  isPending
                    ? "border-amber-500/30 bg-amber-500/[0.02] shadow-[0_4px_20px_-4px_rgba(245,158,11,0.08)]"
                    : "border-border/80"
                )}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                        <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        {company.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
                        {company.industry || "General"}
                      </span>
                      {company.city && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {company.city}{company.country ? `, ${company.country}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        Awaiting Superadmin Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approved & Active
                      </span>
                    )}
                  </div>
                </div>

                {/* 3-Column Specifications Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Administrator Contact */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-border/60 space-y-2">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-indigo-500" />
                      Contact Administrator
                    </div>
                    <div className="font-semibold text-foreground text-sm">
                      {company.adminName || company.contact || "Primary Admin"}
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <a
                          href={`mailto:${company.adminEmail || company.email}`}
                          className="text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate"
                        >
                          {company.adminEmail || company.email || "—"}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <a
                          href={`tel:${company.adminPhone || company.phone}`}
                          className="text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                        >
                          {company.adminPhone || company.phone || "—"}
                        </a>
                      </div>
                      {company.address && (
                        <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40 truncate">
                          {company.address}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Branches & Configuration */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-border/60 space-y-2">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-indigo-500" />
                      Configuration & Setup
                    </div>
                    <div className="font-semibold text-foreground text-sm">
                      {branches.length > 0 ? `${branches.length} Configured Branch${branches.length > 1 ? "es" : ""}` : "1 Primary Branch"}
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      {branches.slice(0, 2).map((b: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="font-medium text-foreground truncate">{b.name}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {b.mode === "SERVICE_BASED" ? "Multi-Service" : "Single Queue"}
                          </span>
                        </div>
                      ))}
                      {branches.length > 2 && (
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          +{branches.length - 2} more branches configured
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-muted font-medium">
                          Solution: {company.solution || "Hybrid"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Commercial Proposal */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-border/60 space-y-2">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                      Invoice Grand Total
                    </div>
                    <div className="font-black text-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      ₹{grandTotal.toLocaleString("en-IN")}
                    </div>
                    <div className="space-y-1 text-muted-foreground text-[11px]">
                      <div className="flex items-center justify-between">
                        <span>GST Included (18%):</span>
                        <span className="font-semibold text-foreground">
                          ₹{Math.round(grandTotal - grandTotal / 1.18).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Payment Terms:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {isPending ? "Offline Settlement" : "Approved"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Official Corporate Billing Details Section */}
                {(() => {
                  const matchingCandidate = state.interestedCandidates?.find((cand: any) => 
                    String(cand.company_id) === String(company.id) || 
                    cand.email === company.adminEmail || 
                    cand.email === company.email
                  );
                  const planConfig = company.planConfig || matchingCandidate?.plan_config || {};
                  const inv = planConfig?.invoice_details;
                  const durationMonths = planConfig?.duration_months || 1;

                  return (
                    <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-indigo-600" /> Corporate Invoicing Details
                        </span>
                        <span className="text-[10.5px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                          Term: {durationMonths} Month{durationMonths > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-slate-700 dark:text-slate-300 text-[11.5px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Billing Name</span>
                          <strong className="text-foreground">{inv?.billing_name || inv?.billingName || company.name}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Biller / Accounts Email</span>
                          <span className="text-foreground">{inv?.biller_email || inv?.billerEmail || company.email || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">GSTIN / Tax ID</span>
                          <span className="font-semibold text-foreground">{inv?.gst_number || inv?.gstNumber || "Not Applicable / Unregistered"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Contact Person & Phone</span>
                          <span className="text-foreground">{inv?.contact_person || inv?.contactPerson || company.adminName || "—"} ({inv?.contact_phone || inv?.contactPhone || company.phone || "—"})</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Billing Address</span>
                          <span className="text-foreground truncate block">{inv?.billing_address || inv?.billingAddress || company.address || `${company.city || ""}, ${company.country || "India"}`}</span>
                        </div>
                      </div>
                      {(inv?.further_instructions || inv?.furtherInstructions) && (
                        <div className="pt-1.5 border-t border-indigo-200/50 dark:border-indigo-900/40 text-[11px] text-muted-foreground">
                          <strong>Further Instructions / PO:</strong> {inv.further_instructions || inv.furtherInstructions}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Card Action Footer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(company)}
                      className="rounded-xl h-9 text-xs font-semibold"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download Proforma PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCompany(company)}
                      className="rounded-xl h-9 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Inspect Full Specs
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={approvingId === company.id}
                        onClick={() => handleApprove(company)}
                        className="rounded-xl h-9 text-xs font-bold px-4 shadow-md shadow-brand/20"
                      >
                        {approvingId === company.id ? (
                          <>
                            <Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Activating Account...
                          </>
                        ) : (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Approve & Activate Workspace
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" /> Workspace Live & Operational
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            actions.suspendCompany(company.id);
                            toast.info(`${company.name} suspended`);
                          }}
                          className="rounded-xl h-8 text-xs text-muted-foreground"
                        >
                          Suspend
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Inspection Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-1">
                  Enterprise Invoice Specification
                </div>
                <h2 className="text-xl font-black text-foreground">
                  {selectedCompany.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedCompany.industry} · {selectedCompany.city}, {selectedCompany.country || "India"}
                </p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Administrator Details */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2 text-xs">
              <div className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                Authorized Contact Administrator
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Name</span>
                  {selectedCompany.adminName || selectedCompany.contact || "Primary Admin"}
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Email</span>
                  <a href={`mailto:${selectedCompany.adminEmail || selectedCompany.email}`} className="text-indigo-600 hover:underline">
                    {selectedCompany.adminEmail || selectedCompany.email || "—"}
                  </a>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Phone</span>
                  <a href={`tel:${selectedCompany.adminPhone || selectedCompany.phone}`} className="text-indigo-600 hover:underline">
                    {selectedCompany.adminPhone || selectedCompany.phone || "—"}
                  </a>
                </div>
              </div>
            </div>

            {/* Corporate Invoicing Details */}
            {(() => {
              const matchingCandidate = state.interestedCandidates?.find((cand: any) => 
                String(cand.company_id) === String(selectedCompany.id) || 
                cand.email === selectedCompany.adminEmail || 
                cand.email === selectedCompany.email
              );
              const planConfig = selectedCompany.planConfig || matchingCandidate?.plan_config || {};
              const inv = planConfig?.invoice_details || {};
              const durationMonths = planConfig?.duration_months || 1;

              return (
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 text-[11px] flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-indigo-600" />
                      Official Corporate Billing Information
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      Term: {durationMonths} Month{durationMonths > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-medium text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Billing Legal Name</span>
                      <strong className="text-foreground">{inv.billing_name || inv.billingName || selectedCompany.name}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Biller / Accounts Email</span>
                      <a href={`mailto:${inv.biller_email || inv.billerEmail || selectedCompany.email}`} className="text-indigo-600 hover:underline">
                        {inv.biller_email || inv.billerEmail || selectedCompany.email || "—"}
                      </a>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">GSTIN / Tax ID</span>
                      <span className="font-semibold text-foreground">{inv.gst_number || inv.gstNumber || "Not Applicable / Unregistered"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Contact Person</span>
                      <span className="text-foreground">{inv.contact_person || inv.contactPerson || selectedCompany.adminName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Contact Phone Number</span>
                      <a href={`tel:${inv.contact_phone || inv.contactPhone || selectedCompany.phone}`} className="text-indigo-600 hover:underline">
                        {inv.contact_phone || inv.contactPhone || selectedCompany.phone || "—"}
                      </a>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Billing Address</span>
                      <span className="text-foreground truncate block">{inv.billing_address || inv.billingAddress || selectedCompany.address || `${selectedCompany.city || ""}, ${selectedCompany.country || "India"}`}</span>
                    </div>
                  </div>
                  {(inv.further_instructions || inv.furtherInstructions) && (
                    <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/40 text-[11px] text-muted-foreground">
                      <strong>Customer Purchase Order / Further Instructions:</strong> {inv.further_instructions || inv.furtherInstructions}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Itemized Commercial Table */}
            <div className="space-y-2">
              <div className="font-bold text-sm text-foreground">
                Itemized Commercial Breakdown
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left">Item Description</th>
                      <th className="px-3.5 py-2.5 text-center">Qty</th>
                      <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {selectedCompany.planPurchase?.line_items && selectedCompany.planPurchase.line_items.length > 0 ? (
                      selectedCompany.planPurchase.line_items.map((li: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3.5 py-2.5 font-medium text-foreground">
                            {li.component_label || li.component_key}
                          </td>
                          <td className="px-3.5 py-2.5 text-center text-muted-foreground">
                            {li.quantity || 1}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-semibold text-foreground">
                            ₹{Number(li.subtotal || li.unit_price || 0).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3.5 py-2.5 font-medium">Standard Enterprise Workspace Deployment</td>
                        <td className="px-3.5 py-2.5 text-center">1</td>
                        <td className="px-3.5 py-2.5 text-right font-semibold">
                          ₹{Number(selectedCompany.monthlySpend || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-muted/20 border-t border-border font-semibold text-xs">
                    <tr>
                      <td colSpan={2} className="px-3.5 py-2 text-right text-muted-foreground">Grand Total (Incl. 18% GST):</td>
                      <td className="px-3.5 py-2 text-right text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        ₹{Number(selectedCompany.planPurchase?.total_amount || selectedCompany.monthlySpend || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPDF(selectedCompany)}
                className="rounded-xl text-xs font-semibold"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download Proforma PDF
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCompany(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
                {selectedCompany.status === "pending" ||
                selectedCompany.onboardingStatus === "pending_invoice_approval" ? (
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={approvingId === selectedCompany.id}
                    onClick={() => handleApprove(selectedCompany)}
                    className="rounded-xl text-xs font-bold shadow-md shadow-brand/20"
                  >
                    {approvingId === selectedCompany.id ? "Activating..." : "Approve & Activate Workspace"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

