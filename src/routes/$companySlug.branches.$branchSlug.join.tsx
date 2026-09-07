import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Loader2, MapPin, QrCode, ShieldAlert, Compass, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, HelpCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "../lib/api-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/site/logo";
import { useQuesole, waitingOf } from "@/lib/quesole/store";
import { motion } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$companySlug/branches/$branchSlug/join")({
  head: () => ({
    meta: [
      { title: "Join the queue — Quesole" },
      {
        name: "description",
        content: "Scan, pick your service and get a live token with your position and wait time.",
      },
      { property: "og:title", content: "Join the queue with Quesole" },
      { property: "og:description", content: "Get a digital token and track your place in line." },
    ],
  }),
  component: JoinQueue,
});

function JoinQueue() {
  const { companySlug, branchSlug } = Route.useParams();
  const { state, actions } = useQuesole();
  const navigate = useNavigate();

  // ── 1. ALL HOOKS DECLARED UNCONDITIONALLY AT TOP LEVEL ──
  const [resolvedBranch, setResolvedBranch] = useState<any | null>(null);
  const [resolvedCompany, setResolvedCompany] = useState<any | null>(null);
  const [publicServices, setPublicServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<"company_not_found" | "branch_not_found" | "branch_inactive" | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Geofence states
  const [geoStatus, setGeoStatus] = useState<"checking" | "passed" | "blocked" | "denied" | "unavailable" | "timeout" | "bypassed">("bypassed");
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const fetchBaseUrl = typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://localhost:8000";

  // Resolve Company & Branch Slugs
  useEffect(() => {
    const resolveSlugs = async () => {
      setIsLoading(true);
      setErrorType(null);
      try {
        const compRes = await fetch(`${fetchBaseUrl}/api/companies/by-slug/${companySlug}/`);
        if (!compRes.ok) {
          setErrorType(compRes.status === 403 ? "branch_inactive" : "company_not_found");
          setIsLoading(false);
          return;
        }
        const comp = await compRes.json();
        setResolvedCompany(comp);

        const brRes = await fetch(`${fetchBaseUrl}/api/companies/${companySlug}/branches/by-slug/${branchSlug}/`);
        if (!brRes.ok) {
          setErrorType(brRes.status === 403 ? "branch_inactive" : "branch_not_found");
          setIsLoading(false);
          return;
        }
        const br = await brRes.json();
        setResolvedBranch(br);
      } catch (err: any) {
        console.error("Join slug resolution failed:", err);
        setErrorType("branch_not_found");
      } finally {
        setIsLoading(false);
      }
    };
    resolveSlugs();
  }, [companySlug, branchSlug, fetchBaseUrl]);

  const branch = resolvedBranch;
  const company = resolvedCompany;
  const branchId = branch?.id ? String(branch.id) : "";

  // Fetch Public Branch Services
  useEffect(() => {
    if (!branchId) return;
    fetch(`${fetchBaseUrl}/api/public/display/${branchId}/`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.services)) {
          setPublicServices(data.services);
        }
      })
      .catch((e) => console.warn("Failed to load public services:", e));
  }, [branchId, fetchBaseUrl]);

  const isGeofenceRequired = Boolean(
    branch &&
    branch.method >= 1 &&
    branch.method <= 3 &&
    branch.geofenceEnabled &&
    branch.geoLat !== undefined &&
    branch.geoLng !== undefined
  );

  // Helper function for geofence verification
  const handlePositionSuccess = useCallback(async (pos: GeolocationPosition) => {
    if (!branch) return;
    const lat = Number(pos.coords.latitude.toFixed(6));
    const lng = Number(pos.coords.longitude.toFixed(6));
    setDetectedCoords({ lat, lng });

    try {
      const res = await fetch(getApiUrl("/api/public/verify-location/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: branch.id, lat, lng })
      });
      const data = await res.json();
      if (data.is_within_geofence) {
        setDistanceMeters(data.distance_meters);
        setGeoStatus("passed");
      } else {
        setDistanceMeters(data.distance_meters);
        setGeoStatus("blocked");
      }
    } catch {
      if (branch.geoLat !== undefined && branch.geoLng !== undefined) {
        const R = 6371000;
        const dLat = ((branch.geoLat - lat) * Math.PI) / 180;
        const dLng = ((branch.geoLng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((branch.geoLat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = Math.round(R * c);
        setDistanceMeters(dist);
        setGeoStatus(dist <= (branch.geofenceRadiusMeters ?? 200) ? "passed" : "blocked");
      } else {
        setGeoStatus("passed");
      }
    }
  }, [branch]);

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setGeoStatus("denied");
      setGeoErrorMessage("permission_denied");
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      setGeoStatus("unavailable");
      setGeoErrorMessage("unavailable");
    } else if (err.code === err.TIMEOUT) {
      setGeoStatus("timeout");
      setGeoErrorMessage("timeout");
    } else {
      setGeoStatus("denied");
      setGeoErrorMessage(err.message || "Location permission denied or unavailable.");
    }
  }, []);

  const verifyLocation = useCallback(async () => {
    if (!branch || !isGeofenceRequired) {
      setGeoStatus("bypassed");
      return;
    }

    if (!navigator.geolocation) {
      setGeoErrorMessage("Geolocation is not supported by your browser.");
      setGeoStatus("denied");
      return;
    }

    setGeoStatus("checking");
    setGeoErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePositionSuccess(pos);
      },
      (err1) => {
        if (err1.code === err1.PERMISSION_DENIED) {
          handlePositionError(err1);
          return;
        }
        console.warn("High accuracy location query failed, retrying with low accuracy...", err1);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handlePositionSuccess(pos);
          },
          (err2) => {
            handlePositionError(err2);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [branch, isGeofenceRequired, handlePositionSuccess, handlePositionError]);

  // Trigger geofence check on branch load
  useEffect(() => {
    if (isGeofenceRequired && branch) {
      verifyLocation();
    }
  }, [isGeofenceRequired, branch, verifyLocation]);

  // Derived variables
  const branchServices = publicServices.length > 0
    ? publicServices
    : state.services.filter((s) => String(s.branchId) === String(branchId));

  const activeServiceId = serviceId || branchServices[0]?.id || "";

  // ── 2. CONDITIONAL RENDERINGS (AFTER ALL HOOKS ARE DECLARED) ──
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Join Page...</p>
        </div>
      </div>
    );
  }

  if (errorType === "company_not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">We couldn't find that company</h2>
          <p className="text-sm text-muted-foreground">The organization slug matches no active account.</p>
        </div>
      </div>
    );
  }

  if (errorType === "branch_not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Branch not found</h2>
          <p className="text-sm text-muted-foreground leading-normal">
            We couldn't find that branch for <strong className="text-foreground">{company?.name || companySlug.toUpperCase()}</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (errorType === "branch_inactive") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Branch inactive</h2>
          <p className="text-sm text-muted-foreground">
            The branch <strong className="text-foreground">{branchSlug}</strong> is currently deactivated or suspended.
          </p>
        </div>
      </div>
    );
  }

  const selectedService = branchServices.find((s) => String(s.id) === String(activeServiceId)) ?? branchServices[0];
  const waitMinutes = selectedService ? selectedService.estServiceMinutes ?? 15 : 15;
  const currentWaitingCount = activeServiceId
    ? waitingOf(state, activeServiceId).length
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServiceId) {
      toast.error("Please pick a service to join the queue.");
      return;
    }
    if (isGeofenceRequired && geoStatus !== "passed") {
      toast.error("Location verification required. Please allow location access to join queue.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        branch_id: branchId,
        service_id: activeServiceId,
        customer_name: name.trim() || "Guest",
        customer_phone: contact.trim(),
        customer_email: email.trim(),
        note: note.trim(),
        user_lat: detectedCoords?.lat,
        user_lng: detectedCoords?.lng,
        consent: true,
      };

      const res = await fetch(`${fetchBaseUrl}/api/public/join/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || data.detail || "Failed to join queue.");
        return;
      }

      toast.success("Joined queue successfully!");
      if (data.tracking_code) {
        navigate({
          to: "/t/$ticketId",
          params: { ticketId: data.tracking_code },
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ambient min-h-screen bg-[#FAFAFA] dark:bg-[#0B0F19] text-foreground font-sans flex flex-col justify-between">
      <div>
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt={company?.name || "Company Logo"} className="h-9 w-auto max-w-[180px] object-contain" />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-600/20">
                    {(company?.name || companySlug || "C").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-base font-black text-foreground tracking-tight">
                    {company?.name || companySlug.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-muted-foreground">{branch?.name || branchSlug}</span>
            </div>
          </div>
        </header>

      <main className="max-w-xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Join Branch Queue</h1>
          <p className="text-xs text-muted-foreground">Select your required service and get a live digital token on your smartphone.</p>
        </div>

        {/* Geofence Check Banner if Enabled */}
        {isGeofenceRequired && (
          <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className={cn("h-4 w-4", geoStatus === "passed" ? "text-emerald-500" : "text-amber-500")} />
                <span className="text-xs font-bold">Branch Location Verification</span>
              </div>
              <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border", geoStatus === "passed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                {geoStatus === "passed" ? "Verified Nearby" : geoStatus === "checking" ? "Checking Location..." : "Location Required"}
              </span>
            </div>

            {geoStatus !== "passed" && (
              <Button size="sm" variant="outline" onClick={verifyLocation} className="w-full h-8 text-xs font-bold gap-1.5">
                <Compass className="h-3.5 w-3.5" /> Re-verify My Location
              </Button>
            )}
          </div>
        )}

        {/* Service Picker */}
        <div className="space-y-3">
          <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
            Select Service *
          </Label>
          <div className="grid gap-2">
            {branchServices.map((s) => {
              const isSelected = String(s.id) === String(activeServiceId);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setServiceId(String(s.id))}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 shadow-sm",
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-foreground ring-2 ring-indigo-600/20"
                      : "border-border/80 bg-card hover:border-indigo-600/40"
                  )}
                >
                  <div>
                    <div className="font-extrabold text-sm text-foreground flex items-center gap-2">
                      <span>{s.name}</span>
                      {s.prefix && (
                        <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                          {s.prefix}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">~{s.estServiceMinutes || 15} mins per visitor</p>
                  </div>

                  <span className={cn("h-5 w-5 rounded-full flex items-center justify-center border transition-all", isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-border")}>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Customer Information Form */}
        <form onSubmit={handleSubmit} className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Your Name *</Label>
            <Input
              required
              placeholder="e.g. Harshil Patel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-xs font-semibold rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Mobile Phone</Label>
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="h-10 text-xs font-semibold rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Email (Optional)</Label>
              <Input
                type="email"
                placeholder="e.g. name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs font-semibold rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Notes / Purpose (Optional)</Label>
            <Textarea
              rows={2}
              placeholder="Add any specific inquiry details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs rounded-xl resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={busy || (isGeofenceRequired && geoStatus !== "passed")}
            className="w-full h-11 text-xs font-extrabold uppercase tracking-wider rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
          >
            {busy ? "Generating Token..." : "Get Queue Token"}
          </Button>

          <p className="text-[11px] text-center text-muted-foreground pt-1">
            By obtaining a token, you agree to processing your visit details for live queue updates.
          </p>
        </form>
      </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5 border-t border-border/40 mt-12 bg-background/50">
        <span>Powered by</span>
        <span className="font-extrabold tracking-tight text-foreground">Quesoles</span>
      </footer>
    </div>
  );
}
