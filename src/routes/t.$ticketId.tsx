import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, MapPin, Timer, Users, Loader2, Clock } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { useQuesole, positionOf, apiFetch } from "@/lib/quesole/store";
import { CountUp, FlipNumber, motion } from "@/components/quesole/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/t/$ticketId")({
  head: () => ({
    meta: [
      { title: "Your live token — Quesole" },
      {
        name: "description",
        content: "Track your position in line and estimated wait time live, without refreshing.",
      },
      { property: "og:title", content: "Your live queue token" },
      { property: "og:description", content: "See your position and estimated wait in real time." },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const { ticketId } = Route.useParams();
  const { state } = useQuesole();
  const storeInfo = positionOf(state, ticketId);
  const [remoteInfo, setRemoteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(!storeInfo);

  useEffect(() => {
    let isMounted = true;
    const fetchTicket = async () => {
      try {
        const data = await apiFetch(`/api/public/ticket/${ticketId}/`);
        if (isMounted && data) {
          setRemoteInfo(data);
        }
      } catch (e) {
        console.error("Failed to fetch public ticket:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTicket();
    const interval = setInterval(fetchTicket, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium text-muted-foreground">Loading token details…</p>
        </div>
      </div>
    );
  }

  const info = storeInfo || (remoteInfo ? {
    ticket: {
      id: remoteInfo.id,
      branchId: remoteInfo.branchId,
      serviceId: remoteInfo.serviceId,
      deskId: remoteInfo.deskId,
      number: remoteInfo.number,
      customerName: remoteInfo.customerName,
      customerPhoto: remoteInfo.customerPhoto || remoteInfo.customer_photo,
      contact: remoteInfo.contact,
      note: remoteInfo.note,
      status: remoteInfo.status,
      joinedAt: remoteInfo.joinedAt
    },
    ahead: remoteInfo.ahead,
    eta: remoteInfo.eta,
    service: { name: remoteInfo.serviceName, avgMinutes: 15 }
  } : null);

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div>
          <h1 className="text-2xl font-bold">Token not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This token has expired or the demo data was reset.
          </p>
          <Button asChild variant="brand" className="mt-5">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { ticket, ahead, eta, service } = info;
  const branch = state.branches.find((b) => String(b.id) === String(ticket.branchId)) || { name: remoteInfo?.branchName || "Branch", companyId: remoteInfo?.companyId };
  const desk = state.desks.find((d) => String(d.id) === String(ticket.deskId)) || (remoteInfo?.deskLabel ? { label: remoteInfo.deskLabel } : null);
  const isNow = ticket.status === "serving" || ticket.status === "called";
  const isDone = ticket.status === "served";
  const progress = isDone ? 100 : isNow ? 92 : Math.max(8, 92 - ahead * 12);
  const estWait = eta;
  const company = state.companies.find((c) => String(c.id) === String(branch?.companyId));

  return (
    <div className="ambient min-h-screen bg-background px-5 py-8 flex flex-col justify-between">
      <div className="mx-auto max-w-lg w-full">
        <div className="mb-6 flex items-center justify-between">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt={company?.name || "Company Logo"} className="h-8 w-auto max-w-[160px] object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-600/20">
                {(company?.name || "C").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-black text-foreground tracking-tight">
                {company?.name || "Company Queue"}
              </span>
            </div>
          )}
          <span className="text-xs font-bold text-muted-foreground bg-accent px-2.5 py-1 rounded-full">{branch?.name}</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel overflow-hidden text-center"
        >
          <div
            className={cn(
              "px-6 py-9 text-primary-foreground transition-colors duration-700",
              isNow ? "bg-coral" : isDone ? "bg-emerald" : "bg-brand",
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-85">
              {remoteInfo?.isAppointment ? "Confirmed Appointment Pass" : isDone ? "Completed" : isNow ? "It's your turn" : "Your token"}
            </div>
            <div className="mt-1 font-display text-5xl sm:text-7xl font-bold tracking-tight">
              <FlipNumber value={ticket.number} />
            </div>
            <div className="mt-2 text-sm opacity-90 font-medium">
              {service?.name} · {branch?.name}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {remoteInfo?.isAppointment ? (
              <div className="grid grid-cols-2 gap-3">
                <Stat icon={Clock} label="Appointment Date" value={remoteInfo.appointmentDate || "Scheduled"} />
                <Stat icon={Timer} label="Time Slot" value={remoteInfo.slotTime || "10:00"} />
              </div>
            ) : !isDone && (
              <div className="grid grid-cols-3 gap-3">
                <Stat icon={Users} label="Ahead" value={ahead} />
                <Stat icon={Clock} label="Est. Wait" value={`~${estWait}m`} />
                <Stat icon={MapPin} label="Counter" value={desk?.label || "TBD"} />
              </div>
            )}

            {!remoteInfo?.isAppointment && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 rounded-full bg-accent overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {remoteInfo?.isAppointment ? (
              <div className="rounded-2xl bg-emerald/10 border border-emerald/30 p-4 text-emerald font-medium text-xs text-center">
                ✓ Your appointment is confirmed! Please present this pass or reference ID <strong className="text-foreground">{ticket.number}</strong> at the reception upon arrival.
              </div>
            ) : isNow ? (
              <div className="rounded-2xl bg-coral/10 border border-coral/30 p-4 text-coral font-medium text-xs">
                ⚡ Please proceed to <strong className="text-foreground">{desk?.label || "the counter"}</strong> immediately.
              </div>
            ) : isDone ? (
              <div className="rounded-2xl bg-emerald/10 border border-emerald/30 p-4 text-emerald font-medium text-xs">
                ✓ Thank you for visiting! Your service has been completed.
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Keep this page open — your position updates automatically. We'll highlight the screen
                when it's your turn.
              </p>
            )}

            <div className="rounded-2xl bg-accent/40 px-4 py-3 text-left text-xs text-muted-foreground flex items-center gap-3">
              {(ticket.customerPhoto || remoteInfo?.customerPhoto || remoteInfo?.customer_photo) ? (
                <img
                  src={ticket.customerPhoto || remoteInfo?.customerPhoto || remoteInfo?.customer_photo}
                  alt={ticket.customerName || "Customer Photo"}
                  className="h-10 w-10 rounded-full object-cover border border-primary/30 shrink-0 shadow-sm"
                />
              ) : null}
              <div>
                <div className="font-semibold text-foreground">{ticket.customerName}</div>
                {ticket.contact} {ticket.note ? `· ${ticket.note}` : ""}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="py-6 text-center text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5 border-t border-border/40 mt-12 bg-background/50">
        <span>Powered by</span>
        <Logo size={14} className="h-5 w-auto" />
      </footer>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-accent/50 px-3 py-3.5">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-1.5 font-display text-xl font-bold">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
