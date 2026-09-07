import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Monitor, Eye, EyeOff, RefreshCw, Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, Check, Clock, CheckSquare, Square, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, useQuesole } from "@/lib/quesole/store";
import { cn } from "@/lib/utils";
import type { Desk } from "@/lib/quesole/types";

interface DisplayTerminalsManagerProps {
  branchId: string;
  branchDesks: Desk[];
  companySlug: string;
  branchSlug: string;
}

export function DisplayTerminalsManager({ branchId, branchDesks, companySlug, branchSlug }: DisplayTerminalsManagerProps) {
  const { actions, refresh } = useQuesole();
  const [terminals, setTerminals] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [fetchedDesks, setFetchedDesks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasscodes, setVisiblePasscodes] = useState<Record<string, boolean>>({});

  // Timing form values per terminal
  const [timingSettings, setTimingSettings] = useState<Record<string, { desks_per_slot: number; rotation_seconds: number }>>({});
  const [savingTiming, setSavingTiming] = useState<Record<string, boolean>>({});

  // Inline Quick Create Desk Modal
  const [isAddDeskOpen, setIsAddDeskOpen] = useState(false);
  const [newDeskName, setNewDeskName] = useState("");
  const [isCreatingDesk, setIsCreatingDesk] = useState(false);

  const displayUrl = companySlug && branchSlug ? `/${companySlug}/branches/${branchSlug}/display` : `/display`;

  const loadData = async () => {
    try {
      setLoading(true);
      const [termData, slotData, desksData] = await Promise.all([
        apiFetch(`/api/display-terminals/?branch=${branchId}`),
        apiFetch(`/api/display-slots/`),
        apiFetch(`/api/desks/`).catch(() => []),
      ]);

      const branchTerminals = (termData as any[]).filter((t) => String(t.branch) === String(branchId));
      setTerminals(branchTerminals);
      setSlots(slotData as any[]);

      const filteredDesks = (desksData as any[]).filter((d) => String(d.branch || d.branch_id || d.branchId) === String(branchId));
      setFetchedDesks(filteredDesks);

      const timings: Record<string, { desks_per_slot: number; rotation_seconds: number }> = {};
      branchTerminals.forEach((t) => {
        timings[t.id] = {
          desks_per_slot: t.desks_per_slot || 4,
          rotation_seconds: t.rotation_seconds || 10,
        };
      });
      setTimingSettings(timings);
    } catch (err: any) {
      toast.error(err.message || "Failed to load display terminals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      loadData();
    }
  }, [branchId]);

  // Combine prop desks and fetched desks for 100% reliable desk listing
  const activeDesksList = fetchedDesks.length > 0
    ? fetchedDesks
    : branchDesks.map((d) => ({ id: d.id, name: d.label || d.name, label: d.label || d.name }));

  const togglePasscode = (id: string) => {
    setVisiblePasscodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRegeneratePasscode = async (terminalId: string) => {
    try {
      const updated = await apiFetch(`/api/display-terminals/${terminalId}/regenerate-passcode/`, {
        method: "POST",
      });
      toast.success("Passcode regenerated successfully! Active sessions have been evicted.");
      setTerminals((prev) => prev.map((t) => (t.id === terminalId ? updated : t)));
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate passcode.");
    }
  };

  const handleSaveTiming = async (terminalId: string) => {
    const setting = timingSettings[terminalId];
    if (!setting) return;

    setSavingTiming((prev) => ({ ...prev, [terminalId]: true }));
    try {
      const updated = await apiFetch(`/api/display-terminals/${terminalId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          desks_per_slot: Number(setting.desks_per_slot) || 4,
          rotation_seconds: Number(setting.rotation_seconds) || 10,
        }),
      });
      toast.success("Rotation timing settings saved successfully!");
      setTerminals((prev) => prev.map((t) => (t.id === terminalId ? updated : t)));
    } catch (err: any) {
      toast.error(err.message || "Failed to save timing settings.");
    } finally {
      setSavingTiming((prev) => ({ ...prev, [terminalId]: false }));
    }
  };

  const handleAddSlot = async (terminalId: string) => {
    const termSlots = slots.filter((s) => String(s.terminal) === String(terminalId));
    const nextOrder = termSlots.length + 1;

    try {
      const newSlot = await apiFetch(`/api/display-slots/`, {
        method: "POST",
        body: JSON.stringify({
          terminal: terminalId,
          order: nextOrder,
          desk_ids: [],
        }),
      });
      toast.success(`Slot #${nextOrder} created!`);
      setSlots((prev) => [...prev, newSlot]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add slot.");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this rotation slot?")) return;
    try {
      await apiFetch(`/api/display-slots/${slotId}/`, { method: "DELETE" });
      toast.success("Rotation slot deleted.");
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slot.");
    }
  };

  const handleToggleDeskInSlot = async (slot: any, deskId: string) => {
    const currentDeskIds = (slot.desk_ids || (slot.desks || [])).map(String);
    const exists = currentDeskIds.includes(String(deskId));

    const nextDeskIds = (exists
      ? currentDeskIds.filter((id) => id !== String(deskId))
      : [...currentDeskIds, String(deskId)]).map(Number);

    try {
      const updated = await apiFetch(`/api/display-slots/${slot.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          desk_ids: nextDeskIds,
        }),
      });
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
    } catch (err: any) {
      toast.error(err.message || "Failed to update desk assignments for slot.");
    }
  };

  const handleSelectAllDesksForSlot = async (slot: any) => {
    const allDeskIds = activeDesksList.map((d) => Number(d.id));
    try {
      const updated = await apiFetch(`/api/display-slots/${slot.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          desk_ids: allDeskIds,
        }),
      });
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
      toast.success("All branch desks assigned to slot.");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign all desks.");
    }
  };

  const handleClearDesksForSlot = async (slot: any) => {
    try {
      const updated = await apiFetch(`/api/display-slots/${slot.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          desk_ids: [],
        }),
      });
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
      toast.success("Desk assignments cleared for slot.");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear desk assignments.");
    }
  };

  const handleReorderSlot = async (slot: any, direction: "up" | "down", termSlots: any[]) => {
    const sorted = [...termSlots].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((s) => s.id === slot.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const otherSlot = sorted[targetIndex];
    const currentOrder = slot.order;
    const targetOrder = otherSlot.order;

    try {
      const [u1, u2] = await Promise.all([
        apiFetch(`/api/display-slots/${slot.id}/`, { method: "PATCH", body: JSON.stringify({ order: targetOrder }) }),
        apiFetch(`/api/display-slots/${otherSlot.id}/`, { method: "PATCH", body: JSON.stringify({ order: currentOrder }) }),
      ]);
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? u1 : s.id === otherSlot.id ? u2 : s)));
      toast.success("Slot rotation order updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to reorder slot.");
    }
  };

  const handleCreateQuickDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeskName.trim()) return;

    setIsCreatingDesk(true);
    try {
      await apiFetch(`/api/desks/`, {
        method: "POST",
        body: JSON.stringify({
          branch: branchId,
          name: newDeskName.trim(),
          label: newDeskName.trim(),
          is_active: true,
        }),
      });
      toast.success(`Desk "${newDeskName}" created!`);
      setNewDeskName("");
      setIsAddDeskOpen(false);
      await loadData();
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create desk.");
    } finally {
      setIsCreatingDesk(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground font-semibold">Loading display terminals & desks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 text-foreground rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-soft">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Layers className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-black tracking-tight text-foreground">Live Display Terminals</h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Assign counter desks to rotation slots, configure slide timing, and manage passcodes for live display screens in your waiting area.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddDeskOpen(true)}
            className="gap-1.5 text-xs font-bold border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Add Counter Desk
          </Button>
          <Button
            variant="brand"
            size="sm"
            onClick={() => window.open(displayUrl, "_blank")}
            className="gap-2 text-xs font-bold shrink-0 shadow-lg shadow-brand/20"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Launch Display Board
          </Button>
        </div>
      </div>

      {terminals.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-3xl p-12 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
          <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold">No Live Display Screens Provisioned</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your current plan includes 0 display terminals. To add live display screens to your branch, upgrade your package allocations in the Billing console.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {terminals.map((term) => {
            const termSlots = slots.filter((s) => String(s.terminal) === String(term.id)).sort((a, b) => a.order - b.order);
            const isPasscodeVisible = visiblePasscodes[term.id] ?? false;
            const timing = timingSettings[term.id] || { desks_per_slot: term.desks_per_slot || 4, rotation_seconds: term.rotation_seconds || 10 };

            // Generate Rotation Preview String
            const previewParts = termSlots.map((s, idx) => {
              const deskIds = (s.desk_ids || (s.desks || [])).map(String);
              const assignedNames = activeDesksList
                .filter((d) => deskIds.includes(String(d.id)))
                .map((d) => d.label || d.name);
              const namesStr = assignedNames.length > 0 ? assignedNames.join(", ") : "No Desks";
              return `Slot ${idx + 1}: ${namesStr} (${timing.rotation_seconds}s)`;
            });
            const rotationPreviewText = previewParts.length > 0 ? previewParts.join(" → ") : "No slots configured (Will display all active desks)";

            return (
              <div key={term.id} className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-6 shadow-soft space-y-6">
                {/* Terminal Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                      <Monitor className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-foreground">{term.terminal_identifier}</h3>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider", term.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground")}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", term.status === "active" ? "bg-emerald-500" : "bg-muted-foreground")} />
                          {term.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Session Status:</span>
                        {term.is_logged_in ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online (Active)
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 font-medium">Locked / Idle</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Passcode Management */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-2xl border border-border/40">
                    <div className="text-left px-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground block">Passcode</span>
                      <span className="font-mono text-sm font-bold text-foreground">
                        {isPasscodeVisible ? term.passcode : "••••"}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePasscode(term.id)}>
                      {isPasscodeVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegeneratePasscode(term.id)}
                      className="h-8 gap-1.5 text-xs font-bold border-border/80"
                    >
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </Button>
                  </div>
                </div>

                {/* Timing Controls & Live Rotation Preview */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-slate-50/70 dark:bg-slate-850 p-4 rounded-2xl border border-border/40 space-y-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Rotation Timing & Layout
                    </h4>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Seconds Per Slot (Slide Duration)</Label>
                      <Input
                        type="number"
                        min={3}
                        max={120}
                        value={timing.rotation_seconds}
                        onChange={(e) => setTimingSettings((prev) => ({
                          ...prev,
                          [term.id]: { ...timing, rotation_seconds: Number(e.target.value) }
                        }))}
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSaveTiming(term.id)}
                      disabled={savingTiming[term.id]}
                      className="w-full h-8 text-xs font-bold gap-1.5"
                    >
                      Save Rotation Timing
                    </Button>
                  </div>

                  {/* Live Rotation Preview Box */}
                  <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
                      Live Rotation Summary Preview
                    </span>
                    <p className="text-xs font-mono font-medium text-foreground leading-relaxed">
                      {rotationPreviewText}
                    </p>
                  </div>
                </div>

                {/* Slot Configuration Builder */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" /> Configured Rotation Slots ({termSlots.length})
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSlot(term.id)}
                      className="h-8 gap-1.5 text-xs font-bold"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Rotation Slot
                    </Button>
                  </div>

                  {termSlots.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border/60 rounded-2xl text-xs text-muted-foreground space-y-2">
                      <p>No rotation slots configured yet for {term.terminal_identifier}.</p>
                      <Button size="sm" onClick={() => handleAddSlot(term.id)} className="h-8 text-xs font-bold gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add First Slot
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {termSlots.map((slot, idx) => {
                        const assignedDeskIds = (slot.desk_ids || (slot.desks || [])).map(String);

                        return (
                          <div key={slot.id} className="p-5 border border-border/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-border/40 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-xl">
                                  Slot #{idx + 1}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {assignedDeskIds.length} desk{assignedDeskIds.length === 1 ? "" : "s"} assigned
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSelectAllDesksForSlot(slot)}
                                  className="h-7 text-[10px] font-bold text-primary gap-1"
                                >
                                  <CheckSquare className="h-3 w-3" /> Select All Desks
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleClearDesksForSlot(slot)}
                                  className="h-7 text-[10px] font-bold text-muted-foreground gap-1"
                                >
                                  <Square className="h-3 w-3" /> Clear Selection
                                </Button>

                                <div className="h-4 w-px bg-border/60 mx-1" />

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={idx === 0}
                                  onClick={() => handleReorderSlot(slot, "up", termSlots)}
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={idx === termSlots.length - 1}
                                  onClick={() => handleReorderSlot(slot, "down", termSlots)}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* User-Friendly Desk Toggle Chips */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  Click to Assign / Unassign Counter Desks to Slot #{idx + 1}:
                                </Label>
                              </div>

                              {activeDesksList.length === 0 ? (
                                <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
                                  <span>No counter desks created for this branch yet. Create counter desks to assign them to rotation slots.</span>
                                  <Button
                                    size="sm"
                                    onClick={() => setIsAddDeskOpen(true)}
                                    className="h-7 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                                  >
                                    <Plus className="h-3 w-3" /> Create First Desk
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2.5 pt-1">
                                  {activeDesksList.map((d) => {
                                    const isAssigned = assignedDeskIds.includes(String(d.id));
                                    const deskName = d.label || d.name || `Desk ${d.id}`;
                                    return (
                                      <button
                                        key={d.id}
                                        onClick={() => handleToggleDeskInSlot(slot, String(d.id))}
                                        className={cn(
                                          "px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm select-none",
                                          isAssigned
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-600/20 scale-[1.02]"
                                            : "bg-white dark:bg-slate-800 border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/50"
                                        )}
                                      >
                                        <span className={cn(
                                          "h-4 w-4 rounded-lg flex items-center justify-center border text-[10px] shrink-0 transition-all",
                                          isAssigned
                                            ? "bg-white text-indigo-600 border-white font-black"
                                            : "border-border/80 bg-slate-100 dark:bg-slate-700"
                                        )}>
                                          {isAssigned ? <Check className="h-3 w-3 stroke-[3]" /> : <Plus className="h-3 w-3 text-muted-foreground/60" />}
                                        </span>
                                        <span>{deskName}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add Desk Modal */}
      {isAddDeskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-foreground">Create New Counter Desk</h3>
            <p className="text-xs text-muted-foreground">Add a new operator counter desk for this branch to assign to live display slots.</p>

            <form onSubmit={handleCreateQuickDesk} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Desk Name / Label</Label>
                <Input
                  autoFocus
                  placeholder="e.g. Counter 01 or General Desk"
                  value={newDeskName}
                  onChange={(e) => setNewDeskName(e.target.value)}
                  className="h-10 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddDeskOpen(false)} className="h-9 text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingDesk} className="h-9 text-xs font-bold gap-1.5">
                  {isCreatingDesk ? "Creating..." : "Create Desk"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
