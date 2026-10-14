import React, { useState, useRef } from "react";
import {
  Monitor,
  Printer,
  QrCode,
  MessageSquare,
  HelpCircle,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Copy,
  Undo2,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Smartphone,
  Info,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BranchOnsiteConfig {
  name: string;
  address?: string;
  mode: "NON_SERVICE_BASED" | "SERVICE_BASED";
  channel_type: "ONSITE_ONLY" | "ONLINE_ONLY" | "HYBRID";
  serviceQty: number;
  operatorQty: number;
  kioskQty: number;
  kotQty?: number;
  tokenDeliverySelections: string[];
  activeMethods: string[];
  serviceAssignments?: Record<string | number, number[]>;
  addons?: Record<string, number>;
  [key: string]: any;
}

interface OnsiteBranchAccordionProps {
  onsiteModuleEnabled: boolean;
  onToggleOnsiteModule: (enabled: boolean) => void;
  branches: BranchOnsiteConfig[];
  onUpdateBranch: (index: number, field: string, value: any) => void;
  onApplyToAll: (sourceIndex: number) => void;
  componentPrices?: Record<string, any>;
  saveStatus?: "saved" | "saving" | "error";
  onNext: () => void;
  onBack: () => void;
}

export function OnsiteBranchAccordion({
  onsiteModuleEnabled,
  onToggleOnsiteModule,
  branches,
  onUpdateBranch,
  onApplyToAll,
  componentPrices = {},
  saveStatus = "saved",
  onNext,
  onBack,
}: OnsiteBranchAccordionProps) {
  // Accordion open/close state per branch index
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({ 0: true });
  const [showApplyModal, setShowApplyModal] = useState<{ sourceIndex: number; sourceName: string } | null>(null);
  const [lastUndoState, setLastUndoState] = useState<BranchOnsiteConfig[] | null>(null);
  const branchRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => {
      const nextState = !prev[idx];
      if (nextState && branchRefs.current[idx]) {
        // Smoothly scroll into view
        setTimeout(() => {
          branchRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
      }
      return { ...prev, [idx]: nextState };
    });
  };

  const handleExpandAll = () => {
    const allExpanded: Record<number, boolean> = {};
    branches.forEach((_, i) => {
      allExpanded[i] = true;
    });
    setExpandedIndices(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedIndices({});
  };

  const calculateBranchCost = (b: BranchOnsiteConfig) => {
    if (b.channel_type === "ONLINE_ONLY") return 0;
    let cost = 0;
    const operatorRate = componentPrices["operator_screens"]?.price_per_unit ? Number(componentPrices["operator_screens"].price_per_unit) : 100;
    const kioskRate = componentPrices["paper_roll_screens"]?.price_per_unit ? Number(componentPrices["paper_roll_screens"].price_per_unit) : 100;
    const serviceRate = componentPrices["services"]?.price_per_unit ? Number(componentPrices["services"].price_per_unit) : 100;
    const kotRate = 100;

    const opSeats = (b.operatorQty || 0) + (b.addons?.operator_screens || 0);
    const kiosks = (b.kioskQty || 0) + (b.addons?.paper_roll_screens || 0);
    const kots = b.kotQty || 0;
    const services = b.mode === "SERVICE_BASED" ? ((b.serviceQty || 1) + (b.addons?.services || 0)) : 0;

    cost += opSeats * operatorRate;
    cost += kiosks * kioskRate;
    cost += kots * kotRate;
    cost += services * serviceRate;

    // KOT SMS / WhatsApp
    if (b.activeMethods?.includes("3")) cost += 490;
    if (b.activeMethods?.includes("4")) cost += 790;

    return cost;
  };

  const triggerApplyToAll = (sourceIndex: number) => {
    const sourceBranch = branches[sourceIndex];
    setShowApplyModal({ sourceIndex, sourceName: sourceBranch.name });
  };

  const executeApplyToAll = () => {
    if (!showApplyModal) return;
    // Save undo state
    setLastUndoState(JSON.parse(JSON.stringify(branches)));
    onApplyToAll(showApplyModal.sourceIndex);
    setShowApplyModal(null);

    toast.success("Settings copied to all branch locations!", {
      action: {
        label: "Undo",
        onClick: () => {
          if (lastUndoState) {
            lastUndoState.forEach((b, idx) => {
              Object.keys(b).forEach((key) => {
                onUpdateBranch(idx, key, b[key]);
              });
            });
            toast.info("Reverted back to previous settings.");
          }
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* ──── MODULE HEADER ──── */}
      <div className="panel p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  3. Onsite Module (In-Branch Queue Operations)
                </h2>
                {/* Autosave Status Pill */}
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors",
                    saveStatus === "saving" && "bg-amber-50 text-amber-600 dark:bg-amber-950/40",
                    saveStatus === "saved" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40",
                    saveStatus === "error" && "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      saveStatus === "saving" && "bg-amber-500 animate-pulse",
                      saveStatus === "saved" && "bg-emerald-500",
                      saveStatus === "error" && "bg-rose-500"
                    )}
                  />
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Save Failed" : "All changes saved"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure physical customer walk-ins, ticketing kiosks, operator desks, and token delivery channels.
              </p>
            </div>
          </div>

          {/* Master Enable/Disable Switch */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-center">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {onsiteModuleEnabled ? "Onsite Active" : "Onsite Disabled"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onsiteModuleEnabled}
                onChange={(e) => onToggleOnsiteModule(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
        </div>

        {!onsiteModuleEnabled ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Onsite Queue Module is currently turned off
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md mx-auto">
                Toggle the switch above to enable on-premise physical queue management, operator desks, and self-service kiosks.
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-6 space-y-4">
            {/* Top Toolbar Controls: Expand/Collapse All + Apply to All Locations */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
                >
                  Expand All
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
                >
                  Collapse All
                </button>
              </div>

              {branches.length > 1 && (
                <button
                  type="button"
                  onClick={() => triggerApplyToAll(0)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Copy className="h-3.5 w-3.5" /> Apply HQ Settings to All Locations
                </button>
              )}
            </div>

            {/* STACKED ACCORDION OF ALL BRANCHES */}
            <div className="space-y-4">
              {branches.map((branch, idx) => {
                const isExpanded = !!expandedIndices[idx];
                const isOnsiteActive = branch.channel_type !== "ONLINE_ONLY";
                const branchCost = calculateBranchCost(branch);
                const activeMethods = branch.activeMethods || ["1"];

                const isQrSel = activeMethods.includes("1");
                const isKioskSel = activeMethods.includes("2");
                const isSmsSel = activeMethods.includes("3");
                const isWhatsAppSel = activeMethods.includes("4");
                const isKotSel = isSmsSel || isWhatsAppSel;

                return (
                  <div
                    key={idx}
                    ref={(el) => (branchRefs.current[idx] = el)}
                    className={cn(
                      "rounded-3xl border transition-all duration-200 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs",
                      !isOnsiteActive
                        ? "opacity-65 border-dashed border-slate-200 dark:border-slate-800"
                        : isExpanded
                        ? "border-indigo-300 dark:border-indigo-800/80 shadow-md ring-2 ring-indigo-500/10"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    {/* ACCORDION CARD HEADER */}
                    <div
                      onClick={() => toggleExpand(idx)}
                      className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={cn(
                            "h-9 w-9 rounded-2xl text-xs font-bold flex items-center justify-center shrink-0 transition-colors",
                            idx === 0
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          {idx + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                              {branch.name}
                            </h3>
                            {idx === 0 && (
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/50">
                                Primary HQ
                              </span>
                            )}
                          </div>
                          {branch.address && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate mt-0.5 max-w-md">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{branch.address}</span>
                            </p>
                          )}

                          {/* Short config summary chips */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {!isOnsiteActive ? (
                              <span className="text-[11px] font-semibold text-slate-500 italic">
                                Onsite Disabled · Turn on to configure
                              </span>
                            ) : (
                              <>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {branch.mode === "SERVICE_BASED" ? `${branch.serviceQty || 1} Services` : "Single Queue"}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {branch.operatorQty} Operator{branch.operatorQty !== 1 ? "s" : ""}
                                </span>
                                {isKioskSel && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200/50">
                                    {branch.kioskQty || 1} Kiosk{(branch.kioskQty || 1) !== 1 ? "s" : ""}
                                  </span>
                                )}
                                {isKotSel && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50">
                                    {branch.kotQty || 1} KOT{isSmsSel && isWhatsAppSel ? " (SMS+WA)" : isSmsSel ? " (SMS)" : " (WA)"}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                                  ₹{branchCost.toLocaleString("en-IN")}/mo
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Right Actions */}
                      <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Onsite ON/OFF switch */}
                        <label className="relative inline-flex items-center cursor-pointer" title="Toggle Onsite Operations">
                          <input
                            type="checkbox"
                            checked={isOnsiteActive}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const newChannel = checked
                                ? (branch.channel_type === "ONLINE_ONLY" ? "HYBRID" : branch.channel_type)
                                : "ONLINE_ONLY";
                              onUpdateBranch(idx, "channel_type", newChannel);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                        </label>

                        {/* Expand/Collapse Chevron */}
                        <div className="p-1 text-slate-400">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>

                    {/* ACCORDION CARD BODY */}
                    {isExpanded && (
                      <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800/80 space-y-6 bg-white dark:bg-slate-900 animate-fadeIn">
                        {!isOnsiteActive ? (
                          <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-950/50">
                            <Info className="h-5 w-5 text-slate-400 mx-auto" />
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Onsite operations are turned off for {branch.name}.
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Toggle the switch above to activate physical queues, desks, and ticketing.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Copy Settings to All Locations action bar inside branch */}
                            {branches.length > 1 && (
                              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                                  Want identical settings across all branches?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => triggerApplyToAll(idx)}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 transition-colors cursor-pointer border-0 shadow-2xs flex items-center gap-1.5"
                                >
                                  <Copy className="h-3 w-3" /> Copy this setup to all branches
                                </button>
                              </div>
                            )}

                            {/* Section 1: Queue Options (Option Cards) */}
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Queue Generation Options
                              </label>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Option 1: QR Scanning Token */}
                                <div
                                  className={cn(
                                    "p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between select-none",
                                    isQrSel
                                      ? "border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-400/40"
                                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950"
                                  )}
                                >
                                  <div>
                                    <div className="flex items-center justify-between pb-2">
                                      <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center">
                                        <QrCode className="h-5 w-5" />
                                      </div>
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60">
                                        FREE · Always On
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1">
                                      QR Scanning Token
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                      Customers scan printed QR poster on their phones to join the live virtual queue.
                                    </p>
                                  </div>

                                  <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-2">
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      Included with all plans
                                    </span>
                                    <div className="h-5 w-5 rounded-lg flex items-center justify-center bg-indigo-600 text-white">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  </div>
                                </div>

                                {/* Option 2: Kiosk Printed Token */}
                                <div
                                  onClick={() => {
                                    let nextMethods = [...activeMethods];
                                    if (isKioskSel) {
                                      nextMethods = nextMethods.filter((m) => m !== "2");
                                      onUpdateBranch(idx, "kioskQty", 0);
                                    } else {
                                      nextMethods.push("2");
                                      onUpdateBranch(idx, "kioskQty", Math.max(1, branch.kioskQty || 1));
                                    }
                                    if (nextMethods.length === 0) nextMethods = ["1"];
                                    onUpdateBranch(idx, "activeMethods", nextMethods);
                                  }}
                                  className={cn(
                                    "p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between cursor-pointer select-none",
                                    isKioskSel
                                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-2xs"
                                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:border-slate-300"
                                  )}
                                >
                                  <div>
                                    <div className="flex items-center justify-between pb-2">
                                      <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-900/50 text-violet-600 flex items-center justify-center">
                                        <Printer className="h-5 w-5" />
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        ₹100/mo / kiosk
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1">
                                      Kiosk (Printed Token)
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                      Dispenses physical thermal printed tickets for walk-ins at physical entrance kiosk.
                                    </p>
                                  </div>

                                  <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-2">
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      {isKioskSel ? "Enabled" : "Disabled"}
                                    </span>
                                    <div
                                      className={cn(
                                        "h-5 w-5 rounded-lg flex items-center justify-center",
                                        isKioskSel ? "bg-indigo-600 text-white" : "border border-slate-300 dark:border-slate-700"
                                      )}
                                    >
                                      {isKioskSel && <Check className="h-3 w-3" />}
                                    </div>
                                  </div>
                                </div>

                                {/* Option 3: KOT Digital Delivery (SMS and WhatsApp) */}
                                <div
                                  onClick={() => {
                                    if (!isKotSel) {
                                      // If user taps card when neither is active, activate SMS by default
                                      const nextMethods = [...activeMethods, "3"];
                                      onUpdateBranch(idx, "kotQty", Math.max(1, branch.kotQty || 1));
                                      onUpdateBranch(idx, "activeMethods", nextMethods);
                                    }
                                  }}
                                  className={cn(
                                    "p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between select-none",
                                    isKotSel
                                      ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-2xs"
                                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:border-slate-300"
                                  )}
                                >
                                  <div>
                                    <div className="flex items-center justify-between pb-2">
                                      <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center">
                                        <MessageSquare className="h-5 w-5" />
                                      </div>
                                      <span
                                        className={cn(
                                          "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                                          isKotSel
                                            ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                        )}
                                      >
                                        {isSmsSel && isWhatsAppSel
                                          ? "SMS + WhatsApp (₹1,280/mo)"
                                          : isSmsSel
                                          ? "SMS (₹490/mo)"
                                          : isWhatsAppSel
                                          ? "WhatsApp (₹790/mo)"
                                          : "2 Delivery Options"}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1">
                                      KOT – Digital Delivery
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                      Direct electronic tokens sent to customers' phones via SMS or WhatsApp.
                                    </p>
                                  </div>

                                  {/* 2 Interactive Options: SMS & WhatsApp */}
                                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2 space-y-1.5">
                                    <div className="text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                                      <span>Select Channels:</span>
                                      <span className="text-[9px] text-slate-400">Choose 1 or both</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      {/* Option A: SMS */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          let nextMethods = [...activeMethods];
                                          if (isSmsSel) {
                                            nextMethods = nextMethods.filter((m) => m !== "3");
                                            if (!nextMethods.includes("4")) {
                                              onUpdateBranch(idx, "kotQty", 0);
                                            }
                                          } else {
                                            if (!nextMethods.includes("3")) nextMethods.push("3");
                                            onUpdateBranch(idx, "kotQty", Math.max(1, branch.kotQty || 1));
                                          }
                                          if (nextMethods.length === 0) nextMethods = ["1"];
                                          onUpdateBranch(idx, "activeMethods", nextMethods);
                                        }}
                                        className={cn(
                                          "p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group",
                                          isSmsSel
                                            ? "border-emerald-500 bg-white dark:bg-slate-900 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white shadow-2xs"
                                            : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                        )}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center gap-1.5">
                                            <Smartphone className={cn("h-3.5 w-3.5", isSmsSel ? "text-emerald-600" : "text-slate-400")} />
                                            <span className="text-xs font-bold">SMS</span>
                                          </div>
                                          <div
                                            className={cn(
                                              "h-4 w-4 rounded-md flex items-center justify-center text-[10px] transition-colors",
                                              isSmsSel ? "bg-emerald-600 text-white" : "border border-slate-300 dark:border-slate-700"
                                            )}
                                          >
                                            {isSmsSel && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                          </div>
                                        </div>
                                        <div className="mt-1.5 flex items-baseline justify-between text-[10px]">
                                          <span className={cn("font-bold", isSmsSel ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500")}>
                                            ₹490/mo
                                          </span>
                                          <span className="text-[9px] text-muted-foreground">Text</span>
                                        </div>
                                      </button>

                                      {/* Option B: WhatsApp */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          let nextMethods = [...activeMethods];
                                          if (isWhatsAppSel) {
                                            nextMethods = nextMethods.filter((m) => m !== "4");
                                            if (!nextMethods.includes("3")) {
                                              onUpdateBranch(idx, "kotQty", 0);
                                            }
                                          } else {
                                            if (!nextMethods.includes("4")) nextMethods.push("4");
                                            onUpdateBranch(idx, "kotQty", Math.max(1, branch.kotQty || 1));
                                          }
                                          if (nextMethods.length === 0) nextMethods = ["1"];
                                          onUpdateBranch(idx, "activeMethods", nextMethods);
                                        }}
                                        className={cn(
                                          "p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group",
                                          isWhatsAppSel
                                            ? "border-emerald-500 bg-white dark:bg-slate-900 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white shadow-2xs"
                                            : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                        )}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center gap-1.5">
                                            <MessageSquare className={cn("h-3.5 w-3.5", isWhatsAppSel ? "text-emerald-600" : "text-slate-400")} />
                                            <span className="text-xs font-bold">WhatsApp</span>
                                          </div>
                                          <div
                                            className={cn(
                                              "h-4 w-4 rounded-md flex items-center justify-center text-[10px] transition-colors",
                                              isWhatsAppSel ? "bg-emerald-600 text-white" : "border border-slate-300 dark:border-slate-700"
                                            )}
                                          >
                                            {isWhatsAppSel && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                          </div>
                                        </div>
                                        <div className="mt-1.5 flex items-baseline justify-between text-[10px]">
                                          <span className={cn("font-bold", isWhatsAppSel ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500")}>
                                            ₹790/mo
                                          </span>
                                          <span className="text-[9px] text-muted-foreground">Live chat</span>
                                        </div>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Routing Mode & Capacity Steppers */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              {/* Column A: Routing Mode & Capacity Steppers */}
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-semibold text-slate-900 dark:text-white">
                                      Branch Routing Mode
                                    </label>
                                    <span
                                      className="text-slate-400 cursor-help"
                                      title="Routing Mode: how customers are assigned to counters and queues"
                                    >
                                      <HelpCircle className="h-3.5 w-3.5" />
                                    </span>
                                  </div>
                                  <select
                                    value={branch.mode || "NON_SERVICE_BASED"}
                                    onChange={(e) => {
                                      const newMode = e.target.value;
                                      onUpdateBranch(idx, "mode", newMode);
                                      if (newMode === "SERVICE_BASED") {
                                        onUpdateBranch(idx, "serviceQty", Math.max(1, branch.serviceQty || 1));
                                      } else {
                                        onUpdateBranch(idx, "serviceQty", 0);
                                      }
                                    }}
                                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-900 dark:text-white"
                                  >
                                    <option value="NON_SERVICE_BASED">Non-Service-Based (Single Queue)</option>
                                    <option value="SERVICE_BASED">Service-Based (Multiple Queues)</option>
                                  </select>
                                  <p className="text-[11px] text-muted-foreground">
                                    {branch.mode === "SERVICE_BASED"
                                      ? "Customers select a specialized desk service line (e.g. Inquiries, Cashier, Testing)."
                                      : "Single universal queue with round-robin desk distribution."}
                                  </p>
                                </div>

                                {/* Number of Services Stepper - ONLY IF SERVICE-BASED */}
                                {branch.mode === "SERVICE_BASED" && (
                                  <div className="p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between transition-all">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                          Number of Services
                                        </span>
                                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                                          {componentPrices["services"]?.price_per_unit ? `₹${Number(componentPrices["services"].price_per_unit).toLocaleString("en-IN")}/mo` : "₹100/mo"}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                                        Active department lines & category queues
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-2xs">
                                      <button
                                        type="button"
                                        disabled={(branch.serviceQty || 1) <= 1}
                                        onClick={() => onUpdateBranch(idx, "serviceQty", Math.max(1, (branch.serviceQty || 1) - 1))}
                                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold text-xs border-none bg-transparent cursor-pointer"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </button>
                                      <span className="w-6 text-center font-bold text-xs text-slate-900 dark:text-white">
                                        {branch.serviceQty || 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => onUpdateBranch(idx, "serviceQty", (branch.serviceQty || 1) + 1)}
                                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs border-none bg-transparent cursor-pointer"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Number of Operators Stepper */}
                                <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                        Number of Operators
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                        ₹100/mo
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                                      Active counter staff and cashier terminals
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-2xs">
                                    <button
                                      type="button"
                                      disabled={branch.operatorQty <= 1}
                                      onClick={() => onUpdateBranch(idx, "operatorQty", Math.max(1, branch.operatorQty - 1))}
                                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold text-xs border-none bg-transparent cursor-pointer"
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="w-6 text-center font-bold text-xs text-slate-900 dark:text-white">
                                      {branch.operatorQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateBranch(idx, "operatorQty", branch.operatorQty + 1)}
                                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs border-none bg-transparent cursor-pointer"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Column B: Hardware Terminals Steppers */}
                              <div className="space-y-4">
                                {/* Base Ticketing Kiosks Stepper - ONLY SHOWN IF isKioskSel */}
                                {isKioskSel && (
                                  <div className="p-3.5 rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/30 flex items-center justify-between transition-all">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                          Base Ticketing Kiosks
                                        </span>
                                        <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/60 px-1.5 py-0.5 rounded">
                                          ₹100/mo
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                                        Physical self-serve touchscreen ticket kiosks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-2xs">
                                      <button
                                        type="button"
                                        disabled={(branch.kioskQty || 1) <= 1}
                                        onClick={() => onUpdateBranch(idx, "kioskQty", Math.max(1, (branch.kioskQty || 1) - 1))}
                                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold text-xs border-none bg-transparent cursor-pointer"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </button>
                                      <span className="w-6 text-center font-bold text-xs text-slate-900 dark:text-white">
                                        {branch.kioskQty || 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => onUpdateBranch(idx, "kioskQty", (branch.kioskQty || 1) + 1)}
                                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs border-none bg-transparent cursor-pointer"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Digital KOT Terminals Stepper - ONLY SHOWN IF isKotSel */}
                                {isKotSel && (
                                  <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30 space-y-3 transition-all">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                            Digital KOT Terminals
                                          </span>
                                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                            ₹100/mo
                                          </span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                                          Electronic kitchen / order dispatch screens
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-2xs">
                                        <button
                                          type="button"
                                          disabled={(branch.kotQty || 1) <= 1}
                                          onClick={() => onUpdateBranch(idx, "kotQty", Math.max(1, (branch.kotQty || 1) - 1))}
                                          className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold text-xs border-none bg-transparent cursor-pointer"
                                        >
                                          <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <span className="w-6 text-center font-bold text-xs text-slate-900 dark:text-white">
                                          {branch.kotQty || 1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => onUpdateBranch(idx, "kotQty", (branch.kotQty || 1) + 1)}
                                          className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs border-none bg-transparent cursor-pointer"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Selected KOT Delivery Channels with quick toggles */}
                                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 text-[11px]">
                                      <span className="text-muted-foreground text-[10px] font-medium">Active Channels:</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          let nextMethods = [...activeMethods];
                                          if (isSmsSel) {
                                            nextMethods = nextMethods.filter((m) => m !== "3");
                                            if (!nextMethods.includes("4")) onUpdateBranch(idx, "kotQty", 0);
                                          } else {
                                            if (!nextMethods.includes("3")) nextMethods.push("3");
                                            onUpdateBranch(idx, "kotQty", Math.max(1, branch.kotQty || 1));
                                          }
                                          if (nextMethods.length === 0) nextMethods = ["1"];
                                          onUpdateBranch(idx, "activeMethods", nextMethods);
                                        }}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer",
                                          isSmsSel
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                            : "bg-white/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                        )}
                                      >
                                        <Smartphone className="h-3 w-3" />
                                        SMS ({isSmsSel ? "₹490/mo · ON" : "Turn ON"})
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          let nextMethods = [...activeMethods];
                                          if (isWhatsAppSel) {
                                            nextMethods = nextMethods.filter((m) => m !== "4");
                                            if (!nextMethods.includes("3")) onUpdateBranch(idx, "kotQty", 0);
                                          } else {
                                            if (!nextMethods.includes("4")) nextMethods.push("4");
                                            onUpdateBranch(idx, "kotQty", Math.max(1, branch.kotQty || 1));
                                          }
                                          if (nextMethods.length === 0) nextMethods = ["1"];
                                          onUpdateBranch(idx, "activeMethods", nextMethods);
                                        }}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer",
                                          isWhatsAppSel
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                            : "bg-white/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                        )}
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                        WhatsApp ({isWhatsAppSel ? "₹790/mo · ON" : "Turn ON"})
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Informative box when neither Kiosk nor KOT is selected */}
                                {!isKioskSel && !isKotSel && (
                                  <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start gap-3">
                                    <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                                        No Physical Hardware Terminals Selected
                                      </span>
                                      QR Scanning Token is active for walk-ins. Select <strong>Kiosk (Printed Token)</strong> or <strong>KOT – Digital Delivery</strong> in Queue Generation Options above if you need physical touchscreen terminals.
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Live Per-Branch Cost Line */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                              <span className="text-slate-500 font-medium">
                                Estimated monthly cost for {branch.name}:
                              </span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                ₹{branchCost.toLocaleString("en-IN")}/mo
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-xl h-11 px-5 font-semibold text-xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Step 2
          </Button>

          <Button
            type="button"
            onClick={onNext}
            className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl px-6 h-11 shadow-md shadow-indigo-500/20 cursor-pointer border-0"
          >
            Continue to Addons <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* ──── APPLY TO ALL CONFIRMATION MODAL ──── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Copy {showApplyModal.sourceName} settings to all locations?
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                This will overwrite queue modes, operator counter numbers, kiosks, and token delivery options for all {branches.length - 1} other branch locations with {showApplyModal.sourceName}'s settings.
                <br /><br />
                Individual branch names and addresses will be preserved. You can undo this action immediately after applying.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setShowApplyModal(null)}
                className="rounded-xl h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={executeApplyToAll}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 text-xs font-bold"
              >
                Yes, Overwrite & Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
