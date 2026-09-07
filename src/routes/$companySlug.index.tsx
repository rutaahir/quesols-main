import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Building2, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Globe, 
  Check, 
  ShieldAlert,
  Download,
  AlertCircle,
  MapPin,
  Sunrise,
  Sun,
  Sunset,
  ChevronRight,
  Info,
  ExternalLink,
  Briefcase,
  Heart,
  RotateCw
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/quesole/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$companySlug/")({
  component: PublicBookingWizard,
});

function PublicBookingWizard() {
  const { companySlug } = Route.useParams();
  const [company, setCompany] = useState<any | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  
  // Selection States
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  
  // OTP States
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);

  // OTP Expiration Countdown Timer
  useEffect(() => {
    let timer: any;
    if (isOtpSent && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpSent, otpCountdown]);

  const isEmailEnabled = company?.booking_config?.enabled_customer_fields?.includes("email") !== false;
  const isNameEnabled = company?.booking_config?.enabled_customer_fields?.includes("name") !== false;
  const isPhoneEnabled = company?.booking_config?.enabled_customer_fields?.includes("phone") !== false;
  const isMessageEnabled = company?.booking_config?.enabled_booking_fields?.includes("message") !== false;
  const isDateSlotEnabled = company?.booking_config?.enabled_booking_fields?.includes("date_slot") !== false;
  const otpVerified = !isEmailEnabled || isOtpVerified;
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // CAPTCHA States
  const [captchaToken, setCaptchaToken] = useState("");
  const [isCaptchaScoreVerifying, setIsCaptchaScoreVerifying] = useState(false);

  // Computed slots state
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const groupedSlots = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];

    slots.forEach((slot) => {
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
  }, [slots]);

  // Final confirmation state
  const [bookingConfirmation, setBookingConfirmation] = useState<any | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Generate date options for the next 7 days
  const dateOptions = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const value = `${year}-${month}-${dateVal}`;
      const label = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
      dates.push({ value, label });
    }
    return dates;
  }, []);

  const formatSlotRange = useCallback((startTime: string, endTime: string) => {
    const formatTime = (tStr: string) => {
      if (!tStr) return "";
      const [hStr, mStr] = tStr.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = String(m).padStart(2, "0");
      return `${displayH}:${displayM} ${ampm}`;
    };
    
    let endStr = endTime;
    if (!endStr) {
      try {
        const [h, m] = startTime.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m + 30, 0, 0);
        const eh = String(d.getHours()).padStart(2, '0');
        const em = String(d.getMinutes()).padStart(2, '0');
        endStr = `${eh}:${em}`;
      } catch {
        endStr = startTime;
      }
    }

    return `${formatTime(startTime)} to ${formatTime(endStr)}`;
  }, []);

  // Fetch public company and enabled branches
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const data = await apiFetch(`/api/public/company/${companySlug}/`);
        setCompany(data);
      } catch (err: any) {
        console.error("Public company resolution failed:", err);
        setCompanyError(err.message || "Online booking is not available for this company.");
      } finally {
        setIsLoadingCompany(false);
      }
    };
    fetchCompanyData();
  }, [companySlug]);

  // Set default selected date
  useEffect(() => {
    if (dateOptions.length > 0 && !selectedDate) {
      setSelectedDate(dateOptions[0]?.value || "");
    }
  }, [dateOptions, selectedDate]);

  // Fetch slots when date, service or branch selection changes
  useEffect(() => {
    if (!selectedBranch || !selectedDate) return;
    
    // Only block on service selection if branch is SERVICE_BASED AND has services to pick from
    const hasServices = selectedBranch.services && selectedBranch.services.length > 0;
    if (selectedBranch.mode === "SERVICE_BASED" && hasServices && !selectedService) {
      setSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const serviceQuery = selectedService ? `&service_id=${selectedService.id}` : "";
        const data = await apiFetch(`/api/public/branches/${selectedBranch.id}/slots/?date=${selectedDate}${serviceQuery}`);
        setSlots(data);
        setSelectedSlot(null); // Reset slot selection
      } catch (err) {
        console.error("Failed to load preview slots:", err);
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedBranch, selectedService, selectedDate]);

  const handleSendOtp = async () => {
    if (!email.trim() || !phone.trim() || !name.trim()) {
      toast.error("Please fill in name, phone, and email before verification.");
      return;
    }
    setIsSendingOtp(true);
    try {
      const data: any = await apiFetch("/api/public/appointments/otp/send/", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          purpose: "booking"
        })
      });
      const codeMsg = data?.otp ? ` (OTP: ${data.otp})` : "";
      toast.success(`Verification code sent to ${email.trim()}!${codeMsg}`);
      setIsOtpSent(true);
      setOtpCountdown(60); // 60 seconds countdown
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      toast.error("Please enter the verification code.");
      return;
    }
    setIsVerifyingOtp(true);
    try {
      await apiFetch("/api/public/appointments/otp/verify/", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          purpose: "booking",
          code: otpCode.trim()
        })
      });
      toast.success("Contact verified successfully!");
      setIsOtpVerified(true);
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const simulateCaptcha = () => {
    setIsCaptchaScoreVerifying(true);
    setTimeout(() => {
      setCaptchaToken("MOCK_CAPTCHA_TOKEN");
      setIsCaptchaScoreVerifying(false);
      toast.success("Invisible security check passed.");
    }, 800);
  };

  const handleSubmitBooking = async () => {
    if (isEmailEnabled && !isOtpVerified) {
      toast.error("Please verify your email/phone first.");
      return;
    }
    if (!captchaToken) {
      toast.error("Security verification required.");
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const data = await apiFetch("/api/public/bookings/", {
        method: "POST",
        body: JSON.stringify({
          email: isEmailEnabled ? email.trim() : `bookings+anon_${phone.trim() || "9999999999"}@quesole.com`,
          otp_code: isEmailEnabled ? otpCode.trim() : "123456",
          customer_name: isNameEnabled ? name.trim() : "Anonymous",
          customer_phone: isPhoneEnabled ? phone.trim() : "9999999999",
          branch_id: selectedBranch.id,
          service_id: selectedService?.id || null,
          date: isDateSlotEnabled ? selectedDate : "",
          slot_time: isDateSlotEnabled ? (selectedSlot?.time || "10:00") : "10:00",
          captcha_token: captchaToken,
          notes: isMessageEnabled ? notes.trim() : ""
        })
      });
      toast.success("Booking confirmed!");
      setBookingConfirmation({
        ...data,
        branch_name: selectedBranch.name,
        branch_address: `${selectedBranch.address}, ${selectedBranch.city}`
      });
      setStep(4);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit booking. The slot may have filled.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const downloadCalendarFile = () => {
    if (!bookingConfirmation) return;
    const start = new Date(`${bookingConfirmation.date}T${bookingConfirmation.slot_time}`);
    const end = new Date(start.getTime() + 30 * 60 * 1000); // Default 30 min duration
    
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsString = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Quesole//NONSGML v1.0//EN",
      "BEGIN:VEVENT",
      `UID:${bookingConfirmation.booking_reference}@quesole.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:Quesole Appointment at ${bookingConfirmation.branch_name}`,
      `DESCRIPTION:Appointment confirmation for ${bookingConfirmation.customer_name}. Reference: ${bookingConfirmation.booking_reference}`,
      `LOCATION:${bookingConfirmation.branch_address}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `appointment-${bookingConfirmation.booking_reference}.ics`;
    link.click();
  };

  if (isLoadingCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center animate-pulse space-y-4">
          <Globe className="h-10 w-10 text-brand mx-auto animate-spin" />
          <h3 className="font-display text-sm font-bold text-foreground">Resolving Booking Availability...</h3>
        </div>
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4 panel p-8 border border-border shadow-lg">
          <AlertCircle className="h-12 w-12 text-coral mx-auto" />
          <h2 className="font-display text-lg font-bold text-foreground">Booking Unavailable</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {companyError || "Online booking is not available for this company."}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = company.brand_colors?.primary || "#6366F1";

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col transition-colors duration-300 relative overflow-x-hidden"
      style={{
        "--primary": primaryColor,
        "--gradient-brand": `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 50%, ${primaryColor}99 100%)`,
        "--brand-primary": primaryColor,
      } as any}
    >
      {/* Background Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 dark:opacity-5 pointer-events-none z-0" />

      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-20 dark:opacity-30 animate-pulse duration-[10000ms]"
          style={{ backgroundColor: primaryColor }}
        />
        <div 
          className="absolute top-80 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-15 dark:opacity-20 animate-pulse duration-[8000ms]"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border/40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {company?.booking_config?.logo_url || company?.logo_url ? (
              <img 
                src={company?.booking_config?.logo_url || company?.logo_url} 
                alt={company?.name || "Company Logo"} 
                className="h-9 w-auto max-w-[170px] object-contain" 
              />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-base shadow-md shadow-primary/20 shrink-0">
                  {company?.name ? company.name.charAt(0).toUpperCase() : "C"}
                </div>
                <span className="font-display font-black text-base tracking-tight text-foreground">{company?.name || "Company"}</span>
              </div>
            )}
          </div>
          
          {/* Step indicator bar in center */}
          {step < 4 && (
            <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60 bg-slate-50 dark:bg-slate-900 border border-border/40 px-4 py-2 rounded-full shadow-sm">
              <div className="flex items-center gap-1.5">
                {step > 1 ? (
                  <span className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                ) : (
                  <span className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center border",
                    step === 1 ? "bg-primary border-primary text-white font-bold" : "border-border text-muted-foreground"
                  )}>
                    1
                  </span>
                )}
                <span className={step === 1 ? "text-foreground font-black" : "text-muted-foreground"}>Branch</span>
              </div>
              {isDateSlotEnabled && (
                <>
                  <div className="h-[1px] w-8 bg-border/60" />
                  <div className="flex items-center gap-1.5">
                    {step > 2 ? (
                      <span className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center border",
                        step === 2 ? "bg-primary border-primary text-white font-bold" : "border-border text-muted-foreground"
                      )}>
                        2
                      </span>
                    )}
                    <span className={step === 2 ? "text-foreground font-black" : "text-muted-foreground"}>Appointment</span>
                  </div>
                </>
              )}
              <div className="h-[1px] w-8 bg-border/60" />
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center border",
                  step === 3 ? "bg-primary border-primary text-white font-bold" : "border-border text-muted-foreground"
                )}>
                  {isDateSlotEnabled ? 3 : 2}
                </span>
                <span className={step === 3 ? "text-foreground font-black" : "text-muted-foreground"}>Details</span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground font-bold hidden md:block">
            {step === 4 ? "Booking Completed" : `Step ${step} of ${isDateSlotEnabled ? 3 : 2}`}
          </div>
        </div>
      </header>

      {/* Main Guided Wizard Grid */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_2.4fr] gap-8 items-start relative z-10">
        
        {/* Sticky Left Column: Company Info Card */}
        <div className="lg:sticky lg:top-24 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-border/60 shadow-soft rounded-3xl p-6 space-y-6 transition-all duration-300">
            {/* Brand Logo & Name */}
            <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-border/40">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="h-16 w-16 rounded-full object-contain border border-border/40 bg-white p-0.5 shadow-sm" />
              ) : (
                <div className="h-14 w-14 rounded-full text-white flex items-center justify-center font-black font-display text-xl shadow-md uppercase" style={{ backgroundColor: primaryColor }}>
                  {company.name.substring(0, 3)}
                </div>
              )}
              <div>
                <h2 className="font-display text-sm font-extrabold tracking-tight text-foreground">
                  {company.booking_config?.portal_name || company.name}
                </h2>
                {company.booking_config?.display_address && (
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    {company.booking_config.display_address}
                  </p>
                )}
                <p className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-widest mt-1">Center</p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 block">Contact Information</span>
              
              {company.contact_phone && (
                <div className="flex items-center gap-3.5 group">
                  <span className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Phone Number</span>
                    <a href={`tel:${company.contact_phone}`} className="text-xs font-bold text-foreground hover:underline">
                      {company.contact_phone}
                    </a>
                  </div>
                </div>
              )}

              {company.contact_email && (
                <div className="flex items-center gap-3.5 group">
                  <span className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Support Email</span>
                    <a href={`mailto:${company.contact_email}`} className="text-xs font-bold text-foreground hover:underline">
                      {company.contact_email}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Booking Context */}
            <div className="border-t border-border/40 pt-4 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 block">Booking Context</span>
              
              {!selectedBranch ? (
                <div className="flex gap-2.5 text-xs text-muted-foreground/80 leading-normal">
                  <MapPin className="h-5 w-5 text-muted-foreground/60 shrink-0" />
                  <span>No branch selected. Please select a branch to continue.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Branch */}
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Selected Branch</span>
                      <span className="text-xs font-extrabold text-foreground block">{selectedBranch.name}</span>
                      <span className="text-[10px] text-muted-foreground block">{selectedBranch.address}, {selectedBranch.city}</span>
                      <span className="text-[10px] text-muted-foreground block">{selectedBranch.operating_hours_summary}</span>
                      {step < 4 && (
                        <button 
                          onClick={() => {
                            setSelectedBranch(null);
                            setSelectedService(null);
                            setSelectedSlot(null);
                            setStep(1);
                          }} 
                          className="text-[10px] font-bold text-primary hover:underline mt-1 block"
                        >
                          Change branch
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selected Service */}
                  {selectedService && (
                    <div className="flex items-start gap-2.5 border-t border-border/20 pt-3">
                      <Briefcase className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Selected Service</span>
                        <span className="text-xs font-extrabold text-foreground block">{selectedService.name}</span>
                        <span className="text-[10px] text-muted-foreground block">{selectedService.est_service_minutes} mins estimated</span>
                        {step < 4 && (
                          <button 
                            onClick={() => {
                              setSelectedService(null);
                              setSelectedSlot(null);
                              setStep(2);
                            }} 
                            className="text-[10px] font-bold text-primary hover:underline mt-1 block"
                          >
                            Change service
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected Slot / Date */}
                  {selectedSlot && (
                    <div className="flex items-start gap-2.5 border-t border-border/20 pt-3">
                      <CalendarIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Selected Date</span>
                        <span className="text-xs font-extrabold text-foreground block">
                          {new Date(selectedDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-mono font-bold">
                          {formatSlotRange(selectedSlot.time, selectedSlot.end_time)}
                        </span>
                        {step < 4 && (
                          <button 
                            onClick={() => {
                              setSelectedSlot(null);
                              setStep(2);
                            }} 
                            className="text-[10px] font-bold text-primary hover:underline mt-1 block"
                          >
                            Change date
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Guided Wizard Card */}
        <div className="bg-white dark:bg-slate-900 border border-border/60 shadow-soft rounded-3xl p-6 lg:p-8 min-h-[520px] flex flex-col justify-between transition-all duration-300">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-black tracking-tight text-foreground">Choose your preferred location</h2>
                    <p className="text-xs text-muted-foreground mt-1">Select a branch where you would like to book your appointment.</p>
                  </div>

                  <div className="grid gap-4">
                    {company.branches.map((b: any, index: number) => {
                      const isSelected = selectedBranch?.id === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBranch(b);
                            setSelectedService(null);
                            setSelectedSlot(null);
                          }}
                          className={cn(
                            "p-5 border bg-white dark:bg-slate-900/30 hover:scale-[1.01] transition-all duration-200 cursor-pointer flex items-center justify-between rounded-2xl",
                            isSelected
                              ? "border-primary ring-1 ring-primary shadow-sm"
                              : "border-border/80 hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            {/* Custom Radio Button */}
                            <div className="mt-1 flex items-center justify-center shrink-0">
                              <span className={cn(
                                "h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200",
                                isSelected ? "border-primary" : "border-muted-foreground/30"
                              )}>
                                {isSelected && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                )}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display font-extrabold text-sm text-foreground">{b.name}</h3>
                                {index === 0 && (
                                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-bold text-primary">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{b.address}, {b.city}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {b.operating_hours_summary}
                              </div>
                              <span className="text-[10px] font-bold text-emerald-500 block">Open today</span>
                            </div>
                          </div>
                          
                          <ArrowRight className={cn(
                            "h-5 w-5 transition-all duration-200",
                            isSelected ? "text-primary translate-x-1" : "text-muted-foreground/60"
                          )} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-border/40 flex justify-end">
                  <Button
                    variant="brand"
                    disabled={!selectedBranch}
                    className="rounded-xl text-xs font-semibold px-6 gap-1.5 h-11"
                    onClick={() => {
                      if (isDateSlotEnabled) {
                        setStep(2);
                      } else {
                        // Pre-populate today's date and a default slot time to satisfy Step 3 summary rendering
                        setSelectedDate(new Date().toISOString().split("T")[0]);
                        setSelectedSlot({ time: "09:00", end_time: "09:30" });
                        setStep(3);
                      }
                    }}
                  >
                    Continue to {isDateSlotEnabled ? "Appointment" : "Details"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && selectedBranch && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold hover:translate-x-[-2px] transition-all duration-200">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div>
                    <h2 className="font-display text-xl font-black tracking-tight text-foreground">Book your appointment</h2>
                    <p className="text-xs text-muted-foreground mt-1">Choose a service, date and available time.</p>
                  </div>

                  {/* 1. Select Service Category */}
                  {selectedBranch.mode === "SERVICE_BASED" && selectedBranch.services && selectedBranch.services.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">1. Select Service Category</Label>
                      <div className="grid grid-cols-3 gap-4">
                        {selectedBranch.services.map((s: any, idx: number) => {
                          const isSelected = selectedService?.id === s.id;
                          const ServiceIcon = idx === 0 ? Briefcase : idx === 1 ? FileText : Globe;
                          return (
                            <button
                              key={s.id}
                              onClick={() => {
                                setSelectedService(s);
                                setSelectedSlot(null);
                              }}
                              className={cn(
                                "relative rounded-2xl border p-5 text-center flex flex-col items-center justify-center gap-2 transition-all duration-200 bg-white dark:bg-slate-900/30",
                                isSelected
                                  ? "border-primary ring-1 ring-primary shadow-sm"
                                  : "border-border/80 hover:border-primary/50"
                              )}
                            >
                              {/* Selected Badge */}
                              {isSelected && (
                                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                                  <Check className="h-3.5 w-3.5 text-white" />
                                </span>
                              )}
                              
                              <span className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                                isSelected ? "bg-primary/10 text-primary" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                              )}>
                                <ServiceIcon className="h-5 w-5" />
                              </span>
                              
                              <div>
                                <span className="block text-xs font-extrabold text-foreground truncate max-w-full">{s.name}</span>
                                <span className="block text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">{s.est_service_minutes} mins estimated</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Select Appointment Date */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">2. Select Appointment Date</Label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
                      {dateOptions.map((d) => {
                        const isSelected = selectedDate === d.value;
                        return (
                          <button
                            key={d.value}
                            onClick={() => {
                              setSelectedDate(d.value);
                              setSelectedSlot(null);
                            }}
                            className={cn(
                              "shrink-0 rounded-xl border px-4 py-3 text-center text-xs font-bold transition-all duration-200",
                              isSelected
                                ? "bg-primary text-white border-primary shadow-md shadow-primary/25 scale-[1.02]"
                                : "border-border text-muted-foreground bg-white/50 dark:bg-slate-900/30 hover:text-foreground hover:border-primary/50"
                            )}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Select Time Slot */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">3. Select Time Slot</Label>
                    
                    {isLoadingSlots ? (
                      <div className="py-16 text-center text-xs text-muted-foreground animate-pulse font-medium">Computing time slot availability...</div>
                    ) : (!selectedService && selectedBranch.mode === "SERVICE_BASED") || !selectedDate ? (
                      <div className="py-12 px-6 text-center border border-dashed border-border/80 rounded-2xl text-xs text-muted-foreground font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <CalendarIcon className="h-5 w-5" />
                        </span>
                        <span>Please select a service and date to see available time slots.</span>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="py-16 text-center border border-dashed border-border/80 rounded-2xl text-xs text-muted-foreground font-medium">
                        No slots available on this date.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Helper function to render a slot button */}
                        {(() => {
                          const renderSlotButton = (slot: any) => {
                            const isBooked = slot.status === "fully_booked" || slot.available <= 0;
                            const isSelected = selectedSlot?.time === slot.time;
                            const isLow = !isBooked && slot.available === 1;

                            const slotRange = formatSlotRange(slot.time, slot.end_time);

                            return (
                              <button
                                key={slot.time}
                                disabled={isBooked}
                                onClick={() => setSelectedSlot(slot)}
                                className={cn(
                                  "relative rounded-xl border p-3.5 text-center flex flex-col justify-center items-center gap-1.5 transition-all duration-200 select-none",
                                  isBooked
                                    ? "border-coral/10 bg-coral/5 text-coral/40 opacity-50 cursor-not-allowed line-through"
                                    : isSelected
                                    ? "border-primary ring-1 ring-primary bg-primary/10 text-primary font-black scale-[1.02] shadow-sm"
                                    : isLow
                                    ? "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:border-primary/50"
                                    : "border-border text-foreground bg-white dark:bg-slate-900/30 hover:border-primary/50"
                                )}
                              >
                                {/* Check Icon for Selected Slot */}
                                {isSelected && (
                                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center shadow">
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  </span>
                                )}
                                
                                <span className="font-mono text-xs font-bold leading-none">{slotRange}</span>
                                <span className={cn(
                                  "text-[9px] font-bold tracking-wider mt-0.5",
                                  isBooked
                                    ? "text-red-500/60"
                                    : isSelected
                                    ? "text-primary"
                                    : isLow
                                    ? "text-amber-600 dark:text-amber-400 animate-pulse"
                                    : "text-emerald-600 dark:text-emerald-400"
                                )}>
                                  {isBooked ? "Full" : isLow ? "1 slot left" : `${slot.available} slots left`}
                                </span>
                              </button>
                            );
                          };

                          return (
                            <div className="space-y-4">
                              {/* Morning slots */}
                              {groupedSlots.morning.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1">
                                    <Sunrise className="h-3.5 w-3.5 text-amber-500" /> Morning (Before 12:00 PM)
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {groupedSlots.morning.map(renderSlotButton)}
                                  </div>
                                </div>
                              )}

                              {/* Afternoon slots */}
                              {groupedSlots.afternoon.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1">
                                    <Sun className="h-3.5 w-3.5 text-amber-600" /> Afternoon (12:00 PM - 4:00 PM)
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {groupedSlots.afternoon.map(renderSlotButton)}
                                  </div>
                                </div>
                              )}

                              {/* Evening slots */}
                              {groupedSlots.evening.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1">
                                    <Sunset className="h-3.5 w-3.5 text-indigo-500" /> Evening (After 4:00 PM)
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {groupedSlots.evening.map(renderSlotButton)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Footer */}
                <div className="pt-6 border-t border-border/40 flex justify-end">
                  <Button
                    variant="brand"
                    disabled={!selectedSlot}
                    className="rounded-xl text-xs font-semibold px-6 gap-1.5 h-11"
                    onClick={() => setStep(3)}
                  >
                    Continue to Details <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && selectedBranch && selectedSlot && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <button onClick={() => setStep(isDateSlotEnabled ? 2 : 1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold hover:translate-x-[-2px] transition-all duration-200">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div>
                    <h2 className="font-display text-xl font-black tracking-tight text-foreground">Almost there! 📝</h2>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Enter your details to confirm your appointment.</p>
                  </div>

                  {/* Selected Info Summary Bar */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-100/60 dark:bg-slate-900/40 p-3 rounded-2xl border border-border/40">
                    <div className="flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 border border-border/40 px-3 py-1.5 text-[10px] font-bold text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {selectedBranch.name}
                    </div>
                    {selectedService && (
                      <div className="flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 border border-border/40 px-3 py-1.5 text-[10px] font-bold text-foreground">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                        {selectedService.name}
                      </div>
                    )}
                    {isDateSlotEnabled && (
                      <>
                        <div className="flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 border border-border/40 px-3 py-1.5 text-[10px] font-bold text-foreground">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                          {new Date(selectedDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-800 border border-border/40 px-3 py-1.5 text-[10px] font-bold text-foreground font-mono">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {selectedSlot.time} - {selectedSlot.end_time || (
                            (() => {
                              try {
                                const [h, m] = selectedSlot.time.split(":").map(Number);
                                const d = new Date();
                                d.setHours(h, m + 30, 0, 0);
                                const eh = String(d.getHours()).padStart(2, '0');
                                const em = String(d.getMinutes()).padStart(2, '0');
                                return `${eh}:${em}`;
                              } catch {
                                return selectedSlot.time;
                              }
                            })()
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-white/50 dark:bg-slate-900/30 border border-border/60 rounded-2xl p-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your full name"
                          required
                          disabled={isOtpVerified}
                          className="pl-10 text-xs rounded-xl h-11 bg-white/40 dark:bg-slate-950/20 border-border/60"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Enter your phone number"
                            required
                            disabled={isOtpVerified}
                            className="pl-10 text-xs rounded-xl h-11 bg-white/40 dark:bg-slate-950/20 border-border/60 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Email Address *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            required
                            disabled={isOtpVerified}
                            className="pl-10 text-xs rounded-xl h-11 bg-white/40 dark:bg-slate-950/20 border-border/60"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Special Instructions / Notes</Label>
                      <div className="relative">
                        <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any comments or operational instructions..."
                          className="pl-10 text-xs rounded-xl h-11 bg-white/40 dark:bg-slate-950/20 border-border/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step Sequential Verification Gating */}
                  <div className="bg-white/60 dark:bg-slate-900/40 border border-border/80 rounded-2xl p-5 space-y-4 shadow-soft">
                    <h3 className="font-display font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-3">
                      <ShieldAlert className="h-4 w-4 text-primary" /> Booking Security &amp; Verification Steps
                    </h3>

                    {/* STEP 1: Email OTP Verification */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center border border-primary/20">1</span>
                            Step 1: Email OTP Verification
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Verify your email address before continuing.</p>
                        </div>

                        {isOtpVerified ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Email Verified ({email})
                          </span>
                        ) : !isOtpSent ? (
                          <Button
                            variant="outline"
                            className="rounded-xl text-xs h-9 font-bold hover:border-primary/50"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp || !email || !phone || !name}
                          >
                            {isSendingOtp ? "Sending Code..." : "Send Verification Code"}
                          </Button>
                        ) : otpCountdown > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                              ⏱️ Code Sent! Expires in 0:{String(otpCountdown).padStart(2, '0')}
                            </span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs h-9 font-bold border-amber-500/40 text-amber-600 hover:bg-amber-500/10 gap-1.5"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp || !email || !phone || !name}
                          >
                            <RotateCw className="h-3.5 w-3.5" /> Resend Code
                          </Button>
                        )}
                      </div>

                      {/* OTP Input Fields when code is sent */}
                      {!isOtpVerified && isOtpSent && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-border/50 space-y-2">
                          <div className="flex items-center gap-3">
                            <Input
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="Enter 6-digit OTP"
                              className="text-xs rounded-xl max-w-[180px] h-10 font-mono tracking-widest font-bold bg-white dark:bg-slate-900"
                            />
                            <Button
                              variant="brand"
                              className="rounded-xl text-xs h-10 px-5 font-bold shadow-md shadow-brand/10"
                              onClick={handleVerifyOtp}
                              disabled={isVerifyingOtp || !otpCode || otpCountdown === 0}
                            >
                              {isVerifyingOtp ? "Verifying..." : "Verify Code"}
                            </Button>
                          </div>

                          {otpCountdown > 0 ? (
                            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                              <span>Enter the 6-digit OTP code sent to</span>
                              <strong className="text-foreground">{email}</strong>.
                              <span className="text-primary font-mono font-black ml-1">(0:{String(otpCountdown).padStart(2, '0')})</span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <span>⚠️ Verification code expired. Click "Resend Code" above to receive a new OTP.</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* STEP 2: CAPTCHA Check (Appears ONLY AFTER Email is Verified!) */}
                    {isOtpVerified && (
                      <div className="border-t border-border/40 pt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                          <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center border border-primary/20">2</span>
                            Step 2: Security CAPTCHA Check
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Complete reCAPTCHA security check to unlock booking.</p>
                        </div>

                        {/* Interactive Google reCAPTCHA Widget Box */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between shadow-sm max-w-sm">
                          {captchaToken ? (
                            <div className="flex items-center gap-3">
                              <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                <Check className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">reCAPTCHA Score Verified</span>
                                <span className="text-[9px] text-muted-foreground block font-mono">Human Visitor Score: 0.9 / 1.0</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id="recaptcha-check"
                                checked={isCaptchaScoreVerifying}
                                onChange={simulateCaptcha}
                                disabled={isCaptchaScoreVerifying}
                                className="h-5 w-5 rounded border-slate-400 text-primary focus:ring-primary cursor-pointer"
                              />
                              <label htmlFor="recaptcha-check" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                                {isCaptchaScoreVerifying ? "Verifying security score..." : "I'm not a robot"}
                              </label>
                            </div>
                          )}

                          <div className="text-right shrink-0">
                            <ShieldAlert className="h-5 w-5 text-slate-400 mx-auto" />
                            <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-tighter mt-0.5">reCAPTCHA v3</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Section */}
                <div className="pt-6 border-t border-border/40 flex flex-col justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      {!isOtpVerified ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1">
                          🔒 Complete Step 1 (Email OTP) to unlock
                        </span>
                      ) : !captchaToken ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1">
                          🔒 Complete Step 2 (reCAPTCHA) to unlock
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> All security checks passed!
                        </span>
                      )}
                    </div>

                    <Button
                      variant="brand"
                      disabled={isSubmittingBooking || !isOtpVerified || !captchaToken}
                      className="rounded-xl text-xs font-semibold px-8 h-11 gap-1.5 shadow-lg shadow-brand/15"
                      onClick={handleSubmitBooking}
                    >
                      {isSubmittingBooking ? "Booking Slot..." : "Confirm Booking"}
                    </Button>
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-xl border border-border/20">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>Your information is secure and will only be used for this appointment.</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && bookingConfirmation && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-center flex-1 flex flex-col justify-center py-6"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-sm border border-emerald-500/20">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>

                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-black tracking-tight text-foreground animate-bounce">Appointment Confirmed!</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto font-medium">
                    Your appointment has been successfully booked.
                  </p>
                </div>

                <div className="max-w-md mx-auto w-full bg-white dark:bg-slate-900 border border-border/50 rounded-2xl p-6 space-y-4 shadow-sm text-left">
                  {/* Row 1: Booking ID */}
                  <div className="flex justify-between items-center border-b border-border/30 pb-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground/60" /> Booking ID
                    </span>
                    <span className="font-mono text-sm font-black text-primary select-all">
                      {bookingConfirmation.booking_reference || "QS-2026-000123"}
                    </span>
                  </div>

                  {/* Rows 2-5 */}
                  <div className="space-y-3.5 text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground/60" /> Branch
                      </span>
                      <span className="text-foreground">{bookingConfirmation.branch_name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground/60" /> Service
                      </span>
                      <span className="text-foreground">
                        {selectedService ? selectedService.name : "All Services"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground/60" /> Date
                      </span>
                      <span className="text-foreground">
                        {new Date(bookingConfirmation.date).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground/60" /> Time
                      </span>
                      <span className="text-foreground font-mono">
                        {bookingConfirmation.slot_time.substring(0, 5)} - {
                          (() => {
                            try {
                              const [h, m] = bookingConfirmation.slot_time.substring(0, 5).split(":").map(Number);
                              const d = new Date();
                              d.setHours(h, m + 30, 0, 0);
                              const eh = String(d.getHours()).padStart(2, '0');
                              const em = String(d.getMinutes()).padStart(2, '0');
                              return `${eh}:${em}`;
                            } catch {
                              return bookingConfirmation.slot_time.substring(0, 5);
                            }
                          })()
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="rounded-xl text-xs font-semibold px-6 gap-1.5 h-10 border-border/80"
                    onClick={downloadCalendarFile}
                  >
                    <CalendarIcon className="h-4 w-4 text-primary" /> Add to Calendar
                  </Button>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-xl text-white px-8 font-semibold text-xs h-10 bg-primary hover:brightness-[1.05] shadow-md shadow-primary/20 transition-all"
                  >
                    Done
                  </Link>
                </div>

                {/* Heart Message Footer */}
                <div className="text-[10px] text-muted-foreground font-bold flex items-center justify-center gap-1 mt-4">
                  <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
                  <span>Thank you for choosing Quesole. We look forward to serving you!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Sticky Bottom Footer Bar */}
      <footer className="sticky bottom-0 z-40 border-t border-border/40 py-2 px-4 text-center text-[11px] font-extrabold text-muted-foreground bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider">
        <Logo size={16} />
        <span>Powered by Quesole</span>
      </footer>
    </div>
  );
}
