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
  Briefcase,
  Building2,
  Plus,
  Trash2,
  LogOut,
  X,
  MapPin,
  Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, useQuesole } from "@/lib/quesole/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "@/components/quesole/motion";

export function BranchAttendanceLogsView({
  branchId,
  branchName,
  isStaffRole = false,
  companyWide = false,
  onBranchChange,
}: {
  branchId?: string;
  branchName?: string;
  isStaffRole?: boolean;
  companyWide?: boolean;
  onBranchChange?: (newBranchId: string) => void;
}) {
  const { state, session, refresh } = useQuesole();
  const [logs, setLogs] = useState<any[]>([]);
  const [allCompanyLogsCount, setAllCompanyLogsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<any | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Branch Selection: defaults to provided branchId, or "all" if companyWide or no branchId
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    if (companyWide) return "all";
    return branchId || "all";
  });

  // Modal: Check In Staff (for Admins)
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInUserId, setCheckInUserId] = useState("");
  const [checkInBranchId, setCheckInBranchId] = useState("");
  const [checkInDeskId, setCheckInDeskId] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Available branches for current company
  const companyBranches = useMemo(() => {
    const userCompanyId = session?.companyId;
    return state.branches.filter(
      (b) => !userCompanyId || String(b.companyId) === String(userCompanyId) || String((b as any).company) === String(userCompanyId)
    );
  }, [state.branches, session?.companyId]);

  // Keep selectedBranch synced if branchId prop changes
  useEffect(() => {
    if (branchId && !companyWide) {
      setSelectedBranch(branchId);
    }
  }, [branchId, companyWide]);

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
      let query = `/api/operator/attendance/`;
      const params = new URLSearchParams();
      if (selectedBranch && selectedBranch !== "all") {
        params.append("branch", selectedBranch);
      }
      if (selectedDate) {
        params.append("date", selectedDate);
      }
      const qs = params.toString();
      const fullQuery = qs ? `${query}?${qs}` : query;
      const data = await apiFetch(fullQuery);
      setLogs(Array.isArray(data) ? data : []);

      // If viewing a specific branch with 0 logs, also check if company has any logs in other branches
      if (selectedBranch !== "all" && Array.isArray(data) && data.length === 0) {
        try {
          const compLogs = await apiFetch(`/api/operator/attendance/`);
          if (Array.isArray(compLogs)) {
            setAllCompanyLogsCount(compLogs.length);
          }
        } catch {
          // Ignore
        }
      } else {
        setAllCompanyLogsCount(null);
      }
    } catch (err) {
      console.error("Failed to fetch attendance logs:", err);
      toast.error("Could not load attendance logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceLogs();
  }, [selectedBranch, selectedDate]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchQuery === "" ||
        (log.user_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.user_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.desk_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.branch_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.user_role || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" &&
          (log.user_role === "branch_admin" || log.user_role === "company_admin")) ||
        (roleFilter === "staff" &&
          (log.user_role === "operator" ||
            log.user_role === "desk_staff" ||
            log.user_role === "staff" ||
            !log.user_role));

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
      "Branch",
      "Assigned Desk",
      "Status",
      "Check-in Time",
      "Check-out Time",
      "Net Work Duration",
      "Total Break Time",
      "Break Count",
      "Notes",
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
        `"${l.branch_name || ""}"`,
        `"${l.desk_name || "Unassigned"}"`,
        `"${l.status}"`,
        `"${new Date(l.check_in_time).toLocaleString()}"`,
        `"${l.check_out_time ? new Date(l.check_out_time).toLocaleString() : "Active Now"}"`,
        `"${formatDuration(workSec)}"`,
        `"${formatDuration(l.total_break_seconds || 0)}"`,
        `"${l.break_count || 0}"`,
        `"${(l.notes || "").replace(/"/g, '""')}"`,
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
      `staff_attendance_${selectedBranch === "all" ? "all_branches" : branchName || "branch"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Staff attendance exported to CSV!");
  };

  // Admin: Check Out an active shift
  const handleCheckOutShift = async (attendanceId: number) => {
    setIsActionLoading(true);
    try {
      await apiFetch("/api/operator/attendance/check-out/", {
        method: "POST",
        body: JSON.stringify({ attendance_id: attendanceId }),
      });
      toast.success("Shift successfully checked out!");
      setSelectedLogForDetails(null);
      await fetchAttendanceLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to check out shift");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Admin: Delete an attendance record
  const handleDeleteRecord = async (attendanceId: number) => {
    if (!confirm("Are you sure you want to delete this shift attendance record?")) return;
    setIsActionLoading(true);
    try {
      await apiFetch(`/api/operator/attendance/${attendanceId}/`, {
        method: "DELETE",
      });
      toast.success("Attendance record deleted.");
      setSelectedLogForDetails(null);
      await fetchAttendanceLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Admin: Submit Manual Check In
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInBranchId) {
      toast.error("Please select a branch.");
      return;
    }
    setIsCheckingIn(true);
    try {
      await apiFetch("/api/operator/attendance/check-in/", {
        method: "POST",
        body: JSON.stringify({
          branch_id: checkInBranchId,
          user_id: checkInUserId || undefined,
          desk_id: checkInDeskId || undefined,
        }),
      });
      toast.success("Staff member checked in successfully!");
      setIsCheckInModalOpen(false);
      setCheckInUserId("");
      setCheckInDeskId("");
      await fetchAttendanceLogs();
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to check in staff member");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Find another branch that has records to suggest to user
  const currentBranchObj = companyBranches.find((b) => String(b.id) === String(selectedBranch));
  const otherBranchWithData = companyBranches.find((b) => String(b.id) !== String(selectedBranch));

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
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {selectedBranch === "all" ? "Across all branches" : "Recorded shift sessions"}
            </p>
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
          {/* Branch Filter (Company Admin & Multi-Branch Switcher) */}
          {!isStaffRole && (companyBranches.length > 0 || state.branches.length > 0) && (
            <div className="relative shrink-0">
              <select
                value={selectedBranch}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBranch(val);
                  onBranchChange?.(val);
                }}
                className="text-xs font-bold h-8.5 rounded-xl border border-brand/40 bg-brand/5 pl-2.5 pr-7 text-brand focus:ring-1 focus:ring-brand cursor-pointer hover:bg-brand/10 transition-colors"
                title="Filter attendance logs by branch"
              >
                <option value="all">🏢 All Branches (Company-Wide)</option>
                {(companyBranches.length > 0 ? companyBranches : state.branches).map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            <option value="admin">Branch / Company Admin</option>
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
          {!isStaffRole && (
            <Button
              variant="brand"
              size="sm"
              onClick={() => {
                setCheckInBranchId(
                  selectedBranch && selectedBranch !== "all"
                    ? selectedBranch
                    : companyBranches[0]?.id || ""
                );
                setIsCheckInModalOpen(true);
              }}
              className="h-8.5 gap-1.5 text-xs font-bold rounded-xl shadow-xs shadow-brand/20 bg-[#5B50EB] hover:bg-[#4d42db] text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Check In Staff
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAttendanceLogs}
            className="h-8.5 gap-1.5 text-xs font-bold rounded-xl"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-8.5 gap-1.5 text-xs font-bold rounded-xl shadow-xs shadow-brand/10"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── CONTEXTUAL INFO BANNER: If selected branch has 0 logs but other branches have data ── */}
      {!isLoading && logs.length === 0 && selectedBranch !== "all" && (
        <div className="panel p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-foreground">
                No attendance sessions recorded for {currentBranchObj?.name || branchName || "this branch"} yet.
              </p>
              <p className="text-muted-foreground mt-0.5">
                {allCompanyLogsCount && allCompanyLogsCount > 0
                  ? `There are ${allCompanyLogsCount} attendance logs in your company. Switch branch or view all branches to inspect them.`
                  : "Operators record attendance upon shift check-in at the Desk Console, or you can check in staff manually."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBranch("all");
                onBranchChange?.("all");
              }}
              className="h-8 text-xs font-bold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
            >
              🏢 View All Branches
            </Button>
            {otherBranchWithData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const bId = String(otherBranchWithData.id);
                  setSelectedBranch(bId);
                  onBranchChange?.(bId);
                }}
                className="h-8 text-xs font-bold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
              >
                Switch to {otherBranchWithData.name}
              </Button>
            )}
            {!isStaffRole && (
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  setCheckInBranchId(
                    selectedBranch && selectedBranch !== "all"
                      ? selectedBranch
                      : companyBranches[0]?.id || ""
                  );
                  setIsCheckInModalOpen(true);
                }}
                className="h-8 text-xs font-bold rounded-xl bg-[#5B50EB] text-white"
              >
                <Plus className="h-3 w-3 mr-1" /> Check In Staff
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── TABULAR ATTENDANCE DASHBOARD (Full Width & Space Optimized) ── */}
      <div className="panel overflow-hidden border-border/80 rounded-2xl shadow-2xs bg-card">
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-md z-10 border-b border-border/60">
              <tr className="text-muted-foreground font-extrabold uppercase tracking-wider text-[10px]">
                <th className="p-3 pl-4">Staff Member</th>
                <th className="p-3">Role</th>
                {(selectedBranch === "all" || companyBranches.length > 1) && (
                  <th className="p-3">Branch</th>
                )}
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
                  <td
                    colSpan={selectedBranch === "all" || companyBranches.length > 1 ? 10 : 9}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-brand mx-auto mb-2" />
                    Loading staff attendance records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedBranch === "all" || companyBranches.length > 1 ? 10 : 9}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="h-10 w-10 mx-auto rounded-full bg-muted/70 flex items-center justify-center text-muted-foreground">
                        <Clock className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-foreground">
                        No staff attendance logs found matching your filters.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedBranch !== "all"
                          ? `No logs for ${currentBranchObj?.name || "selected branch"}. Try selecting 'All Branches' or clearing date/search filters.`
                          : "Shift records will appear here as soon as staff check into their desks."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const checkInTime = new Date(log.check_in_time);
                  const checkInStr = checkInTime.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const checkInDateStr = checkInTime.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  });

                  const checkOutStr = log.check_out_time
                    ? new Date(log.check_out_time).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
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
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border",
                              isAdminRole
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                            )}
                          >
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
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 w-fit",
                            isAdminRole
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20"
                          )}
                        >
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

                      {/* Branch Badge */}
                      {(selectedBranch === "all" || companyBranches.length > 1) && (
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-muted/70 text-foreground border border-border/50">
                            <Building2 className="h-3 w-3 text-brand" />
                            {log.branch_name || "Branch"}
                          </span>
                        </td>
                      )}

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
                      {selectedLogForDetails.user_name} ({selectedLogForDetails.desk_name || "Unassigned Desk"}) • {selectedLogForDetails.branch_name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLogForDetails(null)}
                  className="h-8 w-8 rounded-full p-0"
                >
                  <X className="h-4 w-4" />
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
                                minute: "2-digit",
                              })}{" "}
                              -{" "}
                              {b.break_end
                                ? new Date(b.break_end).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
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

                {/* Admin Management Actions inside Details Modal */}
                {!isStaffRole && (
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRecord(selectedLogForDetails.id)}
                      disabled={isActionLoading}
                      className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs font-bold gap-1 rounded-xl"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Record
                    </Button>

                    {!selectedLogForDetails.check_out_time && (
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => handleCheckOutShift(selectedLogForDetails.id)}
                        disabled={isActionLoading}
                        className="text-xs font-bold gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <LogOut className="h-3.5 w-3.5" /> End / Check Out Shift
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: MANUAL SHIFT CHECK-IN (ADMIN TOOL) ── */}
      <AnimatePresence>
        {isCheckInModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel max-w-md w-full p-6 space-y-4 rounded-3xl shadow-2xl bg-card border-border/80"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-[#5B50EB]/10 text-[#5B50EB] flex items-center justify-center font-bold">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-foreground">
                      Check In Staff Member
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Record an operator shift attendance session
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCheckInModalOpen(false)}
                  className="h-8 w-8 rounded-full p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleManualCheckIn} className="space-y-4 text-xs">
                {/* Branch Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Target Branch</Label>
                  <select
                    value={checkInBranchId}
                    onChange={(e) => {
                      setCheckInBranchId(e.target.value);
                      setCheckInDeskId("");
                    }}
                    required
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-brand font-medium"
                  >
                    <option value="">Select Branch...</option>
                    {companyBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Staff Member Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Staff Member</Label>
                  <select
                    value={checkInUserId}
                    onChange={(e) => setCheckInUserId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-brand font-medium"
                  >
                    <option value="">Myself ({session?.email || "Current User"})</option>
                    {state.staff
                      .filter(
                        (s) =>
                          (!session?.companyId || String(s.companyId) === String(session.companyId)) &&
                          (!checkInBranchId || !s.branchId || String(s.branchId) === String(checkInBranchId))
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.email} ({s.role || "staff"})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Desk Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Assigned Desk <span className="font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <select
                    value={checkInDeskId}
                    onChange={(e) => setCheckInDeskId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-brand font-medium"
                  >
                    <option value="">Unassigned Desk</option>
                    {state.desks
                      .filter(
                        (d) =>
                          !checkInBranchId || String(d.branchId) === String(checkInBranchId)
                      )
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label} ({d.status})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCheckInModalOpen(false)}
                    className="h-9 text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="brand"
                    disabled={isCheckingIn}
                    className="h-9 px-5 text-xs font-bold rounded-xl bg-[#5B50EB] hover:bg-[#4d42db] text-white"
                  >
                    {isCheckingIn ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Checking In...
                      </>
                    ) : (
                      "Confirm Check-In"
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
