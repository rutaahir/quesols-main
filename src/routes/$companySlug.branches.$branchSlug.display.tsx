import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import { Lock, Layers, Monitor, RefreshCw, AlertCircle, CheckCircle, Volume2, Users, Sun, Moon, LogOut } from "lucide-react";
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

/* ─── HELPER TO SANITIZE IDENTIFIER STRINGS ───────────────── */
function cleanId(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === "" || s === "null" || s === "None" || s === "undefined" || s === "0") return null;
  return s;
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

  // Light / Dark Theme Switching State
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("display_theme") as "dark" | "light";
      if (saved) return saved;
    }
    return "dark";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("display_theme", nextTheme);
    }
  };

  // Logout PIN Verification Modal State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [logoutPin, setLogoutPin] = useState("");
  const [logoutPinError, setLogoutPinError] = useState<string | null>(null);
  const [isVerifyingLogoutPin, setIsVerifyingLogoutPin] = useState(false);

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

            // Verify session token with backend server
            const savedToken = localStorage.getItem(`display_session_token_${branchId}_${initialTermId}`);
            if (savedToken) {
              fetch(`${fetchBaseUrl}/api/public/display-terminals/verify-session/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ terminal_id: initialTermId, session_token: savedToken }),
              })
                .then((res) => res.json())
                .then((resData) => {
                  if (resData && resData.valid) {
                    setIsUnlocked(true);
                    setSessionToken(savedToken);
                  } else {
                    setIsUnlocked(false);
                    setSessionToken(null);
                    localStorage.setItem(`display_unlocked_${branchId}_${initialTermId}`, "false");
                    localStorage.removeItem(`display_session_token_${branchId}_${initialTermId}`);
                  }
                })
                .catch(() => {
                  setIsUnlocked(false);
                  setSessionToken(null);
                });
            } else {
              setIsUnlocked(false);
              setSessionToken(null);
            }
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
      const savedToken = localStorage.getItem(`display_session_token_${branchId}_${termId}`);
      if (savedToken) {
        fetch(`${fetchBaseUrl}/api/public/display-terminals/verify-session/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terminal_id: termId, session_token: savedToken }),
        })
          .then((res) => res.json())
          .then((resData) => {
            if (resData && resData.valid) {
              setIsUnlocked(true);
              setSessionToken(savedToken);
            } else {
              setIsUnlocked(false);
              setSessionToken(null);
              localStorage.setItem(`display_unlocked_${branchId}_${termId}`, "false");
              localStorage.removeItem(`display_session_token_${branchId}_${termId}`);
            }
          })
          .catch(() => {
            setIsUnlocked(false);
            setSessionToken(null);
          });
      } else {
        setIsUnlocked(false);
        setSessionToken(null);
      }
    }
  };

  // Passcode Authentication Submission (Unlock)
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

  // Passcode PIN Logout Verification Submission
  const handleLogoutWithPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoutPin.trim()) {
      setLogoutPinError("Passcode PIN is required.");
      return;
    }

    setIsVerifyingLogoutPin(true);
    setLogoutPinError(null);

    try {
      const res = await fetch(`${fetchBaseUrl}/api/public/display-terminals/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminal_id: selectedTerminalId,
          passcode: logoutPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLogoutPinError(data.error || "Incorrect passcode PIN. Logout denied.");
        return;
      }

      // PIN is correct! Perform Logout
      setIsUnlocked(false);
      setSessionToken(null);
      setIsLogoutModalOpen(false);
      setLogoutPin("");

      if (branchId && selectedTerminalId) {
        localStorage.setItem(`display_unlocked_${branchId}_${selectedTerminalId}`, "false");
        localStorage.removeItem(`display_session_token_${branchId}_${selectedTerminalId}`);
      }
    } catch (err) {
      setLogoutPinError("Failed to verify passcode with authentication server.");
    } finally {
      setIsVerifyingLogoutPin(false);
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

      const mappedTickets: Ticket[] = (data.tickets || []).map((t: any) => ({
        id: String(t.id),
        branchId: String(t.branch || branchId),
        serviceId: cleanId(t.service || t.service_id || t.serviceId) || "",
        deskId: cleanId(t.desk || t.desk_id || t.deskId),
        predictedDeskId: cleanId(t.predicted_desk || t.predicted_desk_id || t.predictedDeskId),
        number: t.token_number || t.number || "",
        status: t.status,
        customerName: t.customer_name || t.customerName || "",
        contact: t.contact || "",
        joinedAt: t.created_at ? new Date(t.created_at).getTime() : (t.joinedAt || Date.now()),
        calledAt: t.called_at ? new Date(t.called_at).getTime() : t.calledAt,
        servedAt: t.served_at ? new Date(t.served_at).getTime() : t.servedAt,
      }));

      setTickets(mappedTickets);
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

        // 3. General Queue & Desk Updates
        if (payload && payload.type === "queue.update" && payload.data) {
          if (payload.event === "desk_updated") {
            const d = payload.data;
            setDesks((prev) => {
              const exists = prev.some((x) => String(x.id) === String(d.id));
              if (exists) {
                return prev.map((x) =>
                  String(x.id) === String(d.id)
                    ? { ...x, status: d.status, isActive: d.is_active, label: d.name || d.label || x.label }
                    : x
                );
              }
              return [...prev, {
                id: String(d.id),
                branchId: String(d.branch || branchId),
                label: d.name || d.label || "Desk",
                serviceIds: d.service_ids || [],
                staffId: d.staff_id || null,
                status: d.status || "open",
                isActive: d.is_active !== undefined ? d.is_active : true
              }];
            });
            return;
          }

          const t = payload.data;
          if (t.token_number) {
            const mapped: Ticket = {
              id: String(t.id),
              branchId: String(t.branch),
              serviceId: t.service ? String(t.service) : "",
              deskId: t.desk ? String(t.desk) : null,
              predictedDeskId: t.predicted_desk ? String(t.predicted_desk) : null,
              number: t.token_number,
              status: t.status,
              customerName: "",
              contact: "",
              joinedAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
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

  // Dynamic Responsive Grid Layout taking 100% full screen width
  const getGridClasses = (count: number) => {
    if (count === 1) return "grid-cols-1 w-full max-w-full";
    if (count === 2) return "grid-cols-1 md:grid-cols-2 w-full max-w-full";
    if (count === 3) return "grid-cols-1 md:grid-cols-3 w-full max-w-full";
    if (count === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full max-w-full";
    return "grid-cols-1 md:grid-cols-3 lg:grid-cols-5 w-full max-w-full";
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
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "h-screen w-screen flex flex-col overflow-hidden relative select-none transition-colors duration-500",
        isDark ? "bg-[#090a15] text-white" : "bg-[#f8fafc] text-slate-900"
      )}
      style={{
        background: isDark
          ? `linear-gradient(160deg, #090a15 0%, #0d0e24 55%, #101132 100%)`
          : `linear-gradient(160deg, #f8fafc 0%, #f1f5f9 55%, #e2e8f0 100%)`,
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
      <header className={cn(
        "relative z-10 flex items-center justify-between px-8 py-3.5 border-b backdrop-blur-md shrink-0 transition-colors duration-500",
        isDark
          ? "border-white/[0.08] bg-white/[0.03] text-white"
          : "border-slate-200 bg-white/80 text-slate-900 shadow-xs"
      )}>
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
            <div className={cn("font-extrabold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>
              {company?.name}
            </div>
            <div className={cn("text-[11px] truncate", isDark ? "text-white/50" : "text-slate-500")}>
              {branch?.name} · {selectedTerminal?.terminal_identifier || "Display Board"}
            </div>
          </div>
        </div>

        {/* Slot Rotation Indicator */}
        {rawSlots.length > 1 && !currentAnnouncement && (
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border",
            isDark ? "bg-white/10 text-white/80 border-white/10" : "bg-slate-200/80 text-slate-700 border-slate-300"
          )}>
            <span>Slot {currentSlotIndex + 1} of {rawSlots.length}</span>
            <div className="flex items-center gap-1 ml-1">
              {rawSlots.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentSlotIndex
                      ? "w-4 bg-emerald-500"
                      : isDark ? "w-1.5 bg-white/20" : "w-1.5 bg-slate-400"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 shrink-0">
          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all duration-300 shadow-sm",
              isDark
                ? "bg-white/10 hover:bg-white/20 border-white/15 text-amber-300"
                : "bg-slate-200/90 hover:bg-slate-300/90 border-slate-300 text-slate-800"
            )}
            title="Toggle Light / Dark Theme"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-600" />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* PIN Protected Logout Button */}
          <button
            type="button"
            onClick={() => {
              setLogoutPin("");
              setLogoutPinError(null);
              setIsLogoutModalOpen(true);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all duration-300 shadow-sm",
              isDark
                ? "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300"
                : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700"
            )}
            title="Lock / Logout Display Board with PIN"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>

          <div className="text-right shrink-0">
            <div className={cn("font-display text-2xl font-black tabular-nums tracking-wide", isDark ? "text-white" : "text-slate-900")}>
              {clock}
            </div>
            <div className={cn("text-[11px] font-medium", isDark ? "text-white/40" : "text-slate-500")}>
              {date}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN IDLE ROTATION DISPLAY (100% Screen Width Utilization) ── */}
      <main className="relative z-10 flex-1 flex flex-col px-6 py-6 min-h-0 overflow-hidden w-full max-w-full">
        {activeDesks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <div className="text-5xl opacity-30">🖥️</div>
            <p className={cn("text-base", isDark ? "text-white/35" : "text-slate-400")}>
              No desks assigned to this slot.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`slot-${currentSlotIndex}-${theme}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className={cn("grid gap-6 flex-1 min-h-0 items-stretch w-full max-w-full", getGridClasses(activeDesks.length))}
            >
              {activeDesks.map((desk) => {
                const targetDeskId = String(desk.id);

                const servingTicket = tickets.find((t) => {
                  if (t.status !== "serving" && t.status !== "called") return false;
                  const dId = cleanId(t.deskId);
                  const pId = cleanId(t.predictedDeskId);
                  return dId === targetDeskId || pId === targetDeskId;
                });

                const servingService = servingTicket?.serviceId
                  ? services.find((s) => String(s.id) === String(servingTicket.serviceId))
                  : null;

                const nextTickets = tickets
                  .filter((t) => {
                    if (t.status !== "waiting") return false;
                    const dId = cleanId(t.deskId);
                    const pId = cleanId(t.predictedDeskId);
                    const sId = cleanId(t.serviceId);

                    // 1. Explicitly assigned desk
                    if (dId) return dId === targetDeskId;

                    // 2. Predicted desk
                    if (pId) return pId === targetDeskId;

                    // 3. Fallback for unassigned/unpredicted tickets: check desk service capability
                    if (sId && desk.serviceIds && desk.serviceIds.length > 0) {
                      return desk.serviceIds.map(cleanId).includes(sId);
                    }
                    return false;
                  })
                  .sort((a, b) => a.joinedAt - b.joinedAt);

                const isBreak = desk.status === "break";
                const isPaused = desk.status === "paused";
                const isOffline = desk.status === "offline";

                return (
                  <div
                    key={desk.id}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-all duration-500 shadow-2xl flex-1 min-h-0 w-full",
                      isDark
                        ? servingTicket
                          ? "border-emerald-500/40 bg-gradient-to-b from-indigo-950/40 via-slate-900/80 to-slate-950/90 shadow-emerald-500/10 text-white"
                          : isBreak
                          ? "border-amber-500/40 bg-gradient-to-b from-amber-950/30 via-slate-900/80 to-slate-950/90 shadow-amber-500/10 text-white"
                          : "border-white/10 bg-slate-900/60 backdrop-blur-xl text-white"
                        : servingTicket
                        ? "border-emerald-500/50 bg-gradient-to-b from-emerald-50/90 via-white to-indigo-50/40 shadow-emerald-500/15 text-slate-900"
                        : isBreak
                        ? "border-amber-500/50 bg-gradient-to-b from-amber-50/90 via-white to-amber-50/30 shadow-amber-500/15 text-slate-900"
                        : "border-slate-300/80 bg-white shadow-xl text-slate-900"
                    )}
                  >
                    {/* Card Header: Desk Name & Status Badge */}
                    <div className={cn(
                      "flex items-center justify-between border-b pb-3 mb-4 shrink-0",
                      isDark ? "border-white/10" : "border-slate-200"
                    )}>
                      <span className={cn(
                        "text-base md:text-lg font-black uppercase tracking-widest",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        {desk.label || desk.name}
                      </span>

                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-2xs",
                        isDark
                          ? servingTicket
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : isBreak
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                            : isPaused
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            : isOffline
                            ? "bg-white/5 text-white/40 border-white/10"
                            : "bg-white/10 text-white/80 border-white/20"
                          : servingTicket
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : isBreak
                          ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                          : isPaused
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : isOffline
                          ? "bg-slate-100 text-slate-500 border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        <span className={cn(
                          "h-2 w-2 rounded-full",
                          servingTicket && "bg-emerald-500 animate-pulse",
                          !servingTicket && isBreak && "bg-amber-500 animate-ping",
                          !servingTicket && isPaused && "bg-amber-400",
                          !servingTicket && isOffline && "bg-slate-400",
                          !servingTicket && !isBreak && !isPaused && !isOffline && "bg-emerald-500"
                        )} />
                        {servingTicket ? "Serving" : isBreak ? "☕ On Break" : isPaused ? "Paused" : isOffline ? "Offline" : "Open"}
                      </span>
                    </div>

                    {/* NOW SERVING / ON BREAK SECTION */}
                    {isBreak ? (
                      <div className="flex flex-col items-center justify-center my-4 text-center shrink-0 space-y-3">
                        <div className="h-20 w-20 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-4xl border border-amber-500/30 shadow-lg animate-bounce">
                          ☕
                        </div>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-wide uppercase">
                          Operator On Break
                        </div>
                        <div className={cn("text-xs font-medium", isDark ? "text-white/50" : "text-slate-500")}>
                          Counter will resume shortly
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center my-4 text-center shrink-0">
                        {/* BIG PROMINENT NOW SERVING HEADING */}
                        <span className={cn(
                          "text-base md:text-lg lg:text-xl font-black uppercase tracking-[0.25em] mb-2 font-display",
                          isDark ? "text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]" : "text-indigo-600"
                        )}>
                          Now Serving
                        </span>

                        {/* EXTRA BIG NOW SERVING TOKEN NUMBER - COLOR GREEN & SIZE BIG */}
                        <span className={cn(
                          "font-display font-black text-7xl md:text-8xl lg:text-9xl tracking-tight leading-none my-3 transition-all",
                          isDark
                            ? servingTicket ? "text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.6)]" : "text-white/20"
                            : servingTicket ? "text-emerald-600 drop-shadow-[0_4px_20px_rgba(16,185,129,0.3)]" : "text-slate-300"
                        )}>
                          {servingTicket?.number || "- -"}
                        </span>

                        {servingTicket && servingService && (
                          <div className="mt-1">
                            <span className={cn(
                              "inline-block px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase border shadow-sm",
                              isDark
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            )}>
                              {servingService.name}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* NEXT UP SECTION */}
                    <div className={cn(
                      "border-t pt-4 flex-1 flex flex-col min-h-0",
                      isDark ? "border-white/10" : "border-slate-200"
                    )}>
                      <div className="flex items-center justify-between mb-3 shrink-0 px-1">
                        <span className={cn(
                          "text-xs font-black uppercase tracking-widest flex items-center gap-1.5",
                          isDark ? "text-white/50" : "text-slate-600"
                        )}>
                          <Users className="h-4 w-4 text-indigo-500" /> Next Up ({nextTickets.length})
                        </span>
                      </div>

                      {nextTickets.length > 0 ? (
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar min-h-0 flex flex-col">
                          {/* 1. FIRST 3 TOKENS: BIG & VERTICAL */}
                          <div className="space-y-2.5">
                            {nextTickets.slice(0, 3).map((t) => {
                              const srv = t.serviceId ? services.find((s) => String(s.id) === String(t.serviceId)) : null;

                              return (
                                <div
                                  key={t.id}
                                  className={cn(
                                    "flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all shadow-sm gap-4",
                                    isDark
                                      ? "bg-indigo-500/15 border-indigo-500/30 text-white hover:bg-indigo-500/25"
                                      : "bg-indigo-50/80 border-indigo-200 text-slate-900 hover:bg-indigo-100/80"
                                  )}
                                >
                                  {/* BIG & VERTICAL TOKEN NUMBER */}
                                  <span className={cn(
                                    "font-display text-3xl md:text-4xl lg:text-5xl font-black tracking-wider text-center flex-1 font-mono",
                                    isDark ? "text-indigo-300" : "text-indigo-800"
                                  )}>
                                    {t.number || `A${String(t.id).padStart(3, '0')}`}
                                  </span>

                                  {srv ? (
                                    <span className={cn(
                                      "text-xs font-black px-3 py-1 rounded-xl border uppercase tracking-wider shrink-0 text-center",
                                      isDark
                                        ? "bg-white/10 text-slate-300 border-white/15"
                                        : "bg-white text-indigo-900 border-indigo-200 shadow-2xs"
                                    )}>
                                      {srv.name}
                                    </span>
                                  ) : (
                                    <span className={cn(
                                      "text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0 text-center opacity-75",
                                      isDark
                                        ? "bg-white/10 text-white/70 border border-white/15"
                                        : "bg-slate-200/80 text-slate-700 border border-slate-300/80"
                                    )}>
                                      Waiting
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* 2. REMAINING TOKENS: EXACTLY 3 TOKENS PER ROW FULL CARD WIDTH */}
                          {nextTickets.length > 3 && (
                            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-white/10 mt-2">
                              <div className="text-[10px] font-extrabold uppercase tracking-wider mb-2 opacity-60 px-1">
                                More Waiting Tokens ({nextTickets.length - 3})
                              </div>
                              <div className="grid grid-cols-3 gap-2 w-full max-h-44 overflow-y-auto no-scrollbar p-0.5">
                                {nextTickets.slice(3).map((t) => (
                                  <div
                                    key={t.id}
                                    className={cn(
                                      "w-full py-2 px-1 rounded-xl border transition-all font-display text-lg md:text-xl lg:text-2xl font-black font-mono tracking-wide text-center flex items-center justify-center shadow-2xs truncate",
                                      isDark
                                        ? "bg-slate-800/90 text-indigo-300 border-indigo-500/30 hover:bg-slate-800"
                                        : "bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-50"
                                    )}
                                  >
                                    {t.number || `A${String(t.id).padStart(3, '0')}`}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={cn(
                          "flex-1 flex items-center justify-center text-xs italic font-medium",
                          isDark ? "text-white/30" : "text-slate-400"
                        )}>
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
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-8 backdrop-blur-3xl",
              isDark ? "bg-slate-950/95" : "bg-slate-900/90"
            )}
          >
            <div className={cn(
              "relative max-w-3xl w-full border-2 border-emerald-400/50 rounded-3xl p-12 text-center space-y-8 shadow-2xl shadow-emerald-500/20 overflow-hidden",
              isDark
                ? "bg-gradient-to-b from-indigo-950/80 to-slate-950/90 text-white"
                : "bg-white text-slate-900"
            )}>
              {/* Flashing Ring Overlay */}
              <div className="absolute inset-0 bg-emerald-400/5 animate-pulse pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-400/20 text-emerald-500 text-xs font-extrabold uppercase tracking-widest">
                <Volume2 className="h-4 w-4 animate-bounce" /> Now Calling
              </div>

              <div className="space-y-2">
                <div className={cn("text-sm font-extrabold uppercase tracking-[0.3em]", isDark ? "text-white/60" : "text-slate-500")}>
                  Ticket Number
                </div>
                {/* HUGE ANNOUNCEMENT TOKEN NUMBER */}
                <div className="font-display font-black text-[clamp(7rem,22vw,14rem)] leading-none text-emerald-500 drop-shadow-[0_0_35px_rgba(52,211,153,0.4)]">
                  {currentAnnouncement.data.token_number}
                </div>
              </div>

              <div className={cn("space-y-2 pt-4 border-t", isDark ? "border-white/10" : "border-slate-200")}>
                <div className={cn("text-base font-medium", isDark ? "text-white/70" : "text-slate-600")}>
                  Please proceed immediately to
                </div>
                <div className={cn("text-4xl font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  {currentAnnouncement.data.desk_name}
                </div>
                {currentAnnouncement.data.service_name && (
                  <div className="text-sm text-indigo-500 font-bold mt-1 uppercase tracking-wide">
                    Service: {currentAnnouncement.data.service_name}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PIN-PROTECTED LOGOUT VERIFICATION MODAL ── */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full border border-white/10 rounded-3xl p-6 bg-slate-900 text-white shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-white">PIN Logout Verification</h3>
                    <p className="text-xs text-white/50">Enter terminal passcode PIN to authorize logout</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="text-white/60 hover:text-white text-sm p-1 rounded-full"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLogoutWithPinSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-white/50">
                    Terminal Passcode PIN
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    autoFocus
                    value={logoutPin}
                    onChange={(e) => setLogoutPin(e.target.value)}
                    placeholder="Enter PIN"
                    className="w-full h-11 rounded-xl bg-slate-800 border border-white/10 text-center font-mono text-xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-rose-500 tracking-widest"
                  />
                </div>

                {logoutPinError && (
                  <p className="text-xs text-red-400 font-bold text-center bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                    {logoutPinError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingLogoutPin}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isVerifyingLogoutPin ? "Verifying PIN..." : "Confirm Logout"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
