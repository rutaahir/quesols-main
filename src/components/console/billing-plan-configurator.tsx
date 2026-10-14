import { useState, useEffect, useMemo } from "react";
import {
  Check, CheckCircle2, ArrowRight, ArrowLeft, Minus, Plus, Loader2, Printer, Info,
  ShieldAlert, ChevronDown, ChevronUp, Sparkles, Monitor, Globe, User,
  Building, Building2, MapPin, Store, Settings, FileText, CheckSquare, MessageSquare, PhoneCall, Mail,
  CreditCard, ExternalLink, ShieldCheck, Heart, Download, Trash2, HelpCircle, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuesole } from "@/lib/quesole/store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-config";
import { OnlineBookingBranchAccordion } from "./billing/online-booking-branch-accordion";
import { OnsiteBranchAccordion } from "./billing/onsite-branch-accordion";
import { PlanSummarySidebar } from "./billing/plan-summary-sidebar";
import { MobileSummarySheet } from "./billing/mobile-summary-sheet";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface BillingPlanConfiguratorProps {
  mode: "registration" | "view" | "upgrade";
  initialData?: any;
  onSubmit?: (data: any) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialStep?: number;
}

export function BillingPlanConfigurator({
  mode: propMode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting: propIsSubmitting,
  initialStep,
}: BillingPlanConfiguratorProps) {
  const { state } = useQuesole();
  const [isEditMode, setIsEditMode] = useState(propMode !== "view");
  const [activeBranchIndex, setActiveBranchIndex] = useState(0);
  const [step, setStep] = useState(initialStep ?? 1);

  useEffect(() => {
    if (initialStep !== undefined) {
      setStep(initialStep);
    }
  }, [initialStep]);

  // 1. Fetch config dynamically
  const [billingConfig, setBillingConfig] = useState<any | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(getApiUrl("/api/billing/config/"));
        if (res.ok) {
          const data = await res.json();
          setBillingConfig(data);
        }
      } catch (err) {
        console.error("Failed to fetch billing config", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    fetchConfig();
  }, []);

  // fallback/default config values derived from store state
  const config = useMemo(() => {
    if (billingConfig) return billingConfig;
    const compsByCategory: Record<string, any[]> = {};
    state.planComponents.forEach((pc) => {
      const cat = pc.category || "ADDON";
      if (!compsByCategory[cat]) {
        compsByCategory[cat] = [];
      }
      compsByCategory[cat].push(pc);
    });

    return {
      solution_types: state.solutionTypes,
      components: compsByCategory,
      token_delivery_methods: state.tokenDeliveryMethods,
      duration_tiers: state.durationTiers,
      gst_percent: 18.0
    };
  }, [billingConfig, state]);

  // Current company plan parameters
  const currentCompany = useMemo(() => {
    if (propMode === "registration") {
      return null;
    }
    if (state.companies.length > 0) {
      return state.companies[0];
    }
    return null;
  }, [state.companies, propMode]);

  // Current purchased limits (price locking constraints)
  const currentAllocations = useMemo(() => {
    const allocs: Record<string, number> = {
      branches: 1,
      operator_screens: 3,
      services: 0,
      paper_roll_screens: 1,
      printed_qr: 0,
    };
    state.companyAllocations.forEach((a) => {
      allocs[a.component_key] = a.purchased_qty;
    });
    return allocs;
  }, [state.companyAllocations]);

  // Pricing definitions from config
  const componentPrices = useMemo(() => {
    const prices: Record<string, any> = {};
    Object.values(config.components || {}).forEach((list: any) => {
      list.forEach((c: any) => {
        prices[c.key] = c;
      });
    });
    return prices;
  }, [config.components]);

  const getComponentPriceLabelText = (key: string) => {
    const comp = state.planComponents.find((c) => c.key === key);
    if (!comp) {
      if (key === "services") return "₹800/mo per service";
      if (key === "operator_screens") return "₹100/mo per seat";
      if (key === "paper_roll_screens") return "₹100/mo per Kiosk screen";
      if (key === "printed_qr") return "₹990/mo flat";
      return "";
    }
    const price = Number(comp.price_per_unit);
    const label = comp.unit_label || "unit";
    if (comp.pricing_type === "FLAT") {
      return `₹${price.toLocaleString("en-IN")}/mo flat`;
    }
    return `₹${price.toLocaleString("en-IN")}/mo per ${label}`;
  };

  // 2. Form state variables
  const [selectedSolution, setSelectedSolution] = useState<string>(() => {
    return initialData?.solution || "ONSITE_ONLINE";
  });

  const [durationMonths, setDurationMonths] = useState<number>(() => {
    return initialData?.durationMonths || 1;
  });

  // Master module enablement toggles
  const [onlineModuleEnabled, setOnlineModuleEnabled] = useState(() => {
    if (propMode === "registration") {
      const sol = initialData?.solution || "ONSITE_ONLINE";
      return sol === "ONLINE_ONLY" || sol === "ONSITE_ONLINE";
    }
    return true;
  });
  const [onsiteModuleEnabled, setOnsiteModuleEnabled] = useState(() => {
    if (propMode === "registration") {
      const sol = initialData?.solution || "ONSITE_ONLINE";
      return sol === "ONSITE_ONLY" || sol === "ONSITE_ONLINE";
    }
    return true;
  });

  // Online customizer parameters
  const [logoUrl, setLogoUrl] = useState("");
  const [portalName, setPortalName] = useState(() => {
    return initialData?.companyName || "";
  });
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [displayAddress, setDisplayAddress] = useState(() => {
    return initialData?.locationAddress || "";
  });
  const [enabledCustomerFields, setEnabledCustomerFields] = useState<string[]>(["name", "email", "phone"]);
  const [enabledBookingFields, setEnabledBookingFields] = useState<string[]>(["date_slot", "message"]);
  const [enabledNotificationChannels, setEnabledNotificationChannels] = useState<string[]>(["email"]);

  // Global addons selections
  const [companyAddons, setCompanyAddons] = useState<Record<string, number>>(() => {
    if (initialData?.companyAddons) {
      return initialData.companyAddons;
    }
    return {
      whatsapp_integration: 0,
      sms_integration: 0,
    };
  });

  // 100% Dynamic & Database-Driven Branches List
  const [branches, setBranches] = useState<any[]>(() => {
    if (initialData?.branches && initialData.branches.length > 0) {
      return initialData.branches.map((b: any, i: number) => ({
        ...b,
        name: b.name || (i === 0 ? "Head Office" : `Branch ${i + 1}`),
        mode: b.mode || "NON_SERVICE_BASED",
        channel_type: b.channel_type || "HYBRID",
        serviceQty: b.serviceQty ?? 1,
        operatorQty: b.operatorQty !== undefined ? b.operatorQty : 1,
        kioskQty: b.kioskQty ?? 0,
        kotQty: b.kotQty ?? 0,
        tokenDeliverySelections: b.tokenDeliverySelections ?? ["SCREEN_ONLY"],
        activeMethods: b.activeMethods ?? ["1"],
        serviceAssignments: b.serviceAssignments ?? {},
        addons: b.addons ?? { operator_screens: 0, paper_roll_screens: 0, services: 0, printed_qr: 0 },
        branding: b.branding ?? {
          portal_name: b.name || (i === 0 ? "Head Office" : `Branch ${i + 1}`),
          logo_url: "",
          primary_color: "#7C3AED",
          display_address: b.address || "",
          enabled_customer_fields: ["name", "email", "phone"],
          enabled_booking_fields: ["date_slot", "message"],
        }
      }));
    }

    // Default starting list: 1 Primary Branch (Head Office)
    return [
      {
        name: "Head Office",
        address: initialData?.locationAddress || "",
        mode: "NON_SERVICE_BASED" as "SERVICE_BASED" | "NON_SERVICE_BASED",
        channel_type: "HYBRID" as "ONSITE_ONLY" | "ONLINE_ONLY" | "HYBRID",
        serviceQty: 1,
        operatorQty: 1,
        kioskQty: 0,
        kotQty: 0,
        tokenDeliverySelections: ["SCREEN_ONLY"],
        activeMethods: ["1"],
        serviceAssignments: {},
        addons: {
          operator_screens: 0,
          paper_roll_screens: 0,
          services: 0,
          printed_qr: 0,
        },
        branding: {
          portal_name: initialData?.companyName || "Head Office",
          logo_url: "",
          primary_color: "#7C3AED",
          display_address: initialData?.locationAddress || "",
          enabled_customer_fields: ["name", "email", "phone"],
          enabled_booking_fields: ["date_slot", "message"],
        }
      }
    ];
  });

  const [branchesCount, setBranchesCount] = useState<number>(() => branches.length);

  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  const [companySlug, setCompanySlug] = useState("");
  const [slugLoading, setSlugLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Initialize slug from company name
  useEffect(() => {
    if (!companySlug) {
      const name = initialData?.companyName || currentCompany?.name;
      if (name) {
        const rawSlug = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");
        setCompanySlug(rawSlug);
      }
    }
  }, [initialData, currentCompany]);

  // Real-time slug availability check
  useEffect(() => {
    if (!companySlug || companySlug.trim().length === 0) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }
    const clean = companySlug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(clean)) {
      setSlugAvailable(false);
      setSlugError("Slug must contain only lowercase letters, numbers, and hyphens.");
      return;
    }
    if (clean.length < 2) {
      setSlugAvailable(false);
      setSlugError("Slug must be at least 2 characters long.");
      return;
    }

    const checkAvailability = async () => {
      if (currentCompany && currentCompany.slug === clean) {
        setSlugAvailable(true);
        setSlugError(null);
        return;
      }
      setSlugLoading(true);
      setSlugError(null);
      try {
        const res = await fetch(getApiUrl(`/api/companies/check-slug/?slug=${encodeURIComponent(clean)}`));
        const data = await res.json();
        if (res.ok) {
          setSlugAvailable(data.available);
          if (!data.available) {
            setSlugError("This company URL slug is already taken.");
          }
        } else {
          setSlugAvailable(false);
          setSlugError(data.error || "Invalid slug format.");
        }
      } catch (err) {
        setSlugAvailable(false);
        setSlugError("Failed to verify slug availability.");
      } finally {
        setSlugLoading(false);
      }
    };

    const timer = setTimeout(checkAvailability, 300);
    return () => clearTimeout(timer);
  }, [companySlug, currentCompany]);

  // Load existing plan configuration from Database on mount
  useEffect(() => {
    async function loadPlanConfigFromDB() {
      try {
        const token = localStorage.getItem("quesole.access_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(getApiUrl("/api/companies/plan-config/"), { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.plan_config && Object.keys(data.plan_config).length > 0) {
            const cfg = data.plan_config;
            if (cfg.branches && Array.isArray(cfg.branches) && cfg.branches.length > 0) {
              setBranches(cfg.branches);
              setBranchesCount(cfg.branches.length);
            }
            if (cfg.durationMonths) setDurationMonths(cfg.durationMonths);
            if (cfg.companyAddons) setCompanyAddons(cfg.companyAddons);
            if (cfg.onlineModuleEnabled !== undefined) setOnlineModuleEnabled(cfg.onlineModuleEnabled);
            if (cfg.onsiteModuleEnabled !== undefined) setOnsiteModuleEnabled(cfg.onsiteModuleEnabled);
            if (cfg.branding) {
              if (cfg.branding.portal_name) setPortalName(cfg.branding.portal_name);
              if (cfg.branding.logo_url) setLogoUrl(cfg.branding.logo_url);
              if (cfg.branding.primary_color) setPrimaryColor(cfg.branding.primary_color);
              if (cfg.branding.display_address) setDisplayAddress(cfg.branding.display_address);
              if (cfg.branding.enabled_customer_fields) setEnabledCustomerFields(cfg.branding.enabled_customer_fields);
              if (cfg.branding.enabled_booking_fields) setEnabledBookingFields(cfg.branding.enabled_booking_fields);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load plan config from DB", err);
      }
    }
    loadPlanConfigFromDB();
  }, []);

  // Autosave to DB with ~600ms debounce
  const planConfigSnapshot = useMemo(() => {
    return {
      branches,
      branchesCount,
      durationMonths,
      solution: selectedSolution,
      onlineModuleEnabled,
      onsiteModuleEnabled,
      companyAddons,
      companySlug,
      simulateFailure,
      branding: {
        portal_name: portalName,
        logo_url: logoUrl,
        primary_color: primaryColor,
        display_address: displayAddress,
        enabled_customer_fields: enabledCustomerFields,
        enabled_booking_fields: enabledBookingFields,
        enabled_notification_channels: enabledNotificationChannels,
      }
    };
  }, [
    branches, branchesCount, durationMonths, selectedSolution,
    onlineModuleEnabled, onsiteModuleEnabled, companyAddons, companySlug,
    simulateFailure, portalName, logoUrl, primaryColor, displayAddress,
    enabledCustomerFields, enabledBookingFields, enabledNotificationChannels
  ]);

  const debouncedPlanConfig = useDebounce(planConfigSnapshot, 600);

  useEffect(() => {
    let active = true;
    async function persistPlanConfig() {
      setSaveStatus("saving");
      try {
        const token = localStorage.getItem("quesole.access_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(getApiUrl("/api/companies/plan-config/"), {
          method: "POST",
          headers,
          body: JSON.stringify({ plan_config: debouncedPlanConfig })
        });
        if (res.ok && active) {
          setSaveStatus("saved");
        } else if (active) {
          setSaveStatus("error");
        }
      } catch (err) {
        if (active) setSaveStatus("error");
      }
    }
    persistPlanConfig();
    return () => { active = false; };
  }, [debouncedPlanConfig]);

  // Active branches list derived directly from dynamic branches
  const activeBranchesList = useMemo(() => {
    return branches;
  }, [branches]);

  const hasOnsiteOperations = useMemo(() => {
    return activeBranchesList.some((b) => b.channel_type === "ONSITE_ONLY" || b.channel_type === "HYBRID");
  }, [activeBranchesList]);

  const onlineBranchesCount = useMemo(() => {
    return activeBranchesList.filter((b) => b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID").length;
  }, [activeBranchesList]);

  // Quote calculation payload
  const quotePayload = useMemo(() => {
    const branchesPayload = activeBranchesList.map((b) => {
      const isOnline = onlineModuleEnabled && (b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID");
      const isOnsite = onsiteModuleEnabled && (b.channel_type === "ONSITE_ONLY" || b.channel_type === "HYBRID");
      const finalChannel = (isOnline && isOnsite) ? "HYBRID" : isOnline ? "ONLINE_ONLY" : "ONSITE_ONLY";

      const onsiteSelections: string[] = [];
      if (b.activeMethods?.includes("1")) onsiteSelections.push("SCREEN_ONLY");
      if (b.activeMethods?.includes("2")) onsiteSelections.push("PRINTED_TOKEN");
      if (b.activeMethods?.includes("3")) onsiteSelections.push("SMS");
      if (b.activeMethods?.includes("4")) onsiteSelections.push("WHATSAPP");
      const finalSelections = Array.from(new Set(onsiteSelections));

      return {
        name: b.name,
        mode: b.mode,
        channel_type: finalChannel,
        service_qty: isOnsite ? (b.mode === "SERVICE_BASED" ? ((b.serviceQty || 1) + (b.addons?.services || 0)) : 0) : 0,
        operator_qty: isOnsite ? (b.operatorQty + (b.addons?.operator_screens || 0)) : 0,
        kiosk_qty: isOnsite ? (b.activeMethods?.includes("2") ? ((b.kioskQty || 0) + (b.addons?.paper_roll_screens || 0)) : 0) : 0,
        token_delivery_selections: isOnsite ? finalSelections : [],
        active_methods: isOnsite ? (b.activeMethods || ["1"]) : [],
        addons: {
          printed_qr: isOnsite ? (b.addons?.printed_qr || 0) : 0,
        },
      };
    });

    return {
      duration_months: durationMonths,
      branches: branchesPayload,
      company_addons: companyAddons,
      online_module_enabled: onlineModuleEnabled,
      onsite_module_enabled: onsiteModuleEnabled,
    };
  }, [durationMonths, activeBranchesList, onlineModuleEnabled, onsiteModuleEnabled, companyAddons]);

  const debouncedQuotePayload = useDebounce(quotePayload, 300);
  const [quote, setQuote] = useState<any | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    async function calculateQuote() {
      setLoadingQuote(true);
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/billing/calculate-quote/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(debouncedQuotePayload),
        });
        if (res.ok) {
          const data = await res.json();
          setQuote(data);
          setQuoteError(null);
        } else {
          setQuote(null);
          try {
            const errData = await res.json();
            const messages = [];
            for (const [key, value] of Object.entries(errData)) {
              if (Array.isArray(value)) {
                messages.push(`${key}: ${value.join(", ")}`);
              } else {
                messages.push(`${key}: ${value}`);
              }
            }
            setQuoteError(messages.join("; "));
          } catch (e) {
            setQuoteError("Failed to calculate quote");
          }
        }
      } catch (err) {
        setQuoteError("Failed to fetch pricing quote due to a network error.");
      } finally {
        setLoadingQuote(false);
      }
    }
    calculateQuote();
  }, [debouncedQuotePayload]);

  // Branch updates & action handlers
  const updateBranchField = (index: number, field: string, value: any) => {
    setBranches((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleAddBranch = async () => {
    const nextCount = branches.length + 1;
    const newName = `Branch ${nextCount}`;
    const newBranch = {
      name: newName,
      address: displayAddress || "",
      mode: "NON_SERVICE_BASED" as "SERVICE_BASED" | "NON_SERVICE_BASED",
      channel_type: (onlineModuleEnabled && onsiteModuleEnabled ? "HYBRID" : onlineModuleEnabled ? "ONLINE_ONLY" : "ONSITE_ONLY") as any,
      serviceQty: 1,
      operatorQty: 1,
      kioskQty: 0,
      kotQty: 0,
      tokenDeliverySelections: ["SCREEN_ONLY"],
      activeMethods: ["1"],
      serviceAssignments: {},
      addons: {
        operator_screens: 0,
        paper_roll_screens: 0,
        services: 0,
        printed_qr: 0,
      },
      branding: {
        portal_name: newName,
        logo_url: logoUrl,
        primary_color: primaryColor,
        display_address: displayAddress || "",
        enabled_customer_fields: enabledCustomerFields,
        enabled_booking_fields: enabledBookingFields,
      }
    };

    setBranches((prev) => [...prev, newBranch]);
    setBranchesCount((prev) => prev + 1);
    toast.success(`${newName} added!`);

    try {
      const token = localStorage.getItem("quesole.access_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(getApiUrl("/api/companies/branches/add/"), {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newName, address: displayAddress })
      });
    } catch (e) {
      // optimistic update maintained
    }
  };

  const handleRemoveBranch = async (removeIdx: number) => {
    if (branches.length <= 1) {
      toast.error("Your plan requires at least 1 branch location.");
      return;
    }
    const branchToRemove = branches[removeIdx];
    const updated = branches.filter((_, i) => i !== removeIdx);
    setBranches(updated);
    setBranchesCount(updated.length);
    toast.info(`${branchToRemove?.name || "Branch"} removed.`);

    try {
      const token = localStorage.getItem("quesole.access_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(getApiUrl("/api/companies/branches/delete/"), {
        method: "POST",
        headers,
        body: JSON.stringify({ index: removeIdx })
      });
    } catch (e) {
      // optimistic update maintained
    }
  };

  const handleApplyToAll = async (sourceIdx: number) => {
    if (branches.length <= 1) return;
    const source = branches[sourceIdx] || branches[0];
    const updated = branches.map((b, i) => {
      if (i === sourceIdx) return b;
      return {
        ...source,
        name: b.name,
        address: b.address || source.address,
      };
    });
    setBranches(updated);
    setApplyToAll(true);

    try {
      const token = localStorage.getItem("quesole.access_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(getApiUrl("/api/companies/branches/apply-to-all/"), {
        method: "POST",
        headers,
        body: JSON.stringify({ source_index: sourceIdx, branches: updated })
      });
    } catch (e) {
      // optimistic update maintained
    }
  };

  // Submission flows
  const [submitting, setSubmitting] = useState(false);

  const handleRegistrationSubmit = async () => {
    if (!onSubmit) return;

    if (slugLoading) {
      toast.error("Please wait while we verify your company URL slug availability.");
      return;
    }
    if (slugError || slugAvailable === false) {
      toast.error(slugError || "This company URL slug is already taken. Please choose another.");
      return;
    }

    setSubmitting(true);
    try {
      const mappedBranches = activeBranchesList.map((b) => {
        const onsiteSelections: string[] = [];
        if (b.activeMethods?.includes("1")) onsiteSelections.push("SCREEN_ONLY");
        if (b.activeMethods?.includes("2")) onsiteSelections.push("PRINTED_TOKEN");
        if (b.activeMethods?.includes("3")) onsiteSelections.push("SMS");
        if (b.activeMethods?.includes("4")) onsiteSelections.push("WHATSAPP");
        const finalSelections = Array.from(new Set(onsiteSelections));

        return {
          name: b.name,
          mode: b.mode,
          channel_type: b.channel_type || "ONSITE_ONLY",
          serviceQty: b.serviceQty,
          operatorQty: b.operatorQty,
          kioskQty: b.kioskQty,
          kotQty: b.kotQty || 0,
          tokenDeliverySelections: finalSelections,
          activeMethods: b.activeMethods || ["1"],
          active_methods: b.activeMethods || ["1"],
          serviceAssignments: b.serviceAssignments || {},
          addons: b.addons || {},
        };
      });

      await onSubmit({
        solution: selectedSolution,
        branches: mappedBranches,
        durationMonths,
        simulateFailure,
        totalPrice: quote ? quote.total : 0,
        quote: quote,
        companyAddons: companyAddons,
        portalName,
        logoUrl,
        primaryColor,
        displayAddress,
        enabledCustomerFields,
        enabledBookingFields,
        enabledNotificationChannels,
        companySlug,
        itemizedSelections: {
          branches: branches.length,
          operator_screens: activeBranchesList.reduce((acc, b) => acc + (b.operatorQty + (b.addons?.operator_screens || 0)), 0),
          services: activeBranchesList.reduce((acc, b) => acc + (b.serviceQty + (b.addons?.services || 0)), 0),
          paper_roll_screens: activeBranchesList.reduce((acc, b) => acc + (b.kioskQty + (b.addons?.paper_roll_screens || 0)), 0),
          printed_qr: activeBranchesList.reduce((acc, b) => acc + (b.addons?.printed_qr || 0), 0)
        }
      });
    } catch (e: any) {
      toast.error(e.message || "Registration configuration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgradeSubmit = async () => {
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      const mappedBranches = activeBranchesList.map((b) => ({
        name: b.name,
        mode: b.mode,
        channel_type: b.channel_type || "ONSITE_ONLY",
        service_qty: b.serviceQty,
        operator_qty: b.operatorQty,
        kiosk_qty: b.kioskQty,
        token_delivery_selections: b.tokenDeliverySelections || ["SCREEN_ONLY"],
        active_methods: b.activeMethods || ["1"],
        addons: b.addons || {},
      }));

      await onSubmit({
        branches: mappedBranches,
        durationMonths,
        simulateFailure,
        quoteId: quote?.quote_id,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to process upgrade checkout");
    } finally {
      setSubmitting(false);
    }
  };

  // Client-side PDF Quote generation
  const handleDownloadPDF = () => {
    if (!quote) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to download PDF quote.");
      return;
    }
    const gstRate = 18;
    const items = quote.itemized || {};

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quesole Official Plan Proposal</title>
          <style>
            body { font-family: Inter, system-ui, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #7c3aed; padding-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 800; color: #7c3aed; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th { text-align: left; padding: 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .total-table { width: 340px; margin-left: auto; margin-top: 20px; }
            .grand-total { font-size: 18px; font-weight: 800; color: #059669; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">QUESOLS</div>
            <div>
              <strong>Official Plan Proposal</strong><br/>
              Date: ${new Date().toLocaleDateString()}<br/>
              Company: ${portalName || initialData?.companyName || "Organization"}
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Component</th><th>Description</th><th style="text-align: right;">Cost (INR)</th></tr>
            </thead>
            <tbody>
              <tr><td>Active Locations</td><td>${branches.length} Branches</td><td style="text-align: right;">₹${Number(items.branches_subtotal || 0).toLocaleString("en-IN")}</td></tr>
              <tr><td>Online Booking Module</td><td>${onlineBranchesCount} Online Locations</td><td style="text-align: right;">₹${Number(items.online_subtotal || 0).toLocaleString("en-IN")}</td></tr>
              <tr><td>Operator Seats</td><td>Total Counter Seats</td><td style="text-align: right;">₹${Number(items.operators_subtotal || 0).toLocaleString("en-IN")}</td></tr>
              <tr><td>Displays & Kiosks</td><td>Physical Hardware Terminals</td><td style="text-align: right;">₹${Number(items.kiosks_subtotal || 0).toLocaleString("en-IN")}</td></tr>
            </tbody>
          </table>
          <table class="total-table">
            <tr><td>Subtotal (${durationMonths}M):</td><td style="text-align: right;">₹${Number(quote.total).toLocaleString("en-IN")}</td></tr>
            <tr><td>GST (${gstRate}%):</td><td style="text-align: right;">₹${Math.round(Number(quote.total) * (gstRate / 100)).toLocaleString("en-IN")}</td></tr>
            <tr class="grand-total"><td>Grand Total:</td><td style="text-align: right;">₹${Math.round(Number(quote.total) * (1 + gstRate / 100)).toLocaleString("en-IN")}</td></tr>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  // Conditions required to unlock Continue / Checkout button
  const conditions = useMemo(() => {
    const compName = (portalName || initialData?.companyName || currentCompany?.name || "").trim();
    const compAddr = (displayAddress || initialData?.locationAddress || currentCompany?.address || "").trim();
    const isCompanyValid = compName.length >= 2 && compAddr.length >= 3;

    const isSlugFormat = !!companySlug && companySlug.trim().length >= 2 && /^[a-z0-9-]+$/.test(companySlug);
    const isSlugVerified = isSlugFormat && !slugLoading && slugAvailable === true && !slugError;

    const branchIssues: string[] = [];
    activeBranchesList.forEach((b, idx) => {
      const bName = b.name?.trim() || `Branch ${idx + 1}`;
      if (!b.name || b.name.trim().length === 0) {
        branchIssues.push(`Branch ${idx + 1} name is missing`);
      }
      if (b.channel_type !== "ONLINE_ONLY") {
        const totalSeats = (b.operatorQty || 0) + (b.addons?.operator_screens || 0);
        if (totalSeats < 1) {
          branchIssues.push(`${bName}: Minimum 1 operator seat required`);
        }
      }
    });

    const isCapacityValid = branchIssues.length === 0;
    const isQuoteValid = !quoteError && !!quote && Number(quote?.total || 0) > 0;

    const checklist = [
      {
        id: "company",
        title: "Company Details",
        status: isCompanyValid,
        description: isCompanyValid ? `${compName} • ${compAddr}` : "Company name & location address required",
        stepTarget: 1,
      },
      {
        id: "slug",
        title: "Company URL Slug",
        status: isSlugVerified,
        description: isSlugVerified
          ? `/${companySlug} (Verified)`
          : slugLoading ? "Checking slug..." : slugError || "Unique URL slug required",
        stepTarget: 1,
      },
      {
        id: "capacity",
        title: "Serving Capacity",
        status: isCapacityValid,
        description: isCapacityValid
          ? `All ${branches.length} locations configured`
          : branchIssues[0] || "Configure operator desks",
        stepTarget: 3,
      },
      {
        id: "quote",
        title: "Pricing Calculation",
        status: isQuoteValid,
        description: isQuoteValid ? "Subscription quote calculated" : "Calculating plan pricing...",
        stepTarget: 4,
      },
    ];

    const allSatisfied = checklist.every((item) => item.status);
    return { checklist, allSatisfied, branchIssues };
  }, [portalName, displayAddress, companySlug, slugLoading, slugAvailable, slugError, activeBranchesList, branches.length, quote, quoteError, initialData, currentCompany]);

  if (loadingConfig) {
    return (
      <div className="flex h-96 items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <span className="ml-3 text-sm font-bold text-slate-900 dark:text-white">
          Loading Plan Configurator...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full text-foreground space-y-6 pb-20 lg:pb-8">
      {/* ──── WIZARD HEADER & SUB-STEPPER NAVIGATION ──── */}
      <div className="w-full pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Build Your Plan
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Select channels, branch limits, and features. Pricing updates dynamically.
            </p>
          </div>

          {/* Sub-Stepper: Horizontal pill row on mobile & desktop */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: 1, label: "1. Branches" },
              { id: 2, label: "2. Online" },
              { id: 3, label: "3. Onsite" },
              { id: 4, label: "4. Addons" },
            ].map((s) => {
              const isCompleted = s.id < step;
              const isActive = s.id === step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border",
                    isActive
                      ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20"
                      : isCompleted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-white text-violet-600"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ──── MAIN CONTENT GRID: SUB-STEP FORM (LEFT) + SUMMARY (RIGHT) ──── */}
      <div className="w-full grid gap-6 lg:grid-cols-3 items-start">
        {/* LEFT COLUMN: ACTIVE SUB-STEP */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* SUB-STEP 1: BRANCHES & ORGANIZATION */}
              {step === 1 && (
                <div className="panel p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6 relative overflow-hidden">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        1. Company Details & Branch Locations
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Define organization headquarters and active branch locations.
                      </p>
                    </div>
                    <span className="h-10 w-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5" />
                    </span>
                  </div>

                  {/* Organization Card Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center shrink-0">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {currentCompany?.name || initialData?.companyName || "Organization Name"}
                          </h3>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {currentCompany?.address || initialData?.locationAddress || "Primary Location"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                      Headquarters
                    </span>
                  </div>

                  {/* Branch Locations List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Branch Locations ({branches.length})
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Each location manages independent queues, counters, and ticketing kiosks.
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/50">
                        {branches.length} {branches.length === 1 ? "Location" : "Locations"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {branches.map((b, idx) => {
                        const isPrimary = idx === 0;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3",
                              isPrimary
                                ? "bg-white dark:bg-slate-900 border-violet-200 dark:border-violet-800/60 shadow-2xs"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold shrink-0",
                                    isPrimary
                                      ? "bg-violet-600 text-white"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  )}
                                >
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {isPrimary ? "Headquarters / Main Branch" : `Branch Location ${idx + 1}`}
                                </span>
                              </div>

                              {isPrimary ? (
                                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg shrink-0 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Primary (HQ)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBranch(idx)}
                                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 border-none bg-transparent"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove Branch
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                  Branch Name <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                  value={b.name}
                                  onChange={(e) => updateBranchField(idx, "name", e.target.value)}
                                  className="h-10 text-sm font-semibold rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 w-full"
                                  placeholder={isPrimary ? "Head Office Name" : `Branch ${idx + 1} Name`}
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                  Branch Physical Address / Location
                                </label>
                                <div className="relative">
                                  <Input
                                    value={b.address || ""}
                                    onChange={(e) => updateBranchField(idx, "address", e.target.value)}
                                    className="h-10 text-sm font-medium rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 w-full pl-8"
                                    placeholder={isPrimary ? "Headquarters Street, Building, Area" : `Branch ${idx + 1} Street, Building, Area`}
                                  />
                                  <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBranch}
                      className="w-full py-3.5 px-4 rounded-2xl border border-dashed border-violet-300 hover:border-violet-500 bg-violet-50/30 hover:bg-violet-50/70 text-violet-700 dark:text-violet-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Another Branch Location
                    </button>
                  </div>

                  {/* Company URL Slug */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div>
                      <label className="text-xs font-bold text-slate-900 dark:text-white block">
                        Online Booking Web Address (URL Slug)
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Customers use this link to access your booking page.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 max-w-md">
                      <span className="text-xs text-muted-foreground font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 h-10 rounded-xl flex items-center shrink-0">
                        {window.location.host}/
                      </span>
                      <div className="flex-1 relative">
                        <Input
                          value={companySlug}
                          onChange={(e) => setCompanySlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                          className={cn(
                            "h-10 text-xs font-mono font-bold rounded-xl pr-8",
                            slugAvailable === true && "border-emerald-500 text-emerald-700 dark:text-emerald-300 focus-visible:ring-emerald-500/20",
                            slugAvailable === false && "border-rose-500 text-rose-700 dark:text-rose-300 focus-visible:ring-rose-500/20"
                          )}
                          placeholder="your-company-name"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {slugLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                          ) : slugAvailable === true ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : slugAvailable === false ? (
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {slugError && (
                      <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-1">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{slugError}</span>
                      </p>
                    )}
                  </div>

                  {/* Step 1 Continue Button */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      onClick={() => setStep(2)}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2 rounded-xl px-6 h-11 shadow-md shadow-violet-500/20 cursor-pointer"
                    >
                      Next: Online Booking <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* SUB-STEP 2: ONLINE MODULE CONFIGURATION */}
              {step === 2 && (
                <OnlineBookingBranchAccordion
                  onlineModuleEnabled={onlineModuleEnabled}
                  onToggleOnlineModule={(enabled) => setOnlineModuleEnabled(enabled)}
                  branches={branches}
                  onUpdateBranch={updateBranchField}
                  onAddBranch={handleAddBranch}
                  onDeleteBranch={handleRemoveBranch}
                  globalBranding={{
                    portalName,
                    logoUrl,
                    primaryColor,
                    displayAddress,
                    enabledCustomerFields,
                    enabledBookingFields,
                  }}
                  onUpdateGlobalBranding={(fields) => {
                    if (fields.portalName !== undefined) setPortalName(fields.portalName);
                    if (fields.logoUrl !== undefined) setLogoUrl(fields.logoUrl);
                    if (fields.primaryColor !== undefined) setPrimaryColor(fields.primaryColor);
                    if (fields.displayAddress !== undefined) setDisplayAddress(fields.displayAddress);
                    if (fields.enabledCustomerFields !== undefined) setEnabledCustomerFields(fields.enabledCustomerFields);
                    if (fields.enabledBookingFields !== undefined) setEnabledBookingFields(fields.enabledBookingFields);
                  }}
                  companySlug={companySlug}
                  saveStatus={saveStatus}
                  onNext={() => setStep(hasOnsiteOperations ? 3 : 4)}
                  onBack={() => setStep(1)}
                />
              )}

              {/* SUB-STEP 3: ONSITE MODULE CONFIGURATION */}
              {step === 3 && (
                <OnsiteBranchAccordion
                  onsiteModuleEnabled={onsiteModuleEnabled}
                  onToggleOnsiteModule={(enabled) => setOnsiteModuleEnabled(enabled)}
                  branches={branches}
                  onUpdateBranch={updateBranchField}
                  onApplyToAll={handleApplyToAll}
                  componentPrices={componentPrices}
                  saveStatus={saveStatus}
                  onNext={() => setStep(4)}
                  onBack={() => setStep(2)}
                />
              )}

              {/* SUB-STEP 4: ORGANIZATION ADDONS & REVIEW */}
              {step === 4 && (
                <div className="panel p-6 sm:p-7 space-y-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        4. Organization Addons & Access
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select global plugins and review your complete billing proposal details.
                      </p>
                    </div>
                    <span className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Settings className="h-5 w-5" />
                    </span>
                  </div>

                  {/* Included Admin features row */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Included With Your Plan
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        "Multi-Branch Admin Console",
                        "Live Queue Monitoring & Stats",
                        "Interactive Kiosk Manager",
                        "Role-Based Operator Logs",
                        "Wait Time Forecast Engine",
                        "SLA Breach Alerts"
                      ].map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800 px-3.5 py-2.5 text-xs font-semibold bg-slate-50/70 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 4: Plan Duration & Pricing Options */}
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          Choose Subscription Term & Total Billing
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Commit longer to unlock greater duration savings. Pricing dynamically computes across your configured branches.
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200/60 dark:border-indigo-800/50 self-start sm:self-auto">
                        Selected: {durationMonths} {durationMonths === 1 ? "Month" : durationMonths === 12 ? "Year (12 Mos)" : "Months"}
                      </span>
                    </div>

                    {/* 4 Duration Tier Cards Grid */}
                    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      {(() => {
                        const baseMonthlySubtotal = quote?.raw_total
                          ? Number(quote.raw_total)
                          : activeBranchesList.reduce((acc, b) => {
                              let cost = 0;
                              if (b.channel_type === "ONLINE_ONLY") return 0;
                              const opRate = componentPrices["operator_screens"]?.price_per_unit ? Number(componentPrices["operator_screens"].price_per_unit) : 100;
                              const kioskRate = componentPrices["paper_roll_screens"]?.price_per_unit ? Number(componentPrices["paper_roll_screens"].price_per_unit) : 100;
                              const serviceRate = componentPrices["services"]?.price_per_unit ? Number(componentPrices["services"].price_per_unit) : 100;
                              cost += (b.operatorQty || 1) * opRate;
                              cost += (b.kioskQty || 0) * kioskRate;
                              if (b.mode === "SERVICE_BASED") cost += (b.serviceQty || 1) * serviceRate;
                              if (b.activeMethods?.includes("3")) cost += 490;
                              if (b.activeMethods?.includes("4")) cost += 790;
                              return acc + cost;
                            }, 0) || 1200;

                        const tiers = [
                          {
                            months: 1,
                            discountPercent: 0,
                            title: "1 Month",
                            tag: "Monthly Flexible",
                            badge: "Standard Rate",
                            popular: false,
                            desc: "Month-to-month billing with complete flexibility to cancel or alter desks anytime."
                          },
                          {
                            months: 3,
                            discountPercent: 5,
                            title: "3 Months",
                            tag: "Quarterly Starter",
                            badge: "Save 5%",
                            popular: false,
                            desc: "Quarterly billing with 5% upfront discount applied across all desks and queues."
                          },
                          {
                            months: 6,
                            discountPercent: 10,
                            title: "6 Months",
                            tag: "Semi-Annual",
                            badge: "Save 10% · Popular",
                            popular: false,
                            desc: "Half-year commitment with 10% volume discount across all locations."
                          },
                          {
                            months: 12,
                            discountPercent: 20,
                            title: "1 Year",
                            tag: "Annual Commitment",
                            badge: "Save 20% · Best Deal",
                            popular: true,
                            desc: "Maximum 20% annual discount. Optimal for established multi-counter branches."
                          }
                        ];

                        return tiers.map((tier) => {
                          const isSelected = durationMonths === tier.months;
                          const undiscounted = baseMonthlySubtotal * tier.months;
                          const discount = undiscounted * (tier.discountPercent / 100);
                          const subtotal = undiscounted - discount;
                          const gst = subtotal * 0.18;
                          const grandTotal = Math.round(subtotal + gst);
                          const effectiveMonthly = Math.round(subtotal / tier.months);
                          const savings = Math.round(discount);

                          return (
                            <button
                              key={tier.months}
                              type="button"
                              onClick={() => setDurationMonths(tier.months)}
                              className={cn(
                                "relative rounded-2xl border p-4 text-left transition-all duration-200 outline-none flex flex-col justify-between cursor-pointer select-none group",
                                isSelected
                                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/25 shadow-md shadow-indigo-500/10"
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                              )}
                            >
                              {/* Top Banner Tag / Checkmark */}
                              <div>
                                <div className="flex items-center justify-between pb-2">
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                                      tier.popular
                                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-2xs"
                                        : isSelected
                                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-extrabold"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                                    )}
                                  >
                                    {tier.badge}
                                  </span>
                                  <div
                                    className={cn(
                                      "h-5 w-5 rounded-lg flex items-center justify-center transition-colors shrink-0",
                                      isSelected
                                        ? "bg-indigo-600 text-white"
                                        : "border border-slate-300 dark:border-slate-700 group-hover:border-slate-400"
                                    )}
                                  >
                                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                </div>

                                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
                                  {tier.title}
                                </h4>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                                  {tier.tag}
                                </span>

                                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                                  {tier.desc}
                                </p>
                              </div>

                              {/* Price Display */}
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3 space-y-1">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                    ₹{effectiveMonthly.toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-semibold">/ month</span>
                                </div>

                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground font-medium">Total Billed:</span>
                                  <strong className="text-slate-900 dark:text-white font-bold">
                                    ₹{grandTotal.toLocaleString("en-IN")}
                                  </strong>
                                </div>

                                {savings > 0 ? (
                                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between pt-0.5">
                                    <span>Duration Discount:</span>
                                    <span>Save ₹{savings.toLocaleString("en-IN")}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                                    <span>GST Included (18%):</span>
                                    <span>₹{Math.round(gst).toLocaleString("en-IN")}</span>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Step 4 Footer */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setStep(hasOnsiteOperations ? 3 : 2)}
                      className="rounded-xl h-11 px-5 font-semibold text-xs cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to {!hasOnsiteOperations ? "Step 2" : "Step 3"}
                    </Button>

                    {conditions.allSatisfied && propMode === "registration" && (
                      <Button
                        type="button"
                        onClick={handleRegistrationSubmit}
                        disabled={submitting || propIsSubmitting}
                        className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white font-bold text-xs gap-2 rounded-xl px-6 h-11 shadow-lg shadow-indigo-500/25 cursor-pointer border-none"
                      >
                        Proceed to Checkout <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: STICKY PLAN SUMMARY SIDEBAR (DESKTOP ≥1024px) */}
        <div className="hidden lg:block lg:col-span-1 lg:sticky lg:top-6">
          <PlanSummarySidebar
            branchesCount={branches.length}
            onlineBranchesCount={onlineBranchesCount}
            durationMonths={durationMonths}
            onDurationChange={setDurationMonths}
            durationTiers={config.duration_tiers}
            branches={activeBranchesList}
            quote={quote}
            loadingQuote={loadingQuote}
            quoteError={quoteError}
            companyAddons={companyAddons}
            statePlanComponents={state.planComponents}
            checklist={conditions.checklist}
            allSatisfied={conditions.allSatisfied}
            onNavigateStep={(s) => setStep(s)}
            simulateFailure={simulateFailure}
            onToggleSimulateFailure={setSimulateFailure}
            onDownloadPDF={handleDownloadPDF}
            onSubmit={propMode === "upgrade" ? handleUpgradeSubmit : handleRegistrationSubmit}
            submitting={submitting || propIsSubmitting}
            onCancel={onCancel}
            mode={propMode}
          />
        </div>
      </div>

      {/* ──── MOBILE STICKY BOTTOM BAR & SHEET (<1024px) ──── */}
      <MobileSummarySheet
        branchesCount={branches.length}
        onlineBranchesCount={onlineBranchesCount}
        durationMonths={durationMonths}
        onDurationChange={setDurationMonths}
        durationTiers={config.duration_tiers}
        branches={activeBranchesList}
        quote={quote}
        loadingQuote={loadingQuote}
        checklist={conditions.checklist}
        allSatisfied={conditions.allSatisfied}
        onNavigateStep={(s) => setStep(s)}
        simulateFailure={simulateFailure}
        onToggleSimulateFailure={setSimulateFailure}
        onDownloadPDF={handleDownloadPDF}
        onSubmit={propMode === "upgrade" ? handleUpgradeSubmit : handleRegistrationSubmit}
        submitting={submitting || propIsSubmitting}
        onCancel={onCancel}
        mode={propMode}
      />
    </div>
  );
}
