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
  Play
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
    try {
      const updated = await apiFetch(
        `/api/display-terminals/${terminalId}/regenerate-passcode/`,
        {
          method: "POST",
        }
      );
      toast.success("Passcode regenerated successfully! Active sessions have been evicted.");
      setTerminals((prev) => prev.map((t) => (t.id === terminalId ? updated : t)));
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate passcode.");
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
      toast.success(`Slide duration updated to ${seconds}s!`);
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
      toast.success(`Slot #${nextOrder} created!`);
      setSlots((prev) => [...prev, newSlot]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add rotation slot.");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await apiFetch(`/api/display-slots/${slotId}/`, { method: "DELETE" });
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      toast.success("Rotation slot deleted.");
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
      toast.success(`Assigned all ${allDeskIds.length} desks to Slot #${slot.order}.`);
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
      toast.success(`Cleared all desks from Slot #${slot.order}.`);
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
    setAddTerminalUserMessage("Checking availability in database...");
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
          setAddTerminalUserMessage(res.message || "Username already taken.");
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
    setEditTerminalUserMessage("Checking availability in database...");
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

    const nextIdx = terminals.length + 1;
    setNewTerminalIdentifier(`Display Screen ${nextIdx}`);
    setNewTerminalUsername("");
    setNewTerminalPasscode(Math.floor(1000 + Math.random() * 9000).toString());
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
    } catch (err: any) {
      toast.error(err.message || "Failed to create display screen. Check your plan allocations.");
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
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#5B50EB] border-t-transparent" />
        <p className="text-xs text-muted-foreground font-semibold">Loading display terminals & desks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row with Quota & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-foreground">
              Live Display Screens ({terminals.length})
            </h2>
            {isQuotaReached && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
                Plan Limit Reached
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure multi-desk rotation slots, slide duration, and secure PIN credentials for TV displays.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Plan Quota Pill */}
          <span className="text-xs text-muted-foreground bg-accent/20 px-3 py-1.5 rounded-xl border border-border/40 font-bold shrink-0 flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5 text-primary" />
            <span>
              Screens Allocated: <strong className="text-foreground">{activeTerminalsCount}</strong> / {effectivePurchasedDisplays}
            </span>
          </span>

          {/* Upsell button if quota reached */}
          {isQuotaReached && setView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("billing")}
              className="h-8 gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 shadow-xs shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Upgrade Plan
            </Button>
          )}

          {/* Add Screen Button as per plan */}
          <Button
            variant={isQuotaReached ? "outline" : "brand"}
            size="sm"
            onClick={handleOpenAddTerminal}
            className={cn(
              "h-8 gap-1.5 text-xs font-bold shrink-0",
              !isQuotaReached && "shadow-md shadow-brand/10 bg-[#5B50EB] hover:bg-[#4d42db] text-white"
            )}
          >
            {isQuotaReached ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Buy More Screens
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Add Display Screen
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddDeskOpen(true)}
            className="h-8 gap-1.5 text-xs font-bold border-border/70 shrink-0"
          >
            <PlusCircle className="h-3.5 w-3.5 text-slate-500" /> Add Counter Desk
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(displayBaseUrl, "_blank")}
            className="h-8 gap-1.5 text-xs font-bold border-border/70 shrink-0 text-foreground hover:bg-accent/30"
          >
            <ExternalLink className="h-3.5 w-3.5 text-indigo-500" /> Launch Display
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Screens */}
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">
            Screens
          </span>
          <span className="text-base font-black text-foreground block mt-0.5">
            {terminals.length}
          </span>
        </div>

        {/* Card 2: Connected Live */}
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">
            Online / Broadcasting
          </span>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-black text-emerald-500 leading-none">
              {liveCount}
            </span>
          </div>
        </div>

        {/* Card 3: Standby / Locked */}
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">
            Standby / Locked
          </span>
          <span className="text-base font-black text-muted-foreground block mt-0.5">
            {standbyCount}
          </span>
        </div>

        {/* Card 4: Desks In Rotation */}
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">
            Desks In Rotation
          </span>
          <span className="text-base font-black text-[#5B50EB] block mt-0.5">
            {uniqueDesksInRotation.length} / {activeDesksList.length}
          </span>
        </div>
      </div>

      {/* Main Terminal List */}
      {terminals.length === 0 ? (
        <div className="border border-dashed border-border/80 rounded-3xl p-12 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
            <Tv className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No Live Display Screens Provisioned</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Live display terminals rotate through assigned counter desks on TV screens in your customer waiting area. Click below to provision your screen.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenAddTerminal}
            disabled={isProvisioning}
            className="gap-1.5 text-xs font-bold bg-[#5B50EB] hover:bg-[#4d42db] text-white shadow-md shadow-brand/10"
          >
            <Plus className="h-3.5 w-3.5" /> Provision Live Display Screen
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

            return (
              <div
                key={term.id}
                className="bg-white dark:bg-slate-900 border border-border/60 shadow-soft rounded-3xl p-5 sm:p-6 space-y-6 hover:border-border transition-all"
              >
                {/* Terminal Header Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-5">
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* TV / Monitor Illustration Avatar */}
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-900/50">
                      <Tv className="h-6 w-6" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-base text-foreground truncate">
                          {term.terminal_identifier}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
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
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Terminal: DSP-0{idx + 1}
                        </span>
                        <span className="text-[10px] bg-[#5B50EB]/10 text-[#5B50EB] dark:text-indigo-400 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1">
                          @{term.username || `display-${term.id}`}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(term.username || `display-${term.id}`);
                              toast.success(`Copied username @${term.username || `display-${term.id}`}`);
                            }}
                            className="text-indigo-400 hover:text-indigo-600 dark:hover:text-white ml-0.5"
                            title="Copy Username"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </span>

                        <span className="text-border/80">•</span>

                        {/* Session State Badge */}
                        <div className="flex items-center gap-1.5">
                          {term.is_logged_in ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Broadcasting Live
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              Standby (Locked)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Header Actions: Passcode Pill & Button Group */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Passcode Box */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-2xl border border-border/50">
                      <div className="text-left pr-1">
                        <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground block">
                          4-Digit PIN
                        </span>
                        <span className="font-mono text-xs font-black text-foreground">
                          {isPasscodeVisible ? term.passcode : "••••"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePasscode(term.id)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title={isPasscodeVisible ? "Hide PIN" : "Show PIN"}
                      >
                        {isPasscodeVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Direct Link Open & Copy */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded-2xl border border-border/50">
                      <a
                        href={singleDisplayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#5B50EB] hover:text-[#4d42db] font-bold px-2 py-1 flex items-center gap-1 hover:underline"
                        title="Open direct display screen in new window"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Open Screen</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}${singleDisplayUrl}`;
                          navigator.clipboard.writeText(url);
                          toast.success(`Copied direct URL for ${term.terminal_identifier}!`);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 flex items-center gap-1"
                        title="Copy direct display link"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </button>
                    </div>

                    {/* Edit Credentials Button */}
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
                      className="h-8 gap-1.5 text-xs font-bold border-border/70"
                    >
                      <KeyRound className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                      <span>Edit</span>
                    </Button>

                    {/* Regenerate PIN Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegeneratePasscode(term.id)}
                      className="h-8 gap-1 text-xs font-bold border-border/70"
                      title="Generate new 4-digit PIN and disconnect previous sessions"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Regen PIN</span>
                    </Button>

                    {/* Delete Screen Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTerminalToDelete(term)}
                      className="h-8 gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                      title="Permanently remove this live display screen"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>

                {/* Timing Controls & Live Stepper Preview */}
                <div className="grid gap-4 lg:grid-cols-12 items-stretch">
                  {/* Left: Timing Duration Picker (5 cols) */}
                  <div className="lg:col-span-5 bg-slate-50/70 dark:bg-slate-850 p-4 rounded-2xl border border-border/40 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#5B50EB]" /> Slide Display Duration
                        </Label>
                        <span className="text-[11px] font-mono font-bold text-foreground bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-border/50">
                          {timing.rotation_seconds}s
                        </span>
                      </div>

                      {/* Quick Preset Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {[5, 10, 15, 20, 30, 45, 60].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSaveTiming(term.id, preset)}
                            className={cn(
                              "px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border",
                              timing.rotation_seconds === preset
                                ? "bg-[#5B50EB] text-white border-[#5B50EB] shadow-xs"
                                : "bg-white dark:bg-slate-800 text-muted-foreground border-border/60 hover:text-foreground hover:border-primary/40"
                            )}
                          >
                            {preset}s
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/30 flex items-center gap-2">
                      <div className="relative flex-1">
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
                          className="h-8 text-xs font-bold pr-8"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">
                          sec
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveTiming(term.id)}
                        disabled={savingTiming[term.id]}
                        className="h-8 text-xs font-bold bg-[#5B50EB] hover:bg-[#4d42db] text-white shrink-0"
                      >
                        {savingTiming[term.id] ? "Saving..." : "Save Timing"}
                      </Button>
                    </div>
                  </div>

                  {/* Right: Live Rotation Stepper / Flow Visualizer (7 cols) */}
                  <div className="lg:col-span-7 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <Radio className="h-3 w-3 animate-pulse" /> Live Rotation Flow
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Rotates every {timing.rotation_seconds}s per slot in infinite loop
                      </span>
                    </div>

                    {termSlots.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-xs font-semibold text-muted-foreground">
                          No rotation slots configured yet. Display board will broadcast all active branch desks together.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                        {termSlots.map((s, idx) => {
                          const deskIds = (s.desk_ids || (s.desks || [])).map(String);
                          const assignedDesks = activeDesksList.filter((d) =>
                            deskIds.includes(String(d.id))
                          );

                          return (
                            <div key={s.id} className="flex items-center gap-2 shrink-0">
                              <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-2.5 shadow-2xs min-w-[130px] space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-[#5B50EB]">
                                    Slot #{idx + 1}
                                  </span>
                                  <span className="text-[9px] font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                    {timing.rotation_seconds}s
                                  </span>
                                </div>
                                <div className="text-[11px] font-semibold text-foreground truncate">
                                  {assignedDesks.length > 0
                                    ? assignedDesks.map((d) => d.label || d.name).join(", ")
                                    : "No desks"}
                                </div>
                              </div>
                              {idx < termSlots.length - 1 && (
                                <ArrowRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                        {/* Loop Indicator */}
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 pl-1 shrink-0">
                          <RefreshCw className="h-3 w-3" />
                          <span>Loop</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-indigo-200/40 dark:border-indigo-900/30">
                      <span>Total cycle time: <strong>{termSlots.length * timing.rotation_seconds}s</strong></span>
                      <span>{termSlots.length} slot{termSlots.length === 1 ? "" : "s"} configured</span>
                    </div>
                  </div>
                </div>

                {/* Configured Rotation Slots Section */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-[#5B50EB]" /> Configured Rotation Slots ({termSlots.length})
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Assign counter desks to display together during each rotation step.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAddSlot(term.id)}
                      className="h-8 gap-1.5 text-xs font-bold bg-[#5B50EB] hover:bg-[#4d42db] text-white shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Rotation Slot
                    </Button>
                  </div>

                  {termSlots.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border/70 rounded-2xl text-xs text-muted-foreground space-y-2 bg-slate-50/30 dark:bg-slate-900/20">
                      <p>No custom rotation slots configured for {term.terminal_identifier}.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddSlot(term.id)}
                        className="h-8 text-xs font-bold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Create First Slot
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3.5">
                      {termSlots.map((slot, slotIdx) => {
                        const assignedDeskIds = (slot.desk_ids || (slot.desks || [])).map(String);

                        return (
                          <div
                            key={slot.id}
                            className="p-4 sm:p-5 border border-border/70 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5 shadow-2xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black bg-[#5B50EB]/10 text-[#5B50EB] dark:text-indigo-400 px-2.5 py-1 rounded-xl">
                                  Slot #{slotIdx + 1}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {assignedDeskIds.length} desk{assignedDeskIds.length === 1 ? "" : "s"} assigned
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSelectAllDesksForSlot(slot)}
                                  className="h-7 text-[11px] font-bold text-[#5B50EB] hover:text-[#4d42db] hover:bg-[#5B50EB]/10 gap-1 px-2"
                                >
                                  <CheckSquare className="h-3 w-3" /> Select All
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleClearDesksForSlot(slot)}
                                  className="h-7 text-[11px] font-bold text-muted-foreground hover:text-foreground gap-1 px-2"
                                >
                                  <Square className="h-3 w-3" /> Clear
                                </Button>

                                <div className="h-3.5 w-px bg-border/60 mx-1" />

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  disabled={slotIdx === 0}
                                  onClick={() => handleReorderSlot(slot, "up", termSlots)}
                                  title="Move slot up"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  disabled={slotIdx === termSlots.length - 1}
                                  onClick={() => handleReorderSlot(slot, "down", termSlots)}
                                  title="Move slot down"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  title="Delete slot"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Desk Chips Selection */}
                            <div className="space-y-2">
                              <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                Click Desks to Assign to Slot #{slotIdx + 1}:
                              </Label>

                              {activeDesksList.length === 0 ? (
                                <div className="p-3.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
                                  <span>No counter desks found. Create desks to assign them to rotation slots.</span>
                                  <Button
                                    size="sm"
                                    onClick={() => setIsAddDeskOpen(true)}
                                    className="h-7 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
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
                                          "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs select-none",
                                          isAssigned
                                            ? "bg-[#5B50EB] border-[#5B50EB] text-white shadow-[#5B50EB]/20 scale-[1.01]"
                                            : "bg-white dark:bg-slate-800 border-border/80 text-muted-foreground hover:text-foreground hover:border-[#5B50EB]/50"
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "h-3.5 w-3.5 rounded-md flex items-center justify-center border text-[9px] shrink-0 transition-all",
                                            isAssigned
                                              ? "bg-white text-[#5B50EB] border-white font-black"
                                              : "border-border/80 bg-slate-100 dark:bg-slate-700 text-transparent"
                                          )}
                                        >
                                          {isAssigned ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : null}
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

      {/* Modal: Delete Screen Confirmation */}
      {terminalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
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
              (@{terminalToDelete.username || `display-${terminalToDelete.id}`})? All rotation slots and timing configurations will be removed, and active TV connections will be disconnected.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTerminalToDelete(null)}
                disabled={isDeletingTerminal}
                className="h-9 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteTerminal}
                disabled={isDeletingTerminal}
                className="h-9 text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
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
        </div>
      )}

      {/* Modal: Quick Add Desk */}
      {isAddDeskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-foreground">Create New Counter Desk</h3>
            <p className="text-xs text-muted-foreground">
              Add a new operator counter desk for this branch to assign to live display rotation slots.
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
                  className="h-10 text-xs font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddDeskOpen(false)}
                  className="h-9 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingDesk || !newDeskName.trim()}
                  className="h-9 text-xs font-bold gap-1.5 bg-[#5B50EB] hover:bg-[#4d42db] text-white"
                >
                  {isCreatingDesk ? "Creating..." : "Create Desk"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Live Display Screen */}
      {isAddTerminalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Tv className="h-5 w-5 text-[#5B50EB]" />
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

            <form onSubmit={handleCreateTerminal} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Display Screen Name *
                </Label>
                <Input
                  type="text"
                  value={newTerminalIdentifier}
                  onChange={(e) => setNewTerminalIdentifier(e.target.value)}
                  placeholder="e.g. Main Lobby Screen"
                  required
                  className="mt-1 text-xs rounded-xl h-9 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  value={newTerminalUsername}
                  onChange={(e) => {
                    setNewTerminalUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                  }}
                  placeholder="e.g. lobby-tv"
                  required
                  className={cn(
                    "mt-1 font-mono text-xs rounded-xl h-9 font-bold transition-colors",
                    addTerminalUserStatus === "available" && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                    addTerminalUserStatus === "taken" && "border-rose-500 text-rose-600 dark:text-rose-400",
                    addTerminalUserStatus !== "available" && addTerminalUserStatus !== "taken" && "text-[#5B50EB]"
                  )}
                />
                {addTerminalUserStatus === "taken" ? (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {addTerminalUserMessage}
                  </p>
                ) : addTerminalUserStatus === "available" ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    ✓ {addTerminalUserMessage}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Unique username required to unlock and display on this TV screen.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  4-Digit Access Passcode / PIN *
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={newTerminalPasscode}
                  onChange={(e) => setNewTerminalPasscode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 1234"
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddTerminalOpen(false)}
                  className="text-xs h-9"
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
                  className="text-xs h-9 bg-[#5B50EB] hover:bg-[#4d42db] text-white"
                >
                  {isProvisioning ? "Creating..." : "Create Display Screen"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Display Terminal Credentials */}
      {editingTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#5B50EB]" />
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
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Display Screen Name *
                </Label>
                <Input
                  type="text"
                  value={editTerminalIdentifier}
                  onChange={(e) => setEditTerminalIdentifier(e.target.value)}
                  required
                  className="mt-1 text-xs rounded-xl h-9 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                    "mt-1 font-mono text-xs rounded-xl h-9 font-bold transition-colors",
                    editTerminalUserStatus === "available" && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                    editTerminalUserStatus === "taken" && "border-rose-500 text-rose-600 dark:text-rose-400",
                    editTerminalUserStatus !== "available" && editTerminalUserStatus !== "taken" && "text-[#5B50EB]"
                  )}
                />
                {editTerminalUserStatus === "taken" ? (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {editTerminalUserMessage}
                  </p>
                ) : editTerminalUserStatus === "available" ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    ✓ {editTerminalUserMessage}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Unique username required to unlock and display on this TV screen.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                  className="mt-1 font-mono text-xs rounded-xl h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTerminal(null)}
                  className="text-xs h-9"
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
                  className="text-xs h-9 bg-[#5B50EB] hover:bg-[#4d42db] text-white"
                >
                  {isSavingTerminalEdit ? "Saving..." : "Save Credentials"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
