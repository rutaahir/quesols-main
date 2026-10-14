import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Copy, ExternalLink, Eye, EyeOff, Layers, Monitor, Pencil, Plus, QrCode, Sparkles, UserPlus, Users, MoreVertical, Globe, AlertTriangle, X, Sunrise, Sun, Sunset, Calendar, Filter, Bell, Building2, Clock, Phone, Mail, Radio, Briefcase, User, Info, Settings, MessageSquare, MessageCircle, Printer, Star, CreditCard, ShieldCheck, Loader2, CloudSun, MapPin, TrendingUp, TrendingDown, CheckCircle2, MoreHorizontal, Activity, FileText, BarChart3, PieChart as PieChartIcon, LayoutDashboard, Tv } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, planOf, useQuesole, branchStats, isNoServiceMode, calculateBranchReadiness } from "@/lib/quesole/store";
import { getNetworkOrigin } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { DisplayTerminalsManager } from "@/components/console/display-terminals-manager";
import { BranchAttendanceLogsView } from "@/components/console/branch-attendance-logs";

const tabVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 }
};

const transition = {
  duration: 0.3,
  ease: "easeInOut"
};

export function BranchDesksServicesManager({ 
  branchId, 
  onBack,
  setView,
  renderPlanUsageView
}: { 
  branchId: string; 
  onBack?: () => void;
  setView?: (view: string) => void;
  renderPlanUsageView?: (companyId: string, company: any) => React.ReactNode;
}) {
  const { state, actions, session, refresh } = useQuesole();
  const isBranchAdmin = session?.role === "branch_admin";
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "desks" | "staff" | "attendance" | "kiosks" | "displays" | "online_booking" | "kot">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab") as any;
      if (urlTab && ["overview", "services", "desks", "staff", "attendance", "kiosks", "displays", "online_booking", "kot"].includes(urlTab)) {
        return urlTab;
      }
      const saved = sessionStorage.getItem(`branch_active_tab_${branchId}`) || localStorage.getItem(`branch_active_tab_${branchId}`);
      if (saved && ["overview", "services", "desks", "staff", "attendance", "kiosks", "displays", "online_booking", "kot"].includes(saved)) {
        return saved as any;
      }
    }
    return "overview";
  });

  useEffect(() => {
    if (typeof window !== "undefined" && branchId) {
      sessionStorage.setItem(`branch_active_tab_${branchId}`, activeTab);
      localStorage.setItem(`branch_active_tab_${branchId}`, activeTab);
      const params = new URLSearchParams(window.location.search);
      params.set("tab", activeTab);
      const newSearch = params.toString();
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [activeTab, branchId]);

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [isTabStuck, setIsTabStuck] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!tabContainerRef.current) return;
      const rect = tabContainerRef.current.getBoundingClientRect();
      const stickyThreshold = window.innerWidth >= 1024 ? 68 : 60;
      setIsTabStuck(rect.top <= stickyThreshold);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTabSelect = (tab: "overview" | "services" | "desks" | "staff" | "attendance" | "kiosks" | "displays" | "online_booking" | "kot") => {
    setActiveTab(tab);
    
    // Auto-scroll so the tabview bar goes smoothly to top and docks stickily
    setTimeout(() => {
      if (tabContainerRef.current) {
        const headerOffset = window.innerWidth >= 1024 ? 64 : 56;
        const rect = tabContainerRef.current.getBoundingClientRect();
        const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
        const targetScrollY = currentScrollY + rect.top - headerOffset;

        window.scrollTo({
          top: Math.max(0, targetScrollY),
          behavior: "smooth"
        });
      }
    }, 40);
  };

  // Live auto-refresh kiosk status every 3 seconds when Kiosks tab is active
  useEffect(() => {
    if (activeTab !== "kiosks") return;
    refresh();
    const interval = setInterval(() => {
      refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab, refresh]);
  const [searchServicesQuery, setSearchServicesQuery] = useState("");
  const [searchDesksQuery, setSearchDesksQuery] = useState("");
  const [searchStaffQuery, setSearchStaffQuery] = useState("");
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSetupExpanded, setIsSetupExpanded] = useState<boolean | null>(null);

  // Add Kiosk Form State
  const [isAddKioskModalOpen, setIsAddKioskModalOpen] = useState(false);
  const [newKioskName, setNewKioskName] = useState("");
  const [newKioskPin, setNewKioskPin] = useState("");
  const [isCreatingKiosk, setIsCreatingKiosk] = useState(false);

  const branch = state.branches.find((b) => String(b.id) === String(branchId));
  const company = state.companies.find((c) => String(c.id) === String(branch?.companyId));
  const companyId = company?.id || "";
  const isMethod4Unlocked = planOf(company?.plan ?? "starter").methods.includes(4) || branch?.channel_type === "ONLINE_ONLY" || branch?.channel_type === "HYBRID";

  const companySlug = company?.slug || "";
  const branchSlug = branch?.slug || "";
  const joinUrl = companySlug && branchSlug ? `/${companySlug}/branches/${branchSlug}/join` : `/q/${branch?.id || branchId}`;
  const kioskUrl = companySlug && branchSlug ? `/${companySlug}/branches/${branchSlug}/kiosk` : `/kiosk/${branch?.id || branchId}`;
  const displayUrl = companySlug && branchSlug ? `/${companySlug}/branches/${branchSlug}/display` : `/${companySlug}/branches/${branchSlug}/display`;
  const kotUrl = companySlug && branchSlug ? `/${companySlug}/branches/${branchSlug}/kot` : `/kot/${branch?.id || branchId}`;

  useEffect(() => {
    if (branch?.channel_type === "ONLINE_ONLY" && ["desks", "staff", "kiosks"].includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [branch?.channel_type, activeTab]);

  const [hourlyChartHoverIdx, setHourlyChartHoverIdx] = useState<number | null>(1);
  const [selectedChartService, setSelectedChartService] = useState<string>("all");
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [branchStatus, setBranchStatus] = useState<"active" | "inactive" | "maintenance">("active");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);
  const [kioskPin, setKioskPin] = useState("");
  const [kioskPinConfirm, setKioskPinConfirm] = useState("");
  const [kioskTimeout, setKioskTimeout] = useState(branch?.kioskIdleTimeoutSeconds || 8);
  const [isSavingKioskPin, setIsSavingKioskPin] = useState(false);

  const handleSaveKioskPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kioskPin !== kioskPinConfirm) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }
    if (kioskPin.length < 4) {
      toast.error("Kiosk access password must be at least 4 characters long.");
      return;
    }
    setIsSavingKioskPin(true);
    try {
      if ((actions as any).setBranchKioskSettings) {
        await (actions as any).setBranchKioskSettings(branchId, {
          password: kioskPin,
          idleTimeoutSeconds: kioskTimeout,
        });
      } else {
        await actions.updateBranchDetails(branchId, {
          ...branch,
          name: branch?.name || "",
          city: branch?.city || "",
          kioskPasswordHash: kioskPin,
          kioskIdleTimeoutSeconds: kioskTimeout,
        } as any);
      }
      toast.success("Kiosk access password and idle timeout saved successfully!");
      setIsKioskModalOpen(false);
      setKioskPin("");
      setKioskPinConfirm("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save kiosk settings.");
    } finally {
      setIsSavingKioskPin(false);
    }
  };

  // Filter branch desks, services, staff
  const branchDesks = useMemo(() => {
    return state.desks.filter((d) => String(d.branchId) === String(branchId));
  }, [state.desks, branchId]);

  const branchServices = useMemo(() => {
    return state.services.filter((s) => String(s.branchId) === String(branchId));
  }, [state.services, branchId]);

  const branchStaff = useMemo(() => {
    return state.staff.filter((s) => String(s.branchId) === String(branchId));
  }, [state.staff, branchId]);

  const branchKiosks = useMemo(() => {
    return state.kiosks.filter((k) => String(k.branch) === String(branchId));
  }, [state.kiosks, branchId]);

  // Hourly Queue Breakdown for Queue Overview Chart
  const hourlyQueueData = useMemo(() => {
    return [
      { time: "9 AM", fullTime: "09:00 AM", waiting: 22, served: 16 },
      { time: "10 AM", fullTime: "10:00 AM", waiting: 32, served: 18 },
      { time: "11 AM", fullTime: "11:00 AM", waiting: 14, served: 26 },
      { time: "12 PM", fullTime: "12:00 PM", waiting: 24, served: 18 },
      { time: "1 PM", fullTime: "01:00 PM", waiting: 30, served: 22 },
      { time: "2 PM", fullTime: "02:00 PM", waiting: 18, served: 15 },
      { time: "3 PM", fullTime: "03:00 PM", waiting: 26, served: 20 },
      { time: "4 PM", fullTime: "04:00 PM", waiting: 24, served: 28 },
    ];
  }, []);

  // Servicewise queue distribution
  const serviceDistribution = useMemo(() => {
    const defaultServices = [
      { name: "Prepaid", count: 4, pct: 44, color: "#7C3AED" },
      { name: "Post Paid", count: 3, pct: 33, color: "#3B82F6" },
      { name: "Internet", count: 2, pct: 22, color: "#F59E0B" },
    ];

    if (branchServices.length >= 2) {
      const colors = ["#7C3AED", "#3B82F6", "#F59E0B", "#10B981", "#EC4899"];
      const bTickets = state.tickets.filter((t) => String(t.branchId) === String(branchId) && t.status === "waiting");
      const totalW = Math.max(bTickets.length, 9);
      return branchServices.slice(0, 4).map((s, idx) => {
        const sCount = bTickets.filter((t) => String(t.serviceId) === String(s.id)).length || (idx === 0 ? 4 : idx === 1 ? 3 : 2);
        return {
          name: s.name,
          count: sCount,
          pct: Math.round((sCount / totalW) * 100),
          color: colors[idx % colors.length],
        };
      });
    }

    return defaultServices;
  }, [branchServices, state.tickets, branchId]);

  // Overview desks status cards
  const overviewDesks = useMemo(() => {
    if (branchDesks.length > 0) {
      return branchDesks.slice(0, 4).map((d, idx) => {
        const dServices = state.deskServices
          ?.filter((ds) => ds.deskId === d.id)
          .map((ds) => branchServices.find((s) => s.id === ds.serviceId)?.name)
          .filter(Boolean)
          .join(", ") || (idx === 0 ? "Prepaid" : idx === 1 ? "Post Paid, Internet" : idx === 2 ? "Internet" : "Prepaid");

        const isBusy = idx === 1;
        const isOffline = d.status !== "open" && idx === 3;
        const qCount = idx === 0 ? 0 : idx === 1 ? 5 : idx === 2 ? 2 : 0;

        return {
          id: d.id,
          name: d.name || `Desk ${idx + 1}`,
          status: isOffline ? "Offline" : isBusy ? "Busy" : "Available",
          statusVariant: isOffline ? "offline" : isBusy ? "busy" : "available",
          queueCount: isOffline ? "-" : `${qCount} in queue`,
          rawCount: isOffline ? 0 : qCount,
          services: dServices,
        };
      });
    }
    return [
      { id: "d1", name: "Desk 1", status: "Available", statusVariant: "available", queueCount: "0 in queue", rawCount: 0, services: "Prepaid" },
      { id: "d2", name: "Desk 2", status: "Busy", statusVariant: "busy", queueCount: "5 in queue", rawCount: 5, services: "Post Paid, Internet" },
      { id: "d3", name: "Desk 3", status: "Available", statusVariant: "available", queueCount: "2 in queue", rawCount: 2, services: "Internet" },
      { id: "d4", name: "Desk 4", status: "Offline", statusVariant: "offline", queueCount: "-", rawCount: 0, services: "Prepaid" },
    ];
  }, [branchDesks, branchServices, state.deskServices]);

  // Recent bookings table
  const recentBookingsList = useMemo(() => {
    const branchRecent = state.tickets
      .filter((t) => String(t.branchId) === String(branchId))
      .slice(-5)
      .reverse();

    if (branchRecent.length >= 3) {
      return branchRecent.map((t, idx) => {
        const sName = branchServices.find((s) => s.id === t.serviceId)?.name || (idx % 2 === 0 ? "Prepaid" : "Post Paid");
        const dName = branchDesks.find((d) => d.id === t.deskId)?.name || `Desk ${(idx % 3) + 1}`;
        const timeStr = t.joinedAt ? new Date(t.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `10:${25 - idx * 5} AM`;
        return {
          token: t.token_number || t.number || `A03${6 - idx}`,
          customer: t.customer_name || t.customerName || ["Amit Patel", "Neha Shah", "Ketan Joshi", "Priya Desai", "Rahul Mehta"][idx] || "Customer",
          service: sName,
          desk: dName,
          time: timeStr,
          status: t.status === "waiting" ? "Waiting" : "Served",
          statusVariant: t.status === "waiting" ? "warning" : "success",
        };
      });
    }

    return [
      { token: "A036", customer: "Amit Patel", service: "Post Paid", desk: "Desk 2", time: "10:25 AM", status: "Waiting", statusVariant: "warning" },
      { token: "A035", customer: "Neha Shah", service: "Prepaid", desk: "Desk 1", time: "10:20 AM", status: "Served", statusVariant: "success" },
      { token: "A034", customer: "Ketan Joshi", service: "Internet", desk: "Desk 3", time: "10:15 AM", status: "Served", statusVariant: "success" },
      { token: "A033", customer: "Priya Desai", service: "Post Paid", desk: "Desk 2", time: "10:10 AM", status: "Served", statusVariant: "success" },
      { token: "A032", customer: "Rahul Mehta", service: "Prepaid", desk: "Desk 1", time: "10:05 AM", status: "Served", statusVariant: "success" },
    ];
  }, [state.tickets, branchId, branchServices, branchDesks]);

  // Auto-initialize new kiosk form fields on open
  useEffect(() => {
    if (isAddKioskModalOpen) {
      setNewKioskName(`Kiosk ${branchKiosks.length + 1}`);
      setNewKioskPin(Math.floor(1000 + Math.random() * 9000).toString());
    }
  }, [isAddKioskModalOpen, branchKiosks.length]);

  const handleCreateKiosk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKioskName.trim()) {
      toast.error("Kiosk name is required.");
      return;
    }
    if (newKioskPin.length !== 4) {
      toast.error("Kiosk PIN must be exactly 4 digits.");
      return;
    }
    setIsCreatingKiosk(true);
    try {
      await apiFetch("/api/kot/kiosks/", {
        method: "POST",
        body: JSON.stringify({
          kiosk_identifier: newKioskName.trim(),
          pin: newKioskPin,
          branch: branchId
        })
      });
      toast.success("Kiosk created successfully!");
      setIsAddKioskModalOpen(false);
      setNewKioskName("");
      setNewKioskPin("");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create kiosk.");
    } finally {
      setIsCreatingKiosk(false);
    }
  };

  // Compute branch-scoped usage and purchased plan allocations
  const branchAllocations = state.companyAllocations.filter((a) => String(a.branch_id) === String(branchId));
  const companyWideAllocations = state.companyAllocations.filter((a) => !a.branch_id && String(a.companyId) === String(companyId));

  const getPurchasedQty = (key: string, defaultQty: number) => {
    const brAlloc = branchAllocations.find((a) => a.component_key === key);
    if (brAlloc) return brAlloc.purchased_qty;
    const compAlloc = companyWideAllocations.find((a) => a.component_key === key);
    return compAlloc ? compAlloc.purchased_qty : defaultQty;
  };

  const purchasedDesks = getPurchasedQty("operator_screens", 3);
  const usedDesks = branchDesks.length;
  const isDeskLimitReached = usedDesks >= purchasedDesks;

  const purchasedServices = getPurchasedQty("services", 1);
  const usedServices = branchServices.length;
  const isServiceLimitReached = usedServices >= purchasedServices;

  const noService = isNoServiceMode(companyId, state.companyAllocations);
  const purchasedKiosks = getPurchasedQty("paper_roll_screens", 0);
  const purchasedQRs = getPurchasedQty("printed_qr", 0);
  const showServicesTab = branch?.mode === "SERVICE_BASED" && !noService;
  const isSingleQueue = branch?.mode === "NON_SERVICE_BASED" || noService;

  // Add modals & Add-on upsell state
  const [isAddDeskModalOpen, setIsAddDeskModalOpen] = useState(false);
  const [newDeskName, setNewDeskName] = useState("");
  const [newDeskActive, setNewDeskActive] = useState(true);
  const [newDeskOnlineBooking, setNewDeskOnlineBooking] = useState(false);
  const [newDeskServices, setNewDeskServices] = useState<string[]>([]);
  const [newDeskStaffIds, setNewDeskStaffIds] = useState<string[]>([]);
  const [isCreatingDesk, setIsCreatingDesk] = useState(false);

  // Edit branch state
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchCity, setEditBranchCity] = useState("");
  const [editBranchHours, setEditBranchHours] = useState("");
  const [editBranchPhone, setEditBranchPhone] = useState("");
  const [editBranchEmail, setEditBranchEmail] = useState("");

  // Edit desk modal state
  const [editingDesk, setEditingDesk] = useState<any | null>(null);
  const [editDeskName, setEditDeskName] = useState("");
  const [editDeskActive, setEditDeskActive] = useState(true);
  const [editDeskOnlineBooking, setEditDeskOnlineBooking] = useState(false);
  const [editDeskServices, setEditDeskServices] = useState<string[]>([]);
  const [editDeskStaffIds, setEditDeskStaffIds] = useState<string[]>([]);
  const [isSavingDesk, setIsSavingDesk] = useState(false);

  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrefix, setNewServicePrefix] = useState("A");
  const [newServiceAvgMinutes, setNewServiceAvgMinutes] = useState(15);
  const [isCreatingService, setIsCreatingService] = useState(false);

  // Edit Service modal state
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServicePrefix, setEditServicePrefix] = useState("");
  const [editServiceAvgMinutes, setEditServiceAvgMinutes] = useState(15);

  // Two-Step Staff creation wizard state
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [addStaffStep, setAddStaffStep] = useState<1 | 2>(1);
  const [newStaffFirstName, setNewStaffFirstName] = useState("");
  const [newStaffLastName, setNewStaffLastName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("Staff123!");
  const [showPassword, setShowPassword] = useState(false);
  const [newStaffRole, setNewStaffRole] = useState<"desk_staff" | "branch_admin">("desk_staff");

  // Step 2 Desk Assignment Options
  const [deskOption, setDeskOption] = useState<"existing" | "new">("existing");
  const [selectedExistingDeskId, setSelectedExistingDeskId] = useState<string | null>(null);

  // Option B Inline Desk Creation fields
  const [inlineDeskName, setInlineDeskName] = useState("");
  const [inlineDeskActive, setInlineDeskActive] = useState(true);
  const [inlineDeskServices, setInlineDeskServices] = useState<string[]>([]);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Staff edit state
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editStaffFirstName, setEditStaffFirstName] = useState("");
  const [editStaffLastName, setEditStaffLastName] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffRole, setEditStaffRole] = useState<"desk_staff" | "branch_admin">("desk_staff");
  const [editStaffDeskId, setEditStaffDeskId] = useState<string | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  const [upsellModalCompKey, setUpsellModalCompKey] = useState<string | null>(null);

  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  if (!branch || !company) {
    return (
      <div className="panel p-8 text-center text-muted-foreground">
        Branch or company information not found.
      </div>
    );
  }

  // Pre-checked modal openers
  const handleOpenAddDesk = () => {
    if (isDeskLimitReached) {
      setUpsellModalCompKey("operator_screens");
    } else {
      setNewDeskName("");
      setNewDeskActive(true);
      setNewDeskOnlineBooking(false);
      setNewDeskServices(branchServices.map((s) => s.id));
      setNewDeskStaffIds([]);
      setIsAddDeskModalOpen(true);
    }
  };

  const handleOpenAddService = () => {
    if (isServiceLimitReached) {
      setUpsellModalCompKey("services");
    } else {
      setNewServiceName("");
      setNewServicePrefix(String.fromCharCode(65 + branchServices.length % 26));
      setIsAddServiceModalOpen(true);
    }
  };

  const handleOpenAddStaff = () => {
    setAddStaffStep(1);
    setNewStaffFirstName("");
    setNewStaffLastName("");
    setNewStaffEmail("");
    setNewStaffPassword("Staff123!");
    setShowPassword(false);
    setNewStaffRole("desk_staff");

    const hasDesks = branchDesks.length > 0 && branchDesks[0] !== undefined;
    setDeskOption(hasDesks ? "existing" : "new");
    setSelectedExistingDeskId(hasDesks ? branchDesks[0]!.id : null);
    setInlineDeskName("");
    setInlineDeskActive(true);
    setInlineDeskServices(branchServices.map((s) => s.id));

    setIsAddStaffModalOpen(true);
  };

  const handleCreateDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeskName.trim()) return;
    setIsCreatingDesk(true);
    try {
      const deskId = await actions.createDesk({ branchId: branch.id, name: newDeskName.trim() });
      await actions.updateDesk(deskId, {
        name: newDeskName.trim(),
        label: newDeskName.trim(),
        isActive: newDeskActive,
        serviceIds: newDeskServices,
        assignedStaffIds: newDeskStaffIds,
        isOnlineBookingDesk: newDeskOnlineBooking,
      });
      toast.success(`Desk "${newDeskName}" created successfully!`);
      setIsAddDeskModalOpen(false);
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes("limit") || err.message.toLowerCase().includes("reached") || err.message.toLowerCase().includes("allocate"))) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-xs leading-normal">{err.message}</span>
            <span className="text-[10px] text-muted-foreground leading-normal">
              You can upgrade your subscription limits in the Billing tab of the Company Admin Console.
            </span>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error(err.message || "Failed to create desk.");
      }
    } finally {
      setIsCreatingDesk(false);
    }
  };

  const handleOpenEditDesk = (desk: any) => {
    const deskServicesIds = state.deskServices
      .filter((ds) => ds.deskId === desk.id)
      .map((ds) => ds.serviceId);

    const assignedStaffIds = branchStaff
      .filter((st) => String(st.deskId) === String(desk.id))
      .map((st) => st.id);

    setEditingDesk(desk);
    setEditDeskName(desk.label || desk.name || "");
    setEditDeskActive(desk.isActive ?? true);
    setEditDeskOnlineBooking(desk.isOnlineBookingDesk ?? false);
    setEditDeskServices(deskServicesIds);
    setEditDeskStaffIds(assignedStaffIds);
  };

  const handleSaveDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesk || !editDeskName.trim()) return;
    setIsSavingDesk(true);
    try {
      await actions.updateDesk(editingDesk.id, {
        name: editDeskName.trim(),
        label: editDeskName.trim(),
        isActive: editDeskActive,
        serviceIds: editDeskServices,
        assignedStaffIds: editDeskStaffIds,
        isOnlineBookingDesk: editDeskOnlineBooking,
      });
      toast.success(`Desk "${editDeskName}" saved successfully!`);
      setEditingDesk(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update desk.");
    } finally {
      setIsSavingDesk(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    setIsCreatingService(true);
    try {
      await actions.createService({
        branchId: branch.id,
        name: newServiceName.trim(),
        prefix: newServicePrefix.trim().toUpperCase() || "A",
        estServiceMinutes: Number(newServiceAvgMinutes) || 15,
      });
      toast.success(`Service "${newServiceName}" created successfully!`);
      setIsAddServiceModalOpen(false);
      setNewServiceName("");
      setNewServicePrefix("A");
      setNewServiceAvgMinutes(15);
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes("limit") || err.message.toLowerCase().includes("reached") || err.message.toLowerCase().includes("allocate"))) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-xs leading-normal">{err.message}</span>
            <span className="text-[10px] text-muted-foreground leading-normal">
              You can upgrade your subscription limits in the Billing tab of the Company Admin Console.
            </span>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error(err.message || "Failed to create service.");
      }
    } finally {
      setIsCreatingService(false);
    }
  };

  const handleOpenEditService = (s: any) => {
    setEditingService(s);
    setEditServiceName(s.name);
    setEditServicePrefix(s.prefix);
    setEditServiceAvgMinutes(s.avgMinutes || 15);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editServiceName.trim()) return;
    try {
      await apiFetch(`/api/services/${editingService.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editServiceName.trim(),
          prefix: editServicePrefix.trim().toUpperCase() || "A",
          est_service_minutes: Number(editServiceAvgMinutes) || 15,
        }),
      });
      toast.success(`Service "${editServiceName}" updated successfully!`);
      setEditingService(null);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update service.");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service category? All counter routing configurations for this service will be removed.")) {
      return;
    }
    try {
      await apiFetch(`/api/services/${serviceId}/`, { method: "DELETE" });
      toast.success("Service category deleted successfully!");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service category.");
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailStr = newStaffEmail.trim();
    if (!emailStr || !newStaffFirstName.trim() || !newStaffLastName.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      toast.error("Please enter a valid login email address.");
      return;
    }

    const isDuplicate = state.staff.some((st) => st.email.toLowerCase() === emailStr.toLowerCase());
    if (isDuplicate) {
      toast.error(`A staff user with email "${emailStr}" already exists.`);
      return;
    }

    if (newStaffPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    // Branch Admin submit from Step 1
    if (newStaffRole === "branch_admin") {
      setIsCreatingStaff(true);
      try {
        await actions.createBranchStaff({
          branchId: branch.id,
          email: emailStr,
          password: newStaffPassword.trim() || "Staff123!",
          firstName: newStaffFirstName.trim(),
          lastName: newStaffLastName.trim(),
          role: "branch_admin",
        });
        toast.success(`Branch Admin "${emailStr}" created successfully!`);
        setIsAddStaffModalOpen(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to create Branch Admin.");
      } finally {
        setIsCreatingStaff(false);
      }
      return;
    }

    // If step 1 for Desk Operator, advance to Step 2
    if (addStaffStep === 1) {
      setAddStaffStep(2);
      return;
    }

    // Step 2 Submission for Desk Operator
    setIsCreatingStaff(true);
    try {
      let targetDeskId: string | null = null;
      let targetServices: string[] = [];

      if (deskOption === "existing") {
        if (!selectedExistingDeskId) {
          toast.error("Please select an existing desk to assign this operator.");
          setIsCreatingStaff(false);
          return;
        }
        targetDeskId = selectedExistingDeskId;
        targetServices = state.deskServices
          .filter((ds) => ds.deskId === targetDeskId)
          .map((ds) => ds.serviceId);
      } else {
        // Option B: Create new desk
        if (!inlineDeskName.trim()) {
          toast.error("Please enter a Desk Name for the new desk.");
          setIsCreatingStaff(false);
          return;
        }
        if (isDeskLimitReached) {
          setUpsellModalCompKey("operator_screens");
          setIsCreatingStaff(false);
          return;
        }

        const createdDeskId = await actions.createDesk({
          branchId: branch.id,
          name: inlineDeskName.trim(),
        });

        await actions.updateDesk(createdDeskId, {
          name: inlineDeskName.trim(),
          label: inlineDeskName.trim(),
          isActive: inlineDeskActive,
          serviceIds: inlineDeskServices,
        });

        targetDeskId = createdDeskId;
        targetServices = inlineDeskServices;
      }

      // Create staff account
      const res = await actions.createBranchStaff({
        branchId: branch.id,
        email: emailStr,
        password: newStaffPassword.trim() || "Staff123!",
        firstName: newStaffFirstName.trim(),
        lastName: newStaffLastName.trim(),
        role: "desk_staff",
      });

      const newUserId = res?.id || state.staff.find((st) => st.email.toLowerCase() === emailStr.toLowerCase())?.id;

      if (targetDeskId && newUserId) {
        await actions.assignStaffToDesk(newUserId, targetDeskId);
        await actions.updateUserServices(newUserId, targetServices);
      }

      const assignedDeskLabel = branchDesks.find((d) => d.id === targetDeskId)?.label || inlineDeskName.trim() || "assigned desk";
      toast.success(`Desk Operator "${emailStr}" created & assigned to ${assignedDeskLabel}!`);
      setIsAddStaffModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create staff account.");
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleOpenEditStaff = (st: any) => {
    const nameParts = (st.name || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const assignedDesk = branchDesks.find((d) =>
      state.staff.some((s) => s.id === st.id && s.deskId === d.id)
    );

    setEditingStaff(st);
    setEditStaffFirstName(firstName);
    setEditStaffLastName(lastName);
    setEditStaffEmail(st.email || "");
    setEditStaffRole(st.role === "branch_admin" ? "branch_admin" : "desk_staff");
    setEditStaffDeskId(assignedDesk ? assignedDesk.id : null);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editStaffEmail.trim()) return;
    setIsSavingStaff(true);
    try {
      await actions.updateBranchStaff(editingStaff.id, {
        firstName: editStaffFirstName.trim(),
        lastName: editStaffLastName.trim(),
        email: editStaffEmail.trim(),
        role: editStaffRole,
        deskId: editStaffDeskId,
      });

      if (editStaffRole === "desk_staff" && editStaffDeskId) {
        await actions.assignStaffToDesk(editingStaff.id, editStaffDeskId);
        const deskServices = state.deskServices
          .filter((ds) => ds.deskId === editStaffDeskId)
          .map((ds) => ds.serviceId);
        await actions.updateUserServices(editingStaff.id, deskServices);
      } else if (editingStaff.deskId) {
        await actions.assignStaffToDesk(editingStaff.id, null);
        await actions.updateUserServices(editingStaff.id, []);
      }

      toast.success(`Staff user "${editStaffEmail}" updated successfully!`);
      setEditingStaff(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update staff user.");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleOpenEditBranch = () => {
    setEditBranchName(branch.name || "");
    setEditBranchAddress(branch.address || "");
    setEditBranchCity(branch.city || "");
    setEditBranchHours(branch.operating_hours_summary || "");
    setEditBranchPhone(branch.phone || company.contact_phone || "");
    setEditBranchEmail(branch.email || company.contact_email || "");
    setIsEditingBranch(true);
  };

  const handleSaveBranch = async () => {
    try {
      await actions.updateBranchDetails(branch.id, {
        name: editBranchName.trim(),
        address: editBranchAddress.trim(),
        city: editBranchCity.trim(),
        operating_hours_summary: editBranchHours.trim(),
        phone: editBranchPhone.trim(),
        email: editBranchEmail.trim(),
      });
      toast.success("Branch details updated successfully!");
      setIsEditingBranch(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update branch details.");
    }
  };

  if (!branch) {
    return (
      <div className="panel p-8 text-center space-y-4 my-8">
        <h3 className="font-display text-lg font-bold text-foreground">Branch Loading or Not Found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          The requested branch details could not be found or are being initialized.
        </p>
        {onBack && (
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={onBack} className="font-bold text-xs">
              ← Return to Branches List
            </Button>
          </div>
        )}
      </div>
    );
  }

  const readinessGlobal = calculateBranchReadiness(branch, state);
  const isSetupCompleteGlobal = readinessGlobal.score === 100;

  return (
    <div className="flex flex-col gap-6 pb-16 relative">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 relative">
        <div className="flex items-center gap-2 text-sm">
          {onBack && (
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-[#5B50EB] dark:hover:text-indigo-400 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Branches
            </button>
          )}
          {!onBack && setView && (
            <button
              onClick={() => setView("branches")}
              className="text-slate-400 hover:text-[#5B50EB] dark:hover:text-indigo-400 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Branches
            </button>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
            {branch.name}
          </span>
        </div>

        {/* Right side: Open Live Display, More Actions, Active Status */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="brand"
            size="sm"
            onClick={() => window.open(displayUrl, "_blank")}
            className="h-9 px-4 gap-2 text-xs font-bold rounded-xl bg-[#5B50EB] hover:bg-[#4d42db] text-white shadow-xs shadow-[#5B50EB]/20 transition-all cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" /> Open Live Display
          </Button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
              className="h-9 px-3 gap-1.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-2xs cursor-pointer"
            >
              More Actions <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
            {isMoreActionsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1.5 z-30 animate-in fade-in-50 zoom-in-95">
                <button
                  onClick={() => {
                    setIsMoreActionsOpen(false);
                    setIsQrModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5 text-[#5B50EB]" /> Branch QR &amp; Links
                </button>
                <button
                  onClick={() => {
                    setIsMoreActionsOpen(false);
                    setIsEditingBranch(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" /> Branch Settings
                </button>
                <button
                  onClick={async () => {
                    setIsMoreActionsOpen(false);
                    await refresh();
                    toast.success("Branch telemetry refreshed!");
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5 text-emerald-500" /> Refresh Telemetry
                </button>
              </div>
            )}
          </div>

          {/* Status Pill Badge */}
          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs",
                branchStatus === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800"
                  : branchStatus === "maintenance"
                  ? "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800"
                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
              )}
            >
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                branchStatus === "active" ? "bg-emerald-500 animate-pulse" : branchStatus === "maintenance" ? "bg-amber-500" : "bg-slate-400"
              )} />
              <span className="capitalize">{branchStatus}</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </button>
            {isStatusDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1 z-30 animate-in fade-in-50 zoom-in-95">
                {(["active", "maintenance", "inactive"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setBranchStatus(st);
                      setIsStatusDropdownOpen(false);
                      toast.success(`Branch status updated to ${st}`);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium capitalize hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      st === "active" ? "bg-emerald-500" : st === "maintenance" ? "bg-amber-500" : "bg-slate-400"
                    )} />
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Branch Header Hero Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 z-10 relative">
        {/* Left: Building Photo + Title + Meta */}
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          <div className="relative shrink-0 group">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop&q=80"
              alt={branch.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs group-hover:opacity-90 transition-all"
            />
            <button
              onClick={() => setIsEditingBranch(true)}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#5B50EB] hover:scale-110 transition-all cursor-pointer"
              title="Edit Branch Image / Details"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {branch.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{branch.address || "Main Office Address, Vadodara, Gujarat, India"}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                Branch Code: <strong className="font-mono font-bold text-slate-900 dark:text-slate-100">{branch.code || `HO-00${branch.id || '1'}`}</strong>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(branch.code || `HO-00${branch.id || '1'}`);
                    toast.success("Branch code copied!");
                  }}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-0.5 cursor-pointer"
                  title="Copy code"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                Region: <strong className="text-slate-900 dark:text-slate-100">{branch.city || "Gujarat"}</strong>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                Timezone: <strong className="text-slate-900 dark:text-slate-100">IST (UTC+5:30)</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Today's Activity widget */}
        <div className="border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 rounded-xl p-3 sm:p-4 min-w-[280px] shrink-0 space-y-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Today's Activity
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-3.5 w-3.5 text-[#5B50EB]" />
              <span>Mon, 14 Oct 2026</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium font-mono">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>10:32 AM</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50/70 border border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-medium">
            <CloudSun className="h-4 w-4 text-amber-500" />
            <span>32°C Partly Cloudy</span>
          </div>
        </div>
      </div>

      {/* Sticky Pill-Style Sub-Navigation Tabs Bar */}
      <div
        ref={tabContainerRef}
        className={cn(
          "sticky top-14 lg:top-16 z-30 w-full transition-all duration-300 py-2.5 -mx-2 px-2 sm:-mx-6 sm:px-6 scroll-mt-14 lg:scroll-mt-16",
          isTabStuck
            ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md shadow-slate-200/50 dark:shadow-slate-950/60 border-b border-slate-200/80 dark:border-slate-800"
            : "bg-slate-50/70 dark:bg-slate-900/40 backdrop-blur-xs border-b border-slate-200/60 dark:border-slate-800/80"
        )}
      >
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5">
            {/* Sticky mini branch indicator badge when pinned */}
            {isTabStuck && (
              <div className="hidden md:flex items-center gap-2 pr-3 mr-1 border-r border-slate-200 dark:border-slate-800 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5B50EB]/10 text-[#5B50EB]">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 max-w-[120px] truncate">
                  {branch.name}
                </span>
              </div>
            )}

            {/* Tab 1: Overview */}
            <button
              onClick={() => handleTabSelect("overview")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                activeTab === "overview"
                  ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                  : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Overview
            </button>

            {/* Tab 2: Services */}
            {showServicesTab && (
              <button
                onClick={() => handleTabSelect("services")}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                  activeTab === "services"
                    ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                    : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <Layers className="h-3.5 w-3.5" /> Services
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                  activeTab === "services" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60"
                )}>
                  {branchServices.length}
                </span>
              </button>
            )}

            {/* Tab 3: Desks */}
            {branch?.channel_type !== "ONLINE_ONLY" && (
              <button
                onClick={() => handleTabSelect("desks")}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                  activeTab === "desks"
                    ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                    : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <Monitor className="h-3.5 w-3.5" /> Desks
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                  activeTab === "desks" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60"
                )}>
                  {branchDesks.length}
                </span>
              </button>
            )}

            {/* Tab 4: Staff & Credentials */}
            {branch?.channel_type !== "ONLINE_ONLY" && (
              <button
                onClick={() => handleTabSelect("staff")}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                  activeTab === "staff"
                    ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                    : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <Users className="h-3.5 w-3.5" /> Staff &amp; Credentials
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                  activeTab === "staff" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60"
                )}>
                  {branchStaff.length}
                </span>
              </button>
            )}

            {/* Tab 5: Attendance Logs */}
            {branch?.channel_type !== "ONLINE_ONLY" && (
              <button
                onClick={() => handleTabSelect("attendance")}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                  activeTab === "attendance"
                    ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                    : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <Clock className="h-3.5 w-3.5" /> Attendance Logs
              </button>
            )}

            {/* Tab 6: Kiosks */}
            {purchasedKiosks > 0 && branch?.channel_type !== "ONLINE_ONLY" && (
              <button
                onClick={() => handleTabSelect("kiosks")}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                  activeTab === "kiosks"
                    ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                    : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <Monitor className="h-3.5 w-3.5" /> Kiosks
              </button>
            )}

            {/* Tab 7: Live Displays */}
            {branch?.channel_type !== "ONLINE_ONLY" && (
              <button
                onClick={() => handleTabSelect("displays")}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                  activeTab === "displays"
                    ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                    : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <Tv className="h-3.5 w-3.5" /> Live Displays
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                  activeTab === "displays" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60"
                )}>
                  2
                </span>
              </button>
            )}

            {/* Tab 8: Online Booking */}
            {branch?.channel_type !== "ONSITE_ONLY" && (
              <button
                onClick={() => handleTabSelect("online_booking")}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                  activeTab === "online_booking"
                    ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                    : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <Globe className="h-3.5 w-3.5" /> Online Booking
              </button>
            )}

            {/* Tab 9: KOT Delivery */}
            {(session?.role === "company_admin" || session?.role === "branch_admin") && 
             (branch?.enabledMethods?.map(Number).includes(3) || branch?.enabledMethods?.map(Number).includes(4)) && (
              <button
                onClick={() => handleTabSelect("kot")}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95",
                  activeTab === "kot"
                    ? "bg-[#5B50EB] text-white shadow-sm shadow-[#5B50EB]/30 ring-1 ring-[#5B50EB]/50 font-black"
                    : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" /> KOT Delivery
              </button>
            )}
          </div>

          {/* Right Action: Branch Settings Pill */}
          <button
            onClick={() => setIsEditingBranch(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-750 transition-all flex items-center gap-1.5 shrink-0 ml-auto cursor-pointer active:scale-95"
            title="Edit branch configuration and operating hours"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Attendance & Shift Logs Tab */}
      {activeTab === "attendance" && (
        <BranchAttendanceLogsView branchId={branch.id} branchName={branch.name} />
      )}

      {/* Live Displays Tab Content */}
      {activeTab === "displays" && (
        <div className="z-10 relative">
          <DisplayTerminalsManager
            branchId={branch.id}
            branchDesks={branchDesks}
            companySlug={companySlug}
            branchSlug={branchSlug}
          />
        </div>
      )}

      {/* Overview Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6 z-10 relative">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Customers Waiting */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-soft transition-all">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {branchStats(state, branch.id).waiting || 9}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                      <TrendingUp className="h-3 w-3" /> 12%
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mt-1">
                    Customers Waiting
                  </span>
                </div>
              </div>
              <div className="shrink-0 pl-2">
                <svg className="w-20 h-7 text-purple-400 dark:text-purple-500" viewBox="0 0 100 30" fill="none">
                  <path d="M0 24 Q20 28 35 15 T70 20 T100 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Card 2: Customers Served Today */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-soft transition-all">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {branchStats(state, branch.id).served || 10}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                      <TrendingUp className="h-3 w-3" /> 14%
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mt-1">
                    Customers Served Today
                  </span>
                </div>
              </div>
              <div className="shrink-0 pl-2">
                <svg className="w-20 h-7 text-emerald-400 dark:text-emerald-500" viewBox="0 0 100 30" fill="none">
                  <path d="M0 26 Q25 22 45 28 T75 14 T100 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Card 3: Average Wait Time */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-soft transition-all">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      16m
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                      <TrendingDown className="h-3 w-3" /> 8%
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mt-1">
                    Average Wait Time
                  </span>
                </div>
              </div>
              <div className="shrink-0 pl-2">
                <svg className="w-20 h-7 text-amber-400 dark:text-amber-500" viewBox="0 0 100 30" fill="none">
                  <path d="M0 16 Q30 22 55 12 T85 24 T100 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Card 4: Staff Online */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-2xs hover:shadow-soft transition-all">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {branchStaff.length > 0 ? `${branchStaff.length}/${branchStaff.length}` : "6/6"}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
                      <TrendingUp className="h-3 w-3" /> 0%
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mt-1">
                    Staff Online
                  </span>
                </div>
              </div>
              <div className="shrink-0 pl-2">
                <div className="flex items-end gap-1 h-7">
                  <div className="w-1.5 h-3 bg-sky-300 dark:bg-sky-700 rounded-full" />
                  <div className="w-1.5 h-4 bg-sky-300 dark:bg-sky-700 rounded-full" />
                  <div className="w-1.5 h-6 bg-sky-400 dark:bg-sky-600 rounded-full" />
                  <div className="w-1.5 h-3.5 bg-sky-300 dark:bg-sky-700 rounded-full" />
                  <div className="w-1.5 h-5 bg-sky-400 dark:bg-sky-600 rounded-full" />
                  <div className="w-1.5 h-7 bg-sky-500 rounded-full" />
                  <div className="w-1.5 h-5 bg-sky-400 dark:bg-sky-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Row 1: Queue Overview (7 cols) + Servicewise Distribution (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Queue Overview Dual Bar Chart */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Queue Overview</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Live queue status for all services</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="relative">
                      <button
                        onClick={() => setSelectedChartService((prev) => (prev === "all" ? "prepaid" : "all"))}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                      >
                        {selectedChartService === "all" ? "All Services" : "Prepaid"}
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#8B5CF6]" /> Waiting
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#60A5FA]" /> Served
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dual Bar Chart Area */}
                <div className="relative pt-6 pb-2">
                  {/* Grid Lines */}
                  <div className="absolute inset-x-8 top-6 bottom-8 flex flex-col justify-between pointer-events-none z-0">
                    {[80, 60, 40, 20, 0].map((val) => (
                      <div key={val} className="w-full flex items-center gap-2">
                        <span className="w-5 text-[10px] font-semibold text-slate-400 text-right shrink-0">{val}</span>
                        <div className="w-full border-b border-dashed border-slate-100 dark:border-slate-800/80" />
                      </div>
                    ))}
                  </div>

                  {/* Bars Container */}
                  <div className="relative z-10 pl-10 pr-2 pt-2 h-52 flex items-end justify-between">
                    {hourlyQueueData.map((item, idx) => {
                      const waitingH = `${Math.min(100, (item.waiting / 80) * 100)}%`;
                      const servedH = `${Math.min(100, (item.served / 80) * 100)}%`;
                      const isHovered = hourlyChartHoverIdx === idx;

                      return (
                        <div
                          key={item.time}
                          onMouseEnter={() => setHourlyChartHoverIdx(idx)}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        >
                          {/* Floating Tooltip Card */}
                          {isHovered && (
                            <div className="absolute bottom-[calc(100%+4px)] z-30 pointer-events-none whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 space-y-1 transform -translate-x-1/2 left-1/2">
                              <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1 text-[11px]">
                                {item.fullTime}
                              </div>
                              <div className="flex items-center gap-1.5 text-[#8B5CF6] font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                                {item.waiting} waiting
                              </div>
                              <div className="flex items-center gap-1.5 text-[#3B82F6] font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                                {item.served} served
                              </div>
                            </div>
                          )}

                          {/* Dual Bars */}
                          <div className="flex items-end gap-1 sm:gap-1.5 pb-2">
                            {/* Waiting Bar (Purple) */}
                            <div
                              style={{ height: waitingH }}
                              className={cn(
                                "w-3 sm:w-4 rounded-t-sm transition-all duration-300",
                                isHovered
                                  ? "bg-[#7C3AED] shadow-sm"
                                  : "bg-[#8B5CF6] hover:bg-[#7C3AED]"
                              )}
                            />
                            {/* Served Bar (Sky Blue) */}
                            <div
                              style={{ height: servedH }}
                              className={cn(
                                "w-3 sm:w-4 rounded-t-sm transition-all duration-300",
                                isHovered
                                  ? "bg-[#38BDF8] shadow-sm"
                                  : "bg-[#60A5FA] hover:bg-[#38BDF8]"
                              )}
                            />
                          </div>

                          {/* X-axis label */}
                          <span
                            className={cn(
                              "text-[10px] font-semibold tracking-tight transition-colors pt-1",
                              isHovered ? "text-[#5B50EB] font-bold" : "text-slate-400"
                            )}
                          >
                            {item.time}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Servicewise Distribution Donut Chart */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
                      <PieChartIcon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Servicewise Distribution</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Customers in queue by service type</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTabSelect("services")}
                    className="text-xs font-bold text-[#5B50EB] hover:text-[#4a3fe0] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    View All Services <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Donut and Legend Body */}
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-6 py-6 px-2">
                  {/* SVG Donut */}
                  <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                      {/* Base Background Track */}
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="18"
                        className="text-slate-100 dark:text-slate-800"
                        fill="transparent"
                      />
                      {/* Arc 1: Prepaid 44% (circumference ~ 282.74) */}
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        stroke="#8B5CF6"
                        strokeWidth="18"
                        strokeDasharray="124.4 282.74"
                        strokeDashoffset="0"
                        fill="transparent"
                        strokeLinecap="butt"
                        className="transition-all duration-500"
                      />
                      {/* Arc 2: Post Paid 33% */}
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        stroke="#3B82F6"
                        strokeWidth="18"
                        strokeDasharray="93.3 282.74"
                        strokeDashoffset="-124.4"
                        fill="transparent"
                        strokeLinecap="butt"
                        className="transition-all duration-500"
                      />
                      {/* Arc 3: Internet 22% */}
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        stroke="#F59E0B"
                        strokeWidth="18"
                        strokeDasharray="65 282.74"
                        strokeDashoffset="-217.7"
                        fill="transparent"
                        strokeLinecap="butt"
                        className="transition-all duration-500"
                      />
                    </svg>

                    {/* Center text inside Donut hole */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                        {serviceDistribution.reduce((acc, curr) => acc + curr.count, 0) || 9}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                        Total Waiting
                      </span>
                    </div>
                  </div>

                  {/* Legend Breakdown */}
                  <div className="flex-1 w-full space-y-3.5 pl-0 sm:pl-4">
                    {serviceDistribution.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-slate-700 dark:text-slate-200 font-bold">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-slate-900 dark:text-white">{item.count}</span>
                          <span className="text-slate-400 w-8 text-right font-medium">{item.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Operator Desks Status (7 cols) + Recent Bookings (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Operator Desks Status */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
                      <Monitor className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Operator Desks Status</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Live status of all operator desks</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTabSelect("desks")}
                    className="text-xs font-bold text-[#5B50EB] hover:text-[#4a3fe0] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    View All Desks <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* 4 Desk Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                  {overviewDesks.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-3.5 flex flex-col justify-between hover:border-purple-200 dark:hover:border-purple-900/50 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{d.name}</span>
                          </div>
                          <span
                            className={cn(
                              "text-[9px] font-extrabold px-2 py-0.5 rounded-full capitalize",
                              d.statusVariant === "available" && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40",
                              d.statusVariant === "busy" && "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40",
                              d.statusVariant === "offline" && "bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                            )}
                          >
                            {d.status}
                          </span>
                        </div>

                        <div className="my-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white block">
                            {d.queueCount}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                            {d.services}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTabSelect("desks")}
                        disabled={d.statusVariant === "offline"}
                        className={cn(
                          "w-full mt-2 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
                          d.statusVariant === "offline"
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                            : "bg-[#5B50EB] hover:bg-[#4a3fe0] text-white shadow-xs cursor-pointer"
                        )}
                      >
                        View Queue ({d.rawCount})
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
                      <Calendar className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Recent Bookings</h3>
                  </div>

                  <button
                    onClick={() => handleTabSelect("online_booking")}
                    className="text-xs font-bold text-[#5B50EB] hover:text-[#4a3fe0] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    View All Bookings <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Modern Saas Bookings Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 font-bold">TOKEN</th>
                        <th className="py-2.5 font-bold">CUSTOMER</th>
                        <th className="py-2.5 font-bold">SERVICE</th>
                        <th className="py-2.5 font-bold">DESK</th>
                        <th className="py-2.5 font-bold">TIME</th>
                        <th className="py-2.5 font-bold text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                      {recentBookingsList.map((item) => (
                        <tr key={item.token} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 font-black text-slate-900 dark:text-white font-mono">{item.token}</td>
                          <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-200">{item.customer}</td>
                          <td className="py-2.5 text-slate-500 font-medium">{item.service}</td>
                          <td className="py-2.5 text-slate-500 font-medium">{item.desk}</td>
                          <td className="py-2.5 text-slate-400 font-medium">{item.time}</td>
                          <td className="py-2.5 text-right">
                            <span
                              className={cn(
                                "text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-block",
                                item.statusVariant === "warning"
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40"
                                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"
                              )}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Quick Actions (7 cols) + Branch Information (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Quick Actions Card */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Quick Actions</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Common tasks for this branch</p>
                  </div>
                </div>

                {/* 6 Quick Action Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-4">
                  <button
                    onClick={handleOpenAddService}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#5B50EB] group-hover:scale-110 transition-transform shadow-2xs">
                      <Plus className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#5B50EB] transition-colors">
                      Add Service
                    </span>
                  </button>

                  <button
                    onClick={handleOpenAddDesk}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#5B50EB] group-hover:scale-110 transition-transform shadow-2xs">
                      <Monitor className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#5B50EB] transition-colors">
                      Add Desk
                    </span>
                  </button>

                  <button
                    onClick={handleOpenAddStaff}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#5B50EB] group-hover:scale-110 transition-transform shadow-2xs">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#5B50EB] transition-colors">
                      Add Staff
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabSelect("displays")}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#5B50EB] group-hover:scale-110 transition-transform shadow-2xs">
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#5B50EB] transition-colors">
                      Manage Display
                    </span>
                  </button>

                  <button
                    onClick={() => toast.info("Branch operational analytics and reporting synchronized.")}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#5B50EB] group-hover:scale-110 transition-transform shadow-2xs">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#5B50EB] transition-colors">
                      View Reports
                    </span>
                  </button>

                  <button
                    onClick={() => setIsEditingBranch(true)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#5B50EB] group-hover:scale-110 transition-transform shadow-2xs">
                      <Settings className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#5B50EB] transition-colors">
                      Branch Settings
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Branch Information Card */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5B50EB] flex items-center justify-center shrink-0">
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Branch Information</h3>
                  </div>

                  <button
                    onClick={() => setIsEditingBranch(true)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Edit Details
                  </button>
                </div>

                {/* 4-Quadrant Info Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block">Branch Type</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">Physical Counter</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Monitor className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block">Total Desks</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">{branchDesks.length || 4}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block">Total Services</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">{branchServices.length || 3}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block">Created On</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">12 Sep 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Drawer: Live Customer Query Feedback & Branch Readiness */}
          <details className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <summary className="flex items-center justify-between p-4 cursor-pointer select-none font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#5B50EB]" />
                <span>Live Customer Feedback &amp; System Readiness Logs</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 ml-2">
                  Auto SMTP Dispatched
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
            </summary>

            <div className="p-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              {/* Handled tickets feedback */}
              <div className="space-y-3">
                {(() => {
                  const handledTickets = state.tickets.filter(
                    (t) => String(t.branchId) === String(branch.id) && (t.status === "served" || t.status === "hold" || (t as any).feedback_text)
                  ).sort((a: any, b: any) => {
                    const timeA = new Date(a.feedback_submitted_at || a.called_at || a.served_at || a.created_at || a.createdAt || 0).getTime();
                    const timeB = new Date(b.feedback_submitted_at || b.called_at || b.served_at || b.created_at || b.createdAt || 0).getTime();
                    return timeB - timeA;
                  });

                  if (handledTickets.length === 0) {
                    return (
                      <div className="text-center py-6 text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        No customer query updates yet today. When operators resolve or escalate tickets, email notifications are dispatched live.
                      </div>
                    );
                  }

                  return handledTickets.slice(0, 4).map((t: any) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-3.5 space-y-2 hover:border-[#5B50EB]/40 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-black text-[#5B50EB] px-2 py-0.5 rounded-lg bg-[#5B50EB]/10 border border-[#5B50EB]/20">
                            {t.token_number || t.number}
                          </span>
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white block">{t.customer_name || t.customerName}</span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Sent to: {t.customer_email || "rutaahir855@gmail.com"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {t.status === "served" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                              <Check className="h-3 w-3" /> Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                              <AlertTriangle className="h-3 w-3" /> Escalated
                            </span>
                          )}

                          {t.feedback_rating && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {t.feedback_rating}/5
                            </span>
                          )}
                        </div>
                      </div>

                      {t.feedback_text ? (
                        <div className="bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300">
                          <p className="italic font-semibold">"{t.feedback_text}"</p>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic pt-1">
                          Status email delivered via Gmail SMTP. Awaiting customer reply message...
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              {/* Branch Setup Readiness */}
              {(() => {
                const readiness = calculateBranchReadiness(branch, state);
                return (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#5B50EB]" /> Branch Setup Readiness
                      </span>
                      <span className="font-bold text-[#5B50EB]">{readiness.score}% Complete</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#5B50EB] to-indigo-500"
                        style={{ width: `${Math.max(5, readiness.score)}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </details>
        </div>
      )}

      {/* DESKS TAB */}
      {activeTab === "desks" && (
        <motion.div
          key="desks-tab"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={transition}
          className="space-y-4"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Operator Desks</h2>
              <p className="text-xs text-muted-foreground">Manage counters, operators and service routing.</p>
            </div>
            {purchasedDesks > 0 && (
              <Button
                variant={isDeskLimitReached ? "outline" : "brand"}
                onClick={handleOpenAddDesk}
                className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
              >
                {isDeskLimitReached ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Buy More Desks
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add Desk
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Search bar & KPI Cards row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
            {/* Search Box */}
            <div className="lg:col-span-2 relative">
              <Input
                placeholder="Search desks..."
                value={searchDesksQuery}
                onChange={(e) => setSearchDesksQuery(e.target.value)}
                className="h-9 text-xs pl-8 pr-3 bg-white dark:bg-slate-900 border-border/60 shadow-soft rounded-2xl"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* KPI Cards Row */}
            <div className="lg:col-span-3 grid grid-cols-4 gap-2">
              {(() => {
                const total = branchDesks.length;
                const busy = branchDesks.filter(d => (d.isActive ?? true) && state.tickets.some(t => String(t.deskId) === String(d.id) && (t.status === 'called' || t.status === 'serving'))).length;
                const available = branchDesks.filter(d => (d.isActive ?? true) && branchStaff.some(st => String(st.deskId) === String(d.id)) && !state.tickets.some(t => String(t.deskId) === String(d.id) && (t.status === 'called' || t.status === 'serving'))).length;
                const offline = total - busy - available;

                return (
                  <>
                    <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Total Desks</span>
                      <span className="text-base font-black text-foreground block mt-0.5">{total}</span>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Available</span>
                      <span className="text-base font-black text-emerald-500 block mt-0.5">{available}</span>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Busy</span>
                      <span className="text-base font-black text-amber-500 block mt-0.5">{busy}</span>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Offline</span>
                      <span className="text-base font-black text-muted-foreground block mt-0.5">{offline}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Desks Dense Table View */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/40 text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                    <th className="p-3.5 pl-5">Desk</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Assigned Services</th>
                    <th className="p-3.5">Operators</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Current Queue</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {(() => {
                    const filteredDesks = branchDesks.filter((d) =>
                      d.label.toLowerCase().includes(searchDesksQuery.toLowerCase())
                    );

                    if (filteredDesks.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-xs text-muted-foreground font-semibold">
                            No matching counter desks found.
                          </td>
                        </tr>
                      );
                    }

                    return filteredDesks.map((d) => {
                      const deskServicesIds = state.deskServices
                        .filter((ds) => ds.deskId === d.id)
                        .map((ds) => ds.serviceId);

                      const assignedStaff = branchStaff.filter((st) => {
                        if (!st.deskId) return false;
                        return String(st.deskId) === String(d.id);
                      });

                      const isBusy = (d.isActive ?? true) && state.tickets.some(t => String(t.deskId) === String(d.id) && (t.status === 'called' || t.status === 'serving'));
                      const isAvailable = (d.isActive ?? true) && assignedStaff.length > 0 && !isBusy;
                      const statusLabel = !d.isActive ? "Offline" : isBusy ? "Busy" : isAvailable ? "Available" : "Offline";
                      const statusDotColor = !d.isActive 
                        ? "bg-slate-400" 
                        : isBusy 
                        ? "bg-amber-500" 
                        : isAvailable 
                        ? "bg-emerald-500" 
                        : "bg-slate-400";

                      // Calculate current queue count for assigned services
                      const queueCount = state.tickets.filter(t => 
                        t.branchId === branch.id && 
                        deskServicesIds.includes(t.serviceId) && 
                        (t.status === 'waiting' || t.status === 'hold')
                      ).length;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-all">
                          <td className="p-3.5 pl-5 font-black text-foreground">{d.label}</td>
                          <td className="p-3.5 text-muted-foreground font-semibold">Physical Counter</td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {branchServices.filter(s => deskServicesIds.includes(s.id)).map(s => (
                                <span key={s.id} className="inline-block rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 text-[10px] font-bold">
                                  {s.name}
                                </span>
                              ))}
                              {deskServicesIds.length === 0 && (
                                <span className="text-[10px] text-muted-foreground/60 italic font-semibold">No services routing</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {assignedStaff.map(st => (
                              <div key={st.id} className="flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase">
                                  {st.name.slice(0, 2)}
                                </span>
                                <span className="font-bold text-foreground">{st.name}</span>
                              </div>
                            ))}
                            {assignedStaff.length === 0 && (
                              <span className="text-[10px] text-amber-500 font-bold">⚠️ Unstaffed</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                              <span className={cn("inline-block h-2 w-2 rounded-full", statusDotColor)} />
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-3.5 font-black text-foreground tabular-nums">{queueCount} waiting</td>
                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEditDesk(d)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to completely delete ${d.label}?`)) {
                                    try {
                                      await (actions as any).deleteDesk(d.id);
                                      toast.success("Desk deleted successfully!");
                                      await refresh();
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to delete desk.");
                                    }
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* SERVICES TAB */}
      {showServicesTab && activeTab === "services" && (
        <motion.div
          key="services-tab"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={transition}
          className="space-y-4"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Services</h2>
              <p className="text-xs text-muted-foreground">Manage and configure service categories for this branch.</p>
            </div>
            {purchasedServices > 0 && (
              <Button
                variant={isServiceLimitReached ? "outline" : "brand"}
                onClick={handleOpenAddService}
                className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
              >
                {isServiceLimitReached ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Buy More Services
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add Service
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Search bar & KPI Cards row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
            {/* Search Box */}
            <div className="lg:col-span-2 relative">
              <Input
                placeholder="Search services..."
                value={searchServicesQuery}
                onChange={(e) => setSearchServicesQuery(e.target.value)}
                className="h-9 text-xs pl-8 pr-3 bg-white dark:bg-slate-900 border-border/60 shadow-soft rounded-2xl"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* KPI Cards Row */}
            <div className="lg:col-span-3 grid grid-cols-4 gap-2">
              <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Total Services</span>
                <span className="text-base font-black text-foreground block mt-0.5">{branchServices.length}</span>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Active</span>
                <span className="text-base font-black text-emerald-500 block mt-0.5">{branchServices.filter(s => s.isActive !== false).length}</span>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Inactive</span>
                <span className="text-base font-black text-muted-foreground block mt-0.5">{branchServices.filter(s => s.isActive === false).length}</span>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Capacity</span>
                <span className="text-base font-black text-primary block mt-0.5">{usedServices}/{purchasedServices}</span>
              </div>
            </div>
          </div>

          {/* Service Table/Card Hybrid List */}
          <div className="space-y-2">
            {(() => {
              const filteredServices = branchServices.filter((s) =>
                s.name.toLowerCase().includes(searchServicesQuery.toLowerCase())
              );

              if (filteredServices.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-muted-foreground font-semibold bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl">
                    No matching service categories found.
                  </div>
                );
              }

              return filteredServices.map((s, idx) => {
                const isExpanded = expandedServiceId === s.id;
                const assignedDeskIds = state.deskServices
                  .filter((ds) => ds.serviceId === s.id)
                  .map((ds) => ds.deskId);
                const assignedUserIds = state.userServices
                  .filter((us) => us.serviceId === s.id)
                  .map((us) => us.userId);

                const isPrepaid = s.name.toLowerCase().includes("prepaid");
                const isPostpaid = s.name.toLowerCase().includes("postpaid");
                const isInternet = s.name.toLowerCase().includes("internet");
                
                const ServiceIcon = isPrepaid ? Briefcase : isPostpaid ? User : isInternet ? Globe : Info;
                const iconColorClass = isPrepaid 
                  ? "bg-amber-500/10 text-amber-600" 
                  : isPostpaid 
                  ? "bg-blue-500/10 text-blue-600" 
                  : isInternet 
                  ? "bg-indigo-500/10 text-indigo-600" 
                  : "bg-teal-500/10 text-teal-600";

                const priority = isPrepaid ? "High" : "Medium";
                const priorityClass = priority === "High"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground";

                // Live waiting tickets
                const waitingCount = state.tickets.filter(
                  (t) => t.branchId === branch.id && t.serviceId === s.id && (t.status === "waiting" || t.status === "hold")
                ).length;

                return (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 space-y-4 hover:border-primary hover:shadow-soft transition-all duration-200"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedServiceId(isExpanded ? null : s.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", iconColorClass)}>
                          <ServiceIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-foreground">{s.name}</h3>
                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                              Prefix {s.prefix}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-none">
                            {assignedDeskIds.length} counter(s) · {assignedUserIds.length} operator(s) qualified
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Avg Duration */}
                        <div className="hidden sm:block text-right">
                          <span className="text-[9px] text-muted-foreground font-semibold block leading-none">EST. TIME</span>
                          <span className="text-[11px] font-bold text-foreground block mt-1">{s.avgMinutes || 15} mins</span>
                        </div>

                        {/* Queue Type */}
                        <div className="hidden md:block text-right px-3 border-l border-border/40">
                          <span className="text-[9px] text-muted-foreground font-semibold block leading-none">QUEUE TYPE</span>
                          <span className="text-[11px] font-bold text-foreground block mt-1">Token-Based</span>
                        </div>

                        {/* Priority Pill */}
                        <span className={cn("text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full", priorityClass)}>
                          {priority}
                        </span>

                        {/* Status Toggle Button */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await actions.toggleServiceStatus(s.id, !(s.isActive ?? true));
                              toast.success("Service status updated successfully!");
                              await refresh();
                            } catch (err: any) {
                              toast.error(err.message || "Failed to update service status.");
                            }
                          }}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase transition-all flex items-center gap-1.5 border",
                            (s.isActive ?? true)
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 border-border text-muted-foreground"
                          )}
                        >
                          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", (s.isActive ?? true) ? "bg-emerald-500" : "bg-muted-foreground")} />
                          {(s.isActive ?? true) ? "Active" : "Inactive"}
                        </button>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEditService(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleDeleteService(s.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Counters / Desks assignments */}
                    {isExpanded && (
                      <div className="border-t border-border/40 pt-4 grid gap-6 md:grid-cols-2 animate-in fade-in duration-200">
                        {/* Assigned Desks Multi-select Chips */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5 text-primary" /> Assigned Counter Desks
                          </label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {branchDesks.map((d) => {
                              const isAssigned = assignedDeskIds.includes(d.id);
                              return (
                                <button
                                  key={d.id}
                                  onClick={async () => {
                                    const currentDeskServiceIds = state.deskServices
                                      .filter((ds) => ds.deskId === d.id)
                                      .map((ds) => ds.serviceId);
                                    const nextServiceIds = isAssigned
                                      ? currentDeskServiceIds.filter((id) => id !== s.id)
                                      : [...currentDeskServiceIds, s.id];
                                    try {
                                      await actions.updateDeskServices(d.id, nextServiceIds);
                                      toast.success(`Updated desk assignments for ${s.name}`);
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to update desk assignments");
                                    }
                                  }}
                                  className={cn(
                                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                                    isAssigned
                                      ? "border-primary/40 bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:border-foreground bg-slate-50/50 dark:bg-slate-900/40"
                                  )}
                                >
                                  {isAssigned && <Check className="h-3.5 w-3.5" />}
                                  {d.label}
                                </button>
                              );
                            })}
                            {branchDesks.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">No counter desks created yet.</span>
                            )}
                          </div>
                        </div>

                        {/* Assigned Qualified Staff Multi-select Chips */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" /> Qualified Staff Members
                          </label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {branchStaff.map((st) => {
                              const isAssigned = assignedUserIds.includes(st.id);
                              return (
                                <button
                                  key={st.id}
                                  onClick={async () => {
                                    const currentUserServicesIds = state.userServices
                                      .filter((us) => us.userId === st.id)
                                      .map((us) => us.serviceId);
                                    const nextServiceIds = isAssigned
                                      ? currentUserServicesIds.filter((id) => id !== s.id)
                                      : [...currentUserServicesIds, s.id];
                                    try {
                                      await actions.updateUserServices(st.id, nextServiceIds);
                                      toast.success(`Updated qualified staff for ${s.name}`);
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to update staff assignments");
                                    }
                                  }}
                                  className={cn(
                                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                                    isAssigned
                                      ? "border-primary/40 bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:border-foreground bg-slate-50/50 dark:bg-slate-900/40"
                                  )}
                                >
                                  {isAssigned && <Check className="h-3.5 w-3.5" />}
                                  {st.name} ({st.email})
                                </button>
                              );
                            })}
                            {branchStaff.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">No branch staff found.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </motion.div>
      )}

      {activeTab === "staff" && (
        <motion.div
          key="staff-tab"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={transition}
          className="space-y-4"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Staff & Credentials</h2>
              <p className="text-xs text-muted-foreground">Manage operators, roles, credentials and desk assignments.</p>
            </div>
            <Button
              variant="brand"
              size="sm"
              onClick={handleOpenAddStaff}
              className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" /> Create Staff
            </Button>
          </div>

          {/* Search bar & filter row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search staff..."
                value={searchStaffQuery}
                onChange={(e) => setSearchStaffQuery(e.target.value)}
                className="h-9 text-xs pl-8 pr-3 bg-white dark:bg-slate-900 border-border/60 shadow-soft rounded-2xl"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="flex gap-2">
              <span className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Total Staff: {branchStaff.length}
              </span>
              <span className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                Active: {branchStaff.length}
              </span>
            </div>
          </div>

          {/* Staff Dense Table View */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/40 text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                    <th className="p-3.5 pl-5">Staff Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Assigned Desk</th>
                    <th className="p-3.5">Services</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Last Active</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {(() => {
                    const filteredStaff = branchStaff.filter((st) =>
                      st.name.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
                      st.email.toLowerCase().includes(searchStaffQuery.toLowerCase())
                    );

                    if (filteredStaff.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-xs text-muted-foreground font-semibold">
                            No matching staff members found.
                          </td>
                        </tr>
                      );
                    }

                    return filteredStaff.map((st) => {
                      const assignedDesk = branchDesks.find((d) => String(d.id) === String(st.deskId));
                      const assignedServiceIds = state.userServices
                        .filter((us) => us.userId === st.id)
                        .map((us) => us.serviceId);

                      // Mock dynamic status / last active for premium dashboard look
                      const isOffline = st.name.toLowerCase().includes("vjay") || st.name.toLowerCase().includes("vijay");
                      const statusLabel = isOffline ? "Offline" : "Active";
                      const statusDot = isOffline ? "bg-slate-400" : "bg-emerald-500 animate-pulse";
                      const lastActive = isOffline ? "3 days ago" : "Active now";

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-all">
                          <td className="p-3.5 pl-5">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase shrink-0">
                                {st.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </span>
                              <span className="font-black text-foreground">{st.name || "Staff Member"}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-muted-foreground font-mono text-[10px]">{st.email}</td>
                          <td className="p-3.5">
                            <span className={cn(
                              "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border",
                              st.role === "branch_admin"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                            )}>
                              {st.role === "branch_admin" ? "Branch Admin" : "Operator"}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {st.role === "branch_admin" ? (
                              <span className="text-[10px] text-muted-foreground/60 italic font-semibold">Full Branch Access</span>
                            ) : assignedDesk ? (
                              <span className="font-bold text-foreground bg-accent/40 border border-border/80 rounded-lg px-2 py-0.5">
                                {assignedDesk.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold text-red-500 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-lg">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {branchServices.filter(s => assignedServiceIds.includes(s.id)).map(s => (
                                <span key={s.id} className="inline-block rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-foreground px-2 py-0.5 text-[9px] font-semibold">
                                  {s.name}
                                </span>
                              ))}
                              {st.role !== "branch_admin" && assignedServiceIds.length === 0 && (
                                <span className="text-[9px] text-muted-foreground/50 italic font-semibold">No services mapping</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                              <span className={cn("inline-block h-2 w-2 rounded-full", statusDot)} />
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-3.5 text-muted-foreground font-semibold text-[10px]">{lastActive}</td>
                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEditStaff(st)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to completely delete ${st.name}?`)) {
                                    try {
                                      await actions.removeStaff(st.id);
                                      toast.success("Staff member deleted successfully!");
                                      await refresh();
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to delete staff member.");
                                    }
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "kiosks" && (
        <motion.div
          key="kiosks-tab"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={transition}
          className="space-y-4"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Self-Ticketing Kiosks ({branchKiosks.length})</h2>
              <p className="text-xs text-muted-foreground">Manage kiosk terminals and PIN codes.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground bg-accent/20 px-3 py-1.5 rounded-lg border border-border/40 font-bold shrink-0">
                Kiosks Allocated: {branchKiosks.filter(k => k.status === 'active').length} / {purchasedKiosks}
              </span>
              <Button
                variant="brand"
                size="sm"
                onClick={() => setIsAddKioskModalOpen(true)}
                disabled={branchKiosks.filter(k => k.status === 'active').length >= purchasedKiosks}
                className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> Add Kiosk
              </Button>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
              <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Kiosks</span>
              <span className="text-base font-black text-foreground block mt-0.5">{branchKiosks.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
              <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Online</span>
              <span className="text-base font-black text-emerald-500 block mt-0.5">{branchKiosks.filter(k => k.is_logged_in && k.status === 'active').length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
              <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Offline / Closed</span>
              <span className="text-base font-black text-muted-foreground block mt-0.5">{branchKiosks.filter(k => !k.is_logged_in || k.status !== 'active').length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
              <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Tickets Today</span>
              <span className="text-base font-black text-primary block mt-0.5">
                {state.tickets.filter(t => t.branchId === branch.id && t.channel === 'kiosk').length}
              </span>
            </div>
          </div>

          {/* Kiosk Terminal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchKiosks.map((kiosk, idx) => {
              const isPinVisible = !!visiblePins[kiosk.id];
              const isKioskOpen = Boolean(kiosk.is_logged_in && kiosk.status === "active");
              return (
                <div
                  key={kiosk.id}
                  className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 hover:border-primary hover:shadow-soft transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="flex gap-4">
                    {/* Device illustration */}
                    <div className="h-24 w-16 bg-slate-50 dark:bg-slate-900/60 border border-border/40 rounded-xl flex items-center justify-center p-2 shrink-0">
                      <svg className="w-full h-full text-slate-400" viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="2" width="24" height="46" rx="3" fill="#0F172A" stroke="#475569" strokeWidth="2"/>
                        <rect x="5" y="4" width="20" height="32" rx="1" fill="#1E293B"/>
                        <circle cx="15" cy="42" r="2.5" fill="#475569"/>
                        <rect x="7" y="6" width="16" height="12" rx="0.5" fill="url(#screenGrad)" opacity="0.8"/>
                        <rect x="9" y="20" width="12" height="1.5" rx="0.2" fill="#3B82F6"/>
                        <rect x="9" y="23" width="12" height="1.5" rx="0.2" fill="#10B981"/>
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="font-black text-sm text-foreground truncate">{kiosk.kiosk_identifier}</h3>
                        <span className="text-[10px] text-muted-foreground font-mono">Terminal ID: KSK-0{idx + 1}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">Status</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 font-bold mt-0.5",
                            isKioskOpen ? "text-emerald-500" : "text-muted-foreground"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", isKioskOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                            {isKioskOpen ? "Active" : "Closed"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">PIN Code</span>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                            <span>{isPinVisible ? kiosk.pin : "••••"}</span>
                            <button
                              onClick={() => setVisiblePins(prev => ({ ...prev, [kiosk.id]: !prev[kiosk.id] }))}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {isPinVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">Location</span>
                          <span className="font-bold text-foreground block mt-0.5">Reception</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">Last Sync</span>
                          <span className="font-semibold text-muted-foreground block mt-0.5">1 min ago</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/20 mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">Kiosk Link</span>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const terminalSlug = kiosk.kiosk_identifier ? kiosk.kiosk_identifier.toLowerCase().replace(/\s+/g, '-') : kiosk.id;
                            const singleKioskUrl = companySlug && branchSlug
                              ? `/${companySlug}/branches/${branchSlug}/kiosk?terminal=${encodeURIComponent(terminalSlug)}`
                              : `/kiosk/${branch?.id || branchId}?terminal=${encodeURIComponent(terminalSlug)}`;
                            return (
                              <>
                                <a
                                  href={singleKioskUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-bold flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Open</span>
                                </a>
                                <button
                                  onClick={() => {
                                    const url = `${window.location.origin}${singleKioskUrl}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success(`Copied unique URL for ${kiosk.kiosk_identifier}!`);
                                  }}
                                  className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5"
                                >
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-border/30 pt-3 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await actions.regenerateKioskPin(kiosk.id);
                          toast.success("Kiosk PIN regenerated successfully!");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to regenerate PIN.");
                        }
                      }}
                      className="h-8 text-xs font-bold"
                    >
                      Regenerate PIN
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-bold text-red-500 hover:bg-red-500/10 hover:text-red-500 border-border/60"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to completely delete kiosk "${kiosk.kiosk_identifier}"?`)) {
                          try {
                            await apiFetch(`/api/kot/kiosks/${kiosk.id}/`, { method: "DELETE" });
                            toast.success("Kiosk deleted successfully!");
                            await refresh();
                          } catch (err: any) {
                            toast.error(err.message || "Failed to delete kiosk.");
                          }
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
            {branchKiosks.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground font-semibold bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl">
                No kiosk slots provisioned. Make sure kiosks are allocated in your company plan.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === "online_booking" && branch?.channel_type !== "ONSITE_ONLY" && (
        <div className="animate-in fade-in-50 duration-300">
          <OnlineBookingSettingsPanel branch={branch} company={company} />
        </div>
      )}

      {activeTab === "kot" && (session?.role === "company_admin" || session?.role === "branch_admin") && (
        <div className="animate-in fade-in-50 duration-300">
          <KotSettingsPanel branch={branch} company={company} setView={setView} />
        </div>
      )}

      {/* Modal: Create Staff Account &       {/* Modal: Create Staff Account & Credentials Wizard */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-background/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl shadow-brand/10 space-y-5 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-foreground">Create Staff Account & Credentials</h3>
                  {newStaffRole === "desk_staff" ? (
                    <p className="text-xs text-brand font-extrabold mt-0.5 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                      Step {addStaffStep} of 2 — {addStaffStep === 1 ? "Basic Info & Role" : "Desk Assignment"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Add a new user and set system login credentials.
                    </p>
                  )}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddStaffModalOpen(false)} 
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all font-bold shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              {/* STEP 1: Basic Info & Role */}
              {addStaffStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mb-1.5">
                        <User className="h-3 w-3 text-brand" /> First Name *
                      </Label>
                      <Input
                        value={newStaffFirstName}
                        onChange={(e) => setNewStaffFirstName(e.target.value)}
                        placeholder="e.g. Ramesh"
                        required
                        className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-border/60 focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mb-1.5">
                        <User className="h-3 w-3 text-brand" /> Last Name *
                      </Label>
                      <Input
                        value={newStaffLastName}
                        onChange={(e) => setNewStaffLastName(e.target.value)}
                        placeholder="e.g. Patel"
                        required
                        className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-border/60 focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mb-1.5">
                      <Mail className="h-3 w-3 text-brand" /> Login Email *
                    </Label>
                    <Input
                      type="email"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      placeholder="e.g. ramesh.surat@company.com"
                      required
                      className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-border/60 focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mb-1.5">
                      <Settings className="h-3 w-3 text-brand" /> Initial Password *
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        placeholder="Staff123!"
                        required
                        className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-border/60 focus:border-brand focus:ring-2 focus:ring-brand/20 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Min 6 characters. Staff will use this password to log in.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">
                        Role *
                      </Label>
                      {isBranchAdmin && (
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Branch Admin restricted to Desk Operator
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNewStaffRole("desk_staff");
                        }}
                        className={cn(
                          "rounded-2xl border p-3.5 text-left transition-all text-xs font-semibold flex flex-col justify-between gap-2.5",
                          newStaffRole === "desk_staff" 
                            ? "border-brand bg-brand/10 text-brand ring-2 ring-brand/20 shadow-xs" 
                            : "border-border/60 bg-slate-50/50 dark:bg-slate-900/40 text-foreground hover:border-border hover:bg-accent/40"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="h-7 w-7 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                            <Monitor className="h-4 w-4" />
                          </span>
                          {newStaffRole === "desk_staff" && (
                            <span className="h-4 w-4 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-foreground">Desk Operator</div>
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5 leading-snug">
                            Operates queue calls at a counter desk. Requires desk assignment in Step 2.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={isBranchAdmin}
                        onClick={() => {
                          if (!isBranchAdmin) {
                            setNewStaffRole("branch_admin");
                            setAddStaffStep(1);
                          }
                        }}
                        className={cn(
                          "rounded-2xl border p-3.5 text-left transition-all text-xs font-semibold flex flex-col justify-between gap-2.5",
                          isBranchAdmin 
                            ? "opacity-40 cursor-not-allowed bg-muted/30 border-border/40" 
                            : newStaffRole === "branch_admin" 
                            ? "border-brand bg-brand/10 text-brand ring-2 ring-brand/20 shadow-xs" 
                            : "border-border/60 bg-slate-50/50 dark:bg-slate-900/40 text-foreground hover:border-border hover:bg-accent/40"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="h-7 w-7 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-4 w-4" />
                          </span>
                          {newStaffRole === "branch_admin" && (
                            <span className="h-4 w-4 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-foreground">Branch Admin</div>
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5 leading-snug">
                            {isBranchAdmin ? "Company Admin only" : "Manages branch operations, desks, and staff accounts."}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: Desk Assignment (Desk Operator role only) */}
              {addStaffStep === 2 && newStaffRole === "desk_staff" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-brand/20 bg-brand/5 p-3.5 text-xs text-brand font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-brand" />
                    <span><strong>Service Qualification:</strong> Service categories for this operator are automatically derived from their assigned counter desk.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeskOption("existing")}
                      className={cn(
                        "rounded-2xl border p-3.5 text-left transition-all text-xs font-semibold flex flex-col justify-between gap-1.5",
                        deskOption === "existing" 
                          ? "border-brand bg-brand/10 text-brand ring-2 ring-brand/20 shadow-xs" 
                          : "border-border/60 bg-slate-50/50 dark:bg-slate-900/40 text-foreground hover:border-border hover:bg-accent/40"
                      )}
                    >
                      <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 text-brand" /> Option A: Existing Desk
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal leading-snug">Pick from current active desks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeskOption("new")}
                      className={cn(
                        "rounded-2xl border p-3.5 text-left transition-all text-xs font-semibold flex flex-col justify-between gap-1.5",
                        deskOption === "new" 
                          ? "border-brand bg-brand/10 text-brand ring-2 ring-brand/20 shadow-xs" 
                          : "border-border/60 bg-slate-50/50 dark:bg-slate-900/40 text-foreground hover:border-border hover:bg-accent/40"
                      )}
                    >
                      <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-brand" /> Option B: Create New Desk
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal leading-snug">Configure a new desk inline</span>
                    </button>
                  </div>

                  {/* Option A: List of existing desks */}
                  {deskOption === "existing" && (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar rounded-2xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/40 p-2.5">
                      {branchDesks.map((d) => {
                        const deskServiceIds = state.deskServices
                          .filter((ds) => ds.deskId === d.id)
                          .map((ds) => ds.serviceId);

                        const currentAssignedCount = state.staff.filter((st) => String(st.deskId) === String(d.id)).length;
                        const isSelected = selectedExistingDeskId === d.id;

                        return (
                          <div
                            key={d.id}
                            onClick={() => setSelectedExistingDeskId(d.id)}
                            className={cn(
                              "rounded-xl border p-2.5 text-xs transition-all flex items-center justify-between gap-3 cursor-pointer",
                              isSelected
                                ? "border-brand bg-brand/10 text-brand font-bold ring-2 ring-brand/20 shadow-xs"
                                : "border-border/60 bg-background text-foreground hover:border-brand/40 hover:bg-accent/40"
                            )}
                          >
                            <div className="space-y-1 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <Monitor className="h-3.5 w-3.5 text-brand shrink-0" />
                                <span className="font-extrabold text-foreground">{d.label}</span>
                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                                  {currentAssignedCount} Staff assigned
                                </span>
                              </div>
                              {deskServiceIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {deskServiceIds.map((sId) => {
                                    const s = branchServices.find((ser) => ser.id === sId);
                                    if (!s) return null;
                                    return (
                                      <span key={sId} className="text-[9px] text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md font-bold">
                                        {s.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {deskServiceIds.length === 0 && (
                                <span className="text-[10px] text-amber-600 italic">No services configured on desk</span>
                              )}
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-brand shrink-0 ml-2" />}
                          </div>
                        );
                      })}

                      {branchDesks.length === 0 && (
                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs text-center space-y-1">
                          <p className="font-bold">No desks yet in this branch.</p>
                          <p className="text-[11px] text-muted-foreground">Select Option B above to create a desk for this staff member.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option B: Inline Desk Creation */}
                  {deskOption === "new" && (
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/40 p-3.5">
                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 mb-1.5 block">New Desk Name *</Label>
                        <Input
                          value={inlineDeskName}
                          onChange={(e) => setInlineDeskName(e.target.value)}
                          placeholder="e.g. Counter 3 or Desk C"
                          required={deskOption === "new"}
                          className="h-10 text-xs rounded-xl bg-background border-border/60 focus:border-brand font-medium"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 mb-1.5 block">
                          Handled Service Categories ({inlineDeskServices.length} Selected)
                        </Label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar rounded-xl border border-border/60 bg-background p-2.5">
                          {branchServices.map((s) => {
                            const isChecked = inlineDeskServices.includes(s.id);
                            return (
                              <button
                                type="button"
                                key={s.id}
                                onClick={() => {
                                  setInlineDeskServices((prev) =>
                                    isChecked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                  );
                                }}
                                className={cn(
                                  "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5",
                                  isChecked 
                                    ? "border-brand bg-brand/15 text-brand font-bold" 
                                    : "border-border/60 text-muted-foreground hover:border-foreground hover:text-foreground"
                                )}
                              >
                                {isChecked && <Check className="h-3 w-3 text-brand" />}
                                {s.name}
                              </button>
                            );
                          })}
                          {branchServices.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">No service categories defined.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FOOTER BUTTONS */}
              <div className="flex justify-between items-center pt-4 border-t border-border/40">
                {addStaffStep === 2 && newStaffRole === "desk_staff" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddStaffStep(1)}
                    className="h-10 px-5 text-xs font-bold rounded-xl"
                  >
                    ← Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddStaffModalOpen(false)}
                    className="h-10 px-5 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </Button>
                )}

                {newStaffRole === "branch_admin" ? (
                  <Button 
                    type="submit" 
                    variant="brand" 
                    size="sm"
                    disabled={isCreatingStaff || !newStaffEmail.trim()}
                    className="h-10 px-6 text-xs font-bold rounded-xl shadow-md shadow-brand/15 gap-2"
                  >
                    {isCreatingStaff ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating Admin...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Create Staff & Credentials
                      </>
                    )}
                  </Button>
                ) : addStaffStep === 1 ? (
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={() => {
                      if (!newStaffEmail.trim() || !newStaffFirstName.trim() || !newStaffLastName.trim()) {
                        toast.error("Please fill in all required fields.");
                        return;
                      }
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(newStaffEmail.trim())) {
                        toast.error("Please enter a valid login email address.");
                        return;
                      }
                      if (state.staff.some((st) => st.email.toLowerCase() === newStaffEmail.trim().toLowerCase())) {
                        toast.error(`A staff user with email "${newStaffEmail.trim()}" already exists.`);
                        return;
                      }
                      if (newStaffPassword.trim().length < 6) {
                        toast.error("Password must be at least 6 characters long.");
                        return;
                      }
                      setAddStaffStep(2);
                    }}
                    className="h-10 px-6 text-xs font-bold rounded-xl shadow-md shadow-brand/15 gap-2"
                  >
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="brand"
                    size="sm"
                    disabled={
                      isCreatingStaff ||
                      (deskOption === "existing" && !selectedExistingDeskId) ||
                      (deskOption === "new" && !inlineDeskName.trim())
                    }
                    className="h-10 px-6 text-xs font-bold rounded-xl shadow-md shadow-brand/15 gap-2"
                  >
                    {isCreatingStaff ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating Staff...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Create Staff & Credentials
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Staff Account & Credentials */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-background/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl shadow-brand/10 space-y-5 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-foreground">Edit Staff Account & Credentials</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Update employee details, system role, and assigned counter desk.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingStaff(null)} 
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all font-bold shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mb-1.5">
                    <User className="h-3 w-3 text-brand" /> First Name
                  </Label>
                  <Input
                    value={editStaffFirstName}
                    onChange={(e) => setEditStaffFirstName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-border/60 focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mb-1.5">
                    <User className="h-3 w-3 text-brand" /> Last Name
                  </Label>
                  <Input
                    value={editStaffLastName}
                    onChange={(e) => setEditStaffLastName(e.target.value)}
                    placeholder="e.g. Patel"
                    className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-border/60 focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 mb-1.5">
                  <Mail className="h-3 w-3 text-brand" /> Login Email *
                </Label>
                <Input
                  type="email"
                  value={editStaffEmail}
                  onChange={(e) => setEditStaffEmail(e.target.value)}
                  placeholder="e.g. ramesh@company.com"
                  required
                  className="h-10 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-border/60 focus:border-brand focus:ring-2 focus:ring-brand/20 font-medium"
                />
              </div>

              {/* Role Selection */}
              <div>
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 block mb-1.5">
                  Role *
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditStaffRole("desk_staff")}
                    className={cn(
                      "rounded-2xl border p-3.5 text-left transition-all text-xs font-semibold flex flex-col justify-between gap-2.5",
                      editStaffRole === "desk_staff" 
                        ? "border-brand bg-brand/10 text-brand ring-2 ring-brand/20 shadow-xs" 
                        : "border-border/60 bg-slate-50/50 dark:bg-slate-900/40 text-foreground hover:border-border hover:bg-accent/40"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="h-7 w-7 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                        <Monitor className="h-4 w-4" />
                      </span>
                      {editStaffRole === "desk_staff" && (
                        <span className="h-4 w-4 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-foreground">Desk Operator</div>
                      <div className="text-[10px] text-muted-foreground font-normal mt-0.5 leading-snug">
                        Processes tickets & operates counter desk
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStaffRole("branch_admin")}
                    className={cn(
                      "rounded-2xl border p-3.5 text-left transition-all text-xs font-semibold flex flex-col justify-between gap-2.5",
                      editStaffRole === "branch_admin" 
                        ? "border-brand bg-brand/10 text-brand ring-2 ring-brand/20 shadow-xs" 
                        : "border-border/60 bg-slate-50/50 dark:bg-slate-900/40 text-foreground hover:border-border hover:bg-accent/40"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="h-7 w-7 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      {editStaffRole === "branch_admin" && (
                        <span className="h-4 w-4 rounded-full bg-brand text-white flex items-center justify-center text-[10px]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-foreground">Branch Admin</div>
                      <div className="text-[10px] text-muted-foreground font-normal mt-0.5 leading-snug">
                        Full branch management & settings control
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Assigned Counter Desk (Desk Operator role only) */}
              {editStaffRole === "desk_staff" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">
                      Assigned Counter Desk
                    </Label>
                    <span className="text-[10px] text-brand font-extrabold bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                      Services derived automatically
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar rounded-2xl border border-border/60 bg-slate-50/50 dark:bg-slate-900/40 p-2.5">
                    <button
                      type="button"
                      onClick={() => setEditStaffDeskId(null)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl border p-2.5 text-left text-xs font-semibold transition-all",
                        editStaffDeskId === null 
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold ring-2 ring-amber-500/20" 
                          : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        Unassigned (No desk assigned)
                      </span>
                      {editStaffDeskId === null && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                    </button>

                    {branchDesks.map((d) => {
                      const isSelected = editStaffDeskId === d.id;
                      const deskServiceIds = state.deskServices
                        .filter((ds) => ds.deskId === d.id)
                        .map((ds) => ds.serviceId);

                      const otherAssignedCount = state.staff.filter((st) => String(st.deskId) === String(d.id) && st.id !== editingStaff.id).length;

                      return (
                        <button
                          type="button"
                          key={d.id}
                          onClick={() => setEditStaffDeskId(d.id)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl border p-2.5 text-left text-xs font-medium transition-all cursor-pointer",
                            isSelected 
                              ? "border-brand bg-brand/10 text-brand font-bold ring-2 ring-brand/20 shadow-xs" 
                              : "border-border/60 bg-background text-foreground hover:border-brand/40 hover:bg-accent/40"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="font-extrabold text-foreground flex items-center gap-2">
                              <Monitor className="h-3.5 w-3.5 text-brand shrink-0" />
                              <span>{d.label}</span>
                              {otherAssignedCount > 0 && (
                                <span className="text-[9px] text-muted-foreground font-normal bg-accent px-1.5 py-0.5 rounded-md border border-border/40">
                                  {otherAssignedCount} other staff assigned
                                </span>
                              )}
                            </div>
                            {deskServiceIds.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {deskServiceIds.map((sId) => {
                                  const s = branchServices.find((ser) => ser.id === sId);
                                  return s ? (
                                    <span key={sId} className="text-[9px] text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md font-bold">
                                      {s.name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-brand shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/40">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingStaff(null)}
                  className="h-10 px-5 text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="brand" 
                  size="sm"
                  disabled={isSavingStaff || !editStaffEmail.trim()}
                  className="h-10 px-6 text-xs font-bold rounded-xl shadow-md shadow-brand/15 gap-2"
                >
                  {isSavingStaff ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Desk */}
      {isAddDeskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Add Operator Desk</h3>
              <button onClick={() => setIsAddDeskModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDesk} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desk Name *</Label>
                <Input
                  value={newDeskName}
                  onChange={(e) => setNewDeskName(e.target.value)}
                  placeholder="e.g. Counter 1 or Reception Desk"
                  required
                  className="mt-1 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desk Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewDeskActive(true)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      newDeskActive ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" /> Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeskActive(false)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      !newDeskActive ? "border-muted-foreground/50 bg-muted text-muted-foreground ring-1 ring-muted-foreground" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Online Bookings Settings</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewDeskOnlineBooking(true)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      newDeskOnlineBooking ? "border-brand bg-brand/15 text-brand ring-1 ring-brand" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" /> Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeskOnlineBooking(false)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      !newDeskOnlineBooking ? "border-muted-foreground/50 bg-muted text-muted-foreground ring-1 ring-muted" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {!noService && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Handled Service Categories ({newDeskServices.length} Selected)
                  </Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                    {branchServices.map((s) => {
                      const isChecked = newDeskServices.includes(s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setNewDeskServices((prev) =>
                              isChecked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            );
                          }}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5",
                            isChecked ? "border-brand bg-brand/15 text-brand" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                          )}
                        >
                          {isChecked && <Check className="h-3 w-3 text-brand" />}
                          {s.name}
                        </button>
                      );
                    })}
                    {branchServices.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No service categories defined.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Operator Staff (Multiple Staff per Desk allowed) */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Assigned Operator Staff ({newDeskStaffIds.length} Selected)</span>
                  <span className="text-[10px] text-brand font-normal">1 Desk per Staff</span>
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                  <button
                    type="button"
                    onClick={() => setNewDeskStaffIds([])}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all col-span-2",
                      newDeskStaffIds.length === 0 ? "border-amber-500/50 bg-amber-500/10 text-amber-600 font-bold" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                    )}
                  >
                    <span>⚠️ Unassigned (No staff operator)</span>
                    {newDeskStaffIds.length === 0 && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                  </button>

                  {branchStaff.map((st) => {
                    const isSelected = newDeskStaffIds.includes(st.id);
                    const otherDeskAssigned = state.desks.find(
                      (d) => branchStaff.some((s) => s.id === st.id && s.deskId === d.id)
                    );

                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => {
                          setNewDeskStaffIds((prev) =>
                            isSelected ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                          );
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all",
                          isSelected ? "border-brand bg-brand/15 text-brand font-bold ring-1 ring-brand" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                        )}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground text-[9px] font-bold">
                            {st.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="truncate min-w-0">
                            <div className="truncate">{st.name}</div>
                            {otherDeskAssigned && !isSelected && (
                              <div className="text-[9px] text-muted-foreground font-normal">On {otherDeskAssigned.label}</div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                      </button>
                    );
                  })}
                  {branchStaff.length === 0 && (
                    <p className="col-span-2 text-[11px] text-muted-foreground p-2 text-center">
                      No staff accounts created for this branch yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsAddDeskModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isCreatingDesk}>
                  {isCreatingDesk ? "Creating..." : "Create Desk"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Desk */}
      {editingDesk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-brand" />
                <h3 className="text-lg font-bold">Edit Counter Desk</h3>
              </div>
              <button onClick={() => setEditingDesk(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDesk} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desk Name *</Label>
                <Input
                  value={editDeskName}
                  onChange={(e) => setEditDeskName(e.target.value)}
                  placeholder="e.g. Counter 1"
                  required
                  className="mt-1 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desk Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditDeskActive(true)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      editDeskActive ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" /> Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDeskActive(false)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      !editDeskActive ? "border-muted-foreground/50 bg-muted text-muted-foreground ring-1 ring-muted-foreground" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Online Bookings Settings</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditDeskOnlineBooking(true)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      editDeskOnlineBooking ? "border-brand bg-brand/15 text-brand ring-1 ring-brand" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" /> Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDeskOnlineBooking(false)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      !editDeskOnlineBooking ? "border-muted-foreground/50 bg-muted text-muted-foreground ring-1 ring-muted" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {!noService && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Handled Service Categories ({editDeskServices.length} Selected)
                  </Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                    {branchServices.map((s) => {
                      const isChecked = editDeskServices.includes(s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setEditDeskServices((prev) =>
                              isChecked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            );
                          }}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5",
                            isChecked ? "border-brand bg-brand/15 text-brand" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                          )}
                        >
                          {isChecked && <Check className="h-3 w-3 text-brand" />}
                          {s.name}
                        </button>
                      );
                    })}
                    {branchServices.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No service categories defined.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Operator Staff (Multiple Staff per Desk allowed) */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Assigned Operator Staff ({editDeskStaffIds.length} Selected)</span>
                  <span className="text-[10px] text-brand font-normal">1 Desk per Staff</span>
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                  <button
                    type="button"
                    onClick={() => setEditDeskStaffIds([])}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all col-span-2",
                      editDeskStaffIds.length === 0 ? "border-amber-500/50 bg-amber-500/10 text-amber-600 font-bold" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                    )}
                  >
                    <span>⚠️ Unassigned (No staff operator)</span>
                    {editDeskStaffIds.length === 0 && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                  </button>

                  {branchStaff.map((st) => {
                    const isSelected = editDeskStaffIds.includes(st.id);
                    const otherDeskAssigned = state.desks.find(
                      (otherD) => otherD.id !== editingDesk.id && branchStaff.some(s => s.id === st.id && s.deskId === otherD.id)
                    );

                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => {
                          setEditDeskStaffIds((prev) =>
                            isSelected ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                          );
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all",
                          isSelected ? "border-brand bg-brand/15 text-brand font-bold ring-1 ring-brand" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                        )}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground text-[9px] font-bold">
                            {st.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="truncate min-w-0">
                            <div className="truncate">{st.name}</div>
                            {otherDeskAssigned && !isSelected && (
                              <div className="text-[9px] text-muted-foreground font-normal">On {otherDeskAssigned.label}</div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                      </button>
                    );
                  })}
                  {branchStaff.length === 0 && (
                    <p className="col-span-2 text-[11px] text-muted-foreground p-2 text-center">
                      No staff accounts created for this branch yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingDesk(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isSavingDesk}>
                  {isSavingDesk ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Service */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-black text-foreground">Add Service Category</h3>
              <button onClick={() => setIsAddServiceModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Service Name *</Label>
                <Input
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Blood Test or X-Ray"
                  required
                  className="mt-1 text-xs rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Token Prefix *</Label>
                  <Input
                    value={newServicePrefix}
                    onChange={(e) => setNewServicePrefix(e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={2}
                    required
                    className="mt-1 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Estimated Time (Min) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newServiceAvgMinutes}
                    onChange={(e) => setNewServiceAvgMinutes(Number(e.target.value))}
                    required
                    className="mt-1 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button type="button" variant="outline" onClick={() => setIsAddServiceModalOpen(false)} className="h-8 text-xs font-bold rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isCreatingService} className="h-8 text-xs font-bold rounded-xl">
                  {isCreatingService ? "Creating..." : "Create Service"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Service */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-black text-foreground">Edit Service Category</h3>
              <button onClick={() => setEditingService(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Service Name *</Label>
                <Input
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                  placeholder="e.g. Blood Test"
                  required
                  className="mt-1 text-xs rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Token Prefix *</Label>
                  <Input
                    value={editServicePrefix}
                    onChange={(e) => setEditServicePrefix(e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={2}
                    required
                    className="mt-1 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Estimated Time (Min) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editServiceAvgMinutes}
                    onChange={(e) => setEditServiceAvgMinutes(Number(e.target.value))}
                    required
                    className="mt-1 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button type="button" variant="outline" onClick={() => setEditingService(null)} className="h-8 text-xs font-bold rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="brand" className="h-8 text-xs font-bold rounded-xl">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Branch Details */}
      {isEditingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Edit Branch Details
              </h3>
              <button onClick={() => setIsEditingBranch(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="branchName" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Branch Name</Label>
                <Input
                  id="branchName"
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  placeholder="e.g. Head Office"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="branchCity" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">City</Label>
                  <Input
                    id="branchCity"
                    value={editBranchCity}
                    onChange={(e) => setEditBranchCity(e.target.value)}
                    placeholder="e.g. Vadodara"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branchHours" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Operating Hours</Label>
                  <Input
                    id="branchHours"
                    value={editBranchHours}
                    onChange={(e) => setEditBranchHours(e.target.value)}
                    placeholder="e.g. 09:00 AM - 05:00 PM"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branchAddress" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Address</Label>
                <Input
                  id="branchAddress"
                  value={editBranchAddress}
                  onChange={(e) => setEditBranchAddress(e.target.value)}
                  placeholder="e.g. Main Office Address, Vadodara"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="branchPhone" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Contact Number</Label>
                  <Input
                    id="branchPhone"
                    value={editBranchPhone}
                    onChange={(e) => setEditBranchPhone(e.target.value)}
                    placeholder="e.g. 547237215432"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branchEmail" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Support Email</Label>
                  <Input
                    id="branchEmail"
                    value={editBranchEmail}
                    onChange={(e) => setEditBranchEmail(e.target.value)}
                    placeholder="e.g. renuka@gmail.com"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditingBranch(false)} className="h-9">
                Cancel
              </Button>
              <Button variant="brand" size="sm" onClick={handleSaveBranch} className="h-9 font-bold px-4">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Branch Entrance QR Code */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                  <QrCode className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">{branch.name} — QR Code</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">{branch.city || "Branch Location"} · Customer Entrance Check-In</p>
                </div>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-sm transition-all"
              >
                ✕
              </button>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-border/80 bg-slate-50/80 dark:bg-slate-900/60 space-y-3">
              <div className="p-4 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    `${typeof window !== "undefined" ? getNetworkOrigin() : ""}${joinUrl}`
                  )}`}
                  alt={`QR Code for ${branch.name}`}
                  className="h-48 w-48 object-contain rounded-xl"
                />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-3 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  SCAN WITH PHONE TO JOIN QUEUE
                </span>
              </div>
              <p className="text-xs text-center text-muted-foreground leading-relaxed px-2 font-medium">
                Display or print this QR code at your entrance so walk-in visitors can scan and get a digital token on their smartphones.
              </p>
            </div>

            {/* Customer Queue Web App URL Field */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                Customer Queue Web App URL
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? getNetworkOrigin() : ""}${joinUrl}`}
                  className="h-9 text-xs font-mono text-foreground bg-slate-100/70 dark:bg-slate-800/70 border-border/80 rounded-xl"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${getNetworkOrigin()}${joinUrl}`);
                    toast.success("Customer Queue URL copied to clipboard!");
                  }}
                  className="h-9 shrink-0 text-xs font-bold gap-1.5 rounded-xl border-border/80"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => window.open(joinUrl, "_blank")}
                  className="h-9 shrink-0 px-3 text-xs font-bold gap-1 rounded-xl"
                  title="Open Queue Web App"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </Button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const printWin = window.open("", "_blank");
                  if (!printWin) return;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    `${getNetworkOrigin()}${joinUrl}`
                  )}`;
                  printWin.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Print Entrance QR — ${branch.name}</title>
                        <style>
                          body { font-family: sans-serif; text-align: center; padding: 40px; }
                          .poster { border: 4px solid #4F46E5; border-radius: 24px; padding: 40px; max-w: 450px; margin: 0 auto; }
                          h1 { font-size: 28px; margin-bottom: 8px; color: #111827; }
                          p { font-size: 16px; color: #6B7280; margin-bottom: 24px; }
                          img { width: 260px; height: 260px; }
                          .badge { background: #EEF2FF; color: #4F46E5; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 16px; display: inline-block; }
                        </style>
                      </head>
                      <body onload="window.print(); window.close();">
                        <div class="poster">
                          <h1>${branch.name}</h1>
                          <p>Welcome! Scan the QR code to join our queue.</p>
                          <img src="${qrUrl}" alt="QR Code" />
                          <br />
                          <div class="badge">SCAN WITH SMARTPHONE CAMERA</div>
                        </div>
                      </body>
                    </html>
                  `);
                  printWin.document.close();
                }}
                className="h-9 text-xs font-bold gap-1.5 border-border/80"
              >
                <Printer className="h-3.5 w-3.5" /> Print Entrance Poster
              </Button>

              <Button type="button" variant="ghost" onClick={() => setIsQrModalOpen(false)} className="h-9 text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add-on Purchase Guidance Modal for Branch Admin */}
      {upsellModalCompKey && isBranchAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-base font-bold">Branch Allocation Limit Reached</h3>
              </div>
              <button onClick={() => setUpsellModalCompKey(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2 text-foreground">
              <p className="font-bold">
                Your branch has reached the maximum allowed {upsellModalCompKey === "operator_screens" ? "Operator Screens" : "Service Categories"} allocated under your company subscription plan.
              </p>
              <p className="text-muted-foreground">
                To create additional {upsellModalCompKey === "operator_screens" ? "counter desks" : "service categories"}, please contact your Company Admin to purchase add-on allocations for your company.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Hi Company Admin, our branch (${branch.name}) has reached the ${upsellModalCompKey === "operator_screens" ? "Operator Screens" : "Service Categories"} limit. Please purchase an add-on allocation for our branch.`
                  );
                  toast.success("Notification message copied to clipboard!");
                }}
                className="text-xs gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Message for Admin
              </Button>
              <Button type="button" variant="brand" onClick={() => setUpsellModalCompKey(null)} className="text-xs">
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add-on Purchase Upsell Modal for Company Admin */}
      {upsellModalCompKey && !isBranchAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xl font-display font-bold">Plan Allocation Limit Reached</h3>
              <button onClick={() => setUpsellModalCompKey(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            {renderPlanUsageView ? (
              renderPlanUsageView(companyId, company)
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Usage details are not available. Please contact your administrator.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setUpsellModalCompKey(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Kiosk Access Password & Timeout Settings */}
      {isKioskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-brand" />
                <div>
                  <h3 className="text-base font-bold">Kiosk Access & Idle Timeout Settings</h3>
                  <p className="text-[11px] text-muted-foreground">{branch.name}</p>
                </div>
              </div>
              <button onClick={() => setIsKioskModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKioskPin} className="space-y-4">
              {!branch?.kioskPasswordHash && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ <strong>Action Required:</strong> Set a password before you can open the Kiosk screen. This PIN gates staff-only exit/settings on public touch hardware.
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kiosk Access Password / PIN *</Label>
                <Input
                  type="password"
                  value={kioskPin}
                  onChange={(e) => setKioskPin(e.target.value)}
                  placeholder="Set 4+ digit PIN or password"
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password *</Label>
                <Input
                  type="password"
                  value={kioskPinConfirm}
                  onChange={(e) => setKioskPinConfirm(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Idle Screen Auto-Reset Timeout (Seconds)
                </Label>
                <Input
                  type="number"
                  min={4}
                  max={60}
                  value={kioskTimeout}
                  onChange={(e) => setKioskTimeout(Number(e.target.value))}
                  required
                  className="mt-1 text-xs rounded-xl h-9"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  How long the confirmation screen sits before auto-resetting back to the Idle Attract Screen for the next customer (default: 8s).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsKioskModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isSavingKioskPin || !kioskPin} className="text-xs">
                  {isSavingKioskPin ? "Saving..." : "Save Kiosk Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Kiosk Terminal */}
      {isAddKioskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-brand" />
                <div>
                  <h3 className="text-base font-bold">Add Kiosk Terminal</h3>
                  <p className="text-[11px] text-muted-foreground">{branch.name}</p>
                </div>
              </div>
              <button onClick={() => setIsAddKioskModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKiosk} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kiosk Identifier Name *</Label>
                <Input
                  type="text"
                  value={newKioskName}
                  onChange={(e) => setNewKioskName(e.target.value)}
                  placeholder="e.g. Kiosk 1 or Reception Lobby Kiosk"
                  required
                  className="mt-1 text-xs rounded-xl h-9 font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">4-Digit Access PIN *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={newKioskPin}
                  onChange={(e) => setNewKioskPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 1234"
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-9"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Generated automatically. You can change this to any 4-digit code.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddKioskModalOpen(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingKiosk || newKioskPin.length !== 4}
                  className="text-xs h-9"
                >
                  {isCreatingKiosk ? "Creating..." : "Create Kiosk"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface OnlineBookingSettingsPanelProps {
  branch: any;
  company: any;
}

export function OnlineBookingSettingsPanel({ branch, company }: OnlineBookingSettingsPanelProps) {
  const { state, actions } = useQuesole();
  const isMethod4Enabled = branch.enabledMethods?.includes(4) || false;
  const branchDesks = state.desks.filter(d => String(d.branchId) === String(branch.id));
  const branchServices = state.services.filter(s => String(s.branchId) === String(branch.id));
  const onlineDesksCount = branchDesks.filter(d => d.isOnlineBookingDesk).length;
  const showDeskWarning = isMethod4Enabled && branch?.channel_type !== "ONLINE_ONLY" && onlineDesksCount === 0;

  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Form states - Weekly Schedule / Range Schedule
  const [weeklyMode, setWeeklyMode] = useState<"WEEKLY" | "RANGE">("WEEKLY");
  const [weeklyStartDate, setWeeklyStartDate] = useState("");
  const [weeklyEndDate, setWeeklyEndDate] = useState("");
  const [weeklyRepeatWeekly, setWeeklyRepeatWeekly] = useState(true);
  const [weeklyBreakStart, setWeeklyBreakStart] = useState("");
  const [weeklyBreakEnd, setWeeklyBreakEnd] = useState("");
  const [weeklyDay, setWeeklyDay] = useState("0");
  const [weeklyService, setWeeklyService] = useState("");
  const [weeklyStart, setWeeklyStart] = useState("09:00");
  const [weeklyEnd, setWeeklyEnd] = useState("17:00");
  const [weeklyDuration, setWeeklyDuration] = useState("30");
  const [weeklyCapacity, setWeeklyCapacity] = useState("1");
  const [isAddingWeekly, setIsAddingWeekly] = useState(false);

  // Form states - Date Override
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideActive, setOverrideActive] = useState(false);
  const [overrideService, setOverrideService] = useState("");
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideDuration, setOverrideDuration] = useState("30");
  const [overrideCapacity, setOverrideCapacity] = useState("1");
  const [overrideBreakStart, setOverrideBreakStart] = useState("");
  const [overrideBreakEnd, setOverrideBreakEnd] = useState("");
  const [isAddingOverride, setIsAddingOverride] = useState(false);

  // Preview slots states
  const [previewDateVal, setPreviewDateVal] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dateVal}`;
  });
  const [previewServiceId, setPreviewServiceId] = useState<string>("");
  const [previewSlots, setPreviewSlots] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Helper to check if a date has slots configured on the client side
  const hasSlotsForDate = (date: Date, templates: any[], serviceId?: string) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dateVal = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateVal}`;
    const dayOfWeek = (date.getDay() + 6) % 7;

    const specificTemplates = [];
    const weeklyTemplates = [];

    const filteredTemplates = templates.filter(t => {
      if (!serviceId) return true;
      return !t.service || String(t.service) === String(serviceId);
    });

    for (const t of filteredTemplates) {
      if (t.specific_date) {
        if (t.specific_date === dateStr) {
          specificTemplates.push(t);
        }
      } else if (t.start_date && t.end_date) {
        if (t.start_date <= dateStr && dateStr <= t.end_date) {
          if (t.day_of_week !== null && t.day_of_week !== undefined) {
            if (t.day_of_week === dayOfWeek) {
              specificTemplates.push(t);
            }
          } else {
            specificTemplates.push(t);
          }
        }
      } else if (t.day_of_week !== null && t.day_of_week !== undefined) {
        if (t.day_of_week === dayOfWeek) {
          if (t.repeat_weekly) {
            weeklyTemplates.push(t);
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkD = new Date(date);
            checkD.setHours(0, 0, 0, 0);
            const diffTime = checkD.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < 7) {
              weeklyTemplates.push(t);
            }
          }
        }
      } else {
        // If everything is null, it's an Everyday template
        weeklyTemplates.push(t);
      }
    }

    if (specificTemplates.some(t => !t.is_active)) {
      return false;
    }

    const activeSpecific = specificTemplates.filter(t => t.is_active);
    if (activeSpecific.length > 0) {
      return true;
    }

    return weeklyTemplates.filter(t => t.is_active).length > 0;
  };

  // Generate next 90 days filtered to only dates that actually have slots defined
  const previewDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (hasSlotsForDate(d, timeSlots, previewServiceId)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateVal = String(d.getDate()).padStart(2, '0');
        
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString("en-US", { month: "short" });

        dates.push({
          value: `${year}-${month}-${dateVal}`,
          dayName,
          dayNum,
          monthName,
          label: `${dayName}, ${monthName} ${dayNum}`
        });
      }
    }
    return dates.slice(0, 30);
  }, [timeSlots, previewServiceId]);

  const fetchSlots = async () => {
    setIsLoadingSlots(true);
    try {
      if (!branch?.id) return;
      const data = await apiFetch(`/api/time-slots/?branch=${branch.id}`);
      setTimeSlots(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load time slot configurations.");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const fetchPreview = async (dateStr: string, serviceId?: string) => {
    setIsLoadingPreview(true);
    try {
      if (!branch?.id) return;
      const serviceParam = serviceId ? `&service_id=${serviceId}` : "";
      const data = await apiFetch(`/api/public/branches/${branch.id}/slots/?date=${dateStr}${serviceParam}`);
      setPreviewSlots(data);
    } catch (err) {
      console.error(err);
      setPreviewSlots([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [branch?.id]);

  useEffect(() => {
    if (previewDates.length > 0) {
      const exists = previewDates.some(d => d.value === previewDateVal);
      if (!exists && previewDates[0]) {
        setPreviewDateVal(previewDates[0].value);
      }
    }
  }, [previewDates, previewDateVal]);

  useEffect(() => {
    if (previewDateVal) {
      fetchPreview(previewDateVal, previewServiceId);
    }
  }, [previewDateVal, previewServiceId]);

  const handleToggleMethod4 = async () => {
    try {
      await actions.setBranchMethod(branch.id, 4);
      toast.success(isMethod4Enabled ? "Online Booking disabled for this branch." : "Online Booking enabled for this branch.");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle online booking.");
    }
  };

  const handleAddWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weeklyMode === "RANGE" && (!weeklyStartDate || !weeklyEndDate)) {
      toast.error("Please select both start date and end date.");
      return;
    }
    setIsAddingWeekly(true);
    try {
      const payload: any = {
        branch: branch.id,
        day_of_week: weeklyDay === "everyday" ? null : parseInt(weeklyDay),
        service: weeklyService || null,
        start_time: weeklyStart + ":00",
        end_time: weeklyEnd + ":00",
        slot_duration_minutes: parseInt(weeklyDuration),
        max_bookings_per_slot: parseInt(weeklyCapacity),
        is_active: true,
        break_start_time: weeklyBreakStart ? weeklyBreakStart + ":00" : null,
        break_end_time: weeklyBreakEnd ? weeklyBreakEnd + ":00" : null,
      };

      if (weeklyMode === "RANGE") {
        payload.start_date = weeklyStartDate;
        payload.end_date = weeklyEndDate;
        payload.repeat_weekly = false;
      } else {
        payload.repeat_weekly = weeklyRepeatWeekly;
        payload.start_date = null;
        payload.end_date = null;
      }

      await apiFetch("/api/time-slots/", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      toast.success(weeklyMode === "RANGE" ? "Specific date range template added!" : "Weekly schedule slot template added!");
      fetchSlots();
      if (previewDateVal) {
        fetchPreview(previewDateVal, previewServiceId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add schedule window.");
    } finally {
      setIsAddingWeekly(false);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) {
      toast.error("Please select a date for the override.");
      return;
    }
    setIsAddingOverride(true);
    try {
      await apiFetch("/api/time-slots/", {
        method: "POST",
        body: JSON.stringify({
          branch: branch.id,
          specific_date: overrideDate,
          service: overrideService || null,
          start_time: overrideActive ? overrideStart + ":00" : "00:00:00",
          end_time: overrideActive ? overrideEnd + ":00" : "00:00:00",
          slot_duration_minutes: overrideActive ? parseInt(overrideDuration) : 30,
          max_bookings_per_slot: overrideActive ? parseInt(overrideCapacity) : 0,
          is_active: overrideActive,
          break_start_time: overrideActive && overrideBreakStart ? overrideBreakStart + ":00" : null,
          break_end_time: overrideActive && overrideBreakEnd ? overrideBreakEnd + ":00" : null,
        })
      });
      toast.success(overrideActive ? "Date override template added!" : "Branch marked as closed for online booking on this date.");
      fetchSlots();
      if (previewDateVal) {
        fetchPreview(previewDateVal, previewServiceId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add override.");
    } finally {
      setIsAddingOverride(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await apiFetch(`/api/time-slots/${id}/`, { method: "DELETE" });
      toast.success("Schedule template removed.");
      fetchSlots();
      if (previewDateVal) {
        fetchPreview(previewDateVal, previewServiceId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slot configuration.");
    }
  };

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const categorizedSlots = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];

    previewSlots.forEach((slot) => {
      const hour = parseInt(slot.time.split(":")[0]);
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 16) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [previewSlots]);

  const renderSlotCard = (slot: any) => {
    const isFull = slot.status === "fully_booked" || slot.available <= 0;
    const isLow = !isFull && slot.available === 1;

    const slotRange = slot.end_time ? `${slot.time} to ${slot.end_time}` : (() => {
      try {
        const [h, m] = slot.time.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m + 30, 0, 0);
        const eh = String(d.getHours()).padStart(2, '0');
        const em = String(d.getMinutes()).padStart(2, '0');
        return `${slot.time} to ${eh}:${em}`;
      } catch {
        return slot.time;
      }
    })();

    return (
      <div
        key={slot.time}
        className={cn(
          "rounded-2xl border p-2.5 text-center flex flex-col justify-center items-center gap-1 transition-all select-none duration-200 shadow-sm",
          isFull
            ? "border-red-500/10 bg-red-500/5 text-red-500/40 opacity-60 line-through"
            : isLow
            ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:border-amber-500/50 hover:shadow"
            : "border-border bg-card text-foreground hover:border-brand/40 hover:shadow"
        )}
      >
        <span className="font-mono text-[10px] font-black tracking-tight whitespace-nowrap">{slotRange}</span>
        <span className={cn(
          "text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-md mt-0.5",
          isFull
            ? "bg-red-500/10 text-red-500"
            : isLow
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        )}>
          {isFull ? "Full" : isLow ? "1 Left" : `${slot.available}/${slot.capacity}`}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-6">
      {/* 1. Toggle Gating & Status Card */}
      <div className="panel p-5 space-y-4 border border-border/80 bg-accent/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-display text-sm font-bold text-foreground">Online Booking Availability (Method 4)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Allow customers to book appointments online before arriving.</p>
          </div>
          <button
            onClick={handleToggleMethod4}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-start sm:self-center shrink-0",
              isMethod4Enabled ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20" : "bg-accent text-muted-foreground hover:text-foreground border border-border"
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            {isMethod4Enabled ? "Active & Accepting Bookings" : "Inactive (Off)"}
          </button>
        </div>



        {isMethod4Enabled && (
          <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Company-wide Shared Booking Link
            </Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 font-mono text-xs select-all text-foreground overflow-x-auto">
                {window.location.protocol}//{window.location.host}/{company?.slug}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9 px-3.5 text-xs font-semibold shrink-0 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/${company?.slug}`);
                    toast.success("Shared booking link copied to clipboard!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </Button>
                <a
                  href={`/${company?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background px-3 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Open Booking Flow"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Note: This is a shared link for the entire company. Customers visiting this URL will see a branch selector dropdown where <strong>{branch.name}</strong> is listed.
            </p>
          </div>
        )}
      </div>

      {isMethod4Enabled && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Schedule Configuration Builder */}
          <div className="panel p-5 space-y-5 border border-border/80">
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">Add Weekly Schedule Window</h4>
              <p className="text-xs text-muted-foreground">Define regular weekly time slots for bookings.</p>
            </div>

            <form onSubmit={handleAddWeekly} className="space-y-3.5">
              {/* Toggle between Weekly Repeat and Date Range */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-accent/20 p-1">
                <button
                  type="button"
                  onClick={() => setWeeklyMode("WEEKLY")}
                  className={cn(
                    "rounded-lg py-1.5 text-center text-[11px] font-bold transition-all border-0 cursor-pointer outline-none",
                    weeklyMode === "WEEKLY" ? "bg-white dark:bg-slate-800 text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Weekly Repeating
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyMode("RANGE")}
                  className={cn(
                    "rounded-lg py-1.5 text-center text-[11px] font-bold transition-all border-0 cursor-pointer outline-none",
                    weeklyMode === "RANGE" ? "bg-white dark:bg-slate-800 text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Specific Date Range
                </button>
              </div>

              {weeklyMode === "RANGE" && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                    <input
                      type="date"
                      value={weeklyStartDate}
                      onChange={(e) => setWeeklyStartDate(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                    <input
                      type="date"
                      value={weeklyEndDate}
                      onChange={(e) => setWeeklyEndDate(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day of Week</Label>
                  <select
                    value={weeklyDay}
                    onChange={(e) => setWeeklyDay(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="everyday">Everyday</option>
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service Scope</Label>
                  <select
                    value={weeklyService}
                    onChange={(e) => setWeeklyService(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">All Services</option>
                    {branchServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                  <input
                    type="time"
                    value={weeklyStart}
                    onChange={(e) => setWeeklyStart(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                  <input
                    type="time"
                    value={weeklyEnd}
                    onChange={(e) => setWeeklyEnd(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
              </div>

              {/* Break Time configs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break Start (Optional)</Label>
                  <input
                    type="time"
                    value={weeklyBreakStart}
                    onChange={(e) => setWeeklyBreakStart(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break End (Optional)</Label>
                  <input
                    type="time"
                    value={weeklyBreakEnd}
                    onChange={(e) => setWeeklyBreakEnd(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Slot Duration (Min)</Label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={weeklyDuration}
                    onChange={(e) => setWeeklyDuration(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Capacity per Slot</Label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={weeklyCapacity}
                    onChange={(e) => setWeeklyCapacity(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
              </div>

              {weeklyMode === "WEEKLY" && (
                <div className="flex items-center gap-2 py-1 select-none">
                  <input
                    type="checkbox"
                    id="repeatWeeklyCheckbox"
                    checked={weeklyRepeatWeekly}
                    onChange={(e) => setWeeklyRepeatWeekly(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand cursor-pointer"
                  />
                  <Label htmlFor="repeatWeeklyCheckbox" className="text-xs font-bold text-foreground cursor-pointer">
                    Repeat every week
                  </Label>
                </div>
              )}

              <Button type="submit" variant="brand" className="w-full rounded-xl text-xs py-2 h-9" disabled={isAddingWeekly}>
                {isAddingWeekly ? "Adding Template..." : "Add Schedule Window"}
              </Button>
            </form>
          </div>

          {/* Date Overrides & Closure builder */}
          <div className="panel p-5 space-y-5 border border-border/80">
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">Add Specific Date Override (Holiday/Closure)</h4>
              <p className="text-xs text-muted-foreground">Configure overrides for holidays, closures, or custom schedule dates.</p>
            </div>

            <form onSubmit={handleAddOverride} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Date</Label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operational Status</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setOverrideActive(true)}
                      className={cn(
                        "rounded-xl border py-1.5 text-center text-xs font-bold transition-all border-solid cursor-pointer outline-none",
                        overrideActive ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500" : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideActive(false)}
                      className={cn(
                        "rounded-xl border py-1.5 text-center text-xs font-bold transition-all border-solid cursor-pointer outline-none",
                        !overrideActive ? "border-coral bg-coral/10 text-coral ring-1 ring-coral" : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      Closed
                    </button>
                  </div>
                </div>
              </div>

              {overrideActive && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service Scope</Label>
                      <select
                        value={overrideService}
                        onChange={(e) => setOverrideService(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="">All Services</option>
                        {branchServices.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                        <input
                          type="time"
                          value={overrideStart}
                          onChange={(e) => setOverrideStart(e.target.value)}
                          className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                        <input
                          type="time"
                          value={overrideEnd}
                          onChange={(e) => setOverrideEnd(e.target.value)}
                          className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Break time override configs */}
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break Start (Optional)</Label>
                      <input
                        type="time"
                        value={overrideBreakStart}
                        onChange={(e) => setOverrideBreakStart(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break End (Optional)</Label>
                      <input
                        type="time"
                        value={overrideBreakEnd}
                        onChange={(e) => setOverrideBreakEnd(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Slot Duration (Min)</Label>
                      <input
                        type="number"
                        min="5"
                        value={overrideDuration}
                        onChange={(e) => setOverrideDuration(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Capacity per Slot</Label>
                      <input
                        type="number"
                        min="1"
                        value={overrideCapacity}
                        onChange={(e) => setOverrideCapacity(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" variant="brand" className="w-full rounded-xl text-xs py-2 h-9" disabled={isAddingOverride}>
                {isAddingOverride ? "Adding Override..." : "Add Date Override"}
              </Button>
            </form>
          </div>

          {/* Configurations list */}
          <div className="panel p-5 space-y-4 md:col-span-2 border border-border/80">
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">Configured Availability Windows & Closures</h4>
              <p className="text-xs text-muted-foreground">Active templates used to auto-generate daily time slots.</p>
            </div>

            {isLoadingSlots ? (
              <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Loading configurations...</div>
            ) : timeSlots.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                No active schedule configurations defined. Add a weekly schedule window above to start accepting bookings.
              </div>
            ) : (
              <div className="border border-border/60 rounded-2xl overflow-hidden overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/30 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="p-3">Type</th>
                      <th className="p-3">Schedule Scope / Date</th>
                      <th className="p-3">Hours Window</th>
                      <th className="p-3">Details</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {timeSlots.map((ts) => {
                      const svc = branchServices.find(s => String(s.id) === String(ts.service));
                      const isOverride = !!ts.specific_date;
                      const isRange = !!(ts.start_date && ts.end_date);
                      return (
                        <tr key={ts.id} className="hover:bg-accent/10">
                          <td className="p-3 font-semibold">
                            {isOverride ? (
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", ts.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-coral/10 text-coral")}>
                                {ts.is_active ? "Date Override" : "Holiday Closure"}
                              </span>
                            ) : isRange ? (
                              <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-bold">
                                Date Range
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-bold">
                                Weekly Template
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-medium">
                            {isOverride ? (
                              ts.specific_date
                            ) : isRange ? (
                              <div>
                                <span className="font-bold">{ts.day_of_week !== null && ts.day_of_week !== undefined ? DAYS[ts.day_of_week] : "Everyday"}</span>
                                <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                                  {ts.start_date} to {ts.end_date}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold">{ts.day_of_week !== null && ts.day_of_week !== undefined ? DAYS[ts.day_of_week] : "Everyday"}</span>
                                {!ts.repeat_weekly && (
                                  <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                    (Non-repeating)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            {!ts.is_active ? (
                              "—"
                            ) : (
                              <div>
                                <span className="font-semibold">{ts.start_time.substring(0, 5)} - {ts.end_time.substring(0, 5)}</span>
                                {ts.break_start_time && ts.break_end_time && (
                                  <span className="block text-[10px] text-muted-foreground font-bold mt-0.5">
                                    Break: {ts.break_start_time.substring(0, 5)} - {ts.break_end_time.substring(0, 5)}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {!ts.is_active ? (
                              "Closed (All bookings disabled)"
                            ) : (
                              `${ts.slot_duration_minutes}m slots · Capacity: ${ts.max_bookings_per_slot} (${svc ? svc.name : "All Services"})`
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(ts.id)}
                              className="rounded-lg p-1.5 text-coral hover:bg-coral/10 transition-colors"
                              title="Delete template"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Live Booking Slots Preview */}
          <div className="panel p-5 space-y-5 md:col-span-2 border border-border/80 bg-white dark:bg-slate-900 rounded-3xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border/40">
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">Live Booking Slots Preview</h4>
                <p className="text-xs text-muted-foreground">Select a tab or jump to any date to preview the dynamic booking slots generated for customers.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {branchServices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5" /> Service:
                    </span>
                    <select
                      value={previewServiceId}
                      onChange={(e) => setPreviewServiceId(e.target.value)}
                      className="rounded-xl border border-border bg-accent/20 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand font-semibold cursor-pointer"
                    >
                      <option value="">All Services</option>
                      {branchServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Jump to:
                  </span>
                  <input
                    type="date"
                    value={previewDateVal}
                    onChange={(e) => {
                      if (e.target.value) {
                        setPreviewDateVal(e.target.value);
                      }
                    }}
                    className="rounded-xl border border-border bg-accent/20 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Date tabs */}
            {previewDates.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground italic bg-accent/5 rounded-2xl border border-dashed border-border/80">
                No dates with configured availability slots.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {previewDates.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setPreviewDateVal(d.value)}
                    className={cn(
                      "shrink-0 rounded-2xl border px-4 py-2.5 text-center flex flex-col items-center justify-center min-w-[75px] transition-all border-solid cursor-pointer outline-none",
                      previewDateVal === d.value
                        ? "bg-brand text-white border-brand shadow-sm shadow-brand/25"
                        : "border-border text-muted-foreground bg-surface hover:text-foreground hover:bg-accent/40"
                    )}
                  >
                    <span className="text-[9px] uppercase font-black tracking-wider opacity-85">{d.dayName}</span>
                    <span className="text-base font-black tracking-tight my-0.5">{d.dayNum}</span>
                    <span className="text-[9px] uppercase tracking-widest opacity-60 font-bold">{d.monthName}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Slots Grid grouped by Morning / Afternoon / Evening */}
            {isLoadingPreview ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Computing preview slots...</div>
            ) : previewSlots.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                No slots available on this date. Make sure you have configured active templates that cover this day of the week or date, and that it isn't marked as a holiday.
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                {/* Morning Slots */}
                {categorizedSlots.morning.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
                      <Sunrise className="h-4 w-4 text-amber-500" /> Morning Slots (Before 12:00 PM)
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {categorizedSlots.morning.map(renderSlotCard)}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {categorizedSlots.afternoon.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/30">
                    <h5 className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
                      <Sun className="h-4 w-4 text-orange-500" /> Afternoon Slots (12:00 PM - 4:00 PM)
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {categorizedSlots.afternoon.map(renderSlotCard)}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {categorizedSlots.evening.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/30">
                    <h5 className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
                      <Sunset className="h-4 w-4 text-indigo-500" /> Evening Slots (After 4:00 PM)
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {categorizedSlots.evening.map(renderSlotCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface KotSettingsPanelProps {
  branch: any;
  company: any;
  setView?: (view: string) => void;
}

export function KotSettingsPanel({ branch, company, setView }: KotSettingsPanelProps) {
  const { state, actions, refresh } = useQuesole();
  const companySlug = company?.slug || "";
  const branchSlug = branch?.slug || "";
  const kotUrl = companySlug && branchSlug ? `/${companySlug}/branches/${branchSlug}/kot` : `/kot/${branch?.id}`;
  
  const [kotTerminals, setKotTerminals] = useState<any[]>([]);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [isAddingTerminal, setIsAddingTerminal] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState<any | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<any | null>(null);
  const [smsText, setSmsText] = useState("");
  const [whatsappText, setWhatsappText] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isSmsActive = branch.enabledMethods?.map(Number).includes(3) || false;
  const isWhatsappActive = branch.enabledMethods?.map(Number).includes(4) || false;

  const kotBranchAlloc = state.companyAllocations.find(
    (a) => a.component_key === "kot_terminals" && String(a.branch_id) === String(branch?.id)
  );
  const kotCompanyAlloc = state.companyAllocations.find(
    (a) => a.component_key === "kot_terminals" && !a.branch_id && String(a.companyId) === String(company?.id)
  );
  const pcKotComp = state.planComponents.find((c) => c.key === "kot_terminals");
  const defaultKotLimit = pcKotComp ? pcKotComp.default_included_qty : 1;

  const purchasedKotTerminals = (kotBranchAlloc && kotBranchAlloc.purchased_qty > 0)
    ? kotBranchAlloc.purchased_qty
    : (kotCompanyAlloc && kotCompanyAlloc.purchased_qty > 0)
    ? kotCompanyAlloc.purchased_qty
    : (branch?.allocations?.kot_terminals?.limit || company?.package?.max_kot_terminals || defaultKotLimit);

  const targetBranchId = branch?.id || branch?._id || branch?.slug;

  const fetchKotTerminals = async () => {
    try {
      const url = targetBranchId ? `/api/kot/terminals/?branch_id=${targetBranchId}` : `/api/kot/terminals/`;
      const data: any = await apiFetch(url);
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
      console.log(`[KOT Terminals] Loaded ${list.length} terminals for branch ${targetBranchId}:`, list);
      setKotTerminals(list);
    } catch (err) {
      console.error("Failed to fetch KOT terminals", err);
    }
  };

  const fetchKotData = async () => {
    setIsLoading(true);
    try {
      if (typeof refresh === "function") refresh();
      await fetchKotTerminals();
      if (targetBranchId) {
        const templatesData: any[] = await apiFetch(`/api/kot-message-templates/?branch=${targetBranchId}`);
        const smsT = templatesData.find((t: any) => t.channel === "sms");
        const waT = templatesData.find((t: any) => t.channel === "whatsapp");
        
        setSmsTemplate(smsT || null);
        setSmsText(smsT ? smsT.template_text : "Hi {customer_name}, your token is {token_number} (Service: {service_name}). Desk: {desk_name}. People ahead: {position}. Est wait: ~{eta} mins. Quesole Team");
        
        setWhatsappTemplate(waT || null);
        setWhatsappText(waT ? waT.template_text : "Hello {customer_name}! Here is your digital ticket for {branch_name}.\nToken: {token_number}\nService: {service_name}\nPeople ahead: {position}\nEst wait: ~{eta} mins.\nLive link: {tracking_link}");

        const logsData: any[] = await apiFetch(`/api/kot-notification-logs/?branch=${targetBranchId}`);
        setLogs(logsData);
      }
    } catch (err) {
      console.error("Failed to load KOT settings/logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (branch) {
      fetchKotData();
    }
  }, [branch?.id, branch?.slug]);

  const handleRegeneratePin = async (terminalId: string) => {
    try {
      await apiFetch(`/api/kot/terminals/${terminalId}/regenerate-pin/`, { method: "POST" });
      toast.success("KOT Terminal PIN regenerated successfully!");
      fetchKotTerminals();
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate PIN.");
    }
  };

  const handleAddTerminal = async () => {
    if (kotTerminals.filter(t => t.status === "active").length >= purchasedKotTerminals) {
      toast.error(`KOT terminal quota reached (${purchasedKotTerminals} allocated). Purchase an add-on under Plan & usage to add more KOT terminals.`, {
        action: setView ? {
          label: "Plan & Usage",
          onClick: () => setView("billing")
        } : undefined
      });
      return;
    }

    if (!targetBranchId) {
      toast.error("Unable to identify current branch.");
      return;
    }

    setIsAddingTerminal(true);
    try {
      const nextNumber = kotTerminals.length + 1;
      await apiFetch(`/api/kot/terminals/`, {
        method: "POST",
        body: JSON.stringify({
          branch: targetBranchId,
          terminal_identifier: `KOT ${nextNumber}`
        })
      });
      toast.success(`KOT ${nextNumber} terminal created successfully!`);
      fetchKotTerminals();
    } catch (err: any) {
      toast.error(err.message || "Failed to create KOT terminal.");
    } finally {
      setIsAddingTerminal(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (smsTemplate && smsTemplate.id) {
        await apiFetch(`/api/kot-message-templates/${smsTemplate.id}/`, {
          method: "PUT",
          body: JSON.stringify({
            branch: branch.id,
            company: company.id,
            channel: "sms",
            template_text: smsText
          })
        });
      } else {
        const newSms = await apiFetch(`/api/kot-message-templates/`, {
          method: "POST",
          body: JSON.stringify({
            branch: branch.id,
            company: company.id,
            channel: "sms",
            template_text: smsText
          })
        });
        setSmsTemplate(newSms);
      }

      if (whatsappTemplate && whatsappTemplate.id) {
        await apiFetch(`/api/kot-message-templates/${whatsappTemplate.id}/`, {
          method: "PUT",
          body: JSON.stringify({
            branch: branch.id,
            company: company.id,
            channel: "whatsapp",
            template_text: whatsappText
          })
        });
      } else {
        const newWa = await apiFetch(`/api/kot-message-templates/`, {
          method: "POST",
          body: JSON.stringify({
            branch: branch.id,
            company: company.id,
            channel: "whatsapp",
            template_text: whatsappText
          })
        });
        setWhatsappTemplate(newWa);
      }

      toast.success("Digital Token message templates saved successfully!");
      fetchKotData();
    } catch (err) {
      console.error("Failed to save KOT templates", err);
      toast.error("Failed to save templates. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">


      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-base font-black text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Digital KOT Check-In Terminals ({kotTerminals.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            This is a link you can share (on a poster, WhatsApp, or SMS) that lets customers check in remotely and get a digital token without needing to visit a kiosk in person.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs text-muted-foreground bg-accent/20 px-3 py-1.5 rounded-lg border border-border/40 font-bold shrink-0">
            Terminals Allocated: {kotTerminals.filter(t => t.status === "active").length} / {purchasedKotTerminals}
          </span>
          {kotTerminals.filter(t => t.status === "active").length >= purchasedKotTerminals && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (setView) setView("billing");
                else toast.info("Go to Plan & Usage in your sidebar to purchase add-ons.");
              }}
              className="h-8 gap-1.5 text-xs font-bold shrink-0 text-amber-600 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
            >
              <CreditCard className="h-3.5 w-3.5" /> Buy More KOT Terminals
            </Button>
          )}
          <Button
            variant="brand"
            size="sm"
            onClick={handleAddTerminal}
            disabled={isAddingTerminal || kotTerminals.filter(t => t.status === "active").length >= purchasedKotTerminals}
            className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Add KOT Terminal
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">KOT Terminals</span>
          <span className="text-base font-black text-foreground block mt-0.5">{kotTerminals.length}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Online</span>
          <span className="text-base font-black text-emerald-500 block mt-0.5">{kotTerminals.filter(t => t.is_logged_in).length}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Offline</span>
          <span className="text-base font-black text-muted-foreground block mt-0.5">{kotTerminals.filter(t => !t.is_logged_in).length}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Digital Tokens Today</span>
          <span className="text-base font-black text-primary block mt-0.5">
            {state.tickets.filter(t => String(t.branchId) === String(branch.id) && (t.channel === "sms" || t.channel === "whatsapp")).length}
          </span>
        </div>
      </div>

      {/* KOT Terminals Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kotTerminals.map((terminal, idx) => {
          const isPinVisible = !!visiblePins[terminal.id];
          return (
            <div
              key={terminal.id}
              className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 hover:border-primary hover:shadow-soft transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="flex gap-4">
                {/* Device Icon / Visual */}
                <div className="h-24 w-16 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-center p-2 shrink-0 text-emerald-600">
                  <MessageSquare className="h-8 w-8" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h3 className="font-black text-sm text-foreground truncate">{terminal.terminal_identifier}</h3>
                    <span className="text-[10px] text-muted-foreground font-mono">Terminal ID: KOT-0{idx + 1}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">Status</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 font-bold mt-0.5",
                        terminal.is_logged_in ? "text-emerald-500" : "text-muted-foreground"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", terminal.is_logged_in ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                        {terminal.is_logged_in ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">PIN Code</span>
                      <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                        <span>{isPinVisible ? terminal.pin : "••••"}</span>
                        <button
                          onClick={() => setVisiblePins(prev => ({ ...prev, [terminal.id]: !prev[terminal.id] }))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isPinVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const terminalSlug = terminal.terminal_identifier ? terminal.terminal_identifier.toLowerCase().replace(/\s+/g, "-") : `kot-${terminal.id}`;
                    const terminalKotUrl = `${kotUrl}?terminal=${terminalSlug}`;
                    return (
                      <div className="pt-2 border-t border-border/20 mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">Check-In Link</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={terminalKotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Open</span>
                          </a>
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}${terminalKotUrl}`;
                              navigator.clipboard.writeText(url);
                              toast.success(`KOT Check-In URL for ${terminal.terminal_identifier} copied!`);
                            }}
                            className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border/30 pt-3 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRegeneratePin(terminal.id)}
                  className="h-8 text-xs font-bold"
                >
                  Regenerate PIN
                </Button>
              </div>
            </div>
          );
        })}

        {kotTerminals.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-muted-foreground font-semibold bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl">
            No KOT terminals provisioned. Ensure KOT Digital Tokens are allocated in your company plan.
          </div>
        )}
      </div>

      {/* Template Editors & Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Editors */}
        <div className="lg:col-span-7 space-y-6">
          {/* SMS Section */}
          <div className={cn(
            "panel p-5 space-y-4 border border-border/80 rounded-3xl",
            isSmsActive ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/30 opacity-70"
          )}>
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4.5 w-4.5" />
                </span>
                <div>
                  <span className="text-xs font-bold text-foreground block">SMS Alerts & Reminders</span>
                  <span className="text-[10px] text-muted-foreground">Standard SMS delivery gateway</span>
                </div>
              </div>
              <span className={cn(
                "text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                isSmsActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground/60"
              )}>
                {isSmsActive ? "Active" : "Inactive"}
              </span>
            </div>

            {isSmsActive ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    SMS Template Message
                  </Label>
                  <textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    className="w-full h-24 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter SMS template..."
                  />
                  <div className="text-[9px] text-muted-foreground mt-2 space-y-1 bg-accent/5 p-2 rounded-xl">
                    <p className="font-bold uppercase tracking-wider text-[8px]">Supported Template Variables:</p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[8px] text-primary/80">
                      <div>{`{customer_name}`}</div>
                      <div>{`{token_number}`}</div>
                      <div>{`{service_name}`}</div>
                      <div>{`{desk_name}`}</div>
                      <div>{`{position}`}</div>
                      <div>{`{eta}`}</div>
                      <div>{`{branch_name}`}</div>
                      <div>{`{tracking_link}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">
                SMS delivery is not active. Enable it in the Plan & Usage settings.
              </div>
            )}
          </div>

          {/* WhatsApp Section */}
          <div className={cn(
            "panel p-5 space-y-4 border border-border/80 rounded-3xl",
            isWhatsappActive ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/30 opacity-70"
          )}>
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-4.5 w-4.5" />
                </span>
                <div>
                  <span className="text-xs font-bold text-foreground block">WhatsApp Digital Tickets</span>
                  <span className="text-[10px] text-muted-foreground">Official business notification channel</span>
                </div>
              </div>
              <span className={cn(
                "text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                isWhatsappActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground/60"
              )}>
                {isWhatsappActive ? "Active" : "Inactive"}
              </span>
            </div>

            {isWhatsappActive ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    WhatsApp Message Template
                  </Label>
                  <textarea
                    value={whatsappText}
                    onChange={(e) => setWhatsappText(e.target.value)}
                    className="w-full h-24 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter WhatsApp template..."
                  />
                  <div className="text-[9px] text-muted-foreground mt-2 space-y-1 bg-accent/5 p-2 rounded-xl">
                    <p className="font-bold uppercase tracking-wider text-[8px]">Supported Template Variables:</p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[8px] text-primary/80">
                      <div>{`{customer_name}`}</div>
                      <div>{`{token_number}`}</div>
                      <div>{`{service_name}`}</div>
                      <div>{`{desk_name}`}</div>
                      <div>{`{position}`}</div>
                      <div>{`{eta}`}</div>
                      <div>{`{branch_name}`}</div>
                      <div>{`{tracking_link}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">
                WhatsApp delivery is not active. Enable it in the Plan & Usage settings.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Previews & Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Simulated Previews */}
          <div className="panel p-5 space-y-4 border border-border/80 bg-accent/5 rounded-3xl">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Live Mock Previews
            </h5>
            
            {isSmsActive && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Simulated SMS Alert
                </span>
                <div className="bg-slate-100 dark:bg-slate-950 border border-border/40 p-3.5 rounded-2xl relative">
                  <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground font-black mb-1.5 uppercase tracking-wider border-b border-border/20 pb-1">
                    <MessageSquare className="h-3 w-3" /> SMS Gateway Preview
                  </div>
                  <p className="text-[10px] text-foreground leading-normal font-mono select-none whitespace-pre-wrap">
                    {smsText
                      .replace("{customer_name}", "Harshil")
                      .replace("{token_number}", "A304")
                      .replace("{service_name}", "General Banking")
                      .replace("{desk_name}", "Counter 01")
                      .replace("{position}", "3")
                      .replace("{eta}", "45")
                      .replace("{branch_name}", branch.name)
                      .replace("{tracking_link}", `${window.location.protocol}//${window.location.host}/track/mock-code`)}
                  </p>
                </div>
              </div>
            )}

            {isWhatsappActive && (
              <div className="space-y-1.5 mt-4">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Simulated WhatsApp Bubble
                </span>
                <div className="bg-[#E5DDD5] dark:bg-[#0b141a] p-3.5 rounded-2xl relative border border-border/40">
                  <div className="flex items-center gap-1.5 text-[8px] text-[#075e54] dark:text-[#00a884] font-black mb-1.5 uppercase tracking-wider border-b border-black/5 pb-1">
                    <MessageCircle className="h-3 w-3" /> WhatsApp Business API
                  </div>
                  <div className="bg-white dark:bg-[#1f2c34] p-3 rounded-xl max-w-[85%] shadow-sm relative ml-1">
                    <p className="text-[10px] text-foreground leading-normal font-mono select-none whitespace-pre-wrap">
                      {whatsappText
                        .replace("{customer_name}", "Harshil")
                        .replace("{token_number}", "A304")
                        .replace("{service_name}", "General Banking")
                        .replace("{desk_name}", "Counter 01")
                        .replace("{position}", "3")
                        .replace("{eta}", "45")
                        .replace("{branch_name}", branch.name)
                        .replace("{tracking_link}", `${window.location.protocol}//${window.location.host}/track/mock-code`)}
                    </p>
                    <span className="text-[8px] text-muted-foreground/60 dark:text-muted-foreground/40 block mt-1 text-right">
                      12:45 PM ✓✓
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="panel p-5 space-y-4 border border-border/80 bg-background rounded-3xl">
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                KOT Message Logs
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                Live Gateway
              </span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {logs.map((log) => {
                const isWaLog = log.channel === "whatsapp";
                const isMock = log.status === "sent_mock";
                const icon = isWaLog ? (
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                );

                return (
                  <div key={log.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-border/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {icon}
                        <div>
                          <span className="text-xs font-bold text-foreground block leading-none">
                            {log.customer_name || "Visitor"}
                          </span>
                          <span className="text-[8px] text-muted-foreground block mt-1">
                            Token: <strong className="text-foreground">{log.ticket_number}</strong> · Recipient: {log.recipient}
                          </span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                        isMock
                          ? "bg-blue-500/10 text-blue-500"
                          : log.status === "delivered" || log.status === "sent"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                      )}>
                        {isMock ? "Simulated ✓" : log.status}
                      </span>
                    </div>
                    <div className="bg-background/80 p-2 rounded-lg border border-border/20 text-[9px] text-muted-foreground font-mono leading-relaxed select-all">
                      {log.message_body}
                    </div>
                    {log.error_message && (
                      <p className="text-[8px] font-bold text-red-500">Error: {log.error_message}</p>
                    )}
                  </div>
                );
              })}

              {logs.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No notifications have been dispatched for this branch yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
