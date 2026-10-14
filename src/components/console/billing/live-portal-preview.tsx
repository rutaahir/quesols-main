import React, { useState } from "react";
import { Monitor, Smartphone, Calendar, Clock, MapPin, CheckCircle, Sparkles, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-config";

interface LivePortalPreviewProps {
  branchName: string;
  portalName: string;
  logoUrl?: string;
  primaryColor: string;
  displayAddress: string;
  companySlug?: string;
  enabledCustomerFields: string[];
  enabledBookingFields: string[];
  className?: string;
}

export function LivePortalPreview({
  branchName,
  portalName,
  logoUrl,
  primaryColor = "#7C3AED",
  displayAddress,
  companySlug,
  enabledCustomerFields = ["name", "email", "phone"],
  enabledBookingFields = ["date_slot", "message"],
  className,
}: LivePortalPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [selectedSlot, setSelectedSlot] = useState("10:00 AM");

  const effectiveName = portalName?.trim() || branchName || "Your Organization";
  const effectiveAddress = displayAddress?.trim() || "Main Branch Office";
  const portalUrl = `${window.location.host}/${companySlug || "book"}`;

  return (
    <div className={cn("flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg overflow-hidden transition-all", className)}>
      {/* Top Device Switcher Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pl-1">
            Live Customer Portal
          </span>
        </div>

        {/* Desktop / Mobile segmented toggle */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => setDeviceMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0",
              deviceMode === "desktop"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 bg-transparent"
            )}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode("mobile")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0",
              deviceMode === "mobile"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 bg-transparent"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
        </div>
      </div>

      {/* Device Frame Viewport */}
      <div className="p-4 sm:p-5 flex-1 flex items-center justify-center bg-slate-100/60 dark:bg-slate-950/60 min-h-[460px]">
        <div
          className={cn(
            "transition-all duration-300 w-full overflow-hidden bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-slate-800",
            deviceMode === "mobile"
              ? "max-w-[320px] rounded-[32px] p-4 border-[6px] border-slate-800 dark:border-slate-700 shadow-2xl relative"
              : "rounded-2xl p-5"
          )}
        >
          {/* Mobile phone notch pill */}
          {deviceMode === "mobile" && (
            <div className="w-24 h-3.5 bg-slate-800 dark:bg-slate-700 rounded-full mx-auto -mt-2 mb-3" />
          )}

          {/* Portal Header */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-3">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="h-10 w-10 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src={logoUrl.startsWith("/") ? getApiUrl(logoUrl) : logoUrl}
                    alt={effectiveName}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-2xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  {effectiveName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {effectiveName}
                </h4>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate">{effectiveAddress}</span>
                </p>
              </div>
            </div>

            {/* URL pill */}
            <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
              <span className="truncate">https://{portalUrl}</span>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                <CheckCircle className="h-2.5 w-2.5" /> LIVE
              </span>
            </div>
          </div>

          {/* Form preview fields */}
          <div className="space-y-2.5 text-left text-xs">
            {/* Customer fields */}
            {enabledCustomerFields.includes("name") && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Your Full Name
                </span>
                <div className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-2.5 flex items-center text-[11px] text-slate-400">
                  Alex Johnson
                </div>
              </div>
            )}

            {enabledCustomerFields.includes("phone") && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Mobile Number
                </span>
                <div className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-2.5 flex items-center text-[11px] text-slate-400">
                  +91 98765 43210
                </div>
              </div>
            )}

            {enabledCustomerFields.includes("email") && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Email Address
                </span>
                <div className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-2.5 flex items-center text-[11px] text-slate-400">
                  alex@example.com
                </div>
              </div>
            )}

            {/* Booking fields */}
            {enabledBookingFields.includes("date_slot") && (
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Select Appointment Slot
                  </span>
                  <span className="text-[10px] text-slate-400">Today, 2:30 PM</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {["09:30 AM", "10:00 AM", "11:15 AM"].map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          "py-1 px-1 text-center text-[10px] font-semibold rounded-lg border transition-all cursor-pointer",
                          isSelected
                            ? "text-white border-transparent shadow-2xs font-bold"
                            : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                        )}
                        style={isSelected ? { backgroundColor: primaryColor } : {}}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {enabledBookingFields.includes("message") && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Reason for Visit (Notes)
                </span>
                <div className="h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2 text-[10px] text-slate-400">
                  Appointment regarding queue query...
                </div>
              </div>
            )}

            {/* Branded CTA button */}
            <div className="pt-2">
              <button
                type="button"
                className="w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:opacity-95 active:scale-[0.99] border-0"
                style={{ backgroundColor: primaryColor }}
              >
                Confirm Booking Reservation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
