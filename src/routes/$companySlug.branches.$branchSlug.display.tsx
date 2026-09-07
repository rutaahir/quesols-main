import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import { Lock, Layers, Monitor, RefreshCw, AlertCircle, CheckCircle, Volume2, Users } from "lucide-react";
import type { Desk, Ticket, Service } from "@/lib/quesole/types";

export const Route = createFileRoute("/$companySlug/branches/$branchSlug/display")({
  head: () => ({
    meta: [
      { title: "Live Queue Display Board — Now Serving" },
      { name: "description", content: "Live now-serving and rotation display board for branch waiting area." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Live Queue Display Board" },
    ],
  }),
  component: DisplayBoardScreen,
});

/* ─── CONSTANTS ─────────────────────────────────────────────── */
const ANNOUNCEMENT_DURATION_MS = 8_000; // 8 seconds per call-next announcement

/* ─── CLOCK HOOK ────────────────────────────────────────────── */
function useLiveClock() {
  const [clock, setClock] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDate(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { clock, date };
}

/* ─── ANNOUNCEMENT EVENT PAYLOAD ────────────────────────────── */
interface AnnouncementPayload {
  type: string;
  event: string;
  timestamp: string;
  seq_num: number;
  data: {
    terminal_id: number;
    terminal_identifier: string;
    ticket_id: string;
    token_number: string;
    customer_name: string;
    desk_id: string;
    desk_name: string;
    service_name: string;
    called_at: string;
    sequence: number;
  };
}

/* ─── MAIN DISPLAY BOARD SCREEN ─────────────────────────────── */
function DisplayBoardScreen() {
  const { companySlug, branchSlug } = Route.useParams();
  const { clock, date } = useLiveClock();

  // Branch & Company Resolution
  const [company, setCompany] = useState<any | null>(null);
  const [branch, setBranch] = useState<any | null>(null);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingSlugs, setIsLoadingSlugs] = useState(true);
  const [slugError, setSlugError] = useState<"company_not_found" | "branch_not_found" | "branch_inactive" | null>(null);

  // Terminals & Passcode State
  const [terminalsList, setTerminalsList] = useState<any[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>("");
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isSubmittingPasscode, setIsSubmittingPasscode] = useState(false);
  const [evictionReason, setEvictionReason] = useState<string | null>(null);

  const fetchBaseUrl = typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://localhost:8000";

  const branchId = branch?.id ? String(branch.id) : "";

  // Terminal-Scoped LocalStorage state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Load Company & Branch by Slug
  useEffect(() => {
    const resolve = async () => {
      try {
        const compRes = await fetch(`${fetchBaseUrl}/api/companies/by-slug/${companySlug}/`);
        if (!compRes.ok) {
          setSlugError(compRes.status === 403 ? "branch_inactive" : "company_not_found");
          setIsLoadingSlugs(false);
          return;
        }
        const comp = await compRes.json();
        setCompany(comp);

        const brRes = await fetch(`${fetchBaseUrl}/api/companies/${companySlug}/branches/by-slug/${branchSlug}/`);
        if (!brRes.ok) {
          setSlugError(brRes.status === 403 ? "branch_inactive" : "branch_not_found");
          setIsLoadingSlugs(false);
          return;
        }
        const br = await brRes.json();
        setBranch(br);
      } catch (e) {
        console.error("Slug resolution failed:", e);
        setSlugError("branch_not_found");
      } finally {
        setIsLoadingSlugs(false);
      }
    };
    resolve();
  }, [companySlug, branchSlug]);

  // Load Display Terminals for Branch
  useEffect(() => {
    if (!branchId) return;
    fetch(`${fetchBaseUrl}/api/public/display-terminals/?branch_id=${branchId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTerminalsList(data);
          if (data.length > 0) {
            const savedTermId = localStorage.getItem(`display_selected_id_${branchId}`);
            const initialTermId = savedTermId && data.some((t: any) => String(t.id) === savedTermId)
              ? savedTermId
              : String(data[0].id);

            setSelectedTerminalId(initialTermId);

            // Read terminal-scoped unlock & session token from localStorage
            const savedUnlocked = localStorage.getItem(`display_unlocked_${branchId}_${initialTermId}`) === "true";
            const savedToken = localStorage.getItem(`display_session_token_${branchId}_${initialTermId}`);
            setIsUnlocked(savedUnlocked && !!savedToken);
            setSessionToken(savedToken);
          }
        }
      })
      .catch((err) => console.error("Failed to fetch display terminals:", err));
  }, [branchId]);

  // When selected terminal changes, update terminal-scoped storage
  const handleSelectTerminal = (termId: string) => {
    setSelectedTerminalId(termId);
    if (branchId) {
      localStorage.setItem(`display_selected_id_${branchId}`, termId);
      const savedUnlocked = localStorage.getItem(`display_unlocked_${branchId}_${termId}`) === "true";
      const savedToken = localStorage.getItem(`display_session_token_${branchId}_${termId}`);
      setIsUnlocked(savedUnlocked && !!savedToken);
      setSessionToken(savedToken);
    }
  };

  // Passcode Authentication Submission
  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTerminalId) {
      setPasscodeError("Please select a display terminal.");
      return;
    }
    if (!passcode.trim()) {
      setPasscodeError("Passcode is required.");
      return;
    }

    setIsSubmittingPasscode(true);
    setPasscodeError(null);

    try {
      const res = await fetch(`${fetchBaseUrl}/api/public/display-terminals/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminal_id: selectedTerminalId,
          passcode: passcode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasscodeError(data.error || "Invalid passcode.");
        return;
      }

      const newToken = data.session_token;
      setSessionToken(newToken);
      setIsUnlocked(true);
      setEvictionReason(null);

      // Save terminal-scoped unlock & token
      if (branchId && selectedTerminalId) {
        localStorage.setItem(`display_unlocked_${branchId}_${selectedTerminalId}`, "true");
        localStorage.setItem(`display_session_token_${branchId}_${selectedTerminalId}`, newToken);
      }
    } catch (err: any) {
      setPasscodeError("Failed to connect to authentication server.");
    } finally {
      setIsSubmittingPasscode(false);
    }
  };

  // Public Data Loader
  const loadPublicData = async () => {
    if (!branchId) return;
    try {
      const res = await fetch(`${fetchBaseUrl}/api/public/display/${branchId}/`);
      if (!res.ok) return;
      const data = await res.json();
      setDesks(data.desks || []);
      setServices(data.services || []);
      setTickets(data.tickets || []);
    } catch (err) {
      console.warn("Display data load failed:", err);
    }
  };

  useEffect(() => {
    if (isUnlocked && branchId) {
      loadPublicData();
      const intervalId = setInterval(loadPublicData, 15000); // 15s poll backup
      return () => clearInterval(intervalId);
    }
  }, [isUnlocked, branchId]);

  // WebSocket Live Connection, Heartbeat & Announcement Router
  const [announcementQueue, setAnnouncementQueue] = useState<AnnouncementPayload[]>([]);

  useEffect(() => {
    if (!isUnlocked || !selectedTerminalId || !sessionToken || !branchId) return;

    const wsHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const wsUrl = `ws://${wsHost}:8000/ws/queue/${branchId}/public/?display_id=${selectedTerminalId}&session_token=${sessionToken}`;
    const ws = new WebSocket(wsUrl);

    let heartbeatTimer: NodeJS.Timeout;

    ws.onopen = () => {
      console.log("Display Terminal WebSocket connected");
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // 1. Single Active Session Eviction / Force Logout
        if (payload && payload.type === "force_logout") {
          const reasonMsg = payload.message || "This display terminal was opened on another screen";
          setEvictionReason(reasonMsg);
          setIsUnlocked(false);
          setSessionToken(null);

          if (branchId && selectedTerminalId) {
            localStorage.setItem(`display_unlocked_${branchId}_${selectedTerminalId}`, "false");
            localStorage.removeItem(`display_session_token_${branchId}_${selectedTerminalId}`);
          }
          return;
        }

        // 2. Real-Time Call-Next Announcement Routing
        if (payload && payload.type === "display.announcement" && payload.event === "now_calling") {
          const ann = payload as AnnouncementPayload;

          setAnnouncementQueue((prev) => {
            const exists = prev.some((a) => a.data.ticket_id === ann.data.ticket_id && a.seq_num === ann.seq_num);
            if (exists) return prev;
            return [...prev, ann].sort((a, b) => a.seq_num - b.seq_num);
          });
        }

        // 3. General Queue Updates
        if (payload && payload.type === "queue.update" && payload.data) {
          const t = payload.data;
          const mapped: Ticket = {
            id: String(t.id),
            branchId: String(t.branch),
            serviceId: t.service ? String(t.service) : "",
            deskId: t.desk ? String(t.desk) : null,
            predictedDeskId: t.predicted_desk ? String(t.predicted_desk) : null,
            number: t.token_number,
            status: t.status,
            customerName: t.customer_name || "Guest",
            contact: "",
            joinedAt: new Date(t.created_at).getTime(),
            calledAt: t.called_at ? new Date(t.called_at).getTime() : undefined,
            servedAt: t.served_at ? new Date(t.served_at).getTime() : undefined
          };

          setTickets((prev) => {
            const removeStatuses = ["served", "cancelled", "skipped", "no_show"];
            if (removeStatuses.includes(mapped.status)) {
              return prev.filter((x) => x.id !== mapped.id);
            }
            const exists = prev.some((x) => x.id === mapped.id);
            if (exists) {
              return prev.map((x) => (x.id === mapped.id ? mapped : x));
            } else {
              return [...prev, mapped].sort((a, b) => a.joinedAt - b.joinedAt);
            }
          });
        }
      } catch (err) {
        console.error("Error processing display websocket message:", err);
      }
    };

    return () => {
      clearInterval(heartbeatTimer);
      ws.close();
    };
  }, [isUnlocked, selectedTerminalId, sessionToken, branchId]);

  // Announcement Queue Processing Timer (8 seconds per announcement)
  const currentAnnouncement = announcementQueue.length > 0 ? announcementQueue[0] : null;

  useEffect(() => {
    if (!currentAnnouncement) return;

    const timer = setTimeout(() => {
      setAnnouncementQueue((prev) => prev.slice(1));
    }, ANNOUNCEMENT_DURATION_MS);

    return () => clearTimeout(timer);
  }, [currentAnnouncement]);

  // Selected Terminal Details & Slot Rotation State Machine
  const selectedTerminal = terminalsList.find((t) => String(t.id) === String(selectedTerminalId));
  const rawSlots: any[] = selectedTerminal?.slots || [];
  const rotationSeconds = selectedTerminal?.rotation_seconds || 10;

  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);

  // Cycle currentSlotIndex every rotationSeconds, ONLY when no announcement is active
  useEffect(() => {
    if (!isUnlocked || rawSlots.length <= 1 || !!currentAnnouncement) return;

    const intervalId = setInterval(() => {
      setCurrentSlotIndex((prev) => (prev + 1) % rawSlots.length);
    }, rotationSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [isUnlocked, rawSlots.length, rotationSeconds, currentAnnouncement]);

  // Determine active desks for the current slot
  const currentSlot = rawSlots.length > 0 ? rawSlots[currentSlotIndex % rawSlots.length] : null;
  const currentSlotDeskIds = (currentSlot?.desk_ids || (currentSlot?.desks || [])).map(String);

  const activeDesks = rawSlots.length > 0
    ? desks.filter((d) => currentSlotDeskIds.includes(String(d.id)))
    : desks; // Fallback mode: show all desks if no slots configured

  // Dynamic Responsive Grid Layout based on Active Desk Count & Screen Width
  const getGridClasses = (count: number) => {
    if (count === 1) return "grid-cols-1 max-w-3xl mx-auto w-full";
    if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto w-full";
    if (count === 3) return "grid-cols-1 md:grid-cols-3 max-w-7xl mx-auto w-full";
    if (count === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full";
    return "grid-cols-[repeat(auto-fit,minmax(300px,1fr))] w-full";
  };

  /* ── Slug resolution states ── */
  if (isLoadingSlugs) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-xs uppercase tracking-widest text-white/40">Resolving Display Terminal...</p>
        </div>
      </div>
    );
  }

  if (slugError === "company_not_found" || slugError === "branch_not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center text-white bg-slate-950 font-sans px-6">
        <div className="max-w-md w-full border border-white/10 rounded-3xl p-8 text-center space-y-4 bg-white/5 backdrop-blur-xl shadow-2xl">
          <div className="text-xl font-bold">Display Board Error</div>
          <p className="text-sm text-white/50 leading-normal font-sans">
            We couldn't resolve the branch display for <code>{companySlug}/{branchSlug}</code>.
          </p>
        </div>
      </div>
    );
  }

  /* ── UNLOCKED PASSPHRASE ENTRY / LOCKED SCREEN ── */
  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full border border-white/10 rounded-3xl p-8 bg-slate-900/90 backdrop-blur-2xl shadow-2xl space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Display Terminal Locked</h1>
            <p className="text-xs text-white/50">
              Select a display terminal and enter its 4-digit passcode to unlock.
            </p>
          </div>

          {evictionReason && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{evictionReason}</span>
            </div>
          )}

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            {terminalsList.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-white/50">
                  Select Display Terminal
                </label>
                <select
                  value={selectedTerminalId}
                  onChange={(e) => handleSelectTerminal(e.target.value)}
                  className="w-full h-10 rounded-xl bg-slate-800 border border-white/10 px-3 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {terminalsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.terminal_identifier} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-white/50">
                4-Digit Passcode
              </label>
              <input
                type="password"
                maxLength={8}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                className="w-full h-11 rounded-xl bg-slate-800 border border-white/10 text-center font-mono text-lg font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 tracking-widest"
              />
            </div>

            {passcodeError && (
              <p className="text-xs text-red-400 font-semibold text-center">{passcodeError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmittingPasscode}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmittingPasscode ? "Authenticating..." : "Unlock Display Board"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const brandPrimary = company?.brandColors?.primary ?? "#6366F1";

  return (
    <div
      className="h-screen w-screen flex flex-col text-white overflow-hidden relative select-none"
      style={{
        background: `linear-gradient(160deg, #090a15 0%, #0d0e24 55%, #101132 100%)`,
        fontFamily: "'Inter', 'Outfit', sans-serif",
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 15% 0%, ${brandPrimary}55 0%, transparent 70%)`,
        }}
      />

      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-3.5 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt={company.name ?? ""} className="h-9 w-9 object-contain rounded-xl shrink-0" />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-sm text-white shadow-lg"
              style={{ background: brandPrimary }}
            >
              {company?.name?.[0] ?? "Q"}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-white truncate">{company?.name}</div>
            <div className="text-[11px] text-white/50 truncate">
              {branch?.name} · {selectedTerminal?.terminal_identifier || "Display Board"}
            </div>
          </div>
        </div>

        {/* Slot Rotation Indicator */}
        {rawSlots.length > 1 && !currentAnnouncement && (
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold text-white/80 border border-white/10">
            <span>Slot {currentSlotIndex + 1} of {rawSlots.length}</span>
            <div className="flex items-center gap-1 ml-1">
              {rawSlots.map((_, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 rounded-full transition-all duration-300", i === currentSlotIndex ? "w-4 bg-emerald-400" : "w-1.5 bg-white/20")}
                />
              ))}
            </div>
          </div>
        )}

        <div className="text-right shrink-0">
          <div className="font-display text-2xl font-black tabular-nums tracking-wide text-white">{clock}</div>
          <div className="text-[11px] text-white/40 font-medium">{date}</div>
        </div>
      </header>

      {/* ── MAIN IDLE ROTATION DISPLAY ── */}
      <main className="relative z-10 flex-1 flex flex-col px-6 py-6 min-h-0 overflow-hidden">
        {activeDesks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <div className="text-5xl opacity-30">🖥️</div>
            <p className="text-base text-white/35">No desks assigned to this slot.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`slot-${currentSlotIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className={cn("grid gap-6 flex-1 min-h-0 items-stretch", getGridClasses(activeDesks.length))}
            >
              {activeDesks.map((desk) => {
                const servingTicket = tickets.find(
                  (t) => String(t.deskId) === String(desk.id) && (t.status === "serving" || t.status === "called")
                );
                const servingService = servingTicket?.serviceId
                  ? services.find((s) => String(s.id) === String(servingTicket.serviceId))
                  : null;

                const nextTickets = tickets
                  .filter((t) => t.status === "waiting" && String(t.predictedDeskId) === String(desk.id))
                  .sort((a, b) => a.joinedAt - b.joinedAt);

                return (
                  <div
                    key={desk.id}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-all duration-500 shadow-2xl flex-1 min-h-0",
                      servingTicket
                        ? "border-emerald-500/40 bg-gradient-to-b from-indigo-950/40 via-slate-900/80 to-slate-950/90 shadow-emerald-500/10"
                        : "border-white/10 bg-slate-900/60 backdrop-blur-xl"
                    )}
                  >
                    {/* Card Header: Desk Name & Status Badge */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
                      <span className="text-sm font-black uppercase tracking-widest text-white/90">
                        {desk.label || desk.name}
                      </span>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5",
                        servingTicket ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-white/50 border border-white/10"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", servingTicket ? "bg-emerald-400 animate-pulse" : "bg-white/40")} />
                        {servingTicket ? "Serving" : "Open"}
                      </span>
                    </div>

                    {/* NOW SERVING SECTION */}
                    <div className="flex flex-col items-center justify-center my-3 text-center shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                        Now Serving
                      </span>
                      <span className="font-display font-black text-6xl md:text-7xl text-white tracking-tight drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]">
                        {servingTicket?.number ?? "—"}
                      </span>

                      {servingTicket && (
                        <div className="mt-2 space-y-1">
                          <div className="text-sm font-extrabold text-emerald-400 tracking-wide">
                            {servingTicket.customerName || "Guest"}
                          </div>
                          {servingService && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-300 text-[10px] font-bold tracking-wider uppercase border border-white/10">
                              {servingService.name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* NEXT UP SECTION (Adaptive Height for all next-up tokens with Customer Name & Service) */}
                    <div className="border-t border-white/10 pt-4 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-2.5 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-indigo-400" /> Next Up ({nextTickets.length})
                        </span>
                      </div>

                      {nextTickets.length > 0 ? (
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                          {nextTickets.map((t) => {
                            const srv = t.serviceId ? services.find((s) => String(s.id) === String(t.serviceId)) : null;

                            return (
                              <div
                                key={t.id}
                                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm font-black text-white bg-white/10 px-2.5 py-1 rounded-xl shrink-0">
                                    {t.number}
                                  </span>
                                  <div className="text-left">
                                    <span className="text-xs font-bold text-white block leading-snug">
                                      {t.customerName || "Guest"}
                                    </span>
                                    {srv && (
                                      <span className="text-[9px] font-semibold text-indigo-300/80 block mt-0.5">
                                        {srv.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-white/30 italic">
                          No waiting tickets
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* ── REAL-TIME CALL ANNOUNCEMENT OVERLAY QUEUE ── */}
      <AnimatePresence>
        {currentAnnouncement && (
          <motion.div
            key={`announcement-${currentAnnouncement.seq_num}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-950/95 backdrop-blur-3xl"
          >
            <div className="relative max-w-3xl w-full border-2 border-emerald-400/50 rounded-3xl p-12 text-center space-y-8 bg-gradient-to-b from-indigo-950/80 to-slate-950/90 shadow-2xl shadow-emerald-500/20 overflow-hidden">
              {/* Flashing Ring Overlay */}
              <div className="absolute inset-0 bg-emerald-400/5 animate-pulse pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-400/20 text-emerald-400 text-xs font-extrabold uppercase tracking-widest">
                <Volume2 className="h-4 w-4 animate-bounce" /> Now Calling
              </div>

              <div className="space-y-2">
                <div className="text-sm font-extrabold uppercase tracking-[0.3em] text-white/60">Ticket Number</div>
                <div className="font-display font-black text-[clamp(6rem,18vw,12rem)] leading-none text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.4)]">
                  {currentAnnouncement.data.token_number}
                </div>

                {currentAnnouncement.data.customer_name && (
                  <div className="text-2xl font-extrabold text-white pt-2">
                    {currentAnnouncement.data.customer_name}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10">
                <div className="text-base text-white/70 font-medium">Please proceed immediately to</div>
                <div className="text-3xl font-black text-white uppercase tracking-wider">
                  {currentAnnouncement.data.desk_name}
                </div>
                {currentAnnouncement.data.service_name && (
                  <div className="text-sm text-indigo-300 font-semibold mt-1">
                    Service: {currentAnnouncement.data.service_name}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
