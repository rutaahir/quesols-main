import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Coffee, LogIn, LogOut, Play, Clock, History, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, useQuesole } from "@/lib/quesole/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { BranchAttendanceLogsView } from "@/components/console/branch-attendance-logs";

export function OperatorAttendanceControlBar({
  branchId,
  deskId,
  onStatusChange
}: {
  branchId: string;
  deskId?: string;
  onStatusChange?: (attendance?: any) => void;
}) {
  const { actions } = useQuesole();
  const [attendance, setAttendance] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Modals
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [breakReason, setBreakReason] = useState("Tea / Coffee Break");
  const [customReason, setCustomReason] = useState("");
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Timers
  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  const fetchActiveAttendance = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch(`/api/operator/attendance/active/?branch=${branchId}`);
      if (data && data.active && data.attendance) {
        setAttendance(data.attendance);
        onStatusChange?.(data.attendance);
      } else {
        setAttendance(null);
        onStatusChange?.(null);
      }
    } catch (err) {
      console.error("Failed to fetch operator attendance status:", err);
      onStatusChange?.(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAttendance();
  }, [branchId]);

  // Live Timer Ticks
  useEffect(() => {
    if (!attendance) {
      setShiftSeconds(0);
      setBreakSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();

      // Calculate shift time
      if (attendance.check_in_time && attendance.status !== "checked_out") {
        const start = new Date(attendance.check_in_time).getTime();
        setShiftSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      }

      // Calculate current break time
      if (attendance.status === "on_break" && attendance.break_start_time) {
        const breakStart = new Date(attendance.break_start_time).getTime();
        setBreakSeconds(Math.max(0, Math.floor((now - breakStart) / 1000)));
      } else {
        setBreakSeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attendance]);

  const formatSeconds = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  const handleCheckIn = async () => {
    setIsActionLoading(true);
    try {
      const data = await apiFetch("/api/operator/attendance/check-in/", {
        method: "POST",
        body: JSON.stringify({ branch_id: branchId, desk_id: deskId })
      });
      setAttendance(data);
      toast.success("Checked in successfully! Have a great shift.");
      if (deskId) {
        actions.setDeskStatus(deskId, "open").catch(() => {});
      }
      onStatusChange?.(data);
    } catch (err: any) {
      toast.error(err.message || "Check-in failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setIsActionLoading(true);
    const selectedReason = breakReason === "Other" ? customReason || "Personal Break" : breakReason;
    try {
      const data = await apiFetch("/api/operator/attendance/break-start/", {
        method: "POST",
        body: JSON.stringify({ attendance_id: attendance?.id, desk_id: deskId, reason: selectedReason })
      });
      setAttendance(data);
      setIsBreakModalOpen(false);
      toast.info(`Break started: ${selectedReason}. Live display screen updated.`);
      if (deskId) {
        await actions.setDeskStatus(deskId, "break" as any).catch(() => {});
      }
      onStatusChange?.(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to start break");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setIsActionLoading(true);
    try {
      const data = await apiFetch("/api/operator/attendance/break-end/", {
        method: "POST",
        body: JSON.stringify({ attendance_id: attendance?.id, desk_id: deskId })
      });
      setAttendance(data);
      toast.success("Break ended! Desk status restored to Open.");
      if (deskId) {
        await actions.setDeskStatus(deskId, "open").catch(() => {});
      }
      onStatusChange?.(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to end break");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsActionLoading(true);
    try {
      const data = await apiFetch("/api/operator/attendance/check-out/", {
        method: "POST",
        body: JSON.stringify({ attendance_id: attendance?.id, desk_id: deskId, notes: checkOutNotes })
      });
      setAttendance(null);
      setIsCheckOutModalOpen(false);
      setCheckOutNotes("");
      toast.success("Checked out successfully. Desk set to offline.");
      if (deskId) {
        await actions.setDeskStatus(deskId, "offline").catch(() => {});
      }
      onStatusChange?.(null);
    } catch (err: any) {
      toast.error(err.message || "Check-out failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const logs = await apiFetch(`/api/operator/attendance/?branch=${branchId}`);
      setHistoryLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <>
      <div className="panel p-4 bg-card border-border/80 shadow-sm rounded-2xl mb-5 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status Badge & Timers */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Status indicator pill */}
            <div className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 border shadow-sm shrink-0",
              attendance?.status === "checked_in" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
              attendance?.status === "on_break" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse",
              (!attendance || attendance?.status === "checked_out") && "bg-muted text-muted-foreground border-border/60"
            )}>
              <span className={cn(
                "h-2 w-2 rounded-full",
                attendance?.status === "checked_in" && "bg-emerald-500 animate-pulse",
                attendance?.status === "on_break" && "bg-amber-500 animate-ping",
                (!attendance || attendance?.status === "checked_out") && "bg-slate-400"
              )} />
              {attendance?.status === "checked_in" && "🟢 CHECKED IN"}
              {attendance?.status === "on_break" && "☕ ON BREAK"}
              {(!attendance || attendance?.status === "checked_out") && "🔴 NOT CHECKED IN"}
            </div>

            {/* Shift Timer */}
            {attendance && (
              <div className="flex items-center gap-5 border-l border-border/60 pl-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 text-brand" /> Shift Elapsed
                  </div>
                  <div className="font-mono text-sm font-extrabold text-foreground">
                    {formatSeconds(shiftSeconds)}
                  </div>
                </div>

                {/* Break Timer (if currently on break) */}
                {attendance.status === "on_break" ? (
                  <div className="bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Coffee className="h-3 w-3 animate-bounce" /> Current Break
                    </div>
                    <div className="font-mono text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {formatSeconds(breakSeconds)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Total Break
                    </div>
                    <div className="font-mono text-sm font-bold text-muted-foreground">
                      {formatSeconds(attendance.total_break_seconds || 0)} ({attendance.break_count || 0} breaks)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!attendance ? (
              <Button
                variant="brand"
                size="sm"
                disabled={isActionLoading}
                onClick={handleCheckIn}
                className="font-bold shadow-md shadow-brand/20"
              >
                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <LogIn className="h-4 w-4 mr-1.5" />} Check In to Shift
              </Button>
            ) : attendance.status === "on_break" ? (
              <Button
                variant="brand"
                size="sm"
                disabled={isActionLoading}
                onClick={handleEndBreak}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20"
              >
                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />} End Break & Resume
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isActionLoading}
                  onClick={() => setIsBreakModalOpen(true)}
                  className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 font-bold"
                >
                  <Coffee className="h-4 w-4 mr-1.5 text-amber-500" /> Start Break
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isActionLoading}
                  onClick={() => setIsCheckOutModalOpen(true)}
                  className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-bold"
                >
                  <LogOut className="h-4 w-4 mr-1.5 text-rose-500" /> Check Out
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-xs font-bold gap-1.5 text-foreground hover:bg-muted/60 border-border/80"
            >
              <Users className="h-4 w-4 text-brand" /> Staff Attendance
            </Button>
          </div>
        </div>
      </div>

      {/* ── START BREAK REASON MODAL ── */}
      <AnimatePresence>
        {isBreakModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel max-w-md w-full p-6 space-y-5 border-amber-500/30 rounded-3xl shadow-2xl bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-xl border border-amber-500/30">
                  ☕
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-foreground">Start Break</h3>
                  <p className="text-xs text-muted-foreground">Select break type. Display screen will reflect status.</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Break Reason</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Tea / Coffee Break",
                    "Lunch Break",
                    "Restroom / Personal",
                    "Official Meeting",
                    "Other"
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBreakReason(r)}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2",
                        breakReason === r
                          ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm"
                          : "border-border/60 hover:bg-muted/50 text-foreground"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">{r}</span>
                    </button>
                  ))}
                </div>

                {breakReason === "Other" && (
                  <div className="pt-2">
                    <Input
                      placeholder="Specify reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="text-xs rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBreakModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="brand"
                  size="sm"
                  disabled={isActionLoading}
                  onClick={handleStartBreak}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Coffee className="h-4 w-4 mr-1.5" />} Confirm Break
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CHECK OUT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {isCheckOutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel max-w-md w-full p-6 space-y-5 border-rose-500/30 rounded-3xl shadow-2xl bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-bold text-xl border border-rose-500/30">
                  🚪
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-foreground">Confirm Shift Check Out</h3>
                  <p className="text-xs text-muted-foreground">End your working shift for today. Desk will turn offline.</p>
                </div>
              </div>

              <div className="space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/60 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Total Shift Duration:</span>
                  <span className="font-mono font-bold text-foreground">{formatSeconds(shiftSeconds)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Total Break Duration:</span>
                  <span className="font-mono font-bold text-foreground">{formatSeconds(attendance?.total_break_seconds || 0)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shift Handover / Notes (Optional)</Label>
                <Input
                  placeholder="e.g., All queue tokens cleared..."
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCheckOutModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isActionLoading}
                  onClick={handleCheckOut}
                  className="font-bold"
                >
                  {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <LogOut className="h-4 w-4 mr-1.5" />} Complete Check Out
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ALL STAFF ATTENDANCE TABULAR MODAL (STAFF ROLE) ── */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel max-w-6xl w-full p-6 space-y-4 rounded-3xl shadow-2xl bg-card max-h-[90vh] flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-foreground">
                      Branch Staff Attendance Dashboard
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Real-time shift statuses, break logs, and working durations for all staff
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="rounded-full h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="flex-1">
                <BranchAttendanceLogsView branchId={branchId} isStaffRole={true} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
