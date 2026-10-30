import React, { useState } from "react";
import {
  Download,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Code2,
  X,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanSummarySidebarProps {
  branchesCount: number;
  onlineBranchesCount: number;
  durationMonths: number;
  onDurationChange: (months: number) => void;
  durationTiers?: any[];
  branches: any[];
  quote: any | null;
  loadingQuote?: boolean;
  quoteError?: string | null;
  companyAddons?: Record<string, number>;
  statePlanComponents?: any[];
  checklist: Array<{
    id: string;
    title: string;
    status: boolean;
    description: string;
    stepTarget: number;
  }>;
  allSatisfied: boolean;
  onNavigateStep: (step: number) => void;
  simulateFailure: boolean;
  onToggleSimulateFailure: (checked: boolean) => void;
  onDownloadPDF: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  onCancel?: () => void;
  mode?: "registration" | "view" | "upgrade";
  className?: string;
}

export function PlanSummarySidebar({
  branchesCount,
  onlineBranchesCount,
  durationMonths,
  onDurationChange,
  durationTiers = [
    { months: 1, discount_percent: 0 },
    { months: 3, discount_percent: 5 },
    { months: 6, discount_percent: 10 },
    { months: 12, discount_percent: 20 },
  ],
  branches,
  quote,
  loadingQuote = false,
  quoteError = null,
  companyAddons = {},
  statePlanComponents = [],
  checklist,
  allSatisfied,
  onNavigateStep,
  simulateFailure,
  onToggleSimulateFailure,
  onDownloadPDF,
  onSubmit,
  submitting = false,
  onCancel,
  mode = "registration",
  className,
}: PlanSummarySidebarProps) {
  // Collapsible sections state - all collapsed except essentials
  const [isBranchesOpen, setIsBranchesOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const completedCount = checklist.filter((c) => c.status).length;
  const totalCount = checklist.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Compute grand total
  const gstRate = 18;
  const quoteTotal = quote ? Number(quote.total || 0) : 0;
  const grandTotal = Math.round(quoteTotal * (1 + gstRate / 100));
  const monthlyGrandTotal = Math.round((quoteTotal / (durationMonths || 1)) * (1 + gstRate / 100));

  const incompleteItems = checklist.filter((c) => !c.status);
  const missingTooltip = incompleteItems.length > 0
    ? `Please complete: ${incompleteItems.map((i) => i.title).join(", ")}`
    : "";

  return (
    <div
      className={cn(
        "w-full max-w-[340px] rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-5 space-y-4 text-xs transition-all",
        className
      )}
    >
      {/* ──── COMPACT HEADER ──── */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
          Your Plan
        </span>
        <button
          type="button"
          onClick={onDownloadPDF}
          disabled={!quote}
          className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:underline cursor-pointer bg-transparent border-0 disabled:opacity-40"
          title="Download PDF quote"
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
      </div>

      {/* ──── GRAND TOTAL HERO ──── */}
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
          Grand Total
        </span>
        <div className="flex items-baseline gap-2">
          {loadingQuote ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              <span className="text-slate-400 font-semibold text-sm">Calculating...</span>
            </div>
          ) : (
            <>
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                ₹{grandTotal.toLocaleString("en-IN")}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                / {durationMonths} mo (incl. 18% GST)
              </span>
            </>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          ₹{monthlyGrandTotal.toLocaleString("en-IN")}/month billed for {durationMonths} month{durationMonths > 1 ? "s" : ""}
        </p>
      </div>

      {/* ──── QUICK STATS ROW AS CHIPS ──── */}
      <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
        <div className="text-center px-1">
          <span className="text-[10px] text-slate-400 block">Locations</span>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{branchesCount}</span>
        </div>
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />
        <div className="text-center px-1">
          <span className="text-[10px] text-slate-400 block">Online</span>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{onlineBranchesCount}</span>
        </div>
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />
        <div className="text-center px-1">
          <span className="text-[10px] text-slate-400 block">Contract</span>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{durationMonths}M</span>
        </div>
      </div>

      {/* ──── COMPACT BILLING CYCLE SEGMENTED CONTROL ──── */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Billing Cycle
        </span>
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          {durationTiers.map((tier) => {
            const isSel = durationMonths === tier.months;
            return (
              <button
                key={tier.months}
                type="button"
                onClick={() => onDurationChange(tier.months)}
                className={cn(
                  "py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer border-0 flex flex-col items-center justify-center",
                  isSel
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 bg-transparent font-medium"
                )}
              >
                <span className="text-xs">{tier.months}M</span>
                {tier.discount_percent > 0 ? (
                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400">
                    -{tier.discount_percent}%
                  </span>
                ) : (
                  <span className="text-[8px] text-transparent select-none">-0%</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ──── PER-BRANCH BREAKDOWN (COLLAPSED ACCORDION) ──── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsBranchesOpen(!isBranchesOpen)}
          className="w-full p-3 flex items-center justify-between text-left font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors border-0 bg-transparent cursor-pointer"
        >
          <div className="min-w-0">
            <span className="text-[11px] font-bold block">Branch Locations ({branches.length})</span>
            {!isBranchesOpen && (
              <span className="text-[10px] text-muted-foreground truncate block">
                {branches.map((b) => b.name).slice(0, 2).join(", ")}
                {branches.length > 2 ? ` +${branches.length - 2} more` : ""}
              </span>
            )}
          </div>
          {isBranchesOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
        </button>

        {isBranchesOpen && (
          <div className="p-3 pt-0 space-y-2 border-t border-slate-100 dark:border-slate-800/80 max-h-44 overflow-y-auto">
            {branches.map((b, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/70 text-[10px] space-y-0.5 border border-slate-100 dark:border-slate-800/60"
              >
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>{b.name}</span>
                  <span className="text-violet-600 uppercase font-semibold text-[9px]">{b.channel_type}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Mode: {b.mode === "SERVICE_BASED" ? "Service-Based" : "Single Queue"}</span>
                  <span>{b.operatorQty || 1} ops · {b.kioskQty || 0} kiosks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ──── PRICING CALCULATIONS (COLLAPSED ACCORDION) ──── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
          className="w-full p-3 flex items-center justify-between text-left font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors border-0 bg-transparent cursor-pointer"
        >
          <span className="text-[11px] font-bold">
            {isBreakdownOpen ? "Hide Price Breakdown" : "View Price Breakdown"}
          </span>
          {isBreakdownOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>

        {isBreakdownOpen && (
          <div className="p-3 pt-0 space-y-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            {quote && quote.itemized ? (
              <>
                {Number(quote.itemized.branches_subtotal) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Branches License Fee</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₹{Number(quote.itemized.branches_subtotal).toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                )}
                {Number(quote.itemized.online_subtotal) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Online Booking Module</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₹{Number(quote.itemized.online_subtotal).toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                )}
                {Number(quote.itemized.operators_subtotal) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Operator Seats</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₹{Number(quote.itemized.operators_subtotal).toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                )}
                {Number(quote.itemized.kiosks_subtotal) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Displays & Kiosks</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ₹{Number(quote.itemized.kiosks_subtotal).toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Monthly Subtotal</span>
                  <span>₹{Number(quote.raw_total).toLocaleString("en-IN")}/mo</span>
                </div>
                {quote.discount_percent > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Term Discount ({quote.discount_percent}%)</span>
                    <span>−₹{Number(quote.discount_amount).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>GST ({gstRate}%)</span>
                  <span>₹{Math.round(Number(quote.total) * (gstRate / 100)).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Due Contractually</span>
                  <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </>
            ) : (
              <span className="text-slate-400 italic">No breakdown available</span>
            )}
          </div>
        )}
      </div>

      {/* ──── SETUP CHECKLIST (PROGRESS RING/BAR) ──── */}
      <div
        className={cn(
          "rounded-2xl border p-3 space-y-2.5 transition-all",
          allSatisfied
            ? "border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20"
            : "border-amber-200/80 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20"
        )}
      >
        <div
          onClick={() => setIsChecklistOpen(!isChecklistOpen)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            {allSatisfied ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              Setup Checklist ({completedCount}/{totalCount})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-slate-500">{progressPercent}%</span>
            {isChecklistOpen ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              allSatisfied ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-indigo-600"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Collapsible checklist items */}
        {isChecklistOpen && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {checklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateStep(item.stepTarget)}
                className={cn(
                  "w-full flex items-start gap-2 p-2 rounded-xl text-left transition-all border cursor-pointer",
                  item.status
                    ? "border-emerald-200/60 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-800/40 text-slate-700 dark:text-slate-300"
                    : "border-amber-300 bg-white dark:bg-slate-900 dark:border-amber-700 shadow-2xs text-amber-900 dark:text-amber-200"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {item.status ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-amber-500 flex items-center justify-center text-[8px] font-bold text-amber-600">
                      !
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] truncate">{item.title}</span>
                    {!item.status && (
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center gap-0.5">
                        Fix <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ──── PRIMARY CTA BUTTON ──── */}
      <div>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!allSatisfied || submitting || !quote}
          title={missingTooltip}
          className={cn(
            "w-full h-11 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer border-0 flex items-center justify-center gap-2 text-white",
            !allSatisfied
              ? "bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-60"
              : "bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 shadow-indigo-500/25 active:scale-[0.99]"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing Plan...
            </>
          ) : (
            <>
              {mode === "upgrade" ? "Submit Upgrade Plan" : "Continue to Payment"}{" "}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        {!allSatisfied && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center font-medium mt-1">
            Complete the required setup items above to unlock checkout.
          </p>
        )}
      </div>

      {/* ──── DEVELOPER / TEST MODE (COLLAPSIBLE) ──── */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => setIsDevOpen(!isDevOpen)}
          className="flex items-center justify-between w-full text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors border-0 bg-transparent cursor-pointer"
        >
          <span className="flex items-center gap-1">
            <Code2 className="h-3 w-3" /> Developer / Test Options
          </span>
          {isDevOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {isDevOpen && (
          <div className="mt-2 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between">
            <label htmlFor="simFailCheck" className="text-[11px] font-semibold text-red-600 dark:text-red-400 cursor-pointer">
              Simulate Payment Failure
              <span className="text-[9px] text-muted-foreground block font-normal">
                Test the payment gateway failure screen
              </span>
            </label>
            <input
              id="simFailCheck"
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => onToggleSimulateFailure(e.target.checked)}
              className="accent-red-600 cursor-pointer h-4 w-4"
            />
          </div>
        )}
      </div>

      {/* ──── CANCEL & CLOSE (SUBTLE BUTTON) ──── */}
      {onCancel && (
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer border-0 bg-transparent"
          >
            Cancel & Close
          </button>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Exit Plan Builder?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your configurations are saved automatically. Are you sure you want to exit?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
                className="rounded-xl text-xs"
              >
                Continue Editing
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowCancelModal(false);
                  onCancel();
                }}
                className="bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Yes, Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
