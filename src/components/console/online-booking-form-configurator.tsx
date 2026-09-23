import { useState, useEffect } from "react";
import {
  Camera, Upload, Eye, Save,
  FileText, User, Phone, Mail, MessageSquare, Calendar,
  Sparkles, Layers, RefreshCw, Smartphone,
  Zap, Check, ArrowUpRight, Sliders
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/quesole/store";
import { cn } from "@/lib/utils";

type FieldState = "required" | "optional" | "hidden";

interface FieldDef {
  key: string;
  label: string;
  description: string;
  icon: any;
  locked?: boolean;
}

const FORM_FIELDS: FieldDef[] = [
  { key: "name", label: "Full Name", description: "Customer's name for booking verification", icon: User, locked: true },
  { key: "phone", label: "Mobile Phone Number", description: "Sends booking receipt and queue status via SMS", icon: Phone },
  { key: "email", label: "Email Address", description: "Sends confirmation email and OTP code", icon: Mail },
  { key: "service", label: "Service Selection", description: "Allows picking service category", icon: Layers },
  { key: "date_slot", label: "Appointment Date & Time", description: "Allows selecting appointment date and slot", icon: Calendar },
  { key: "message", label: "Notes / Special Instructions", description: "Customer can leave comments for their visit", icon: MessageSquare },
];

export function OnlineBookingFormConfigurator({ companyId, companySlug }: { companyId: string; companySlug?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Field states: 'required' | 'optional' | 'hidden'
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({
    name: "required",
    phone: "required",
    email: "optional",
    service: "required",
    date_slot: "required",
    message: "optional",
  });

  // Photo configuration
  const [photoMode, setPhotoMode] = useState<"none" | "capture" | "upload" | "both">("none");
  const [photoRequired, setPhotoRequired] = useState(false);
  const [photoLabel, setPhotoLabel] = useState("Customer Profile Photo / ID");

  // Portal Branding details
  const [portalName, setPortalName] = useState("");

  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      try {
        const data = await apiFetch("/api/company-booking-config/");
        if (data) {
          setPortalName(data.portal_name || "");
          setPhotoMode(data.photo_mode || "none");
          setPhotoRequired(Boolean(data.photo_required));

          const custFields: string[] = data.enabled_customer_fields || ["name", "email", "phone"];
          const bookFields: string[] = data.enabled_booking_fields || ["date_slot", "message"];
          const reqMap: Record<string, boolean> = data.form_field_configs?.required_fields || {};

          const updated: Record<string, FieldState> = {
            name: "required",
            phone: custFields.includes("phone") ? (reqMap["phone"] !== false ? "required" : "optional") : "hidden",
            email: custFields.includes("email") ? (reqMap["email"] ? "required" : "optional") : "hidden",
            service: "required",
            date_slot: bookFields.includes("date_slot") ? (reqMap["date_slot"] !== false ? "required" : "optional") : "hidden",
            message: bookFields.includes("message") ? (reqMap["message"] ? "required" : "optional") : "hidden",
          };

          setFieldStates(updated);

          if (data.form_field_configs?.photo_label) {
            setPhotoLabel(data.form_field_configs.photo_label);
          }
        }
      } catch (err: any) {
        console.error("Failed to load online booking form config:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, [companyId]);

  const applyPreset = (preset: "standard" | "verified" | "minimal") => {
    if (preset === "standard") {
      setFieldStates({
        name: "required",
        phone: "required",
        email: "optional",
        service: "required",
        date_slot: "required",
        message: "optional",
      });
      setPhotoMode("none");
      setPhotoRequired(false);
      toast.success("Applied 'Standard Booking' template");
    } else if (preset === "verified") {
      setFieldStates({
        name: "required",
        phone: "required",
        email: "required",
        service: "required",
        date_slot: "required",
        message: "optional",
      });
      setPhotoMode("capture");
      setPhotoRequired(true);
      setPhotoLabel("Selfie / ID Verification Photo");
      toast.success("Applied 'Verified Photo Booking' template");
    } else if (preset === "minimal") {
      setFieldStates({
        name: "required",
        phone: "required",
        email: "hidden",
        service: "required",
        date_slot: "required",
        message: "hidden",
      });
      setPhotoMode("none");
      setPhotoRequired(false);
      toast.success("Applied 'Express Minimal' template");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const custFields = ["name"];
      if (fieldStates["phone"] !== "hidden") custFields.push("phone");
      if (fieldStates["email"] !== "hidden") custFields.push("email");

      const bookFields: string[] = [];
      if (fieldStates["date_slot"] !== "hidden") bookFields.push("date_slot");
      if (fieldStates["message"] !== "hidden") bookFields.push("message");

      const reqMap: Record<string, boolean> = {
        name: true,
        phone: fieldStates["phone"] === "required",
        email: fieldStates["email"] === "required",
        service: true,
        date_slot: fieldStates["date_slot"] === "required",
        message: fieldStates["message"] === "required",
      };

      const payload = {
        enabled_customer_fields: custFields,
        enabled_booking_fields: bookFields,
        photo_mode: photoMode,
        photo_required: photoRequired,
        form_field_configs: {
          required_fields: reqMap,
          photo_label: photoLabel,
        }
      };

      await apiFetch("/api/company-booking-config/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      toast.success("Online Booking form settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save online booking settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 panel">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-brand" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="panel p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-border shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
            <Sliders className="h-3.5 w-3.5" /> Portal Customizer
          </div>
          <h2 className="font-display text-2xl font-black text-foreground tracking-tight">
            Online Booking Form Fields
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Customize which fields customers see when booking an appointment on your portal, and set optional photo verification requirements.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {companySlug && (
            <a
              href={`/${companySlug}/online-booking`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background hover:bg-accent px-4 py-2.5 text-xs font-bold text-foreground transition-all shadow-xs"
            >
              <Eye className="h-4 w-4 text-primary" /> Live Portal <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          <Button
            variant="brand"
            onClick={handleSave}
            disabled={isSaving}
            className="font-bold shadow-md gap-2 rounded-xl h-10 px-5 text-xs"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Quick Templates Bar */}
      <div className="panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border/80">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-foreground">Quick Setup Templates:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset("standard")}
            className="px-3.5 py-1.5 rounded-xl border border-border bg-background hover:bg-accent text-xs font-bold text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-brand" /> Standard Booking
          </button>
          <button
            type="button"
            onClick={() => applyPreset("verified")}
            className="px-3.5 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold text-purple-600 dark:text-purple-400 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" /> Verified Photo ID
          </button>
          <button
            type="button"
            onClick={() => applyPreset("minimal")}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" /> Express Minimal
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Settings */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Form Fields */}
          <div className="panel p-6 space-y-5 border border-border">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">1. Form Field Options</h3>
                <p className="text-xs text-muted-foreground">Toggle each field as Required, Optional, or Hidden.</p>
              </div>
            </div>

            <div className="space-y-3">
              {FORM_FIELDS.map((field) => {
                const Icon = field.icon;
                const currentState = fieldStates[field.key] || "optional";

                return (
                  <div
                    key={field.key}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      currentState === "required"
                        ? "border-brand/40 bg-brand/5"
                        : currentState === "optional"
                        ? "border-border/80 bg-background"
                        : "border-border/40 bg-muted/20 opacity-55"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-bold",
                        currentState === "required" ? "bg-brand text-white" : currentState === "optional" ? "bg-accent text-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{field.label}</span>
                          {field.locked && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-brand/15 text-brand px-2 py-0.5 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{field.description}</p>
                      </div>
                    </div>

                    {!field.locked ? (
                      <div className="inline-flex items-center p-1 bg-muted/60 dark:bg-slate-900 rounded-xl border border-border/60 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => setFieldStates((prev) => ({ ...prev, [field.key]: "required" }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            currentState === "required"
                              ? "bg-brand text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Required
                        </button>
                        <button
                          type="button"
                          onClick={() => setFieldStates((prev) => ({ ...prev, [field.key]: "optional" }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            currentState === "optional"
                              ? "bg-accent text-foreground font-bold shadow-xs border border-border/40"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Optional
                        </button>
                        <button
                          type="button"
                          onClick={() => setFieldStates((prev) => ({ ...prev, [field.key]: "hidden" }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            currentState === "hidden"
                              ? "bg-slate-700 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Off
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-brand bg-brand/10 px-3 py-1 rounded-lg border border-brand/20 self-start sm:self-center">
                        Always On
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Photo Verification */}
          <div className="panel p-6 space-y-5 border border-border">
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">2. Customer Photo Verification</h3>
                <p className="text-xs text-muted-foreground">Allow or require customers to upload or capture a profile photo.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "none", title: "No Photo", icon: Layers },
                  { id: "capture", title: "Live Camera", icon: Camera },
                  { id: "upload", title: "File Upload", icon: Upload },
                  { id: "both", title: "Both Options", icon: Sparkles },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = photoMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPhotoMode(item.id as any)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative",
                        isSelected
                          ? "border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shadow-xs"
                          : "border-border/70 bg-background hover:bg-accent text-muted-foreground"
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                      <Icon className={cn("h-5 w-5", isSelected ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground")} />
                      <span className="text-xs font-bold leading-tight">{item.title}</span>
                    </button>
                  );
                })}
              </div>

              {photoMode !== "none" && (
                <div className="pt-4 border-t border-border/40 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between bg-accent/40 p-3.5 rounded-2xl border border-border/60">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground">Mandatory Photo Requirement</span>
                      <p className="text-[11px] text-muted-foreground">Booking cannot be submitted without a photo.</p>
                    </div>
                    <Switch
                      checked={photoRequired}
                      onCheckedChange={(v) => setPhotoRequired(v)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground">Photo Field Label</Label>
                    <Input
                      value={photoLabel}
                      onChange={(e) => setPhotoLabel(e.target.value)}
                      placeholder="Customer Profile Photo / ID"
                      className="h-10 rounded-xl bg-background border-border text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sticky Preview Column */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-brand" /> Live Customer Form Preview
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Live Interactive
            </span>
          </div>

          <div className="w-full max-w-[360px] mx-auto bg-slate-900 rounded-[2.2rem] p-3.5 shadow-2xl border-4 border-slate-800 relative">
            {/* Phone Notch */}
            <div className="w-24 h-3.5 bg-slate-800 rounded-full mx-auto mb-3" />

            <div className="bg-background rounded-[1.5rem] p-4 space-y-3.5 text-foreground font-sans max-h-[560px] overflow-y-auto scrollbar-none border border-border/60">
              {/* Header */}
              <div className="text-center space-y-1 pb-2 border-b border-border/40">
                <div className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[9px] font-bold text-brand">
                  {portalName || "Online Booking"}
                </div>
                <h4 className="font-display text-base font-bold">Book Appointment</h4>
                <p className="text-[10px] text-muted-foreground">Fill in details to confirm spot</p>
              </div>

              {/* Photo Field Preview */}
              {photoMode !== "none" && (
                <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2 text-center">
                  <span className="text-[10px] font-bold text-foreground block">
                    {photoLabel} {photoRequired && <span className="text-destructive">*</span>}
                  </span>

                  {photoMode === "both" && (
                    <div className="flex rounded-xl bg-background border border-border p-1 gap-1">
                      <div className="flex-1 py-1 text-[8px] font-bold text-center rounded-lg bg-purple-600 text-white shadow-2xs">
                        📷 Camera
                      </div>
                      <div className="flex-1 py-1 text-[8px] font-bold text-center text-muted-foreground">
                        📁 Upload
                      </div>
                    </div>
                  )}

                  <div className="mx-auto w-20 h-20 rounded-full border-2 border-dashed border-purple-500/40 bg-background flex flex-col items-center justify-center gap-1 p-1 shadow-2xs">
                    {photoMode === "upload" ? (
                      <>
                        <Upload className="h-5 w-5 text-purple-600" />
                        <span className="text-[8px] font-bold text-muted-foreground">Upload</span>
                      </>
                    ) : photoMode === "capture" ? (
                      <>
                        <Camera className="h-5 w-5 text-purple-600" />
                        <span className="text-[8px] font-bold text-muted-foreground">Camera</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-5 w-5 text-purple-600" />
                        <span className="text-[8px] font-bold text-muted-foreground">Photo</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Form Fields Preview */}
              <div className="space-y-2.5">
                {fieldStates["name"] !== "hidden" && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Full Name {fieldStates["name"] === "required" && <span className="text-destructive">*</span>}
                    </label>
                    <div className="h-9 rounded-xl border border-border bg-background px-3 flex items-center text-xs text-muted-foreground/70">
                      Rahul Sharma
                    </div>
                  </div>
                )}

                {fieldStates["phone"] !== "hidden" && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Mobile Phone {fieldStates["phone"] === "required" && <span className="text-destructive">*</span>}
                    </label>
                    <div className="h-9 rounded-xl border border-border bg-background px-3 flex items-center text-xs font-mono text-muted-foreground/70">
                      9876543210
                    </div>
                  </div>
                )}

                {fieldStates["email"] !== "hidden" && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Email Address {fieldStates["email"] === "required" && <span className="text-destructive">*</span>}
                    </label>
                    <div className="h-9 rounded-xl border border-border bg-background px-3 flex items-center text-xs text-muted-foreground/70">
                      rahul@example.com
                    </div>
                  </div>
                )}

                {fieldStates["service"] !== "hidden" && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Select Service {fieldStates["service"] === "required" && <span className="text-destructive">*</span>}
                    </label>
                    <div className="h-9 rounded-xl border border-border bg-background px-3 flex items-center justify-between text-xs text-muted-foreground/70">
                      <span>General Service</span>
                      <span className="text-[10px]">▼</span>
                    </div>
                  </div>
                )}

                {fieldStates["date_slot"] !== "hidden" && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Date &amp; Slot {fieldStates["date_slot"] === "required" && <span className="text-destructive">*</span>}
                    </label>
                    <div className="h-9 rounded-xl border border-border bg-background px-3 flex items-center justify-between text-xs text-muted-foreground/70">
                      <span>Today, 04:30 PM</span>
                      <Calendar className="h-3.5 w-3.5 text-brand" />
                    </div>
                  </div>
                )}

                {fieldStates["message"] !== "hidden" && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Special Note {fieldStates["message"] === "required" && <span className="text-destructive">*</span>}
                    </label>
                    <div className="h-12 rounded-xl border border-border bg-background p-2 text-xs text-muted-foreground/70">
                      Visit notes…
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <div className="w-full h-9 rounded-xl bg-brand text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    Confirm &amp; Book
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
