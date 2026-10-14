import React, { useState } from "react";
import { X, ChevronUp, ArrowRight, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlanSummarySidebar } from "./plan-summary-sidebar";

interface MobileSummarySheetProps {
  branchesCount: number;
  onlineBranchesCount: number;
  durationMonths: number;
  onDurationChange: (months: number) => void;
  durationTiers?: any[];
  branches: any[];
  quote: any | null;
  loadingQuote?: boolean;
  checklist: any[];
  allSatisfied: boolean;
  onNavigateStep: (step: number) => void;
  simulateFailure: boolean;
  onToggleSimulateFailure: (checked: boolean) => void;
  onDownloadPDF: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  onCancel?: () => void;
  mode?: "registration" | "view" | "upgrade";
}

export function MobileSummarySheet({
  branchesCount,
  onlineBranchesCount,
  durationMonths,
  onDurationChange,
  durationTiers,
  branches,
  quote,
  loadingQuote,
  checklist,
  allSatisfied,
  onNavigateStep,
  simulateFailure,
  onToggleSimulateFailure,
  onDownloadPDF,
  onSubmit,
  submitting,
  onCancel,
  mode = "registration",
}: MobileSummarySheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const gstRate = 18;
  const quoteTotal = quote ? Number(quote.total || 0) : 0;
  const grandTotal = Math.round(quoteTotal * (1 + gstRate / 100));

  return (
    <>
      {/* ──── STICKY BOTTOM BAR (<1024px) ──── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:px-6 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between gap-3 max-w-xl mx-auto">
          {/* Price & Summary Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex flex-col text-left cursor-pointer border-none bg-transparent"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-slate-900 dark:text-white">
                ₹{grandTotal.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] font-bold text-violet-600 flex items-center gap-0.5">
                Summary <ChevronUp className="h-3 w-3" />
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {branchesCount} Location{branchesCount > 1 ? "s" : ""} · {durationMonths}M plan
            </span>
          </button>

          {/* Continue Action Button */}
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!allSatisfied || submitting || !quote}
            className={cn(
              "h-11 px-5 rounded-xl font-bold text-xs text-white shadow-md transition-all cursor-pointer border-0 flex items-center gap-1.5",
              !allSatisfied
                ? "bg-slate-400 dark:bg-slate-800 opacity-60 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600"
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "upgrade" ? "Upgrade" : "Checkout"} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ──── FULL-HEIGHT BOTTOM SHEET OVERLAY ──── */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-h-[90vh] rounded-t-[32px] border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Selected Plan Details
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-none bg-transparent cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-center">
              <PlanSummarySidebar
                branchesCount={branchesCount}
                onlineBranchesCount={onlineBranchesCount}
                durationMonths={durationMonths}
                onDurationChange={onDurationChange}
                durationTiers={durationTiers}
                branches={branches}
                quote={quote}
                loadingQuote={loadingQuote}
                checklist={checklist}
                allSatisfied={allSatisfied}
                onNavigateStep={(step) => {
                  onNavigateStep(step);
                  setIsOpen(false);
                }}
                simulateFailure={simulateFailure}
                onToggleSimulateFailure={onToggleSimulateFailure}
                onDownloadPDF={onDownloadPDF}
                onSubmit={() => {
                  setIsOpen(false);
                  onSubmit();
                }}
                submitting={submitting}
                onCancel={onCancel}
                mode={mode}
                className="max-w-none shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
