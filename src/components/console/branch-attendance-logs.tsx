import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Clock,
  Coffee,
  Search,
  Download,
  Filter,
  UserCheck,
  Calendar,
  RefreshCw,
  Loader2,
  Info,
  ChevronRight,
  CheckCircle2,
  Users,
  ShieldCheck,
  User,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/quesole/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "@/components/quesole/motion";

export function BranchAttendanceLogsView({
  branchId,
  branchName,
  isStaffRole = false,
}: {
  branchId: string;
  branchName?: string;
  isStaffRole?: boolean;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<any | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Live timer tick for active shift duration calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceLogs = async () => {
    setIsLoading(true);
    try {
      let query = `/api/operator/attendance/?branch=${branchId}`;
      if (selectedDate) {
        query += `&date=${selectedDate}`;
      }
      const data = await apiFetch(query);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch branch attendance logs:", err);
      toast.error("Could not load attendance logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceLogs();
  }, [branchId, selectedDate]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchQuery === "" ||
        (log.user_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.user_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.desk_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.user_role || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && (log.user_role === "branch_admin" || log.user_role === "company_admin")) ||
        (roleFilter === "staff" && (log.user_role === "operator" || log.user_role === "staff" || !log.user_role));

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [logs, searchQuery, statusFilter, roleFilter]);

  // Analytics summary statistics
  const stats = useMemo(() => {
    const totalToday = logs.length;
    const activeWorking = logs.filter((l) => l.status === "checked_in").length;
    const onBreak = logs.filter((l) => l.status === "on_break").length;

    let totalSecondsWorked = 0;
    logs.forEach((l) => {
      const start = new Date(l.check_in_time).getTime();
      const end = l.check_out_time ? new Date(l.check_out_time).getTime() : now;
      const diffSec = Math.max(0, Math.floor((end - start) / 1000));
      const workSec = Math.max(0, diffSec - (l.total_break_seconds || 0));
      totalSecondsWorked += workSec;
    });

    const hours = (totalSecondsWorked / 3600).toFixed(1);
    return { totalToday, activeWorking, onBreak, hours };
  }, [logs, now]);

  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Staff Name",
      "Email",
      "Role",
      "Assigned Desk",
      "Status",
      "Check-in Time",
      "Check-out Time",
      "Net Work Duration",
      "Total Break Time",
      "Break Count",
      "Notes"
    ];
    const rows = filteredLogs.map((l) => {
      const checkInMs = new Date(l.check_in_time).getTime();
      const endMs = l.check_out_time ? new Date(l.check_out_time).getTime() : Date.now();
      const totalSec = Math.max(0, Math.floor((endMs - checkInMs) / 1000));
      const workSec = Math.max(0, totalSec - (l.total_break_seconds || 0));

      return [
        `"${l.user_name || ""}"`,
        `"${l.user_email || ""}"`,
        `"${l.user_role || "Staff"}"`,
        `"${l.desk_name || "Unassigned"}"`,
        `"${l.status}"`,
        `"${new Date(l.check_in_time).toLocaleString()}"`,
        `"${l.check_out_time ? new Date(l.check_out_time).toLocaleString() : "Active Now"}"`,
        `"${formatDuration(workSec)}"`,
        `"${formatDuration(l.total_break_seconds || 0)}"`,
        `"${l.break_count || 0}"`,
        `"${(l.notes || "").replace(/"/g, '""')}"`
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `staff_attendance_${branchName || "branch"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Staff attendance exported to CSV!");
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── EXECUTIVE SUMMARY CARDS (Space-Efficient Grid) ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-4 bg-card border-border/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Total Shift Logs
            </p>
            <div className="font-display font-black text-2xl text-foreground mt-0.5">
              {stats.totalToday}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Recorded shift sessions</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="panel p-4 bg-card border-border/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>On Desks</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </p>
            <div className="font-display font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.activeWorking}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Actively serving users</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="panel p-4 bg-card border-border/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Staff On Break
            </p>
            <div className="font-display font-black text-2xl text-amber-600 dark:text-amber-400 mt-0.5">
              {stats.onBreak}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tea/lunch break sessions</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Coffee className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="panel p-4 bg-card border-border/80 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Total Work Hours
            </p>
            <div className="font-display font-black text-2xl text-foreground mt-0.5">
              {stats.hours} <span className="text-xs font-normal text-muted-foreground">hrs</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Cumulative staff shift time</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── FILTER & ACTION CONTROLS BAR (High Density) ── */}
      <div className="panel p-3.5 bg-card border-border/80 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search staff name, email, desk or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs rounded-xl h-8.5"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold h-8.5 rounded-xl border border-border/80 bg-background px-3 text-foreground focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Statuses</option>
            <option value="checked_in">Checked In</option>
            <option value="on_break">On Break</option>
            <option value="checked_out">Checked Out</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-semibold h-8.5 rounded-xl border border-border/80 bg-background px-3 text-foreground focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Roles</option>
            <option value="staff">Staff / Operators</option>
            <option value="admin">Branch Admin</option>
          </select>

          {/* Date Selector */}
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold h-8.5 rounded-xl border border-border/80 bg-background px-3 text-foreground w-36"
          />
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate("")}
              className="h-8.5 text-xs text-muted-foreground px-2"
            >
              Clear Date
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAttendanceLogs}
            className="h-8.5 gap-1.5 text-xs font-bold rounded-xl"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
          </Button>

          <Button
            variant="brand"
            size="sm"
            onClick={exportCSV}
            className="h-8.5 gap-1.5 text-xs font-bold rounded-xl shadow-xs shadow-brand/20"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── TABULAR ATTENDANCE DASHBOARD (Full Width & Space Optimized) ── */}
      <div className="panel overflow-hidden border-border/80 rounded-2xl shadow-2xs bg-card">
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-md z-10 border-b border-border/60">
              <tr className="text-muted-foreground font-extrabold uppercase tracking-wider text-[10px]">
                <th className="p-3 pl-4">Staff Member</th>
                <th className="p-3">Role</th>
                <th className="p-3">Assigned Desk</th>
                <th className="p-3">Check-in Time</th>
                <th className="p-3">Check-out Time</th>
                <th className="p-3">Work Duration</th>
                <th className="p-3">Break Duration</th>
                <th className="p-3">Status</th>
                <th className="p-3 pr-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-brand mx-auto mb-2" />
                    Loading staff attendance records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground">
                    No staff attendance logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const checkInTime = new Date(log.check_in_time);
                  const checkInStr = checkInTime.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit"
                  });
                  const checkInDateStr = checkInTime.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short"
                  });

                  const checkOutStr = log.check_out_time
                    ? new Date(log.check_out_time).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "Active Now";

                  // Live or recorded work duration
                  const endMs = log.check_out_time
                    ? new Date(log.check_out_time).getTime()
                    : now;
                  const totalSec = Math.max(0, Math.floor((endMs - checkInTime.getTime()) / 1000));
                  const workSec = Math.max(0, totalSec - (log.total_break_seconds || 0));

                  const isAdminRole =
                    log.user_role === "branch_admin" || log.user_role === "company_admin";

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Staff Member Avatar & Info */}
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "h-8 w-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border",
                            isAdminRole
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                          )}>
                            {log.user_name ? log.user_name[0].toUpperCase() : "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-foreground truncate max-w-[170px]">
                              {log.user_name || "Staff Member"}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                              {log.user_email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 w-fit",
                          isAdminRole
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20"
                        )}>
                          {isAdminRole ? (
                            <>
                              <ShieldCheck className="h-3 w-3 text-amber-500" /> Admin
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 text-slate-500" /> Staff
                            </>
                          )}
                        </span>
                      </td>

                      {/* Desk Name */}
                      <td className="p-3">
                        <span className="font-bold text-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/40 text-[11px]">
                          {log.desk_name || "Unassigned"}
                        </span>
                      </td>

                      {/* Check-In Timestamp */}
                      <td className="p-3 font-mono">
                        <div className="font-bold text-foreground">{checkInStr}</div>
                        <div className="text-[10px] text-muted-foreground">{checkInDateStr}</div>
                      </td>

                      {/* Check-Out Timestamp */}
                      <td className="p-3 font-mono">
                        <div
                          className={cn(
                            "font-bold",
                            log.check_out_time
                              ? "text-foreground"
                              : "text-emerald-500 font-extrabold flex items-center gap-1"
                          )}
                        >
                          {!log.check_out_time && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          {checkOutStr}
                        </div>
                      </td>

                      {/* Work Duration (Live incrementing for active shifts) */}
                      <td className="p-3 font-mono font-bold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{formatDuration(workSec)}</span>
                          {!log.check_out_time && log.status === "checked_in" && (
                            <span className="text-[10px] font-sans font-semibold text-emerald-500 animate-pulse">
                              (live)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Break Duration & Count */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedLogForDetails(log)}
                          className="flex items-center gap-1.5 group-hover:underline text-left cursor-pointer"
                        >
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                            {formatDuration(log.total_break_seconds || 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {log.break_count || 0} break{log.break_count === 1 ? "" : "s"}
                          </span>
                        </button>
                      </td>

                      {/* Live Status Badge */}
                      <td className="p-3">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit border shadow-2xs",
                            log.status === "checked_in" &&
                              "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                            log.status === "on_break" &&
                              "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse",
                            log.status === "checked_out" &&
                              "bg-muted text-muted-foreground border-border/60"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              log.status === "checked_in" && "bg-emerald-500 animate-pulse",
                              log.status === "on_break" && "bg-amber-500 animate-ping",
                              log.status === "checked_out" && "bg-slate-400"
                            )}
                          />
                          {log.status === "checked_in" && "Checked In"}
                          {log.status === "on_break" && "On Break"}
                          {log.status === "checked_out" && "Completed"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLogForDetails(log)}
                          className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground rounded-lg"
                        >
                          Details <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BREAK LOG & SHIFT DETAILS MODAL ── */}
      <AnimatePresence>
        {selectedLogForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel max-w-lg w-full p-6 space-y-4 rounded-3xl shadow-2xl bg-card border-border/80"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-lg border border-amber-500/30">
                    ☕
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-foreground">
                      Staff Shift & Break Logs
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedLogForDetails.user_name} ({selectedLogForDetails.desk_name || "Unassigned Desk"})
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLogForDetails(null)}
                  className="h-8 w-8 rounded-full p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-muted/30 p-3.5 rounded-2xl border border-border/60 grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    Check-in:{" "}
                    <strong className="text-foreground block">
                      {new Date(selectedLogForDetails.check_in_time).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    Check-out:{" "}
                    <strong className="text-foreground block">
                      {selectedLogForDetails.check_out_time
                        ? new Date(selectedLogForDetails.check_out_time).toLocaleString()
                        : "Active Now"}
                    </strong>
                  </div>
                  <div>
                    Total Break:{" "}
                    <strong className="text-amber-600 dark:text-amber-400 block">
                      {formatDuration(selectedLogForDetails.total_break_seconds || 0)}
                    </strong>
                  </div>
                  <div>
                    Total Breaks:{" "}
                    <strong className="text-foreground block">
                      {selectedLogForDetails.break_count || 0} session(s)
                    </strong>
                  </div>
                </div>

                {selectedLogForDetails.notes && (
                  <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 italic">
                    "Shift Note: {selectedLogForDetails.notes}"
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Individual Break Sessions Timeline
                  </div>
                  {!selectedLogForDetails.breaks ||
                  selectedLogForDetails.breaks.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground italic border border-dashed rounded-xl">
                      No breaks taken during this shift session.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedLogForDetails.breaks.map((b: any, idx: number) => (
                        <div
                          key={b.id || idx}
                          className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              {b.reason || "Tea / Lunch Break"}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                              {new Date(b.break_start).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}{" "}
                              -{" "}
                              {b.break_end
                                ? new Date(b.break_end).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : "Ongoing"}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            {formatDuration(b.duration_seconds || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
