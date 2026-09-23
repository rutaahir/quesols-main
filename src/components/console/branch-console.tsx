import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, MonitorPlay, PhoneCall, QrCode, SkipForward, UserPlus, Search, Calendar, Clock, User, Check, X, ChevronRight, Globe, Loader2, Star, MessageSquare, Download, Filter, ShieldCheck, RotateCw, Printer, Phone, Mail, FileText, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/console/shell";
import {
  useQuesole,
  branchStats,
  ticketsOf,
  waitingOf,
  planOf,
  isNoServiceMode,
  apiFetch
} from "@/lib/quesole/store";
import { QueueMethod } from "@/lib/quesole/types";
import { CountUp, FlipNumber, Reveal, motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import { OperatorAttendanceControlBar } from "@/components/console/operator-attendance-bar";
import { AppointmentCustomerModal } from "@/components/console/appointment-customer-modal";
import { getNetworkOrigin } from "@/lib/api-config";

export function BranchConsoleView({
  view,
  branchId,
  deskId,
}: {
  view: string;
  branchId: string;
  deskId?: string | undefined;
}) {
  const { state, session, actions, refresh } = useQuesole();
  const branch = state.branches.find((b) => b.id === branchId);
  const company = state.companies.find((c) => String(c.id) === String(branch?.companyId));
  const companySlug = company?.slug || "";
  const branchSlug = branch?.slug || "";
  const desks = state.desks.filter((d) => d.branchId === branchId);
  const stats = branchStats(state, branchId);
  const waiting = waitingOf(state, branchId);
  const tickets = ticketsOf(state, branchId);

  // Manual ticket state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualServiceId, setManualServiceId] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);

  // Transfer ticket state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Online bookings operator console states
  const [onlineBookings, setOnlineBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingDateFilter, setBookingDateFilter] = useState("all"); // "all" | "today" | "tomorrow" | "specific"
  const [specificDateValue, setSpecificDateValue] = useState("");

  // Rescheduling states
  const [rescheduleBooking, setRescheduleBooking] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);

  // In-place Appointments Workbench states (Zero Popups)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showInlineReschedule, setShowInlineReschedule] = useState(false);
  const [staffNoteText, setStaffNoteText] = useState("");

  // Attendance shift check-in state
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);
  const [isCheckingInLoading, setIsCheckingInLoading] = useState(false);

  const fetchOnlineBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const data = await apiFetch(`/api/online-bookings/?branch=${branchId}`);
      setOnlineBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (view === "appointments") {
      fetchOnlineBookings();
    }
  }, [view, branchId]);

  // Fetch rescheduling slots in real-time when date or active booking changes
  useEffect(() => {
    const activeBk = onlineBookings.find(b => String(b.id) === String(selectedBookingId));
    if (!activeBk || !rescheduleDate || !showInlineReschedule) return;
    const fetchAvailableRescheduleSlots = async () => {
      setIsLoadingRescheduleSlots(true);
      try {
        const serviceQuery = activeBk.service ? `&service_id=${activeBk.service}` : "";
        const data = await apiFetch(`/api/public/branches/${branchId}/slots/?date=${rescheduleDate}${serviceQuery}`);
        setRescheduleSlots(Array.isArray(data) ? data : data?.slots || []);
      } catch (err) {
        console.error(err);
        setRescheduleSlots([]);
      } finally {
        setIsLoadingRescheduleSlots(false);
      }
    };
    fetchAvailableRescheduleSlots();
  }, [selectedBookingId, rescheduleDate, showInlineReschedule, branchId, onlineBookings]);

  // Desk Session Lock State
  const [deskSessionError, setDeskSessionError] = useState<string | null>(null);
  const [isDeskLocking, setIsDeskLocking] = useState(false);

  useEffect(() => {
    if (view !== "desk") {
      setDeskSessionError(null);
      return;
    }

    const currentStaffUser = state.staff.find((st) => st.email.toLowerCase() === (session?.email || "").toLowerCase());
    const resolvedDeskId = currentStaffUser?.deskId || deskId;
    const desk = desks.find((d) => String(d.id) === String(resolvedDeskId)) ?? desks[0];

    if (!desk) return;

    let isMounted = true;

    const claimDeskSession = async () => {
      setIsDeskLocking(true);
      setDeskSessionError(null);

      // 1. Local state check: Is desk currently occupied by another operator?
      if (desk.currentOperatorId && currentStaffUser && String(desk.currentOperatorId) !== String(currentStaffUser.id)) {
        const currentOpStaff = state.staff.find((st) => String(st.id) === String(desk.currentOperatorId));
        const occupantName = currentOpStaff ? currentOpStaff.name : (desk.currentOperatorEmail || "another operator");
        if (isMounted) {
          setDeskSessionError(`Desk "${desk.label}" is currently active and logged in by ${occupantName}. Only one operator can log into this desk at a time.`);
          setIsDeskLocking(false);
        }
        return;
      }

      // 2. Remote backend claim check (preserve break status if currently on break)
      try {
        const activeAtt = await apiFetch(`/api/operator/attendance/active/?branch=${branchId}`).catch(() => null);
        const isOnBreak = activeAtt && activeAtt.active && activeAtt.attendance && activeAtt.attendance.status === "on_break";

        const targetStatus = isOnBreak || desk.status === "break" ? "break" : "open";
        await actions.setDeskStatus(desk.id, targetStatus);
        if (isMounted) setDeskSessionError(null);
      } catch (err: any) {
        console.error("Desk claim error:", err);
        let errorMsg = err.message || "Desk access denied.";
        if (errorMsg.includes("already in use")) {
          const latestDesks = await apiFetch("/api/desks/").catch(() => []);
          const activeDesk = latestDesks.find((d: any) => String(d.id) === String(desk.id));
          const occupantName = activeDesk?.staff_name || activeDesk?.current_operator_email || "another operator";
          errorMsg = `Desk "${desk.label}" is currently active and logged in by ${occupantName}. Only one operator can log into this desk at a time.`;
        }
        if (isMounted) setDeskSessionError(errorMsg);
      } finally {
        if (isMounted) setIsDeskLocking(false);
      }
    };

    claimDeskSession();

    return () => {
      isMounted = false;
      // Release desk on unmount / navigation (do NOT set offline if currently on break)
      apiFetch(`/api/operator/attendance/active/?branch=${branchId}`).then((activeAtt) => {
        const isOnBreak = activeAtt && activeAtt.active && activeAtt.attendance && activeAtt.attendance.status === "on_break";
        if (!isOnBreak && desk && desk.status !== "break") {
          actions.setDeskStatus(desk.id, "offline").catch(() => {});
        }
      }).catch(() => {});
    };
  }, [view, branchId, deskId]);

  if (!branch) return <p className="text-muted-foreground">No branch selected.</p>;

  if (view === "queries") {
    return <QueryHistoryView branchId={branchId} branch={branch} company={company} state={state} />;
  }

  if (view === "desk") {
    const currentStaffUser = state.staff.find((st) => st.email.toLowerCase() === (session?.email || "").toLowerCase());
    const userAssignedServices = currentStaffUser
      ? state.userServices.filter((us) => String(us.userId) === String(currentStaffUser.id)).map((us) => String(us.serviceId))
      : [];

    const resolvedDeskId = currentStaffUser?.deskId || deskId;
    const desk = desks.find((d) => String(d.id) === String(resolvedDeskId)) ?? desks[0];
    if (!desk) return <p className="text-muted-foreground">No desk assigned.</p>;

    if (isDeskLocking && !deskSessionError) {
      return (
        <div className="panel p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verifying Desk Access & Session...</p>
        </div>
      );
    }

    if (deskSessionError) {
      return (
        <div className="panel p-8 text-center space-y-5 border-rose-500/30 bg-rose-500/5 max-w-lg mx-auto my-12 rounded-3xl shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/30 font-bold text-2xl shadow-inner">
            🔒
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-xl font-extrabold text-foreground">Desk Session Locked</h3>
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              {deskSessionError}
            </p>
          </div>
          <div className="pt-3 border-t border-border/40 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeskSessionError(null);
                window.location.reload();
              }}
              className="font-bold text-xs"
            >
              🔄 Refresh & Retry Login
            </Button>
          </div>
        </div>
      );
    }

    const deskServices = state.deskServices
      .filter((ds) => String(ds.deskId) === String(desk.id))
      .map((ds) => String(ds.serviceId));

    // Calculate allowed services for queue filtering:
    // 1. If desk has specific DeskServices, and staff has UserServices -> Intersection
    // 2. If desk has no DeskServices yet -> Use staff's UserServices
    // 3. If staff has no UserServices (or viewing as admin) -> Use desk's DeskServices or all branch services
    let allowedServiceIds: string[] = [];
    if (userAssignedServices.length > 0) {
      if (deskServices.length > 0) {
        allowedServiceIds = deskServices.filter((sId) => userAssignedServices.includes(sId));
        if (allowedServiceIds.length === 0) {
          allowedServiceIds = userAssignedServices;
        }
      } else {
        allowedServiceIds = userAssignedServices;
      }
    } else if (deskServices.length > 0) {
      allowedServiceIds = deskServices;
    } else {
      allowedServiceIds = state.services.filter((s) => String(s.branchId) === String(branchId)).map((s) => String(s.id));
    }

    const current = tickets.find(
      (t) => String(t.deskId) === String(desk.id) && (t.status === "serving" || t.status === "called"),
    );

    const queue = waiting
      .filter((t) => {
        if (t.deskId) {
          return String(t.deskId) === String(desk.id);
        }
        if (t.predictedDeskId) {
          return String(t.predictedDeskId) === String(desk.id);
        }
        if (branch.method === 1) return true;
        if (allowedServiceIds.length === 0) return true;
        return allowedServiceIds.includes(String(t.serviceId));
      })
      .sort((a, b) => a.joinedAt - b.joinedAt);

    const noService = isNoServiceMode(branch.companyId, state.companyAllocations);
    if (!noService && branch.method >= 2 && currentStaffUser && userAssignedServices.length === 0) {
      return (
        <div className="panel p-8 text-center space-y-3 border-amber-500/30 bg-amber-500/5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 font-bold text-xl">
            ⚠️
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">Service Assignment Required</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You haven't been assigned to any service yet — contact your branch admin.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <OperatorAttendanceControlBar
          branchId={branchId}
          deskId={desk.id}
          onStatusChange={(att: any) => {
            setIsCheckedIn(!!att && att.status !== "checked_out");
          }}
        />

        {!isCheckedIn ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel relative overflow-hidden p-8 md:p-12 text-center space-y-6 border border-border/80 bg-card shadow-sm"
          >
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand via-violet-500 to-indigo-600" />

            <div className="max-w-xl mx-auto space-y-6">
              {/* Icon Badge */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-8 ring-brand/5">
                <ShieldCheck className="h-8 w-8 text-brand" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Shift Check-In Required
                  </span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  Check In to Begin Operator Shift
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
                  Desk controls, visitor calling, queue management, and resolution tools are locked until you check in to your shift.
                </p>
              </div>

              {/* Information Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background border border-border/70 text-brand">
                    <MonitorPlay className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Desk</div>
                    <div className="font-bold text-foreground truncate">{desk.label}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background border border-border/70 text-brand">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Logged Operator</div>
                    <div className="font-bold text-foreground truncate">{session?.email || "Operator Staff"}</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  size="lg"
                  variant="brand"
                  disabled={isCheckingInLoading}
                  onClick={async () => {
                    setIsCheckingInLoading(true);
                    try {
                      const data = await apiFetch("/api/operator/attendance/check-in/", {
                        method: "POST",
                        body: JSON.stringify({ branch_id: branchId, desk_id: desk.id })
                      });
                      toast.success("Checked in to shift successfully!");
                      setIsCheckedIn(true);
                      if (desk.id) {
                        actions.setDeskStatus(desk.id, "open").catch(() => {});
                      }
                      await refresh();
                    } catch (err: any) {
                      toast.error(err.message || "Failed to check in");
                    } finally {
                      setIsCheckingInLoading(false);
                    }
                  }}
                  className="h-12 px-8 text-sm font-bold rounded-xl shadow-lg shadow-brand/20 gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  {isCheckingInLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" /> Check In to Start Shift
                    </>
                  )}
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground pt-1">
                🔒 Shift attendance logs are recorded in real-time for compliance &amp; performance metrics.
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <ServingCustomerDeskPanel
          desk={desk}
          current={current}
          queue={queue}
          actions={actions}
          setIsTransferModalOpen={setIsTransferModalOpen}
          refresh={refresh}
        />

        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your queue
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">{queue.length} waiting</span>
            </div>

            {/* Authenticated Staff Manual Ticket Issue Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setManualName("");
                setManualPhone("");
                setManualServiceId(allowedServiceIds[0] || "");
                setIsManualModalOpen(true);
              }}
              className="h-8 text-xs font-semibold border-brand/40 text-brand hover:bg-brand/10"
            >
              + Manual Walk-in Ticket
            </Button>
          </div>
          <div className="mt-4 grid gap-2">
            <AnimatePresence initial={false}>
              {queue.slice(0, 10).map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between gap-3 rounded-xl bg-accent/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-display text-lg font-bold tabular-nums">{t.number}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.customerName} · {state.services.find((s) => s.id === t.serviceId)?.name}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {Math.max(1, Math.round((Date.now() - t.joinedAt) / 60000))}m
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {queue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Queue is clear.</p>
            ) : null}
          </div>
        </div>

        {/* Customer Query Status & Live Replies Card */}
        <div className="panel p-5 space-y-4 col-span-1 sm:col-span-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Customer Query Status &amp; Live Replies
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Real-time email status notifications &amp; customer feedback replies for resolved and escalated tickets.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Live Auto-Email Active
              </span>
              <a
                href={`/${companySlug}/branches/${branchSlug}/queries`}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
              >
                View History &rarr;
              </a>
            </div>
          </div>

          <div className="space-y-3">
            {(() => {
              const getTicketSortVal = (t: any): number => {
                const val = t.feedback_submitted_at || t.served_at || t.servedAt || t.called_at || t.calledAt || t.created_at || t.createdAt || t.joinedAt;
                if (val) {
                  const num = typeof val === "number" ? val : new Date(val).getTime();
                  if (!isNaN(num) && num > 0) return num;
                }
                const numericId = Number(t.id);
                if (!isNaN(numericId) && numericId > 0) return numericId;
                const tokenStr = t.token_number || t.number || "";
                const digits = tokenStr.replace(/\D/g, "");
                if (digits) {
                  const p = parseInt(digits, 10);
                  if (!isNaN(p)) return p;
                }
                return 0;
              };

              const handledTickets = state.tickets.filter(
                (t) => String(t.branchId) === String(branch.id) && (t.status === "served" || t.status === "hold" || (t as any).feedback_text)
              ).sort((a: any, b: any) => getTicketSortVal(b) - getTicketSortVal(a));

              if (handledTickets.length === 0) {
                return (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No resolved or escalated tickets yet today. When you click <strong className="text-emerald-600">Resolved</strong> or <strong className="text-amber-600">Escalated</strong>, email status updates &amp; customer replies will appear here live.
                  </div>
                );
              }

              return handledTickets.slice(0, 10).map((t: any) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-border/60 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-primary">{t.token_number || t.number}</span>
                      <span className="font-bold text-xs text-foreground">{t.customer_name || t.customerName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {t.status === "served" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <AlertTriangle className="h-3 w-3" /> Escalated
                        </span>
                      )}

                      {t.feedback_rating && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {t.feedback_rating}/5
                        </span>
                      )}
                    </div>
                  </div>

                  {t.feedback_text ? (
                    <div className="bg-white dark:bg-slate-900 border border-primary/20 rounded-xl p-3 text-xs text-foreground space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        <span>💬 Customer Reply Message</span>
                        {t.feedback_submitted_at && <span>{new Date(t.feedback_submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                      <p className="italic font-medium text-slate-800 dark:text-slate-200">"{t.feedback_text}"</p>
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic flex items-center justify-between">
                      <span>Status email sent to customer ({t.customer_email || "rutaahir855@gmail.com"}). Awaiting rating/reply...</span>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Modal: Manual Walk-in Ticket Issue (Desk Operator Authenticated) */}
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="panel w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-brand" />
                  <h3 className="font-bold text-base">Issue Manual Walk-in Ticket</h3>
                </div>
                <button onClick={() => setIsManualModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                  ✕
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsIssuing(true);
                  try {
                    const ticket = await actions.issueManualTicket({
                      branchId: branch.id,
                      name: manualName.trim() || "Walk-in Visitor",
                      phone: manualPhone.trim() || "Walk-in",
                      serviceId: manualServiceId || allowedServiceIds[0] || "",
                      deskId: desk.id
                    });
                    toast.success(`Token ${ticket.token_number || "created"} issued for ${manualName.trim() || "Walk-in"}!`);
                    setIsManualModalOpen(false);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to issue manual ticket.");
                  } finally {
                    setIsIssuing(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Visitor Name
                  </Label>
                  <Input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Ramesh Patel (or leave blank)"
                    className="mt-1 h-10 rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact Phone (Optional)
                  </Label>
                  <Input
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="mt-1 h-10 rounded-xl"
                  />
                </div>

                {allowedServiceIds.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Service Category *
                    </Label>
                    <select
                      value={manualServiceId}
                      onChange={(e) => setManualServiceId(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-input bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {state.services
                        .filter((s) => s.branchId === branch.id && allowedServiceIds.includes(s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Prefix: {s.prefix})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="brand" disabled={isIssuing}>
                    {isIssuing ? "Issuing..." : "Issue Ticket"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Transfer Ticket to Another Counter Desk */}
        {isTransferModalOpen && current && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="panel w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand font-bold">
                    <ArrowRightLeft className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      Transfer Ticket {current.number}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Re-route visitor <span className="font-bold text-foreground">{current.customerName}</span> to another counter desk
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs rounded-xl bg-accent/30 p-3 border border-border">
                  <span className="text-muted-foreground font-medium">Current Location:</span>
                  <span className="font-bold text-foreground">{desk.label}</span>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Target Counter Desk
                  </Label>
                  <div className="mt-2 grid gap-2 max-h-60 overflow-y-auto pr-1">
                    {desks
                      .filter((d) => String(d.id) !== String(desk.id))
                      .map((targetDesk) => {
                        const targetDeskServices = state.deskServices
                          .filter((ds) => String(ds.deskId) === String(targetDesk.id))
                          .map((ds) => {
                            const svc = state.services.find((s) => String(s.id) === String(ds.serviceId));
                            return svc ? svc.name : null;
                          })
                          .filter(Boolean);

                        return (
                          <div
                            key={targetDesk.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background p-3 hover:border-brand/50 hover:bg-brand/5 transition-all shadow-sm"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <MonitorPlay className="h-4 w-4 text-brand shrink-0" />
                                <span className="font-bold text-sm text-foreground">{targetDesk.label}</span>
                                <span className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                  (targetDesk.isActive ?? true) ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                                )}>
                                  {(targetDesk.isActive ?? true) ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {targetDeskServices.map((name, idx) => (
                                  <span key={idx} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                                    {name}
                                  </span>
                                ))}
                                {targetDeskServices.length === 0 && (
                                  <span className="text-[10px] text-muted-foreground italic">All services</span>
                                )}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="brand"
                              disabled={isTransferring}
                              onClick={async () => {
                                setIsTransferring(true);
                                try {
                                  await actions.transferTicket(current.id, targetDesk.id);
                                  toast.success(`Transferred Ticket ${current.number} (${current.customerName}) to ${targetDesk.label}!`);
                                  setIsTransferModalOpen(false);
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to transfer ticket");
                                } finally {
                                  setIsTransferring(false);
                                }
                              }}
                              className="shrink-0 text-xs font-semibold"
                            >
                              Transfer Here →
                            </Button>
                          </div>
                        );
                      })}

                    {desks.filter((d) => String(d.id) !== String(desk.id)).length === 0 && (
                      <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-1">
                        <p className="font-bold text-foreground">No other counter desks created in this branch.</p>
                        <p>Create additional operator desks in Branch Operations Setup to enable ticket transfers.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
        )}
      </div>
    );
  }

  if (view === "appointments") {

    // Stats calculation
    const confirmedCount = onlineBookings.filter(b => b.status === "confirmed").length;
    const checkedInCount = onlineBookings.filter(b => b.status === "checked_in").length;
    const completedCount = onlineBookings.filter(b => b.status === "completed").length;

    // Date Strings for filtering
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

    // Filter by Date
    const dateFilteredBookings = onlineBookings.filter((b) => {
      if (bookingDateFilter === "today") {
        return b.date === todayStr;
      } else if (bookingDateFilter === "tomorrow") {
        return b.date === tomorrowStr;
      } else if (bookingDateFilter === "specific" && specificDateValue) {
        return b.date === specificDateValue;
      }
      return true;
    });

    // Filter by Search & Status
    const filteredBookings = dateFilteredBookings.filter(b => {
      const ref = (b.booking_reference || "").toLowerCase();
      const name = (b.customer_name || "").toLowerCase();
      const phone = (b.customer_phone || "").toLowerCase();
      const query = bookingSearchQuery.toLowerCase();
      const matchesSearch = !query || ref.includes(query) || name.includes(query) || phone.includes(query);

      let matchesStatus = true;
      if (bookingStatusFilter === "confirmed") {
        matchesStatus = b.status === "confirmed";
      } else if (bookingStatusFilter === "checked_in") {
        matchesStatus = b.status === "checked_in";
      } else if (bookingStatusFilter === "escalated") {
        matchesStatus = ["escalated", "hold"].includes(b.status);
      } else if (bookingStatusFilter === "completed") {
        matchesStatus = b.status === "completed";
      } else if (bookingStatusFilter === "no_show_or_cancelled") {
        matchesStatus = ["no_show", "cancelled"].includes(b.status);
      }
      
      return matchesSearch && matchesStatus;
    });

    // Chronological Sorting by Date (Ascending) and Slot Time (Ascending)
    const sortedBookings = [...filteredBookings].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const slotA = a.slot_time || "00:00";
      const slotB = b.slot_time || "00:00";
      return slotA.localeCompare(slotB);
    });

    const activeBooking = selectedBookingId ? onlineBookings.find(b => String(b.id) === String(selectedBookingId)) || null : null;

    const handleCheckInBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "checked_in" })
        });
        toast.success(`Booking ${booking.booking_reference} check-in successful!`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to check-in booking.");
      }
    };

    const handleCompleteBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "completed" })
        });
        toast.success(`Booking ${booking.booking_reference} marked as completed.`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to complete booking.");
      }
    };

    const handleEscalateBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "escalated" })
        });
        toast.warning(`Booking ${booking.booking_reference} marked as escalated.`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to escalate booking.");
      }
    };

    const handleNoShowBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "no_show" })
        });
        toast.success(`Booking ${booking.booking_reference} marked as no-show.`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to update booking status.");
      }
    };

    const handleCancelBooking = async (booking: any) => {
      try {
        await apiFetch(`/api/online-bookings/${booking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" })
        });
        toast.success(`Booking ${booking.booking_reference} cancelled successfully.`);
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to cancel booking.");
      }
    };

    const handleSaveInlineReschedule = async () => {
      if (!rescheduleSlot || !activeBooking) {
        toast.error("Please select a valid time slot.");
        return;
      }
      setIsSavingReschedule(true);
      try {
        await apiFetch(`/api/online-bookings/${activeBooking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({
            date: rescheduleDate,
            slot_time: rescheduleSlot
          })
         });
         toast.success("Appointment rescheduled successfully!");
         setShowInlineReschedule(false);
         fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to reschedule booking.");
      } finally {
        setIsSavingReschedule(false);
      }
    };

    const handleSaveStaffNote = async () => {
      if (!staffNoteText.trim() || !activeBooking) return;
      try {
        const existingNotes = activeBooking.internal_notes ? `${activeBooking.internal_notes} | ${staffNoteText.trim()}` : staffNoteText.trim();
        await apiFetch(`/api/online-bookings/${activeBooking.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ internal_notes: existingNotes })
        });
        toast.success("Staff note saved successfully!");
        setStaffNoteText("");
        fetchOnlineBookings();
      } catch (err: any) {
        toast.error(err.message || "Failed to save staff note.");
      }
    };

    const handlePrintPass = (booking: any) => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups in your browser to print receipt.");
        return;
      }
      const companyName = company?.name || "Quesoles";
      const serviceName = state.services.find(s => String(s.id) === String(booking.service))?.name || "General Service";
      const networkOrigin = getNetworkOrigin();
      const trackingUrl = `${networkOrigin}/t/${booking.booking_reference}`;
      const qrData = encodeURIComponent(trackingUrl);

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Appointment Receipt - ${booking.booking_reference}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; -webkit-print-color-adjust: exact; }
              .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
              .bar { background: linear-gradient(90deg, #4f46e5, #06b6d4); height: 6px; }
              .head { padding: 20px; border-bottom: 1px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
              .ref { font-size: 22px; font-weight: 800; color: #4f46e5; }
              .body { padding: 20px; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
              .lbl { color: #64748b; font-weight: 600; }
              .val { font-weight: 700; color: #0f172a; }
              .qr { text-align: center; margin-top: 20px; padding: 16px; background: #faf5ff; border-radius: 12px; border: 1px border #e9d5ff; }
              .footer { text-align: center; padding: 14px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="bar"></div>
              <div class="head">
                <div>
                  <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${companyName}</div>
                  <div style="font-size: 11px; color: #64748b; font-weight: 600;">Official Appointment Pass</div>
                </div>
                <div class="ref">${booking.booking_reference}</div>
              </div>
              <div class="body">
                <div class="row"><span class="lbl">Customer Name</span><span class="val">${booking.customer_name}</span></div>
                <div class="row"><span class="lbl">Contact Phone</span><span class="val">${booking.customer_phone || 'N/A'}</span></div>
                <div class="row"><span class="lbl">Service</span><span class="val">${serviceName}</span></div>
                <div class="row"><span class="lbl">Scheduled Date</span><span class="val">${booking.date}</span></div>
                <div class="row"><span class="lbl">Scheduled Slot</span><span class="val">${booking.slot_time ? booking.slot_time.substring(0, 5) : '09:00'}</span></div>
                <div class="row"><span class="lbl">Booking Status</span><span class="val" style="text-transform: uppercase;">${booking.status}</span></div>

                <div class="qr">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}" style="width: 130px; height: 130px; margin: 0 auto; display: block; border-radius: 8px;" />
                  <div style="font-size: 10px; color: #6b21a8; font-weight: 800; margin-top: 8px;">SCAN TO TRACK LIVE STATUS</div>
                </div>
              </div>
              <div class="footer">Powered by Quesoles Digital Queueing</div>
            </div>
            <script>window.onload = function() { window.print(); };</script>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    };

    const STATUS_BADGES: Record<string, React.ReactNode> = {
      confirmed: <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 border border-amber-500/30">Confirmed</span>,
      checked_in: <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">Checked In</span>,
      escalated: <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/15 text-purple-600 border border-purple-500/30">Escalated</span>,
      hold: <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/15 text-purple-600 border border-purple-500/30">Escalated</span>,
      completed: <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-600 border border-blue-500/30">Completed</span>,
      no_show: <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 border border-rose-500/30">No Show</span>,
      cancelled: <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-500/15 text-gray-600 border border-gray-500/30">Cancelled</span>,
    };

    return (
      <div className="space-y-5">
        {/* KPI stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="panel p-4 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Confirmed</span>
            <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{confirmedCount}</div>
          </div>
          <div className="panel p-4 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Checked-In Waiting</span>
            <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{checkedInCount}</div>
          </div>
          <div className="panel p-4 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">Served Successfully</span>
            <div className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{completedCount}</div>
          </div>
          <div className="panel p-4 border border-border/80 bg-accent/10">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Total Bookings</span>
            <div className="mt-1 text-2xl font-black text-foreground">{onlineBookings.length}</div>
          </div>
        </div>

        {/* Upper Line Master Filter Bar (Date + Search + Status Filters) */}
        <div className="panel p-4 space-y-3 bg-card border border-border/80 shadow-xs">
          {/* Row 1: Date Quick Filters + Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Date Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-brand" /> Date:
              </span>
              {[
                { id: "all", label: "All Dates" },
                { id: "today", label: `Today (${todayStr})` },
                { id: "tomorrow", label: "Tomorrow" },
                { id: "specific", label: "Specific Date" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setBookingDateFilter(tab.id);
                    if (tab.id === "specific" && !specificDateValue) {
                      setSpecificDateValue(todayStr ?? "");
                    }
                  }}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all border",
                    bookingDateFilter === tab.id
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:border-brand/40"
                  )}
                >
                  {tab.label}
                </button>
              ))}

              {bookingDateFilter === "specific" && (
                <input
                  type="date"
                  value={specificDateValue}
                  onChange={(e) => setSpecificDateValue(e.target.value)}
                  className="rounded-xl border border-brand/50 bg-background px-3 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                />
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={bookingSearchQuery}
                onChange={(e) => setBookingSearchQuery(e.target.value)}
                placeholder="Search name, phone, ref ID..."
                className="pl-9 text-xs rounded-xl h-9 bg-background"
              />
            </div>
          </div>

          {/* Row 2: Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 border-t border-border/50 pt-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mr-2">Status:</span>
            {[
              { id: "all", label: "All Statuses" },
              { id: "confirmed", label: "Confirmed" },
              { id: "checked_in", label: "Checked In" },
              { id: "escalated", label: "Escalated" },
              { id: "completed", label: "Completed" },
              { id: "no_show_or_cancelled", label: "No-Show / Cancel" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setBookingStatusFilter(tab.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all",
                  bookingStatusFilter === tab.id
                    ? "bg-brand/15 text-brand border border-brand/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Display Mode: Full Page Grid (when selectedBookingId === null) vs Split Screen Workbench (when selectedBookingId !== null) */}
        {!selectedBookingId ? (
          /* MODE A: FULL-PAGE ALL CUSTOMERS OVERVIEW GRID (100% Page Width) */
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Showing {sortedBookings.length} Customer Appointments (Sorted Chronologically by Date &amp; Time)
              </span>
            </div>

            {isLoadingBookings ? (
              <div className="py-16 text-center text-xs text-muted-foreground animate-pulse bg-card border border-dashed rounded-3xl">Loading customer appointments...</div>
            ) : sortedBookings.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground bg-card border border-dashed rounded-3xl p-6">
                No customer appointments found matching your date or status filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {sortedBookings.map((b) => {
                  const svcName = state.services.find(s => String(s.id) === String(b.service))?.name || "General Service";
                  return (
                    <div
                      key={b.id}
                      className="panel p-4 border border-border/80 hover:border-brand/50 transition-all rounded-3xl shadow-xs flex flex-col justify-between bg-card group"
                    >
                      <div className="space-y-3">
                        {/* Header: Photo + Name + Ref + Status */}
                        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {b.customer_photo ? (
                              <img src={b.customer_photo} alt={b.customer_name} className="h-12 w-12 rounded-full object-cover border-2 border-brand/30 shrink-0 shadow-xs" />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-brand/15 text-brand font-black text-sm flex items-center justify-center shrink-0 border border-brand/20 shadow-xs">
                                {(b.customer_name || "C").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-sm text-foreground truncate group-hover:text-brand transition-colors">{b.customer_name}</h4>
                              <span className="font-mono text-[10px] font-black text-brand bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20 inline-block mt-0.5">
                                {b.booking_reference}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {STATUS_BADGES[b.status] || <span className="text-[10px] font-bold">{b.status}</span>}
                          </div>
                        </div>

                        {/* Customer Details */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-muted-foreground font-medium">
                            <span>Service:</span>
                            <strong className="text-foreground font-extrabold">{svcName}</strong>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground font-medium">
                            <span>Date &amp; Time:</span>
                            <strong className="text-brand font-extrabold flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {b.date} at {b.slot_time?.substring(0, 5)}
                            </strong>
                          </div>
                          {b.customer_phone && (
                            <div className="flex items-center justify-between text-muted-foreground font-medium">
                              <span>Phone:</span>
                              <strong className="text-foreground font-bold">{b.customer_phone}</strong>
                            </div>
                          )}
                          {b.notes && (
                            <div className="text-[11px] italic text-muted-foreground bg-accent/10 p-2 rounded-xl border border-border/50 truncate">
                              "{b.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-1.5 mt-3">
                        <div className="flex items-center gap-1">
                          {b.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="brand"
                              className="h-8 text-[11px] font-extrabold rounded-xl px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckInBooking(b);
                              }}
                            >
                              ⚡ Check-In
                            </Button>
                          )}
                          {["checked_in", "serving", "escalated"].includes(b.status) && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-[11px] font-extrabold rounded-xl px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteBooking(b);
                              }}
                            >
                              ✅ Complete
                            </Button>
                          )}
                          {["confirmed", "checked_in"].includes(b.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[11px] font-bold rounded-xl px-2.5 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEscalateBooking(b);
                              }}
                            >
                              🚨 Escalate
                            </Button>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] font-extrabold rounded-xl px-3 border-brand/40 text-brand hover:bg-brand/10"
                          onClick={() => {
                            setSelectedBookingId(b.id);
                            setShowInlineReschedule(false);
                          }}
                        >
                          Details →
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* MODE B: SPLIT-SCREEN WORKBENCH VIEW (Left 5 Cols Stream + Right 7 Cols Detail Workbench) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Left Stream (5/12) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border/80">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-extrabold rounded-xl border-brand/40 text-brand hover:bg-brand/10 gap-1"
                  onClick={() => setSelectedBookingId(null)}
                >
                  ← Back to Full Grid
                </Button>
                <span className="text-[11px] font-bold text-muted-foreground">{sortedBookings.length} Customers</span>
              </div>

              {/* Customer List Stream */}
              <div className="space-y-2 max-h-[660px] overflow-y-auto pr-1">
                {sortedBookings.map((b) => {
                  const isSelected = activeBooking?.id === b.id;
                  const svcName = state.services.find(s => String(s.id) === String(b.service))?.name || "General Service";
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBookingId(b.id);
                        setShowInlineReschedule(false);
                      }}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                        isSelected 
                          ? "bg-brand/10 border-brand ring-2 ring-brand/30 shadow-xs" 
                          : "bg-card border-border/70 hover:border-brand/40 hover:bg-accent/10"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {b.customer_photo ? (
                          <img src={b.customer_photo} alt={b.customer_name} className="h-11 w-11 rounded-full object-cover border-2 border-brand/30 shrink-0" />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-brand/15 text-brand font-black text-sm flex items-center justify-center shrink-0 border border-brand/20">
                            {(b.customer_name || "C").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-foreground truncate group-hover:text-brand transition-colors">{b.customer_name}</span>
                            <span className="font-mono text-[10px] font-extrabold text-brand bg-brand/10 px-1.5 py-0.5 rounded-md shrink-0 border border-brand/20">
                              {b.booking_reference}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                            {svcName} · {b.customer_phone}
                          </div>
                          <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-brand" /> {b.date} at {b.slot_time?.substring(0, 5)}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {STATUS_BADGES[b.status] || <span className="text-[10px] font-bold">{b.status}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Workbench Detail Box (7/12) */}
            <div className="lg:col-span-7">
              {activeBooking ? (
                <div className="panel p-0 border border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
                  
                  {/* Glassmorphic Header Banner */}
                  <div className="bg-gradient-to-br from-brand/10 via-accent/30 to-brand/5 border-b border-border/70 p-5 backdrop-blur-sm relative">
                    <button
                      onClick={() => setSelectedBookingId(null)}
                      className="absolute top-4 right-4 text-xs font-bold text-muted-foreground hover:text-foreground bg-background/80 px-2 py-1 rounded-lg border border-border/60"
                    >
                      ✕ Close Workbench
                    </button>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      {activeBooking.customer_photo ? (
                        <img
                          src={activeBooking.customer_photo}
                          alt={activeBooking.customer_name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-brand/40 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-brand/15 text-brand border-2 border-brand/30 flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                          {(activeBooking.customer_name || "C").charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 text-center sm:text-left space-y-1 min-w-0 pr-12 sm:pr-0">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <h3 className="text-xl font-extrabold text-foreground tracking-tight">{activeBooking.customer_name}</h3>
                          <span className="bg-brand/15 text-brand border border-brand/30 px-2.5 py-0.5 rounded-xl text-xs font-mono font-black">
                            {activeBooking.booking_reference}
                          </span>
                          {STATUS_BADGES[activeBooking.status]}
                        </div>

                        <div className="text-xs text-muted-foreground font-medium flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 pt-1">
                          {activeBooking.customer_phone && (
                            <a href={`tel:${activeBooking.customer_phone}`} className="flex items-center gap-1 bg-background/80 hover:bg-background px-2.5 py-1 rounded-lg border border-border/60 transition-colors">
                              <Phone className="h-3 w-3 text-brand" /> {activeBooking.customer_phone}
                            </a>
                          )}
                          {activeBooking.customer_email && !activeBooking.customer_email.startsWith("bookings+anon_") && (
                            <a href={`mailto:${activeBooking.customer_email}`} className="flex items-center gap-1 bg-background/80 hover:bg-background px-2.5 py-1 rounded-lg border border-border/60 transition-colors">
                              <Mail className="h-3 w-3 text-brand" /> {activeBooking.customer_email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* All-in-One Action Toolbar (STRICT CONDITION: Check-In FIRST, Complete ONLY AFTER Check-In!) */}
                  <div className="p-4 bg-accent/10 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Check-In Button: ONLY when status is "confirmed" */}
                      {activeBooking.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="brand"
                          className="rounded-xl text-xs font-extrabold gap-1.5 h-9 px-4 shadow-xs"
                          onClick={() => handleCheckInBooking(activeBooking)}
                        >
                          <CheckCircle2 className="h-4 w-4" /> ⚡ Check-In / Call
                        </Button>
                      )}

                      {/* Complete & Request Feedback: ONLY AFTER Check-In! (checked_in, serving, or escalated) */}
                      {["checked_in", "serving", "escalated"].includes(activeBooking.status) && (
                        <Button
                          size="sm"
                          variant="default"
                          className="rounded-xl text-xs font-extrabold gap-1.5 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          onClick={() => handleCompleteBooking(activeBooking)}
                        >
                          <ShieldCheck className="h-4 w-4" /> ✅ Complete &amp; Request Feedback
                        </Button>
                      )}

                      {/* Escalated Button */}
                      {["confirmed", "checked_in"].includes(activeBooking.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs font-bold gap-1.5 h-9 px-3 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                          onClick={() => handleEscalateBooking(activeBooking)}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-purple-600" /> Escalate
                        </Button>
                      )}

                      {/* Reschedule Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-bold gap-1.5 h-9 px-3 border-brand/30 text-brand hover:bg-brand/10"
                        onClick={() => {
                          setShowInlineReschedule(!showInlineReschedule);
                          setRescheduleDate(activeBooking.date);
                          setRescheduleSlot(activeBooking.slot_time ? activeBooking.slot_time.substring(0, 5) : "10:00");
                        }}
                      >
                        <RotateCw className="h-3.5 w-3.5" /> {showInlineReschedule ? "Close Reschedule" : "Reschedule"}
                      </Button>

                      {/* Print Pass Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-bold gap-1.5 h-9 px-3"
                        onClick={() => handlePrintPass(activeBooking)}
                      >
                        <Printer className="h-3.5 w-3.5 text-foreground/70" /> Print Pass
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {["confirmed", "checked_in", "escalated"].includes(activeBooking.status) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 h-9 px-3"
                            onClick={() => handleNoShowBooking(activeBooking)}
                          >
                            No-Show
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-bold text-gray-600 border-gray-500/30 hover:bg-gray-500/10 h-9 px-3"
                            onClick={() => handleCancelBooking(activeBooking)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline Reschedule Panel (Real-Time Slot Availability) */}
                  {showInlineReschedule && (
                    <div className="p-4 bg-brand/5 border-b border-brand/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-brand flex items-center gap-1.5">
                          <RotateCw className="h-3.5 w-3.5" /> Real-Time Rescheduler &amp; Slot Availability
                        </span>
                        <button onClick={() => setShowInlineReschedule(false)} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                          ✕ Close
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">1. Select New Date</Label>
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">2. Select Real-Time Time Slot</Label>
                          {isLoadingRescheduleSlots ? (
                            <div className="py-3 text-center text-xs text-muted-foreground animate-pulse font-medium">Checking live slot availability...</div>
                          ) : rescheduleSlots.length === 0 ? (
                            <div className="py-3 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-2 bg-background/50">
                              No slots available on this date.
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5 mt-1 max-h-[140px] overflow-y-auto p-1 border rounded-xl bg-background">
                              {rescheduleSlots.map((slot: any) => {
                                const isBooked = slot.status === "fully_booked" || slot.available_spots === 0;
                                const isSelected = rescheduleSlot === slot.time;
                                return (
                                  <button
                                    key={slot.time}
                                    type="button"
                                    disabled={isBooked}
                                    onClick={() => setRescheduleSlot(slot.time)}
                                    className={cn(
                                      "rounded-lg border px-2 py-1.5 text-center text-[10px] font-extrabold transition-all flex flex-col items-center justify-center",
                                      isBooked
                                        ? "border-coral/10 bg-coral/5 text-coral/60 opacity-50 cursor-not-allowed"
                                        : isSelected
                                        ? "bg-brand text-white border-brand font-black shadow-xs"
                                        : "border-border/80 text-foreground bg-accent/5 hover:border-brand/40"
                                    )}
                                  >
                                    <span>{slot.time}</span>
                                    {slot.available_spots !== undefined && (
                                      <span className="text-[8px] font-semibold opacity-80">{slot.available_spots} left</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-brand/10">
                        <Button size="sm" variant="brand" disabled={isSavingReschedule || !rescheduleSlot} onClick={handleSaveInlineReschedule} className="text-xs h-8 px-4 font-extrabold rounded-xl">
                          {isSavingReschedule ? "Saving..." : "Confirm Inline Reschedule"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Workbench Main Details Section */}
                  <div className="p-5 space-y-4 max-h-[540px] overflow-y-auto">
                    {/* Grid Key Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-accent/10 border border-border/70">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-brand" /> Service Category
                        </div>
                        <div className="text-xs font-extrabold text-foreground mt-1">
                          {state.services.find(s => String(s.id) === String(activeBooking.service))?.name || "General Service"}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-accent/10 border border-border/70">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-brand" /> Scheduled Date &amp; Time
                        </div>
                        <div className="text-xs font-extrabold text-foreground mt-1">
                          {activeBooking.date} at {activeBooking.slot_time?.substring(0, 5)}
                        </div>
                      </div>
                    </div>

                    {/* Customer Booking Notes */}
                    {activeBooking.notes && (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">Customer Booking Notes</div>
                        <div className="text-xs text-foreground italic font-medium">"{activeBooking.notes}"</div>
                      </div>
                    )}

                    {/* Internal Staff Notes & Team Timeline */}
                    <div className="p-3.5 rounded-2xl bg-background border border-border/70 space-y-2.5">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-brand" /> Internal Staff Notes &amp; Log</span>
                        <span className="text-[9px] text-brand font-bold bg-brand/10 px-2 py-0.5 rounded-md">Team Only</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type internal note (e.g. Verified passport, requested invoice)..."
                          value={staffNoteText}
                          onChange={(e) => setStaffNoteText(e.target.value)}
                          className="text-xs h-9 rounded-xl bg-accent/10 border-border/70"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && staffNoteText.trim()) {
                              handleSaveStaffNote();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="brand"
                          className="h-9 text-xs font-extrabold shrink-0 rounded-xl px-4"
                          onClick={handleSaveStaffNote}
                        >
                          Add Note
                        </Button>
                      </div>
                      {activeBooking.internal_notes ? (
                        <div className="text-xs text-foreground bg-accent/20 p-3 rounded-xl border border-border/60 font-medium space-y-1">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Note Log</div>
                          <div>{activeBooking.internal_notes}</div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground italic text-center py-1">No internal staff notes recorded yet.</div>
                      )}
                    </div>

                    {/* Customer Feedback Card (if submitted) */}
                    {activeBooking.feedback_rating ? (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Customer Rating: {activeBooking.feedback_rating} / 5 Stars
                        </div>
                        {activeBooking.feedback_text && (
                          <div className="text-xs text-muted-foreground italic bg-background p-3 rounded-xl border border-border/60">
                            "{activeBooking.feedback_text}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl border border-dashed border-border/70 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">Feedback Link: <code className="font-mono text-[10px] font-bold text-foreground">{getNetworkOrigin()}/feedback/{activeBooking.booking_reference}</code></span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] font-extrabold rounded-lg shrink-0 border-brand/30 text-brand hover:bg-brand/10"
                          onClick={() => {
                            navigator.clipboard.writeText(`${getNetworkOrigin()}/feedback/${activeBooking.booking_reference}`);
                            toast.success("Feedback link copied!");
                          }}
                        >
                          Copy Feedback Link
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-xs text-muted-foreground border border-dashed rounded-3xl bg-card p-6">
                  Select an appointment from the left list stream to view customer workbench.
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    );
  }

  if (view === "desks") {
    const branchServices = state.services.filter((s) => s.branchId === branchId);
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_0.5fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 h-fit">
          {desks.map((d) => {
            const current = tickets.find(
              (t) => t.deskId === d.id && (t.status === "serving" || t.status === "called"),
            );
            const staff = state.staff.find((s) => s.id === d.staffId);
            return (
              <div key={d.id} className="panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold">{d.label}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                      d.status === "open"
                        ? "bg-emerald/12 text-emerald"
                        : d.status === "paused"
                          ? "bg-amber/15 text-amber"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {d.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{staff?.name ?? "Unassigned"}</p>
                <div className="mt-4 rounded-xl bg-accent/40 px-4 py-3 text-center">
                  <div className="font-display text-2xl font-bold tabular-nums">
                    {current?.number ?? "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Now serving
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => actions.callNext(d.id)}>
                    Call next
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await actions.setDeskStatus(d.id, d.status === "open" ? "paused" : "open");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to change desk status");
                      }
                    }}
                  >
                    {d.status === "open" ? "Pause" : "Open"}
                  </Button>
                </div>
              </div>
            );
          })}
          {desks.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground col-span-2">No counter desks configured for this branch.</p>
          ) : null}
        </div>

        <div className="panel p-5 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Add New Desk Counter
          </h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const label = data.get("label") as string;
            const checkedServices = branchServices.filter(s => data.get(`svc_${s.id}`) === "on").map(s => s.id);

            if (!label) {
              toast.error("Desk label is required.");
              return;
            }

            try {
              await actions.addDesk(branchId, label, checkedServices);
              toast.success("Desk Counter created successfully!");
              form.reset();
            } catch (err: any) {
              toast.error(err.message || "Failed to create desk");
            }
          }} className="space-y-4">
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Desk Label</label>
              <input name="label" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Counter 01, Counter A, etc." required />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Mapped Services</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto border rounded-xl p-3 bg-pearl/40">
                {branchServices.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input type="checkbox" name={`svc_${s.id}`} id={`chk_${s.id}`} className="rounded border-border/80 text-brand" />
                    <label htmlFor={`chk_${s.id}`} className="text-xs text-foreground/80 cursor-pointer">{s.name}</label>
                  </div>
                ))}
                {branchServices.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-2">Create services first</p>
                )}
              </div>
            </div>
            <Button type="submit" variant="brand" className="w-full">Create Desk</Button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "services") {
    const branchServices = state.services.filter((s) => s.branchId === branchId);
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_0.6fr]">
        <div className="panel p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Services List
          </h3>
          <div className="grid gap-3">
            {branchServices.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="font-semibold text-base">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Prefix: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{s.prefix}</span> · Est. Service Time: {s.avgMinutes} min
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={async () => {
                  await actions.removeStaff(s.id); // Or remove service
                  toast.success(`Service ${s.name} deleted`);
                }}>
                  Delete
                </Button>
              </div>
            ))}
            {branchServices.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No services configured for this branch.</p>
            ) : null}
          </div>
        </div>

        <div className="panel p-5 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Add New Service
          </h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const name = data.get("name") as string;
            const prefix = data.get("prefix") as string;
            const avgMinutes = parseInt(data.get("avgMinutes") as string, 10);

            if (!name || !prefix) {
              toast.error("Name and Prefix are required.");
              return;
            }

            try {
              await actions.addService(branchId, name, prefix, avgMinutes);
              toast.success("Service added successfully!");
              form.reset();
            } catch (err: any) {
              toast.error(err.message || "Failed to add service");
            }
          }} className="space-y-4">
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Service Name</label>
              <input name="name" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Consultation, Billing, etc." required />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Token Prefix (e.g. A, B)</label>
              <input name="prefix" maxLength={2} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="A" required />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Est. Duration (minutes)</label>
              <input name="avgMinutes" type="number" defaultValue={15} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required />
            </div>
            <Button type="submit" variant="brand" className="w-full">Create Service</Button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "methods") {
    const companyPlan = state.companies[0]?.plan || "starter";
    const packageConfig = planOf(companyPlan);

    const ALL_METHODS = [
      { id: 1, name: "Method 1: Public Walk-in (Self Service)", desc: "Visitors scan QR code to register directly into a single general queue." },
      { id: 2, name: "Method 2: Public Service Selection", desc: "Visitors choose from mapped branch services." },
      { id: 3, name: "Method 3: Live Serving Display Board", desc: "Feeds real-time lobby Serving Boards." },
      { id: 4, name: "Method 4: Remote Slot Booking", desc: "Visitors book appointments remotely verified via SMS." }
    ];

    const visibleMethods = ALL_METHODS.filter((m) => {
      if (m.id === 3 || m.id === 4) {
        return branch?.enabledMethods?.includes(m.id as any) ?? false;
      }
      return true;
    });

    return (
      <div className="grid gap-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Queue Methods Configurations</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {visibleMethods.map((m) => {
            const isUnlocked = packageConfig.methods.includes(m.id as QueueMethod);

            return (
              <div key={m.id} className="panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-base">{m.name}</h3>
                    {isUnlocked ? (
                      <span className="bg-emerald/12 text-emerald rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                        Unlocked
                      </span>
                    ) : (
                      <span className="bg-coral/12 text-coral rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                        Upgrade Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{m.desc}</p>
                </div>

                <div className="mt-5 space-y-4">
                  {!isUnlocked ? (
                    <div className="bg-pearl/60 border border-border/80 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground font-medium">Your current plan ({companyPlan}) does not include this method.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs font-semibold text-muted-foreground">Status</span>
                        <Button size="sm" variant={branch?.method === m.id ? "brand" : "outline"} onClick={async () => {
                          await actions.setBranchMethod(branchId, m.id as QueueMethod);
                          toast.success(`Method ${m.id} activated successfully!`);
                        }}>
                          {branch?.method === m.id ? "Active" : "Activate"}
                        </Button>
                      </div>

                      {(m.id === 1 || m.id === 2) && (
                        <div className="border-t border-border/60 pt-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground">Touchpoint QR Code</div>
                            <p className="text-[10px] text-muted-foreground mt-1">Branded with your company colors</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="brand" onClick={async () => {
                              try {
                                 const res = await fetch(`/api/branches/${branchId}/generate-qr/`, {
                                   method: "POST",
                                   headers: { "Content-Type": "application/json" },
                                   body: JSON.stringify({ method: String(m.id) })
                                 });
                                 if (!res.ok) throw new Error((await res.json()).error || "Failed to generate QR");
                                 toast.success("QR Code generated successfully!");
                                 window.open(`http://${window.location.hostname}:8000/media/qrcodes/branch_${branchId}_m${m.id}.svg`, "_blank");
                              } catch (err: any) {
                                toast.error(err.message || "Failed to generate QR");
                              }
                            }}>
                              Generate QR
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Waiting" value={<CountUp value={stats.waiting} />} hint={branch.openHours} />
        <StatCard label="Served today" value={<CountUp value={stats.served} />} />
        <StatCard label="Avg wait" value={<CountUp value={Math.round(stats.avgWait)} suffix=" min" />} />
        <StatCard label="Desks open" value={`${stats.desksOpen}/${stats.desksTotal}`} />
      </div>

      <Reveal>
        <div className="panel p-3.5 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Customer touchpoints</span>
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <Button asChild size="sm" variant="outline" className="text-xs px-2 sm:px-3 h-8">
                <a href={`/${companySlug}/branches/${branchSlug}/join`} target="_blank" rel="noopener noreferrer">
                  <QrCode className="h-3.5 w-3.5 mr-1" /> Join page
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="text-xs px-2 sm:px-3 h-8">
                <a href={`/${companySlug}/branches/${branchSlug}/display`} target="_blank" rel="noopener noreferrer">
                  <MonitorPlay className="h-3.5 w-3.5 mr-1" /> Display
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="text-xs px-2 sm:px-3 h-8">
                <a href={`/${companySlug}/branches/${branchSlug}/kiosk`} target="_blank" rel="noopener noreferrer">
                  Kiosk mode
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="panel p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Live queue
        </h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {waiting.slice(0, 12).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-accent/40 px-4 py-3"
            >
              <div className="min-w-0">
                <span className="font-display text-lg font-bold tabular-nums">{t.number}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">
                  {t.customerName}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {state.services.find((s) => s.id === t.serviceId)?.name}
              </span>
            </div>
          ))}
          {waiting.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Queue is clear.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function QueryHistoryView({
  branchId,
  branch,
  company,
  state,
}: {
  branchId: string;
  branch: any;
  company: any;
  state: any;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "served" | "hold">("ALL");
  const [feedbackFilter, setFeedbackFilter] = useState<"ALL" | "RATED" | "REPLIED">("ALL");
  const [dateFilter, setDateFilter] = useState<"TODAY" | "YESTERDAY" | "7DAYS" | "30DAYS" | "ALL" | "CUSTOM">("TODAY");
  const [customDate, setCustomDate] = useState<string>("");

  const companySlug = company?.slug || "";
  const branchSlug = branch?.slug || "";

  // Helper for local YYYY-MM-DD
  const getLocalYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTicketYMD = (t: any) => {
    const raw = t.created_at || t.createdAt || t.called_at || t.served_at;
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw).slice(0, 10);
    return getLocalYMD(d);
  };

  const getTicketSortValue = (t: any): number => {
    const val = t.feedback_submitted_at || t.served_at || t.servedAt || t.called_at || t.calledAt || t.created_at || t.createdAt || t.joinedAt;
    if (val) {
      const num = typeof val === "number" ? val : new Date(val).getTime();
      if (!isNaN(num) && num > 0) return num;
    }
    const numericId = Number(t.id);
    if (!isNaN(numericId) && numericId > 0) return numericId;

    const tokenStr = t.token_number || t.number || "";
    const digits = tokenStr.replace(/\D/g, "");
    if (digits) {
      const parsedToken = parseInt(digits, 10);
      if (!isNaN(parsedToken)) return parsedToken;
    }

    return 0;
  };

  // Filter handled tickets for this branch & sort descending (NEWEST FIRST)
  const allHandledTickets = useMemo(() => {
    return state.tickets.filter((t: any) => {
      const matchBranch = String(t.branchId) === String(branchId);
      const isHandled = t.status === "served" || t.status === "hold" || t.status === "completed" || t.status === "cancelled" || !!t.feedback_text || !!t.feedback_rating;
      return matchBranch && isHandled;
    }).sort((a: any, b: any) => {
      return getTicketSortValue(b) - getTicketSortValue(a); // NEWEST FIRST (B008 before B002)
    });
  }, [state.tickets, branchId]);

  // Apply Search and Date Filters
  const filteredTickets = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalYMD(now);
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalYMD(yesterdayDate);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return allHandledTickets.filter((t: any) => {
      // 1. Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "served" && t.status !== "served" && t.status !== "completed") return false;
        if (statusFilter === "hold" && t.status !== "hold" && t.status !== "escalated") return false;
      }

      // 2. Feedback Filter
      if (feedbackFilter === "RATED" && !t.feedback_rating) return false;
      if (feedbackFilter === "REPLIED" && !t.feedback_text) return false;

      // 3. Date Filter (Default: TODAY)
      const ticketYMD = getTicketYMD(t);
      const rawDate = new Date(t.created_at || t.createdAt || t.called_at || 0);

      if (dateFilter === "TODAY") {
        if (ticketYMD && ticketYMD !== todayStr) return false;
      } else if (dateFilter === "YESTERDAY") {
        if (ticketYMD && ticketYMD !== yesterdayStr) return false;
      } else if (dateFilter === "7DAYS") {
        if (rawDate < sevenDaysAgo) return false;
      } else if (dateFilter === "30DAYS") {
        if (rawDate < thirtyDaysAgo) return false;
      } else if (dateFilter === "CUSTOM" && customDate) {
        if (ticketYMD && ticketYMD !== customDate) return false;
      }

      // 4. Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const token = (t.token_number || t.number || "").toLowerCase();
        const name = (t.customer_name || t.customerName || "").toLowerCase();
        const phone = (t.customer_phone || t.contact || "").toLowerCase();
        const email = (t.customer_email || "").toLowerCase();
        const notes = (t.message || t.notes || "").toLowerCase();
        const reply = (t.feedback_text || "").toLowerCase();

        const match = token.includes(query) || name.includes(query) || phone.includes(query) || email.includes(query) || notes.includes(query) || reply.includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [allHandledTickets, statusFilter, feedbackFilter, dateFilter, customDate, searchTerm]);

  // Statistics dynamically based on filtered set
  const totalHandled = filteredTickets.length;
  const totalResolved = filteredTickets.filter((t: any) => t.status === "served" || t.status === "completed").length;
  const totalEscalated = filteredTickets.filter((t: any) => t.status === "hold" || t.status === "escalated").length;
  
  const ratedTickets = filteredTickets.filter((t: any) => t.feedback_rating);
  const avgRating = ratedTickets.length > 0 
    ? (ratedTickets.reduce((acc: number, t: any) => acc + (t.feedback_rating || 0), 0) / ratedTickets.length).toFixed(1)
    : "5.0";

  const totalReplies = filteredTickets.filter((t: any) => t.feedback_text).length;

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      toast.error("No query history data available to export for selected filter.");
      return;
    }

    const headers = ["Token Number", "Customer Name", "Phone", "Email", "Service", "Desk", "Status", "Rating", "Customer Reply", "Date & Time"];
    const rows = filteredTickets.map((t: any) => [
      `"${t.token_number || t.number || ''}"`,
      `"${t.customer_name || t.customerName || 'Visitor'}"`,
      `"${t.customer_phone || t.contact || ''}"`,
      `"${t.customer_email || ''}"`,
      `"${t.service_name || t.service?.name || 'General'}"`,
      `"${t.desk_name || t.desk?.name || 'Counter Desk'}"`,
      `"${t.status === 'served' || t.status === 'completed' ? 'Resolved' : 'Escalated'}"`,
      `"${t.feedback_rating ? t.feedback_rating + '/5' : 'N/A'}"`,
      `"${(t.feedback_text || '').replace(/"/g, '""')}"`,
      `"${t.created_at || t.createdAt || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: string[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Query_Disposition_Report_${branchSlug}_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Query disposition report exported successfully!");
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-3">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Query Disposition History &amp; Live Replies
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time query disposition log, customer star ratings, and incoming email replies. Showing <strong className="text-foreground">{dateFilter === "TODAY" ? "Today's" : dateFilter === "YESTERDAY" ? "Yesterday's" : dateFilter} queries (Newest First)</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 px-3.5 text-xs font-bold gap-2 rounded-xl shadow-sm hover:border-primary/50"
          >
            <Download className="h-3.5 w-3.5 text-primary" /> Export CSV Report
          </Button>
        </div>
      </div>

      {/* Dynamic 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Queries ({dateFilter})</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-foreground">{totalHandled}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Newest Top</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Resolved Queries</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalResolved}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
              {totalHandled > 0 ? Math.round((totalResolved / totalHandled) * 100) : 100}% Rate
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Escalated Queries</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{totalEscalated}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">Action Required</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Avg Rating &amp; Replies</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-500 flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {avgRating}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">
              {totalReplies} Replies
            </span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Dynamic Date Filters */}
      <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-2xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search token, customer name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800/50 border-border/60"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border/60 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="served">✅ Resolved Only</option>
            <option value="hold">⚠️ Escalated Only</option>
          </select>

          {/* Feedback Filter */}
          <select
            value={feedbackFilter}
            onChange={(e: any) => setFeedbackFilter(e.target.value)}
            className="h-9 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border/60 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
          >
            <option value="ALL">All Feedback</option>
            <option value="RATED">⭐ With Star Rating</option>
            <option value="REPLIED">💬 With Reply Message</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e: any) => {
              setDateFilter(e.target.value);
              if (e.target.value !== "CUSTOM") setCustomDate("");
            }}
            className="h-9 px-3 text-xs font-black rounded-xl bg-primary/10 text-primary border border-primary/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
          >
            <option value="TODAY">📅 Today (Default)</option>
            <option value="YESTERDAY">📅 Yesterday</option>
            <option value="7DAYS">📅 Last 7 Days</option>
            <option value="30DAYS">📅 Last 30 Days</option>
            <option value="ALL">📅 All Time History</option>
            <option value="CUSTOM">📅 Select Custom Date...</option>
          </select>

          {dateFilter === "CUSTOM" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-9 px-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-border text-foreground w-full sm:w-auto"
            />
          )}
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 shadow-soft rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-border/60 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="p-3 pl-4">Token #</th>
                <th className="p-3">Customer &amp; Contact</th>
                <th className="p-3">Service &amp; Desk</th>
                <th className="p-3">Disposition</th>
                <th className="p-3">Operator Note</th>
                <th className="p-3">Email Dispatch</th>
                <th className="p-3">Customer Feedback &amp; Reply</th>
                <th className="p-3 pr-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs font-medium">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto opacity-40 mb-2" />
                    <p className="font-bold text-xs">No matching query records found for {dateFilter === "TODAY" ? "Today" : dateFilter}</p>
                    <p className="text-[11px] opacity-75 mt-0.5">Change the date filter above to view previous or past days data.</p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t: any) => {
                  const isResolved = t.status === "served" || t.status === "completed";
                  const timeStr = t.called_at || t.served_at || t.created_at || t.createdAt;
                  const formattedTime = timeStr ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A";
                  const formattedDate = timeStr ? new Date(timeStr).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "";

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Token # */}
                      <td className="p-3 pl-4 font-mono font-black text-primary text-sm whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 inline-block">
                          {t.token_number || t.number}
                        </span>
                      </td>

                      {/* Customer & Contact */}
                      <td className="p-3 min-w-[170px]">
                        <span className="font-extrabold text-foreground block text-sm">{t.customer_name || t.customerName || "Valued Visitor"}</span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5 flex-wrap">
                          <span>📞 {t.customer_phone || t.contact || "N/A"}</span>
                          <span>✉️ {t.customer_email || "rutaahir855@gmail.com"}</span>
                        </div>
                      </td>

                      {/* Service & Desk */}
                      <td className="p-3 min-w-[140px]">
                        <span className="font-bold text-foreground block">{t.service_name || t.service?.name || "General Service"}</span>
                        <span className="text-[11px] text-muted-foreground block">{t.desk_name || t.desk?.name || "Desk 3"}</span>
                      </td>

                      {/* Disposition Status */}
                      <td className="p-3 whitespace-nowrap">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <AlertTriangle className="h-3.5 w-3.5" /> Escalated
                          </span>
                        )}
                      </td>

                      {/* Operator Note */}
                      <td className="p-3 min-w-[180px]">
                        {t.note || t.message ? (
                          <div className="bg-brand/5 dark:bg-brand/10 border border-brand/20 rounded-xl p-2 text-[11px] text-foreground font-medium flex items-start gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{t.note || t.message}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                            <FileText className="h-3 w-3 opacity-40" /> No notes added
                          </span>
                        )}
                      </td>

                      {/* Email Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <Check className="h-3 w-3" /> Dispatched
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono truncate max-w-[150px]">
                          rutaahir855@gmail.com
                        </span>
                      </td>

                      {/* Customer Rating & Reply */}
                      <td className="p-3 min-w-[220px]">
                        <div className="space-y-1">
                          {t.feedback_rating ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {t.feedback_rating}/5 Rating
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic block">Awaiting customer rating...</span>
                          )}

                          {t.feedback_text ? (
                            <div className="bg-slate-100/90 dark:bg-slate-800/80 border border-primary/20 rounded-xl p-2 text-[11px] text-foreground italic font-bold">
                              💬 "{t.feedback_text}"
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="p-3 pr-4 text-right whitespace-nowrap font-mono text-xs">
                        <span className="font-bold text-foreground block">{formattedTime}</span>
                        {dateFilter !== "TODAY" && <span className="text-[10px] text-muted-foreground block">{formattedDate}</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ServingCustomerDeskPanel({
  desk,
  current,
  queue,
  actions,
  setIsTransferModalOpen,
  refresh,
}: {
  desk: any;
  current: any;
  queue: any[];
  actions: any;
  setIsTransferModalOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
}) {
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isNoteSaved, setIsNoteSaved] = useState(false);

  useEffect(() => {
    if (current) {
      setNoteText(current.note || current.message || "");
      setIsNoteSaved(false);
    } else {
      setNoteText("");
      setIsNoteSaved(false);
    }
  }, [current?.id, current?.note, current?.message]);

  const handleSaveNote = async () => {
    if (!current) return;
    setIsSavingNote(true);
    try {
      if (actions.updateTicketNote) {
        await actions.updateTicketNote(current.id, noteText);
      } else {
        await apiFetch(`/api/tickets/${current.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ message: noteText, note: noteText }),
        });
        await refresh();
      }
      toast.success(`Note saved for token ${current.number}`);
      setIsNoteSaved(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="panel overflow-hidden">
      <div className="bg-brand px-6 py-8 text-center text-primary-foreground">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">
          {desk.label} · now serving
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.number ?? "idle"}
            initial={{ y: 22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -22, opacity: 0 }}
            className="mt-1 font-display text-6xl font-bold"
          >
            {current ? <FlipNumber value={current.number} /> : "—"}
          </motion.div>
        </AnimatePresence>
        <div className="mt-2 text-sm opacity-85 font-medium">
          {current ? current.customerName : "Ready for the next visitor"}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="brand"
            size="lg"
            disabled={!!current || queue.length === 0}
            onClick={async () => {
              try {
                const res: any = await actions.callNext(desk.id);
                if (res?.number) {
                  toast.success(`Called token ${res.number}`);
                } else if (res?.message) {
                  toast.info(res.message);
                } else {
                  toast.success("Next visitor called");
                }
              } catch (err: any) {
                toast.error(err.message || "Failed to call next visitor");
              }
            }}
            className="w-full shadow-lg shadow-brand/20 font-bold"
          >
            <PhoneCall className="h-4 w-4 mr-1.5" /> Call Next
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={!current}
            onClick={async () => {
              if (!current) return;
              try {
                await actions.setTicketStatus(current.id, "skipped");
                toast.info(`Skipped ticket ${current.number}`);
              } catch (err: any) {
                toast.error(err.message || "Failed to skip ticket");
              }
            }}
            className="w-full font-semibold"
          >
            <SkipForward className="h-4 w-4 mr-1.5" /> Skip
          </Button>
        </div>

        {/* Customer Note / Remarks Field */}
        {current && (
          <div className="rounded-2xl border border-brand/20 bg-brand/5 dark:bg-brand/10 p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-brand" />
                Customer Note & Operator Remarks
              </span>
              {isNoteSaved && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  setIsNoteSaved(false);
                }}
                placeholder="Add visit notes, customer query details, special instructions, or resolution remarks..."
                className="min-h-[72px] text-xs resize-none rounded-xl border-border/60 bg-background/90 focus-visible:ring-brand/30 shadow-inner"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="brand"
                  disabled={isSavingNote}
                  onClick={handleSaveNote}
                  className="h-8 text-xs font-bold px-3 rounded-lg shadow-sm gap-1.5"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Note...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Save Note
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Visitor Service Resolution & Transfer Controls */}
        <div className="border-t border-border/60 pt-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Visitor Disposition Options</span>
            {current && <span className="text-brand font-semibold">Active: {current.number} ({current.customerName})</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* 1. Resolved */}
            <button
              type="button"
              disabled={!current}
              onClick={async () => {
                if (!current) return;
                try {
                  await actions.setTicketStatus(current.id, "served", noteText);
                  toast.success(`Ticket ${current.number} (${current.customerName}) marked as Resolved!`);
                } catch (err: any) {
                  toast.error(err.message || "Failed to resolve ticket");
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all",
                current
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 shadow-sm cursor-pointer"
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>Resolved</span>
            </button>

            {/* 2. Escalated */}
            <button
              type="button"
              disabled={!current}
              onClick={async () => {
                if (!current) return;
                try {
                  await actions.setTicketStatus(current.id, "hold", noteText);
                  toast.warning(`Ticket ${current.number} (${current.customerName}) Escalated for supervisor review.`);
                } catch (err: any) {
                  toast.error(err.message || "Failed to escalate ticket");
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all",
                current
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 shadow-sm cursor-pointer"
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Escalated</span>
            </button>

            {/* 3. Transfer */}
            <button
              type="button"
              disabled={!current}
              onClick={() => {
                if (current) setIsTransferModalOpen(true);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all",
                current
                  ? "border-brand/40 bg-brand/10 text-brand hover:bg-brand/20 hover:border-brand shadow-sm cursor-pointer"
                  : "border-border/50 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              <ArrowRightLeft className="h-5 w-5 text-brand" />
              <span>Transfer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
