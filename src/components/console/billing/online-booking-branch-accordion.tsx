import React, { useState } from "react";
import {
  Globe,
  Settings,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Building2,
  Check,
  AlertCircle,
  HelpCircle,
  Eye,
  Sparkles,
  Info,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogoUploader } from "./logo-uploader";
import { ColorPickerSwatches } from "./color-picker-swatches";
import { LivePortalPreview } from "./live-portal-preview";

interface BranchOnlineConfig {
  name: string;
  address?: string;
  mode: "NON_SERVICE_BASED" | "SERVICE_BASED";
  channel_type: "ONSITE_ONLY" | "ONLINE_ONLY" | "HYBRID";
  serviceQty?: number;
  branding?: {
    portal_name?: string;
    logo_url?: string;
    primary_color?: string;
    display_address?: string;
    enabled_customer_fields?: string[];
    enabled_booking_fields?: string[];
  };
  [key: string]: any;
}

interface OnlineBookingModuleProps {
  onlineModuleEnabled: boolean;
  onToggleOnlineModule: (enabled: boolean) => void;
  branches: BranchOnlineConfig[];
  onUpdateBranch: (index: number, field: string, value: any) => void;
  onAddBranch: () => void;
  onDeleteBranch: (index: number) => void;
  // Global branding fallback / synchronization
  globalBranding: {
    portalName: string;
    logoUrl: string;
    primaryColor: string;
    displayAddress: string;
    enabledCustomerFields: string[];
    enabledBookingFields: string[];
  };
  onUpdateGlobalBranding: (fields: Partial<OnlineBookingModuleProps["globalBranding"]>) => void;
  companySlug?: string;
  saveStatus?: "saved" | "saving" | "error";
  onNext: () => void;
  onBack: () => void;
}

export function OnlineBookingBranchAccordion({
  onlineModuleEnabled,
  onToggleOnlineModule,
  branches,
  onUpdateBranch,
  onAddBranch,
  onDeleteBranch,
  globalBranding,
  onUpdateGlobalBranding,
  companySlug,
  saveStatus = "saved",
  onNext,
  onBack,
}: OnlineBookingModuleProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [selectedBranchIndex, setSelectedBranchIndex] = useState(0);
  const [activeTabByBranch, setActiveTabByBranch] = useState<Record<number, "basic" | "branding" | "customer" | "booking">>({});
  const [branchToDelete, setBranchToDelete] = useState<{ index: number; name: string } | null>(null);
  const [showMobilePreviewModal, setShowMobilePreviewModal] = useState(false);

  const currentBranch = branches[selectedBranchIndex] || branches[0];
  const branchBranding = currentBranch?.branding || {};
  const effectiveBrandingName = branchBranding.portal_name || globalBranding.portalName || currentBranch?.name || "";
  const effectiveLogoUrl = branchBranding.logo_url ?? globalBranding.logoUrl ?? "";
  const effectiveColor = branchBranding.primary_color || globalBranding.primaryColor || "#7C3AED";
  const effectiveAddress = branchBranding.display_address || globalBranding.displayAddress || currentBranch?.address || "";
  const effectiveCustomerFields = branchBranding.enabled_customer_fields || globalBranding.enabledCustomerFields || ["name", "email", "phone"];
  const effectiveBookingFields = branchBranding.enabled_booking_fields || globalBranding.enabledBookingFields || ["date_slot", "message"];

  const getBranchTab = (idx: number) => activeTabByBranch[idx] || "basic";
  const setBranchTab = (idx: number, tab: "basic" | "branding" | "customer" | "booking") => {
    setActiveTabByBranch((prev) => ({ ...prev, [idx]: tab }));
  };

  const handleBranchSelect = (idx: number) => {
    setSelectedBranchIndex(idx);
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const confirmDelete = () => {
    if (!branchToDelete) return;
    if (branches.length <= 1) {
      toast.error("You must have at least one primary branch location.");
      setBranchToDelete(null);
      return;
    }
    onDeleteBranch(branchToDelete.index);
    if (selectedBranchIndex >= branches.length - 1) {
      setSelectedBranchIndex(Math.max(0, branches.length - 2));
    }
    setBranchToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* ──── MODULE HEADER ──── */}
      <div className="panel p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  2. Online Booking Module Configuration
                </h2>
                {/* Autosave Status Pill */}
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors",
                    saveStatus === "saving" && "bg-amber-50 text-amber-600 dark:bg-amber-950/40",
                    saveStatus === "saved" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40",
                    saveStatus === "error" && "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      saveStatus === "saving" && "bg-amber-500 animate-pulse",
                      saveStatus === "saved" && "bg-emerald-500",
                      saveStatus === "error" && "bg-rose-500"
                    )}
                  />
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Save Failed" : "All changes saved"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure pre-scheduled appointments, branding portal themes, and customer fields per branch.
              </p>
            </div>
          </div>

          {/* Master Enable/Disable Switch */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-center">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {onlineModuleEnabled ? "Module Active" : "Module Disabled"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onlineModuleEnabled}
                onChange={(e) => onToggleOnlineModule(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
            </label>
          </div>
        </div>

        {!onlineModuleEnabled ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Online Booking Module is currently turned off
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md mx-auto">
                Toggle the switch above to enable online customer appointment bookings for your branch locations.
              </p>
            </div>
          </div>
        ) : (
          /* ──── 2-COLUMN LAYOUT: BRANCH ACCORDION (LEFT) + LIVE PORTAL PREVIEW (RIGHT) ──── */
          <div className="pt-6 grid gap-6 lg:grid-cols-12 items-start">
            {/* Left 7 Columns: Branch Accordion List */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Configured Locations ({branches.length})
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Expand a branch to customize its online booking portal.
                  </p>
                </div>

                {/* Mobile Preview Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowMobilePreviewModal(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 text-xs font-bold cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview Portal
                </button>
              </div>

              {/* Stacked Branch Accordion Items */}
              <div className="space-y-3">
                {branches.map((branch, idx) => {
                  const isExpanded = expandedIndex === idx;
                  const isSelected = selectedBranchIndex === idx;
                  const isOnlineActive = branch.channel_type === "ONLINE_ONLY" || branch.channel_type === "HYBRID";
                  const activeTab = getBranchTab(idx);

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-2xl border transition-all duration-200 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs",
                        isSelected
                          ? "border-violet-400 dark:border-violet-700 ring-2 ring-violet-500/10"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      {/* Accordion Card Header */}
                      <div
                        onClick={() => handleBranchSelect(idx)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={cn(
                              "h-8 w-8 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 transition-colors",
                              idx === 0
                                ? "bg-violet-600 text-white shadow-xs"
                                : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            )}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {branch.name}
                              </h4>
                              {idx === 0 && (
                                <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-200/60 dark:border-violet-800/50">
                                  HQ
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {branch.address || "Primary office location"}
                            </p>
                          </div>
                        </div>

                        {/* Controls on Card Header */}
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Online Enabled badge */}
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              isOnlineActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            )}
                          >
                            {isOnlineActive ? "Online Enabled" : "Online Disabled"}
                          </span>

                          {/* Quick Enable Switch */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isOnlineActive}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const newChannel = checked
                                  ? (branch.channel_type === "ONSITE_ONLY" ? "HYBRID" : branch.channel_type)
                                  : "ONSITE_ONLY";
                                onUpdateBranch(idx, "channel_type", newChannel);
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                          </label>

                          {/* Gear Configure icon */}
                          <button
                            type="button"
                            onClick={() => handleBranchSelect(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
                            title="Configure branch"
                          >
                            <Settings className="h-4 w-4" />
                          </button>

                          {/* Delete button (with guard) */}
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => setBranchToDelete({ index: idx, name: branch.name })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border-none bg-transparent cursor-pointer"
                              title="Delete branch"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Expand chevron */}
                          <div className="p-1 text-slate-400">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Accordion Body */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 space-y-5 bg-white dark:bg-slate-900 animate-fadeIn">
                          {/* Inner Tabs: Basic, Branding, Customer Fields, Booking Fields */}
                          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto">
                            {[
                              { id: "basic", label: "Basic Settings" },
                              { id: "branding", label: "Branding" },
                              { id: "customer", label: "Customer Fields" },
                              { id: "booking", label: "Booking Fields" },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setBranchTab(idx, tab.id as any)}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
                                  activeTab === tab.id
                                    ? "bg-violet-600 text-white shadow-xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* TAB 1: BASIC SETTINGS */}
                          {activeTab === "basic" && (
                            <div className="space-y-4 text-xs">
                              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
                                <div>
                                  <span className="font-semibold text-slate-900 dark:text-white block">
                                    Enable Online Booking for {branch.name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                                    Permit customers to book reservations via web portal.
                                  </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isOnlineActive}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const newChannel = checked
                                        ? (branch.channel_type === "ONSITE_ONLY" ? "HYBRID" : branch.channel_type)
                                        : "ONSITE_ONLY";
                                      onUpdateBranch(idx, "channel_type", newChannel);
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
                                </label>
                              </div>

                              {/* Routing Mode */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <label className="font-semibold text-slate-900 dark:text-white">
                                    Routing Mode
                                  </label>
                                  <span
                                    className="text-slate-400 cursor-help"
                                    title="Routing Mode: how customers are assigned to counters and queues"
                                  >
                                    <HelpCircle className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                                <select
                                  value={branch.mode || "NON_SERVICE_BASED"}
                                  onChange={(e) => onUpdateBranch(idx, "mode", e.target.value)}
                                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-900 dark:text-white"
                                >
                                  <option value="NON_SERVICE_BASED">Non-Service-Based (Single Queue)</option>
                                  <option value="SERVICE_BASED">Service-Based (Multiple Queues)</option>
                                </select>
                                <p className="text-[11px] text-muted-foreground">
                                  {branch.mode === "SERVICE_BASED"
                                    ? "Customers select a specific service category when booking."
                                    : "Customers join one general service queue for this location."}
                                </p>
                              </div>

                              {/* Branch Name Input */}
                              <div className="space-y-1.5">
                                <label className="font-semibold text-slate-900 dark:text-white">
                                  Location Display Name
                                </label>
                                <Input
                                  value={branch.name}
                                  onChange={(e) => onUpdateBranch(idx, "name", e.target.value)}
                                  className="h-10 rounded-xl text-xs"
                                  placeholder="e.g. Downtown Clinic"
                                />
                              </div>
                            </div>
                          )}

                          {/* TAB 2: BRANDING */}
                          {activeTab === "branding" && (
                            <div className="space-y-4 text-xs">
                              {/* Branding Name */}
                              <div className="space-y-1.5">
                                <label className="font-semibold text-slate-900 dark:text-white">
                                  Portal Branding Name
                                </label>
                                <Input
                                  value={branchBranding.portal_name ?? globalBranding.portalName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    onUpdateBranch(idx, "branding", {
                                      ...branchBranding,
                                      portal_name: val,
                                    });
                                    if (idx === 0) {
                                      onUpdateGlobalBranding({ portalName: val });
                                    }
                                  }}
                                  className="h-10 rounded-xl text-xs"
                                  placeholder="e.g. Quesole Health Clinic"
                                />
                              </div>

                              {/* Company Logo Uploader */}
                              <LogoUploader
                                logoUrl={branchBranding.logo_url ?? globalBranding.logoUrl}
                                onChange={(url) => {
                                  onUpdateBranch(idx, "branding", {
                                    ...branchBranding,
                                    logo_url: url,
                                  });
                                  if (idx === 0) {
                                    onUpdateGlobalBranding({ logoUrl: url });
                                  }
                                }}
                              />

                              {/* Color Picker Swatches */}
                              <ColorPickerSwatches
                                color={branchBranding.primary_color || globalBranding.primaryColor}
                                onChange={(hex) => {
                                  onUpdateBranch(idx, "branding", {
                                    ...branchBranding,
                                    primary_color: hex,
                                  });
                                  if (idx === 0) {
                                    onUpdateGlobalBranding({ primaryColor: hex });
                                  }
                                }}
                              />

                              {/* Address to Display */}
                              <div className="space-y-1.5">
                                <label className="font-semibold text-slate-900 dark:text-white">
                                  Physical Address to Display
                                </label>
                                <Input
                                  value={branchBranding.display_address ?? globalBranding.displayAddress}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    onUpdateBranch(idx, "address", val);
                                    onUpdateBranch(idx, "branding", {
                                      ...branchBranding,
                                      display_address: val,
                                    });
                                    if (idx === 0) {
                                      onUpdateGlobalBranding({ displayAddress: val });
                                    }
                                  }}
                                  className="h-10 rounded-xl text-xs"
                                  placeholder="e.g. 102 MG Road, Bangalore, India"
                                />
                              </div>
                            </div>
                          )}

                          {/* TAB 3: CUSTOMER FIELDS */}
                          {activeTab === "customer" && (
                            <div className="space-y-3 text-xs">
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                  Customer Information Fields
                                </h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Toggle fields you want customers to fill when booking online.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {[
                                  { id: "name", label: "Full Name", icon: User },
                                  { id: "email", label: "Email Address", icon: Mail },
                                  { id: "phone", label: "Phone Number", icon: Phone },
                                ].map((field) => {
                                  const Icon = field.icon;
                                  const currentFields = branchBranding.enabled_customer_fields || globalBranding.enabledCustomerFields;
                                  const isEnabled = currentFields.includes(field.id);
                                  return (
                                    <button
                                      key={field.id}
                                      type="button"
                                      onClick={() => {
                                        let next = isEnabled
                                          ? currentFields.filter((f) => f !== field.id)
                                          : [...currentFields, field.id];
                                        if (next.length === 0) {
                                          toast.warning("At least one customer field is required.");
                                          return;
                                        }
                                        onUpdateBranch(idx, "branding", {
                                          ...branchBranding,
                                          enabled_customer_fields: next,
                                        });
                                        if (idx === 0) {
                                          onUpdateGlobalBranding({ enabledCustomerFields: next });
                                        }
                                      }}
                                      className={cn(
                                        "p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between cursor-pointer",
                                        isEnabled
                                          ? "border-violet-400 bg-violet-50/50 dark:bg-violet-950/30 text-violet-950 dark:text-violet-100 shadow-2xs"
                                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-500"
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <Icon className="h-4 w-4 shrink-0 text-violet-600" />
                                        <span className="font-semibold text-xs">{field.label}</span>
                                      </div>
                                      <div
                                        className={cn(
                                          "h-5 w-5 rounded-lg flex items-center justify-center transition-colors",
                                          isEnabled ? "bg-violet-600 text-white" : "border border-slate-300 dark:border-slate-700"
                                        )}
                                      >
                                        {isEnabled && <Check className="h-3 w-3" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* TAB 4: BOOKING FIELDS */}
                          {activeTab === "booking" && (
                            <div className="space-y-3 text-xs">
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                  Booking Details Fields
                                </h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Enable appointment schedule slot picking or custom message request.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {[
                                  { id: "date_slot", label: "Date & Time Slot", desc: "Allow customer to pick time slot", icon: Calendar },
                                  { id: "message", label: "Custom Message (Notes)", desc: "Customer visit reason text box", icon: MessageSquare },
                                ].map((field) => {
                                  const Icon = field.icon;
                                  const currentFields = branchBranding.enabled_booking_fields || globalBranding.enabledBookingFields;
                                  const isEnabled = currentFields.includes(field.id);
                                  return (
                                    <button
                                      key={field.id}
                                      type="button"
                                      onClick={() => {
                                        let next = isEnabled
                                          ? currentFields.filter((f) => f !== field.id)
                                          : [...currentFields, field.id];
                                        if (next.length === 0) {
                                          toast.warning("At least one booking field is required.");
                                          return;
                                        }
                                        onUpdateBranch(idx, "branding", {
                                          ...branchBranding,
                                          enabled_booking_fields: next,
                                        });
                                        if (idx === 0) {
                                          onUpdateGlobalBranding({ enabledBookingFields: next });
                                        }
                                      }}
                                      className={cn(
                                        "p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-start justify-between cursor-pointer",
                                        isEnabled
                                          ? "border-violet-400 bg-violet-50/50 dark:bg-violet-950/30 text-violet-950 dark:text-violet-100 shadow-2xs"
                                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-500"
                                      )}
                                    >
                                      <div className="flex items-start gap-2.5">
                                        <Icon className="h-4 w-4 shrink-0 text-violet-600 mt-0.5" />
                                        <div>
                                          <span className="font-semibold text-xs block">{field.label}</span>
                                          <span className="text-[11px] text-muted-foreground block mt-0.5">{field.desc}</span>
                                        </div>
                                      </div>
                                      <div
                                        className={cn(
                                          "h-5 w-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                                          isEnabled ? "bg-violet-600 text-white" : "border border-slate-300 dark:border-slate-700"
                                        )}
                                      >
                                        {isEnabled && <Check className="h-3 w-3" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Prominent "+ Add Branch" Button */}
              <button
                type="button"
                onClick={onAddBranch}
                className="w-full py-3.5 px-4 rounded-2xl border border-dashed border-violet-300 dark:border-violet-800 hover:border-violet-500 bg-violet-50/40 hover:bg-violet-50/80 dark:bg-violet-950/20 dark:hover:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <Plus className="h-4 w-4" /> Add Another Branch Location
              </button>
            </div>

            {/* Right 5 Columns: Sticky Live Portal Preview */}
            <div className="hidden lg:block lg:col-span-5 sticky top-6">
              <LivePortalPreview
                branchName={currentBranch?.name || "Main Branch"}
                portalName={effectiveBrandingName}
                logoUrl={effectiveLogoUrl}
                primaryColor={effectiveColor}
                displayAddress={effectiveAddress}
                companySlug={companySlug}
                enabledCustomerFields={effectiveCustomerFields}
                enabledBookingFields={effectiveBookingFields}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-xl h-11 px-5 font-semibold text-xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Step 1
          </Button>

          <Button
            type="button"
            onClick={onNext}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl px-6 h-11 shadow-md shadow-indigo-500/20 cursor-pointer border-0"
          >
            Continue to Onsite Module <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* ──── DELETE BRANCH CONFIRMATION MODAL ──── */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete {branchToDelete.name}?
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                This removes its queue, counter, and online configuration. Pricing and package estimates will update immediately. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setBranchToDelete(null)}
                className="rounded-xl h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-9 text-xs font-bold"
              >
                Delete Branch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ──── MOBILE FULL-SCREEN PREVIEW BOTTOM SHEET ──── */}
      {showMobilePreviewModal && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-h-[90vh] rounded-t-[32px] border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Live Portal Preview ({currentBranch?.name})
              </span>
              <button
                type="button"
                onClick={() => setShowMobilePreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-none bg-transparent cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <LivePortalPreview
              branchName={currentBranch?.name || "Main Branch"}
              portalName={effectiveBrandingName}
              logoUrl={effectiveLogoUrl}
              primaryColor={effectiveColor}
              displayAddress={effectiveAddress}
              companySlug={companySlug}
              enabledCustomerFields={effectiveCustomerFields}
              enabledBookingFields={effectiveBookingFields}
            />

            <Button
              type="button"
              onClick={() => setShowMobilePreviewModal(false)}
              className="w-full h-11 rounded-xl font-bold bg-violet-600 text-white text-xs"
            >
              Close Preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
