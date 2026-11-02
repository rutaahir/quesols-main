import { createPortal } from "react-dom";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Monitor,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Check,
  Clock,
  CheckSquare,
  Square,
  PlusCircle,
  KeyRound,
  Copy,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  Tv,
  ArrowRight,
  Radio,
  Play,
  RotateCw,
  Info,
  Sliders,
  ChevronRight,
  ShieldCheck,
  CheckCircle
} from "lucide-react";
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
  purchasedDisplays?: number;
  setView?: (view: string) => void;
}

export function DisplayTerminalsManager({
  branchId,
  branchDesks,
  companySlug,
  branchSlug,
  purchasedDisplays = 1,
  setView,
}: DisplayTerminalsManagerProps) {
  const { actions, refresh } = useQuesole();
  const [terminals, setTerminals] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [fetchedDesks, setFetchedDesks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasscodes, setVisiblePasscodes] = useState<Record<string, boolean>>({});

  // Timing settings per terminal
  const [timingSettings, setTimingSettings] = useState<
    Record<string, { desks_per_slot: number; rotation_seconds: number }>
  >({});
  const [savingTiming, setSavingTiming] = useState<Record<string, boolean>>({});

  // Delete Terminal Modal
  const [terminalToDelete, setTerminalToDelete] = useState<any | null>(null);
  const [isDeletingTerminal, setIsDeletingTerminal] = useState(false);

  // Quick Create Desk Modal
  const [isAddDeskOpen, setIsAddDeskOpen] = useState(false);
  const [newDeskName, setNewDeskName] = useState("");
  const [isCreatingDesk, setIsCreatingDesk] = useState(false);

  // Add Terminal Modal State
  const [isAddTerminalOpen, setIsAddTerminalOpen] = useState(false);
  const [newTerminalIdentifier, setNewTerminalIdentifier] = useState("");
  const [newTerminalUsername, setNewTerminalUsername] = useState("");
  const [newTerminalPasscode, setNewTerminalPasscode] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [addTerminalUserStatus, setAddTerminalUserStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [addTerminalUserMessage, setAddTerminalUserMessage] = useState("");

  // Edit Terminal Credentials Modal State
  const [editingTerminal, setEditingTerminal] = useState<any | null>(null);
  const [editTerminalIdentifier, setEditTerminalIdentifier] = useState("");
  const [editTerminalUsername, setEditTerminalUsername] = useState("");
  const [editTerminalPasscode, setEditTerminalPasscode] = useState("");
  const [editTerminalUserStatus, setEditTerminalUserStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [editTerminalUserMessage, setEditTerminalUserMessage] = useState("");
  const [isSavingTerminalEdit, setIsSavingTerminalEdit] = useState(false);

  // Regenerate Passcode loading indicator
  const [regeneratingPinId, setRegeneratingPinId] = useState<string | null>(null);

  const displayBaseUrl =
    companySlug && branchSlug
      ? `/${companySlug}/branches/${branchSlug}/display`
      : `/display`;

  const loadData = async () => {
    try {
      setLoading(true);
      const [termData, slotData, desksData] = await Promise.all([
        apiFetch(`/api/display-terminals/?branch=${branchId}`),
        apiFetch(`/api/display-slots/`),
        apiFetch(`/api/desks/`).catch(() => []),
      ]);

      const branchTerminals = (termData as any[]).filter(
        (t) => String(t.branch) === String(branchId)
      );
      setTerminals(branchTerminals);
      setSlots(slotData as any[]);

      const filteredDesks = (desksData as any[]).filter(
        (d) => String(d.branch || d.branch_id || d.branchId) === String(branchId)
      );
      setFetchedDesks(filteredDesks);

      const timings: Record<
        string,
        { desks_per_slot: number; rotation_seconds: number }
      > = {};
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

  // Combine prop desks and fetched desks
  const activeDesksList = useMemo(() => {
    return fetchedDesks.length > 0
      ? fetchedDesks
      : branchDesks.map((d: any) => ({
          id: d.id,
          name: d.label || d.name || `Desk ${d.id}`,
          label: d.label || d.name || `Desk ${d.id}`,
        }));
  }, [fetchedDesks, branchDesks]);

  // Effective plan quota & usage
  const effectivePurchasedDisplays = Math.max(1, purchasedDisplays);
  const activeTerminalsCount = terminals.filter((t) => t.status === "active").length;
  const isQuotaReached = activeTerminalsCount >= effectivePurchasedDisplays;

  // KPI Calculations
  const liveCount = terminals.filter((t) => t.is_logged_in && t.status === "active").length;
  const standbyCount = terminals.filter((t) => !t.is_logged_in || t.status !== "active").length;

  const uniqueDesksInRotation = useMemo(() => {
    const ids = new Set<string>();
    slots.forEach((s) => {
      const termMatch = terminals.some((t) => String(t.id) === String(s.terminal));
      if (termMatch) {
        const dIds = s.desk_ids || (s.desks || []).map((d: any) => (typeof d === "object" ? d.id : d));
        dIds.forEach((id: any) => ids.add(String(id)));
      }
    });
    return Array.from(ids);
  }, [slots, terminals]);

  const togglePasscode = (id: string) => {
    setVisiblePasscodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRegeneratePasscode = async (terminalId: string) => {
    setRegeneratingPinId(terminalId);
    try {
      const updated = await apiFetch(
        `/api/display-terminals/${terminalId}/regenerate-passcode/`,
        {
          method: "POST",
        }
      );
      toast.success("New 4-digit PIN generated! Active TV sessions disconnected.");
      setTerminals((prev) => prev.map((t) => (t.id === terminalId ? updated : t)));
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate passcode.");
    } finally {
      setRegeneratingPinId(null);
    }
  };

  const handleSaveTiming = async (terminalId: string, customSeconds?: number) => {
    const current = timingSettings[terminalId] || { desks_per_slot: 4, rotation_seconds: 10 };
    const seconds = customSeconds !== undefined ? customSeconds : current.rotation_seconds;

    setSavingTiming((prev) => ({ ...prev, [terminalId]: true }));
    try {
      const updated = await apiFetch(`/api/display-terminals/${terminalId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          desks_per_slot: Number(current.desks_per_slot) || 4,
          rotation_seconds: Number(seconds) || 10,
        }),
      });
      setTimingSettings((prev) => ({
        ...prev,
        [terminalId]: { ...current, rotation_seconds: seconds },
      }));
      toast.success(`Slide duration updated to ${seconds}s.`);
      setTerminals((prev) => prev.map((t) => (t.id === terminalId ? updated : t)));
    } catch (err: any) {
      toast.error(err.message || "Failed to save timing settings.");
    } finally {
      setSavingTiming((prev) => ({ ...prev, [terminalId]: false }));
    }
  };

  const handleDeleteTerminal = async () => {
    if (!terminalToDelete) return;
    setIsDeletingTerminal(true);
    try {
      await apiFetch(`/api/display-terminals/${terminalToDelete.id}/`, {
        method: "DELETE",
      });
      toast.success(`Display screen "${terminalToDelete.terminal_identifier}" deleted successfully.`);
      setTerminalToDelete(null);
      await loadData();
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete display terminal.");
    } finally {
      setIsDeletingTerminal(false);
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
      toast.success(`Slide #${nextOrder} created! Click desks below to assign.`);
      setSlots((prev) => [...prev, newSlot]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add rotation slot.");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await apiFetch(`/api/display-slots/${slotId}/`, { method: "DELETE" });
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      toast.success("Rotation slide deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slot.");
    }
  };

  const handleToggleDeskInSlot = async (slot: any, deskId: string) => {
    const currentDeskIds = (slot.desk_ids || (slot.desks || [])).map(String);
    const isAssigned = currentDeskIds.includes(deskId);

    const updatedDeskIds = isAssigned
      ? currentDeskIds.filter((id: string) => id !== deskId)
      : [...currentDeskIds, deskId];

    try {
      const updated = await apiFetch(`/api/display-slots/${slot.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ desk_ids: updatedDeskIds }),
      });
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
    } catch (err: any) {
      toast.error(err.message || "Failed to update slot desks.");
    }
  };

  const handleSelectAllDesksForSlot = async (slot: any) => {
    const allDeskIds = activeDesksList.map((d) => String(d.id));
    try {
      const updated = await apiFetch(`/api/display-slots/${slot.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ desk_ids: allDeskIds }),
      });
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
      toast.success(`Assigned all ${allDeskIds.length} desks to Slide #${slot.order}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign all desks.");
    }
  };

  const handleClearDesksForSlot = async (slot: any) => {
    try {
      const updated = await apiFetch(`/api/display-slots/${slot.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ desk_ids: [] }),
      });
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? updated : s)));
      toast.success(`Cleared all desks from Slide #${slot.order}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to clear slot.");
    }
  };

  const handleReorderSlot = async (slot: any, direction: "up" | "down", terminalSlots: any[]) => {
    const sorted = [...terminalSlots].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((s) => s.id === slot.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const targetSlot = sorted[targetIndex];
    const currentOrder = slot.order;
    const targetOrder = targetSlot.order;

    try {
      await Promise.all([
        apiFetch(`/api/display-slots/${slot.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ order: targetOrder }),
        }),
        apiFetch(`/api/display-slots/${targetSlot.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ order: currentOrder }),
        }),
      ]);

      setSlots((prev) =>
        prev.map((s) => {
          if (s.id === slot.id) return { ...s, order: targetOrder };
          if (s.id === targetSlot.id) return { ...s, order: currentOrder };
          return s;
        })
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to reorder slot.");
    }
  };

  const handleCreateQuickDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeskName.trim()) {
      toast.error("Desk name is required.");
      return;
    }
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

  // Real-time username availability check for Add Screen
  useEffect(() => {
    if (!isAddTerminalOpen) {
      setAddTerminalUserStatus("idle");
      setAddTerminalUserMessage("");
      return;
    }
    const clean = newTerminalUsername.trim().toLowerCase();
    if (!clean) {
      setAddTerminalUserStatus("invalid");
      setAddTerminalUserMessage("Username is required.");
      return;
    }
    if (clean.length < 2) {
      setAddTerminalUserStatus("invalid");
      setAddTerminalUserMessage("Min 2 characters required.");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(clean)) {
      setAddTerminalUserStatus("invalid");
      setAddTerminalUserMessage("Only letters, numbers, hyphens, and underscores allowed.");
      return;
    }

    setAddTerminalUserStatus("checking");
    setAddTerminalUserMessage("Verifying availability...");
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/api/display-terminals/check-username/?username=${encodeURIComponent(clean)}&branch_id=${branchId}`
        );
        if (res.available) {
          setAddTerminalUserStatus("available");
          setAddTerminalUserMessage(res.message || "Username is available!");
        } else {
          setAddTerminalUserStatus("taken");
          setAddTerminalUserMessage(res.message || "Username already in use.");
        }
      } catch (err: any) {
        setAddTerminalUserStatus("invalid");
        setAddTerminalUserMessage(err.message || "Error validating username.");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [newTerminalUsername, isAddTerminalOpen, branchId]);

  // Real-time username availability check for Edit Screen
  useEffect(() => {
    if (!editingTerminal) {
      setEditTerminalUserStatus("idle");
      setEditTerminalUserMessage("");
      return;
    }
    const clean = editTerminalUsername.trim().toLowerCase();
    if (!clean) {
      setEditTerminalUserStatus("invalid");
      setEditTerminalUserMessage("Username is required.");
      return;
    }
    if (clean.length < 2) {
      setEditTerminalUserStatus("invalid");
      setEditTerminalUserMessage("Min 2 characters required.");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(clean)) {
      setEditTerminalUserStatus("invalid");
      setEditTerminalUserMessage("Only letters, numbers, hyphens, and underscores allowed.");
      return;
    }

    setEditTerminalUserStatus("checking");
    setEditTerminalUserMessage("Verifying availability...");
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/api/display-terminals/check-username/?username=${encodeURIComponent(clean)}&branch_id=${branchId}&exclude_id=${editingTerminal.id}`
        );
        if (res.available) {
          setEditTerminalUserStatus("available");
          setEditTerminalUserMessage(res.message || "Username is available!");
        } else {
          setEditTerminalUserStatus("taken");
          setEditTerminalUserMessage(res.message || "Username already taken.");
        }
      } catch (err: any) {
        setEditTerminalUserStatus("invalid");
        setEditTerminalUserMessage(err.message || "Error validating username.");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [editTerminalUsername, editingTerminal, branchId]);

  const handleOpenAddTerminal = () => {
    if (isQuotaReached) {
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-xs leading-normal">
            Plan limit reached ({effectivePurchasedDisplays} screens allocated).
          </span>
          <span className="text-[10px] text-muted-foreground leading-normal">
            You can purchase additional live display screens in the Plan & Usage tab.
          </span>
        </div>,
        { duration: 7000 }
      );
      return;
    }

    setNewTerminalIdentifier("");
    setNewTerminalUsername("");
    setNewTerminalPasscode("");
    setAddTerminalUserStatus("idle");
    setAddTerminalUserMessage("");
    setIsAddTerminalOpen(true);
  };

  const handleCreateTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerminalIdentifier.trim()) {
      toast.error("Screen name is required.");
      return;
    }
    if (!newTerminalUsername.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (newTerminalPasscode.length !== 4) {
      toast.error("Passcode must be exactly 4 digits.");
      return;
    }
    if (addTerminalUserStatus === "taken") {
      toast.error(addTerminalUserMessage || "Username is already taken.");
      return;
    }
    if (addTerminalUserStatus === "checking") {
      toast.error("Please wait while verifying username availability.");
      return;
    }
    if (addTerminalUserStatus === "invalid") {
      toast.error(addTerminalUserMessage || "Please enter a valid username.");
      return;
    }

    setIsProvisioning(true);
    try {
      await apiFetch("/api/display-terminals/", {
        method: "POST",
        body: JSON.stringify({
          branch: branchId,
          terminal_identifier: newTerminalIdentifier.trim(),
          username: newTerminalUsername.trim().toLowerCase(),
          passcode: newTerminalPasscode.trim(),
        }),
      });
      toast.success(`Display screen "${newTerminalIdentifier.trim()}" created successfully!`);
      setIsAddTerminalOpen(false);
      setNewTerminalIdentifier("");
      setNewTerminalUsername("");
      setNewTerminalPasscode("");
      await loadData();
      await refresh();
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error ||
        (err?.detail ? String(err.detail) : "") ||
        (err?.non_field_errors ? String(err.non_field_errors[0]) : "") ||
        "Failed to create display screen. Check your plan allocations.";
      toast.error(msg);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleUpdateTerminalCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerminal) return;
    if (!editTerminalIdentifier.trim()) {
      toast.error("Screen name is required.");
      return;
    }
    if (!editTerminalUsername.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (editTerminalPasscode.length !== 4) {
      toast.error("Passcode must be exactly 4 digits.");
      return;
    }
    if (editTerminalUserStatus === "taken") {
      toast.error(editTerminalUserMessage || "Username is already taken.");
      return;
    }
    if (editTerminalUserStatus === "checking") {
      toast.error("Please wait while verifying username availability.");
      return;
    }
    if (editTerminalUserStatus === "invalid") {
      toast.error(editTerminalUserMessage || "Please enter a valid username.");
      return;
    }

    setIsSavingTerminalEdit(true);
    try {
      await apiFetch(`/api/display-terminals/${editingTerminal.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          terminal_identifier: editTerminalIdentifier.trim(),
          username: editTerminalUsername.trim().toLowerCase(),
          passcode: editTerminalPasscode.trim(),
        }),
      });
      toast.success("Display terminal credentials updated successfully!");
      setEditingTerminal(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update terminal credentials.");
    } finally {
      setIsSavingTerminalEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-[#5B50EB] border-t-transparent" />
        <p className="text-xs text-muted-foreground font-semibold">Loading display terminals & configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header Row with Clear Actions & Plan Quota ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              <Tv className="h-5 w-5 text-[#5B50EB]" />
              Live Display Screens
            </h2>
            <span className="text-xs font-bold bg-[#5B50EB]/10 text-[#5B50EB] dark:text-indigo-400 px-2.5 py-0.5 rounded-full border border-[#5B50EB]/20">
              {terminals.length} {terminals.length === 1 ? "Screen" : "Screens"}
            </span>
            {isQuotaReached && (
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Plan Limit Reached
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Configure TV boards for waiting areas, multi-counter rotation slides, cycle intervals, and secure PIN passcodes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* Plan Quota Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-border/60 text-xs font-semibold">
            <span className="text-muted-foreground">Screens Quota:</span>
            <span className="font-bold text-foreground">
              {activeTerminalsCount} / {effectivePurchasedDisplays}
            </span>
            {isQuotaReached && setView && (
              <button
                type="button"
                onClick={() => setView("billing")}
                className="text-[11px] text-[#5B50EB] hover:text-[#4d42db] font-bold underline underline-offset-2 ml-1"
              >
                Get More
              </button>
            )}
          </div>

          {/* Primary Action Button */}
          {isQuotaReached ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (setView) setView("billing");
                else handleOpenAddTerminal();
              }}
              className="h-9 gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Upgrade Plan
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleOpenAddTerminal}
              className="h-9 gap-1.5 text-xs font-bold bg-[#5B50EB] hover:bg-[#4d42db] text-white shadow-sm shadow-[#5B50EB]/25"
            >
              <Plus className="h-4 w-4" />
              Add Display Screen
            </Button>
          )}

          {/* Direct Launch TV Board */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(displayBaseUrl, "_blank")}
            className="h-9 gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
            title="Open the general waiting area display board in a new tab"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#5B50EB]" />
            Launch TV Board
          </Button>
        </div>
      </div>

      {/* ── High-End SaaS Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Screens */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-soft transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Total Screens
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground tracking-tight">
                {terminals.length}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                / {effectivePurchasedDisplays} allowed
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {activeTerminalsCount} active display terminal{activeTerminalsCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
            <Tv className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Live Broadcasting */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-soft transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Live Broadcasting
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {liveCount}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                on-air now
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{liveCount > 0 ? "Real-time TV sessions active" : "No active TV sessions"}</span>
            </div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Radio className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Standby / Locked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-soft transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Standby / Ready
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground tracking-tight">
                {standbyCount}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                screens
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ready to unlock with PIN code
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Desks In Rotation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-soft transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Desks Coverage
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#5B50EB] tracking-tight">
                {uniqueDesksInRotation.length}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                / {activeDesksList.length} desks
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {uniqueDesksInRotation.length === activeDesksList.length && activeDesksList.length > 0
                ? "100% of branch desks covered"
                : `${activeDesksList.length - uniqueDesksInRotation.length} unassigned desks`}
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Main Display Screens List ── */}
      {terminals.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-3xl p-12 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-[#5B50EB] flex items-center justify-center mx-auto shadow-sm">
            <Tv className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-foreground">No Live Display Screens Provisioned</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Live display terminals rotate through assigned counter desks on TV screens in your customer waiting area. Click below to provision your first screen.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenAddTerminal}
            disabled={isProvisioning}
            className="gap-1.5 text-xs font-bold bg-[#5B50EB] hover:bg-[#4d42db] text-white shadow-md shadow-[#5B50EB]/20 h-9 px-4"
          >
            <Plus className="h-4 w-4" /> Provision Live Display Screen
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {terminals.map((term, idx) => {
            const termSlots = slots
              .filter((s) => String(s.terminal) === String(term.id))
              .sort((a, b) => a.order - b.order);
            const isPasscodeVisible = visiblePasscodes[term.id] ?? false;
            const timing = timingSettings[term.id] || {
              desks_per_slot: term.desks_per_slot || 4,
              rotation_seconds: term.rotation_seconds || 10,
            };

            const terminalSlug =
              term.username ||
              (term.terminal_identifier
                ? term.terminal_identifier.toLowerCase().replace(/\s+/g, "-")
                : term.id);

            const singleDisplayUrl =
              companySlug && branchSlug
                ? `/${companySlug}/branches/${branchSlug}/display?terminal=${encodeURIComponent(terminalSlug)}`
                : `/display?terminal=${encodeURIComponent(terminalSlug)}`;

            const totalCycleSeconds = termSlots.length * timing.rotation_seconds;

            return (
              <div
                key={term.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-sm hover:shadow-md transition-all"
              >
                {/* ── Screen Header: Identity & Top Controls ── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-5">
                  {/* Left: Device Avatar & Metadata */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#5B50EB] flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-900/50 shadow-2xs">
                        <Tv className="h-7 w-7" />
                      </div>
                      {term.is_logged_in && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-black text-base sm:text-lg text-foreground tracking-tight">
                          {term.terminal_identifier}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            term.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-200 dark:bg-slate-800 text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              term.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"
                            )}
                          />
                          {term.status}
                        </span>

                        {term.is_logged_in ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                            <Radio className="h-3 w-3 animate-pulse" />
                            Broadcasting Live on TV
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                            Standby (Ready to connect)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ID: DSP-0{idx + 1}
                        </span>

                        <span className="text-border/80">•</span>

                        {/* Username Pill with 1-click Copy */}
                        <div className="flex items-center gap-1 bg-[#5B50EB]/10 text-[#5B50EB] dark:text-indigo-400 px-2.5 py-0.5 rounded-lg font-mono text-[11px] font-bold">
                          <span>@{term.username || `display-${term.id}`}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(term.username || `display-${term.id}`);
                              toast.success(`Copied username @${term.username || `display-${term.id}`}`);
                            }}
                            className="text-indigo-400 hover:text-indigo-700 dark:hover:text-white p-0.5"
                            title="Copy Username"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions, PIN Display & Edit Options */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* 4-Digit PIN Box */}
                    <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-border/60">
                      <div className="text-left">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block leading-none">
                          Access PIN
                        </span>
                        <span className="font-mono text-xs font-black text-foreground mt-0.5 block leading-none">
                          {isPasscodeVisible ? term.passcode : "••••"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePasscode(term.id)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1"
                        title={isPasscodeVisible ? "Hide PIN" : "Show PIN"}
                      >
                        {isPasscodeVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Launch Direct Screen Button */}
                    <a
                      href={singleDisplayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-xl bg-[#5B50EB] hover:bg-[#4d42db] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                      title="Open dedicated TV screen view"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Screen</span>
                    </a>

                    {/* Copy Link Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `${window.location.origin}${singleDisplayUrl}`;
                        navigator.clipboard.writeText(url);
                        toast.success(`Copied direct URL for ${term.terminal_identifier}!`);
                      }}
                      className="h-8 px-2.5 text-xs font-semibold border-border/70"
                      title="Copy direct display link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copy Link</span>
                    </Button>

                    {/* Edit Credentials */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTerminal(term);
                        setEditTerminalIdentifier(term.terminal_identifier || "");
                        setEditTerminalUsername(term.username || `display-${term.id}`);
                        setEditTerminalPasscode(term.passcode || "");
                        setEditTerminalUserStatus("idle");
                        setEditTerminalUserMessage("");
                      }}
                      className="h-8 px-2.5 text-xs font-semibold border-border/70"
                      title="Edit screen name, username, and PIN"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Edit</span>
                    </Button>

                    {/* Regenerate PIN */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegeneratePasscode(term.id)}
                      disabled={regeneratingPinId === term.id}
                      className="h-8 px-2 text-xs font-semibold border-border/70"
                      title="Generate new 4-digit PIN and disconnect previous sessions"
                    >
                      {regeneratingPinId === term.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {/* Delete Screen */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTerminalToDelete(term)}
                      className="h-8 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                      title="Delete this screen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* ── Unified Slide Show Presentation & Rotation Schedule ── */}
                <div className="space-y-4">
                  {/* Rotation Controls Bar */}
                  <div className="bg-slate-50/80 dark:bg-slate-850/80 p-4 rounded-2xl border border-border/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Slide Duration Picker */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
                        <Clock className="h-4 w-4 text-[#5B50EB]" /> Slide Interval:
                      </Label>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[5, 10, 15, 20, 30].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSaveTiming(term.id, preset)}
                            disabled={savingTiming[term.id]}
                            className={cn(
                              "px-3 py-1 rounded-xl text-xs font-bold transition-all border",
                              timing.rotation_seconds === preset
                                ? "bg-[#5B50EB] text-white border-[#5B50EB] shadow-xs"
                                : "bg-white dark:bg-slate-800 text-muted-foreground border-border/60 hover:text-foreground hover:border-[#5B50EB]/40"
                            )}
                          >
                            {preset}s {preset === 10 && <span className="text-[10px] opacity-80">(Standard)</span>}
                          </button>
                        ))}
                      </div>

                      {/* Custom Seconds Input */}
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-20">
                          <Input
                            type="number"
                            min={3}
                            max={180}
                            value={timing.rotation_seconds}
                            onChange={(e) =>
                              setTimingSettings((prev) => ({
                                ...prev,
                                [term.id]: {
                                  ...timing,
                                  rotation_seconds: Number(e.target.value),
                                },
                              }))
                            }
                            className="h-8 text-xs font-bold pr-7 rounded-xl"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">
                            s
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveTiming(term.id)}
                          disabled={savingTiming[term.id]}
                          className="h-8 text-xs font-bold rounded-xl"
                        >
                          {savingTiming[term.id] ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>

                    {/* Summary Loop Indicator & Add Slide CTA */}
                    <div className="flex items-center gap-3 shrink-0">
                      {termSlots.length > 0 && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-border/50">
                          <RotateCw className="h-3.5 w-3.5 text-[#5B50EB] animate-spin-slow" />
                          <span>
                            {termSlots.length} Slide{termSlots.length === 1 ? "" : "s"} • {totalCycleSeconds}s Loop
                          </span>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleAddSlot(term.id)}
                        className="h-8 gap-1.5 text-xs font-bold bg-[#5B50EB] hover:bg-[#4d42db] text-white rounded-xl shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Slide
                      </Button>
                    </div>
                  </div>

                  {/* ── Slide Cards or Default Continuous Mode ── */}
                  {termSlots.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-border/80 bg-slate-50/40 dark:bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <h4 className="text-xs font-bold text-foreground">
                            Standard Continuous Mode (No slide rotation)
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This display screen is currently showing all <strong>{activeDesksList.length} active counter desks</strong> simultaneously in real time. If your branch has multiple desks that don't fit on one screen, click <strong>"+ Add Slide"</strong> to split desks across rotating slides.
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddSlot(term.id)}
                        className="h-8 text-xs font-bold gap-1.5 border-[#5B50EB]/30 text-[#5B50EB] hover:bg-[#5B50EB]/10 shrink-0 rounded-xl"
                      >
                        <Plus className="h-3.5 w-3.5" /> Enable Multi-Slide Rotation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {termSlots.map((slot, slotIdx) => {
                        const assignedDeskIds = (slot.desk_ids || (slot.desks || [])).map(String);

                        return (
                          <div
                            key={slot.id}
                            className="p-4 sm:p-5 border border-border/70 rounded-2xl bg-white dark:bg-slate-850 space-y-3.5 shadow-2xs hover:border-[#5B50EB]/40 transition-colors"
                          >
                            {/* Slide Bar Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/40 pb-3">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-black bg-[#5B50EB]/10 text-[#5B50EB] dark:text-indigo-400 px-3 py-1 rounded-xl">
                                  Slide #{slotIdx + 1}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  Showing {assignedDeskIds.length} of {activeDesksList.length} desks ({timing.rotation_seconds}s)
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSelectAllDesksForSlot(slot)}
                                  className="h-7 text-[11px] font-bold text-[#5B50EB] hover:text-[#4d42db] hover:bg-[#5B50EB]/10 gap-1 px-2.5 rounded-lg"
                                >
                                  <CheckSquare className="h-3.5 w-3.5" /> Select All
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleClearDesksForSlot(slot)}
                                  className="h-7 text-[11px] font-bold text-muted-foreground hover:text-foreground gap-1 px-2.5 rounded-lg"
                                >
                                  <Square className="h-3.5 w-3.5" /> Clear
                                </Button>

                                <div className="h-3.5 w-px bg-border/60 mx-1" />

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                  disabled={slotIdx === 0}
                                  onClick={() => handleReorderSlot(slot, "up", termSlots)}
                                  title="Move slide up"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                  disabled={slotIdx === termSlots.length - 1}
                                  onClick={() => handleReorderSlot(slot, "down", termSlots)}
                                  title="Move slide down"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  title="Delete this slide"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Desks Selection Chips */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                                Assign Counter Desks to Display on Slide #{slotIdx + 1}:
                              </span>

                              {activeDesksList.length === 0 ? (
                                <div className="p-3.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
                                  <span>No counter desks found in this branch. Create a desk to assign it to this slide.</span>
                                  <Button
                                    size="sm"
                                    onClick={() => setIsAddDeskOpen(true)}
                                    className="h-7 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white shrink-0 rounded-lg"
                                  >
                                    <Plus className="h-3 w-3" /> Create Desk
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                  {activeDesksList.map((d) => {
                                    const isAssigned = assignedDeskIds.includes(String(d.id));
                                    const deskName = d.label || d.name || `Desk ${d.id}`;
                                    return (
                                      <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => handleToggleDeskInSlot(slot, String(d.id))}
                                        className={cn(
                                          "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 select-none shadow-2xs",
                                          isAssigned
                                            ? "bg-[#5B50EB] border-[#5B50EB] text-white shadow-xs scale-[1.01]"
                                            : "bg-slate-50 dark:bg-slate-800 border-border/80 text-muted-foreground hover:text-foreground hover:border-[#5B50EB]/50"
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "h-4 w-4 rounded-md flex items-center justify-center border text-[10px] shrink-0 transition-all",
                                            isAssigned
                                              ? "bg-white text-[#5B50EB] border-white font-black"
                                              : "border-border/80 bg-white dark:bg-slate-700 text-transparent"
                                          )}
                                        >
                                          {isAssigned && <Check className="h-2.5 w-2.5 stroke-[3]" />}
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

      {/* ── Modal: Delete Screen Confirmation ── */}
      {terminalToDelete && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">Delete Display Screen?</h3>
                <p className="text-xs text-muted-foreground">Permanent deletion confirmation</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to completely delete{" "}
              <strong className="text-foreground font-bold">
                "{terminalToDelete.terminal_identifier}"
              </strong>{" "}
              (@{terminalToDelete.username || `display-${terminalToDelete.id}`})? All slide rotation schedules and PIN credentials will be removed, and connected TV sessions will be immediately disconnected.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTerminalToDelete(null)}
                disabled={isDeletingTerminal}
                className="h-9 text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteTerminal}
                disabled={isDeletingTerminal}
                className="h-9 text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              >
                {isDeletingTerminal ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Yes, Delete Screen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Quick Add Desk ── */}
      {isAddDeskOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-foreground">Create New Counter Desk</h3>
            <p className="text-xs text-muted-foreground">
              Add a new operator counter desk for this branch to assign to live display rotation slides.
            </p>

            <form onSubmit={handleCreateQuickDesk} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Desk Name / Label *
                </Label>
                <Input
                  autoFocus
                  placeholder="e.g. Counter 01 or Cash Desk"
                  value={newDeskName}
                  onChange={(e) => setNewDeskName(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddDeskOpen(false)}
                  className="h-9 text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingDesk || !newDeskName.trim()}
                  className="h-9 text-xs font-bold gap-1.5 bg-[#5B50EB] hover:bg-[#4d42db] text-white rounded-xl"
                >
                  {isCreatingDesk ? "Creating..." : "Create Desk"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Add Live Display Screen ── */}
      {isAddTerminalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-[#5B50EB] flex items-center justify-center">
                  <Tv className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Add Live Display Screen</h3>
                  <p className="text-[11px] text-muted-foreground">Provision a new waiting area TV screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTerminalOpen(false)}
                className="text-muted-foreground hover:text-foreground font-bold p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTerminal} className="space-y-4" autoComplete="off">
              {/* Dummy trap inputs to stop browser password manager autofill */}
              <input type="text" name="prevent_autofill_user" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="prevent_autofill_pass" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

              <div>
                <Label className="text-xs font-bold text-foreground">
                  Display Screen Name *
                </Label>
                <Input
                  type="text"
                  name="custom_screen_name"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={newTerminalIdentifier}
                  onChange={(e) => setNewTerminalIdentifier(e.target.value)}
                  placeholder="e.g. Main Lobby Screen"
                  required
                  className="mt-1 text-xs rounded-xl h-10 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Terminal Username *
                  </Label>
                  {addTerminalUserStatus === "checking" && (
                    <span className="text-[11px] font-medium text-amber-500 flex items-center gap-1 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                    </span>
                  )}
                  {addTerminalUserStatus === "available" && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Available
                    </span>
                  )}
                  {addTerminalUserStatus === "taken" && (
                    <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Already taken
                    </span>
                  )}
                  {addTerminalUserStatus === "invalid" && addTerminalUserMessage && (
                    <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {addTerminalUserMessage}
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  name="custom_screen_username"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={newTerminalUsername}
                  onChange={(e) => {
                    setNewTerminalUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                  }}
                  placeholder="e.g. lobby-tv"
                  required
                  className={cn(
                    "mt-1 font-mono text-xs rounded-xl h-10 font-bold transition-colors",
                    addTerminalUserStatus === "available" && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                    addTerminalUserStatus === "taken" && "border-rose-500 text-rose-600 dark:text-rose-400",
                    addTerminalUserStatus !== "available" && addTerminalUserStatus !== "taken" && "text-[#5B50EB]"
                  )}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Unique username required for TV login and screen identification.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    4-Digit Access Passcode / PIN *
                  </Label>
                  <button
                    type="button"
                    onClick={() => setNewTerminalPasscode(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="text-[11px] text-[#5B50EB] hover:underline font-bold"
                  >
                    Auto-generate PIN
                  </button>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  name="custom_screen_passcode"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={newTerminalPasscode}
                  onChange={(e) => setNewTerminalPasscode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 1234"
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-10 tracking-widest font-black"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddTerminalOpen(false)}
                  className="text-xs h-9 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isProvisioning ||
                    newTerminalPasscode.length !== 4 ||
                    !newTerminalUsername.trim() ||
                    addTerminalUserStatus === "taken" ||
                    addTerminalUserStatus === "checking" ||
                    addTerminalUserStatus === "invalid"
                  }
                  className="text-xs h-9 bg-[#5B50EB] hover:bg-[#4d42db] text-white rounded-xl shadow-xs"
                >
                  {isProvisioning ? "Creating..." : "Create Display Screen"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Edit Display Terminal Credentials ── */}
      {editingTerminal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-[#5B50EB] flex items-center justify-center">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Edit Screen Credentials</h3>
                  <p className="text-[11px] text-muted-foreground">{editingTerminal.terminal_identifier}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTerminal(null)}
                className="text-muted-foreground hover:text-foreground font-bold p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTerminalCredentials} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-foreground">
                  Display Screen Name *
                </Label>
                <Input
                  type="text"
                  value={editTerminalIdentifier}
                  onChange={(e) => setEditTerminalIdentifier(e.target.value)}
                  required
                  className="mt-1 text-xs rounded-xl h-10 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Terminal Username *
                  </Label>
                  {editTerminalUserStatus === "checking" && (
                    <span className="text-[11px] font-medium text-amber-500 flex items-center gap-1 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                    </span>
                  )}
                  {editTerminalUserStatus === "available" && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Available
                    </span>
                  )}
                  {editTerminalUserStatus === "taken" && (
                    <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Already taken
                    </span>
                  )}
                  {editTerminalUserStatus === "invalid" && editTerminalUserMessage && (
                    <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {editTerminalUserMessage}
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  value={editTerminalUsername}
                  onChange={(e) =>
                    setEditTerminalUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }
                  placeholder="e.g. lobby-tv"
                  required
                  className={cn(
                    "mt-1 font-mono text-xs rounded-xl h-10 font-bold transition-colors",
                    editTerminalUserStatus === "available" && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                    editTerminalUserStatus === "taken" && "border-rose-500 text-rose-600 dark:text-rose-400",
                    editTerminalUserStatus !== "available" && editTerminalUserStatus !== "taken" && "text-[#5B50EB]"
                  )}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Unique username for TV login.
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">
                  4-Digit Access Passcode / PIN *
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={editTerminalPasscode}
                  onChange={(e) => setEditTerminalPasscode(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-10 tracking-widest font-black"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTerminal(null)}
                  className="text-xs h-9 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSavingTerminalEdit ||
                    editTerminalPasscode.length !== 4 ||
                    !editTerminalUsername.trim() ||
                    editTerminalUserStatus === "taken" ||
                    editTerminalUserStatus === "checking" ||
                    editTerminalUserStatus === "invalid"
                  }
                  className="text-xs h-9 bg-[#5B50EB] hover:bg-[#4d42db] text-white rounded-xl shadow-xs"
                >
                  {isSavingTerminalEdit ? "Saving..." : "Save Credentials"}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
