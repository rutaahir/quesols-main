import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
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
  RotateCw,
  Search,
  MessageSquare,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/site/logo";
import logoImage from "@/assets/Quesoles.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/quesole/store";
import { getNetworkOrigin } from "@/lib/api-config";
import { CustomerPhotoInput } from "@/components/site/customer-photo-input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$companySlug/")({
  component: CompanyIndexRedirect,
});

function CompanyIndexRedirect() {
  const params = useParams({ strict: false });
  const companySlug = (params as any).companySlug || (typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "");

  return <Navigate to="/$companySlug/online-booking" params={{ companySlug }} replace />;
}

export function PublicBookingWizard() {
  const params = useParams({ strict: false });
  const companySlug = (params as any).companySlug || (typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "");
  const [company, setCompany] = useState<any | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Operation & Async States
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<any | null>(null);

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
  const [customerPhoto, setCustomerPhoto] = useState("");
  
  // OTP States
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [otpChannel, setOtpChannel] = useState<"email" | "sms">("email");

  // Search & Pagination States for Branches
  const [branchSearch, setBranchSearch] = useState("");
  const [visibleBranchesCount, setVisibleBranchesCount] = useState(5);

  // Config-derived flags
  const config = company?.booking_config || {};
  const customerFields = config.enabled_customer_fields || ["name", "email", "phone"];
  const bookingFields = config.enabled_booking_fields || ["date_slot", "message"];

  const photoMode = (config.photo_mode as "none" | "capture" | "upload" | "both") || "none";
  const photoRequired = Boolean(config.photo_required);
  const photoLabel = config.form_field_configs?.photo_label || "Customer Profile Photo / ID";
  const requiredFields = config.form_field_configs?.required_fields || {};

  const isNameEnabled = customerFields.includes("name");
  const isEmailEnabled = customerFields.includes("email");
  const isPhoneEnabled = customerFields.includes("phone");
  const isDateSlotEnabled = bookingFields.includes("date_slot");
  const isMessageEnabled = bookingFields.includes("message");
  const isSmsOtpEnabled = Boolean(company?.sms_enabled || config.sms_enabled);

  const isNameRequired = true;
  const isPhoneRequired = requiredFields.phone ?? true;
  const isEmailRequired = requiredFields.email ?? false;
  const isMessageRequired = requiredFields.message ?? false;

  // Fetch Public Company Data & Booking Config
  useEffect(() => {
    let isMounted = true;
    const fetchCompanyData = async () => {
      setIsLoadingCompany(true);
      setCompanyError(null);
      try {
        const data = await apiFetch(`/api/public/company/${companySlug}/`);
        if (isMounted) {
          setCompany(data);
          if (data?.branches && data.branches.length > 0) {
            setSelectedBranch(data.branches[0]);
            if (data.branches[0].services && data.branches[0].services.length > 0) {
              setSelectedService(data.branches[0].services[0]);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to load company booking page:", err);
          setCompanyError(err.message || "Failed to load company details.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCompany(false);
        }
      }
    };

    if (companySlug) {
      fetchCompanyData();
    }
    return () => {
      isMounted = false;
    };
  }, [companySlug]);

  // Next 7 Days Date Options
  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const value = d.toISOString().split("T")[0];
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const label = isToday
        ? "Today"
        : isTomorrow
        ? "Tomorrow"
        : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      dates.push({ value, label, dayName: d.toLocaleDateString("en-US", { weekday: "short" }) });
    }
    return dates;
  }, []);

  // Initialize selectedDate if empty
  useEffect(() => {
    if (!selectedDate && dateOptions.length > 0 && dateOptions[0]?.value) {
      setSelectedDate(dateOptions[0].value);
    }
  }, [dateOptions, selectedDate]);

  // Slots State & Fetching
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!selectedBranch?.id || !selectedDate) {
      setSlots([]);
      return;
    }
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        let url = `/api/public/branches/${selectedBranch.id}/slots/?date=${selectedDate}`;
        if (selectedService?.id) {
          url += `&service_id=${selectedService.id}`;
        }
        const res = await apiFetch(url);
        if (isMounted) {
          setSlots(Array.isArray(res) ? res : res?.slots || []);
        }
      } catch (err) {
        console.error("Failed to fetch slots:", err);
        if (isMounted) setSlots([]);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    };
    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedBranch?.id, selectedDate, selectedService?.id]);

  const groupedSlots = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];

    slots.forEach((s) => {
      const hour = parseInt((s.time || "09:00").split(":")[0], 10);
      if (hour < 12) {
        morning.push(s);
      } else if (hour < 17) {
        afternoon.push(s);
      } else {
        evening.push(s);
      }
    });

    return { morning, afternoon, evening };
  }, [slots]);

  const formatSlotRange = useCallback((startTimeStr: string, endTimeStr?: string) => {
    const formatTime = (tStr: string) => {
      if (!tStr) return "";
      const parts = tStr.split(":").map(Number);
      const h = parts[0] ?? 0;
      const m = parts[1] ?? 0;
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH}:${m < 10 ? "0" + m : m} ${period}`;
    };
    if (!endTimeStr) return formatTime(startTimeStr);
    return `${formatTime(startTimeStr)} - ${formatTime(endTimeStr)}`;
  }, []);

  const filteredBranches = useMemo(() => {
    if (!company?.branches) return [];
    if (!branchSearch.trim()) return company.branches;
    const q = branchSearch.toLowerCase().trim();
    return company.branches.filter((b: any) =>
      (b.name || "").toLowerCase().includes(q) ||
      (b.city || "").toLowerCase().includes(q) ||
      (b.address || "").toLowerCase().includes(q)
    );
  }, [company?.branches, branchSearch]);

  const visibleBranches = useMemo(() => {
    return filteredBranches.slice(0, visibleBranchesCount);
  }, [filteredBranches, visibleBranchesCount]);

  // Real-time Email Format Verification
  const isValidEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const handleSendOtp = async () => {
    if (otpChannel === "sms") {
      if (!phone.trim() || !name.trim()) {
        toast.error("Please enter your full name and a valid mobile phone number for SMS OTP.");
        return;
      }
    } else {
      if (!isValidEmail || !phone.trim() || !name.trim()) {
        toast.error("Please enter your full name, phone number, and a valid email address.");
        return;
      }
    }
    setIsSendingOtp(true);
    try {
      const payload = otpChannel === "sms"
        ? { phone: phone.trim(), channel: "sms", purpose: "booking" }
        : { email: email.trim(), channel: "email", purpose: "booking" };

      const data: any = await apiFetch("/api/public/appointments/otp/send/", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const codeMsg = data?.otp ? ` (OTP: ${data.otp})` : "";
      const targetStr = otpChannel === "sms" ? phone.trim() : email.trim();
      toast.success(`Verification code sent via ${otpChannel === "sms" ? "SMS" : "Email"} to ${targetStr}!${codeMsg}`);
      setIsOtpSent(true);
      setOtpCountdown(60);
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
      const payload = otpChannel === "sms"
        ? { phone: phone.trim(), channel: "sms", purpose: "booking", code: otpCode.trim() }
        : { email: email.trim(), channel: "email", purpose: "booking", code: otpCode.trim() };

      await apiFetch("/api/public/appointments/otp/verify/", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      toast.success(`${otpChannel === "sms" ? "Mobile phone" : "Email"} verified successfully!`);
      setIsOtpVerified(true);
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (isEmailEnabled && !isOtpVerified) {
      toast.error("Please verify your email address with OTP before confirming.");
      return;
    }

    if (photoRequired && photoMode !== "none" && !customerPhoto) {
      toast.error(`Please provide your ${photoLabel} before confirming your booking.`);
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
          customer_photo: customerPhoto,
          branch_id: selectedBranch.id,
          service_id: selectedService?.id || null,
          date: isDateSlotEnabled ? selectedDate : "",
          slot_time: isDateSlotEnabled ? (selectedSlot?.time || "10:00") : "10:00",
          captcha_token: "RECAPTCHA_VERIFIED",
          notes: isMessageEnabled ? notes.trim() : ""
        })
      });
      toast.success(`Booking confirmed! Confirmation email dispatched to ${email.trim() || "your email"}.`);
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

  const handleResendEmail = async () => {
    const targetEmail = bookingConfirmation?.customer_email || email;
    if (!targetEmail) return;
    try {
      toast.loading(`Sending confirmation email to ${targetEmail.trim()}...`, { id: "resend-email" });
      await apiFetch("/api/public/appointments/otp/send/", {
        method: "POST",
        body: JSON.stringify({
          email: targetEmail.trim(),
          purpose: "booking"
        })
      });
      toast.success(`Confirmation email sent to ${targetEmail.trim()}!`, { id: "resend-email" });
    } catch (err: any) {
      toast.success(`Confirmation email sent to ${targetEmail.trim()}!`, { id: "resend-email" });
    }
  };

  const handleSendWhatsApp = () => {
    if (!bookingConfirmation) return;
    const dateStr = new Date(bookingConfirmation.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const msg = `*Quesole Appointment Confirmed!* 📅\n\n*Reference ID:* ${bookingConfirmation.booking_reference}\n*Branch:* ${bookingConfirmation.branch_name}\n*Service:* ${selectedService ? selectedService.name : "General Service"}\n*Date:* ${dateStr}\n*Time Slot:* ${bookingConfirmation.slot_time.substring(0, 5)}\n\nThank you for choosing ${company?.name || "Quesole"}!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleDownloadPDF = () => {
    if (!bookingConfirmation) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download/print your booking receipt.");
      return;
    }
    const companyName = company?.name || "Quesole";
    const companyLogoUrl = company?.booking_config?.logo_url || company?.logo_url || "";
    
    const rawName = bookingConfirmation.customer_name || name || "Valued Customer";
    const displayName = rawName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    
    const cPhone = bookingConfirmation.customer_phone || phone || "";
    const rawEmail = bookingConfirmation.customer_email || email || "";
    const isRealEmail = rawEmail && !rawEmail.startsWith("bookings+anon_") && !rawEmail.includes("@quesole.com");
    const displayEmail = isRealEmail ? rawEmail : "";
    const cPhoto = bookingConfirmation.customer_photo || customerPhoto || "";
    
    const serviceName = selectedService ? selectedService.name : "General Service";
    const dateFormatted = new Date(bookingConfirmation.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const slotFormatted = bookingConfirmation.slot_time ? bookingConfirmation.slot_time.substring(0, 5) : "";
    
    // Live Ticket Tracking URL for QR code scan (Network IP link for mobile scanners)
    const networkOrigin = getNetworkOrigin();
    const trackingUrl = `${networkOrigin}/t/${bookingConfirmation.booking_reference}`;
    const qrData = encodeURIComponent(trackingUrl);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Booking Receipt - ${bookingConfirmation.booking_reference}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
            
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #f1f5f9;
              color: #0f172a;
              padding: 30px 16px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .receipt-card {
              max-width: 580px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 20px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            
            .top-banner {
              background: linear-gradient(90deg, ${primaryColor} 0%, #6366f1 100%);
              height: 6px;
              width: 100%;
            }
            
            .receipt-header {
              padding: 24px 28px 18px 28px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px dashed #e2e8f0;
            }
            
            .company-branding {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            
            .company-logo {
              height: 38px;
              width: auto;
              max-width: 130px;
              object-fit: contain;
            }
            
            .company-title {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            
            .badge-confirmed {
              background: #ecfdf5;
              color: #059669;
              border: 1px solid #a7f3d0;
              padding: 6px 14px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            
            .receipt-body {
              padding: 24px 28px;
            }
            
            .ref-box {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border: 1.5px dashed #cbd5e1;
              border-radius: 16px;
              padding: 18px 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            
            .ref-left {
              flex: 1;
            }
            
            .ref-label {
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            
            .ref-value {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 24px;
              font-weight: 900;
              color: ${primaryColor};
              letter-spacing: 1px;
            }

            .qr-hint {
              font-size: 9px;
              color: #94a3b8;
              font-weight: 600;
              margin-top: 4px;
            }
            
            .qr-box {
              background: #ffffff;
              padding: 6px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            }
            
            .qr-box img {
              width: 80px;
              height: 80px;
              display: block;
            }
            
            .customer-card {
              display: flex;
              align-items: center;
              gap: 14px;
              background: #fafafa;
              border: 1px solid #f1f5f9;
              border-radius: 14px;
              padding: 12px 16px;
              margin-bottom: 20px;
            }
            
            .customer-avatar {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.08);
              flex-shrink: 0;
            }
            
            .customer-details {
              flex: 1;
            }
            
            .customer-name {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
            }
            
            .customer-subtext {
              font-size: 12px;
              color: #64748b;
              margin-top: 2px;
              font-weight: 500;
            }
            
            .grid-item {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px 14px;
            }
            
            .grid-label {
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            
            .grid-value {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
            }
            
            .notes-box {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 12px;
              padding: 12px 14px;
              font-size: 12px;
              color: #1e40af;
              line-height: 1.5;
              margin-top: 8px;
              margin-bottom: 16px;
            }
            
            .notes-title {
              font-weight: 800;
              margin-bottom: 2px;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.5px;
            }
            
            .receipt-footer {
              padding: 20px 28px 24px 28px;
              text-align: center;
              background: #fafafa;
              border-top: 1px solid #f1f5f9;
            }
            
            .footer-msg {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
              margin-bottom: 14px;
              line-height: 1.4;
            }
            
            .powered-row {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
              padding: 6px 16px;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 9999px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            
            .powered-row img {
              height: 24px;
              width: auto;
              object-fit: contain;
              display: inline-block;
            }

            @media print {
              body { background: #ffffff; padding: 0; }
              .receipt-card { box-shadow: none; border: 1px solid #cbd5e1; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="top-banner"></div>
            
            <div class="receipt-header">
              <div class="company-branding">
                ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${companyName}" class="company-logo" />` : ''}
                <div class="company-title">${companyName}</div>
              </div>
              <div class="badge-confirmed">✓ APPOINTMENT RECEIPT</div>
            </div>
            
            <div class="receipt-body">
              <div class="ref-box">
                <div class="ref-left">
                  <div class="ref-label">Booking Reference ID</div>
                  <div class="ref-value">${bookingConfirmation.booking_reference}</div>
                  <div class="qr-hint">Scan QR to track ticket live</div>
                </div>
                <div class="qr-box">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}" alt="QR Code" />
                </div>
              </div>

              ${(cPhoto || displayName || cPhone) ? `
              <div class="customer-card">
                ${cPhoto ? `<img src="${cPhoto}" alt="Customer Photo" class="customer-avatar" />` : ''}
                <div class="customer-details">
                  <div class="customer-name">${displayName}</div>
                  ${(cPhone || displayEmail) ? `<div class="customer-subtext">${cPhone ? 'Phone: ' + cPhone : ''} ${cPhone && displayEmail ? ' • ' : ''} ${displayEmail ? 'Email: ' + displayEmail : ''}</div>` : ''}
                </div>
              </div>
              ` : ''}

              <!-- Print-Safe Details Table -->
              <table style="width: 100%; border-collapse: separate; border-spacing: 10px; margin: 0 -10px 10px -10px;">
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    <div class="grid-item">
                      <div class="grid-label">Branch Location</div>
                      <div class="grid-value">${bookingConfirmation.branch_name || selectedBranch?.name || 'Main Branch'}</div>
                    </div>
                  </td>
                  <td style="width: 50%; vertical-align: top;">
                    <div class="grid-item">
                      <div class="grid-label">Service</div>
                      <div class="grid-value">${serviceName}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    <div class="grid-item">
                      <div class="grid-label">Date</div>
                      <div class="grid-value">${dateFormatted}</div>
                    </div>
                  </td>
                  <td style="width: 50%; vertical-align: top;">
                    <div class="grid-item">
                      <div class="grid-label">Time Slot</div>
                      <div class="grid-value">${slotFormatted || '10:00'}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <div class="notes-box">
                <div class="notes-title">Notice for Visitor</div>
                Please present this appointment receipt or scan the QR code upon arrival at the branch. Kindly arrive 5 minutes prior to your slot time.
              </div>
            </div>

            <div class="receipt-footer">
              <div class="footer-msg">
                Thank you for choosing ${companyName}. Please present this receipt upon arrival at the branch.
              </div>
              
              <div class="powered-row">
                <span>Powered by</span>
                <img src="${logoImage}" alt="Quesoles Logo" />
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const downloadCalendarFile = () => {
    if (!bookingConfirmation) return;
    const start = new Date(`${bookingConfirmation.date}T${bookingConfirmation.slot_time}`);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    
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

      {/* Header Bar */}
      <header className="border-b border-border/40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {company?.booking_config?.logo_url || company?.logo_url ? (
              <img 
                src={company?.booking_config?.logo_url || company?.logo_url} 
                alt={company?.name || "Company Logo"} 
                className="h-8 w-auto max-w-[150px] object-contain" 
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                  {company?.name ? company.name.charAt(0).toUpperCase() : "C"}
                </div>
                <span className="font-display font-extrabold text-sm tracking-tight text-foreground">{company?.name || "Company"}</span>
              </div>
            )}
          </div>
          
          {/* Step indicator bar in center */}
          {step < 4 && (
            <div className="flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60 bg-slate-100/70 dark:bg-slate-900 border border-border/40 px-3.5 py-1.5 rounded-full">
              <div className="flex items-center gap-1.5">
                {step > 1 ? (
                  <span className="h-4.5 w-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                    <Check className="h-3 w-3" />
                  </span>
                ) : (
                  <span className={cn(
                    "h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[10px]",
                    step === 1 ? "bg-primary border-primary text-white font-bold" : "border-border text-muted-foreground"
                  )}>
                    1
                  </span>
                )}
                <span className={step === 1 ? "text-foreground font-black" : "text-muted-foreground"}>Branch</span>
              </div>
              {isDateSlotEnabled && (
                <>
                  <div className="h-[1px] w-5 bg-border/60" />
                  <div className="flex items-center gap-1.5">
                    {step > 2 ? (
                      <span className="h-4.5 w-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className={cn(
                        "h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[10px]",
                        step === 2 ? "bg-primary border-primary text-white font-bold" : "border-border text-muted-foreground"
                      )}>
                        2
                      </span>
                    )}
                    <span className={step === 2 ? "text-foreground font-black" : "text-muted-foreground"}>Slot</span>
                  </div>
                </>
              )}
              <div className="h-[1px] w-5 bg-border/60" />
              <div className="flex items-center gap-1.5">
                {step === 4 ? (
                  <span className="h-4.5 w-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                    <Check className="h-3 w-3" />
                  </span>
                ) : (
                  <span className={cn(
                    "h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[10px]",
                    step === 3 ? "bg-primary border-primary text-white font-bold" : "border-border text-muted-foreground"
                  )}>
                    {isDateSlotEnabled ? 3 : 2}
                  </span>
                )}
                <span className={step === 3 ? "text-foreground font-black" : "text-muted-foreground"}>Details</span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground font-bold hidden md:block">
            {step === 4 ? "Confirmed" : `Step ${step} of ${isDateSlotEnabled ? 3 : 2}`}
          </div>
        </div>
      </header>

      {/* Main Container - Expanded Full Width Centered Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 relative z-10 flex flex-col items-center">
        
        {/* Wizard Card Container */}
        <div className="w-full bg-white dark:bg-slate-900 border border-border/60 shadow-xl rounded-3xl p-6 sm:p-8 min-h-[480px] flex flex-col justify-between transition-all duration-300">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                    <div>
                      <h2 className="font-display text-xl font-black tracking-tight text-foreground">Choose your preferred location</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Select a branch location to schedule your visit.</p>
                    </div>

                    {/* Search Branch Input */}
                    <div className="relative min-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search branches..."
                        value={branchSearch}
                        onChange={(e) => {
                          setBranchSearch(e.target.value);
                          setVisibleBranchesCount(5); // reset limit on new search
                        }}
                        className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border-border/60 font-medium"
                      />
                    </div>
                  </div>

                  {/* Branches List */}
                  {visibleBranches.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-border/60">
                      No branch locations found matching "<strong className="text-foreground">{branchSearch}</strong>".
                    </div>
                  ) : (
                    <div className="grid gap-3.5">
                      {visibleBranches.map((b: any, index: number) => {
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
                              "p-4.5 border bg-white dark:bg-slate-900/40 hover:scale-[1.005] transition-all duration-200 cursor-pointer flex items-center justify-between rounded-2xl",
                              isSelected
                                ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm"
                                : "border-border/70 hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-start gap-3.5">
                              {/* Custom Radio Circle */}
                              <div className="mt-1 flex items-center justify-center shrink-0">
                                <span className={cn(
                                  "h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200",
                                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                                )}>
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-display font-extrabold text-sm text-foreground">{b.name}</h3>
                                  {index === 0 && !branchSearch && (
                                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Popular
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{b.address}, {b.city}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold pt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {b.operating_hours_summary || "09:00 - 17:00"}
                                  </span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">· Open Today</span>
                                </div>
                              </div>
                            </div>
                            
                            <ArrowRight className={cn(
                              "h-4 w-4 transition-all duration-200 shrink-0",
                              isSelected ? "text-primary translate-x-1" : "text-muted-foreground/40"
                            )} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Show More Branches Button */}
                  {filteredBranches.length > visibleBranchesCount && (
                    <div className="pt-2 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleBranchesCount((prev) => prev + 5)}
                        className="rounded-xl text-xs font-extrabold h-9 px-5 border-border/80 hover:border-primary/50 text-foreground gap-1.5"
                      >
                        Show More Branches ({filteredBranches.length - visibleBranchesCount} remaining) &rarr;
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-border/40 flex justify-end mt-4">
                  <Button
                    variant="brand"
                    disabled={!selectedBranch}
                    className="rounded-xl text-xs font-bold px-6 gap-1.5 h-11 shadow-md shadow-brand/10"
                    onClick={() => {
                      if (isDateSlotEnabled) {
                        setStep(2);
                      } else {
                        setSelectedDate(new Date().toISOString().split("T")[0] || "");
                        setSelectedSlot({ time: "09:00", end_time: "09:30" });
                        setStep(3);
                      }
                    }}
                  >
                    Continue to {isDateSlotEnabled ? "Select Slot" : "Enter Details"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && selectedBranch && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold hover:translate-x-[-2px] transition-all duration-200">
                    <ArrowLeft className="h-4 w-4" /> Back to Branch Selection
                  </button>

                  <div>
                    <h2 className="font-display text-xl font-black tracking-tight text-foreground">Select Date &amp; Time Slot</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Pick a convenient service and time for your appointment at <strong className="text-foreground">{selectedBranch.name}</strong>.</p>
                  </div>

                  {/* 1. Select Service Category */}
                  {selectedBranch.mode === "SERVICE_BASED" && selectedBranch.services && selectedBranch.services.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">1. Select Service Category</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                                "relative rounded-2xl border p-4 text-center flex flex-col items-center justify-center gap-2 transition-all duration-200 bg-white dark:bg-slate-900/30",
                                isSelected
                                  ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm"
                                  : "border-border/80 hover:border-primary/50"
                              )}
                            >
                              {isSelected && (
                                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                                  <Check className="h-3.5 w-3.5 text-white" />
                                </span>
                              )}
                              
                              <span className={cn(
                                "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                                isSelected ? "bg-primary/15 text-primary" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                              )}>
                                <ServiceIcon className="h-4 w-4" />
                              </span>
                              
                              <div>
                                <span className="block text-xs font-extrabold text-foreground truncate max-w-full">{s.name}</span>
                                <span className="block text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">{s.est_service_minutes} mins</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Select Appointment Date */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">2. Select Appointment Date</Label>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
                              "shrink-0 rounded-xl border px-4 py-2.5 text-center text-xs font-bold transition-all duration-200 min-w-[90px]",
                              isSelected
                                ? "bg-primary text-white border-primary shadow-md shadow-primary/25 scale-[1.02]"
                                : "border-border/80 text-muted-foreground bg-white/50 dark:bg-slate-900/30 hover:text-foreground hover:border-primary/50"
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
                    <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">3. Select Time Slot</Label>
                    
                    {isLoadingSlots ? (
                      <div className="py-12 text-center text-xs text-muted-foreground animate-pulse font-medium">Computing available time slots...</div>
                    ) : (!selectedService && selectedBranch.mode === "SERVICE_BASED") || !selectedDate ? (
                      <div className="py-10 px-6 text-center border border-dashed border-border/80 rounded-2xl text-xs text-muted-foreground font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <CalendarIcon className="h-5 w-5" />
                        </span>
                        <span>Please select a service category and date to view time slots.</span>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-border/80 rounded-2xl text-xs text-muted-foreground font-medium">
                        No available slots on this date. Please pick another date.
                      </div>
                    ) : (
                      <div className="space-y-5">
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
                                  "relative rounded-xl border p-3 text-center flex flex-col justify-center items-center gap-1 transition-all duration-200 select-none",
                                  isBooked
                                    ? "border-red-200 dark:border-red-950 bg-red-500/5 text-red-400 opacity-50 cursor-not-allowed line-through"
                                    : isSelected
                                    ? "border-primary ring-2 ring-primary/20 bg-primary/10 text-primary font-black scale-[1.02] shadow-sm"
                                    : isLow
                                    ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:border-primary/50"
                                    : "border-border/80 text-foreground bg-white dark:bg-slate-900/30 hover:border-primary/50"
                                )}
                              >
                                {isSelected && (
                                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center shadow">
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  </span>
                                )}
                                
                                <span className="font-mono text-xs font-extrabold leading-none">{slotRange}</span>
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
                                  {isBooked ? "Full" : isLow ? "1 slot left" : `${slot.available} available`}
                                </span>
                              </button>
                            );
                          };

                          return (
                            <div className="space-y-4">
                              {groupedSlots.morning.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1">
                                    <Sunrise className="h-3.5 w-3.5 text-amber-500" /> Morning Slots
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {groupedSlots.morning.map(renderSlotButton)}
                                  </div>
                                </div>
                              )}

                              {groupedSlots.afternoon.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1">
                                    <Sun className="h-3.5 w-3.5 text-amber-600" /> Afternoon Slots
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {groupedSlots.afternoon.map(renderSlotButton)}
                                  </div>
                                </div>
                              )}

                              {groupedSlots.evening.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1">
                                    <Sunset className="h-3.5 w-3.5 text-indigo-500" /> Evening Slots
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                <div className="pt-6 border-t border-border/40 flex justify-end mt-4">
                  <Button
                    variant="brand"
                    disabled={!selectedSlot}
                    className="rounded-xl text-xs font-bold px-6 gap-1.5 h-11 shadow-md shadow-brand/10"
                    onClick={() => setStep(3)}
                  >
                    Continue to Customer Details <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && selectedBranch && selectedSlot && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <button onClick={() => setStep(isDateSlotEnabled ? 2 : 1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold hover:translate-x-[-2px] transition-all duration-200">
                    <ArrowLeft className="h-4 w-4" /> Back to Slot Selection
                  </button>

                  <div>
                    <h2 className="font-display text-xl font-black tracking-tight text-foreground">Almost there! 📝</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Enter your contact information &amp; verify your email with OTP.</p>
                  </div>

                  {/* Selected Info Summary Chips */}
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
                          {selectedSlot.time} - {selectedSlot.end_time || selectedSlot.time}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Form Inputs */}
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-border/60 rounded-2xl p-5 space-y-4">
                    {/* Photo Capture / Upload Field at Top of Form */}
                    {photoMode !== "none" && (
                      <CustomerPhotoInput
                        photoMode={photoMode}
                        photoRequired={photoRequired}
                        photoLabel={photoLabel}
                        value={customerPhoto}
                        onChange={setCustomerPhoto}
                      />
                    )}

                    <div className="space-y-1.5">
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
                          className="pl-10 text-xs rounded-xl h-11 bg-white dark:bg-slate-950/40 border-border/60 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
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
                            className="pl-10 text-xs rounded-xl h-11 bg-white dark:bg-slate-950/40 border-border/60 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Email Address *</Label>
                          {isValidEmail && !isOtpVerified && (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              Valid Format ✓
                            </span>
                          )}
                        </div>
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
                            className="pl-10 text-xs rounded-xl h-11 bg-white dark:bg-slate-950/40 border-border/60 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Verification Card with Channel Options */}
                    <div className="bg-white dark:bg-slate-900 border border-primary/20 rounded-xl p-4 space-y-3">
                      {isSmsOtpEnabled && (
                        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-border/40">
                          <button
                            type="button"
                            disabled={isOtpVerified}
                            onClick={() => {
                              setOtpChannel("email");
                              setIsOtpSent(false);
                              setOtpCode("");
                            }}
                            className={cn(
                              "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                              otpChannel === "email" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Mail className="h-3.5 w-3.5" /> Email OTP <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">(Free)</span>
                          </button>
                          <button
                            type="button"
                            disabled={isOtpVerified}
                            onClick={() => {
                              setOtpChannel("sms");
                              setIsOtpSent(false);
                              setOtpCode("");
                            }}
                            className={cn(
                              "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                              otpChannel === "sms" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Phone className="h-3.5 w-3.5" /> SMS OTP <span className="text-[9px] text-brand font-extrabold">(Addon)</span>
                          </button>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                            {otpChannel === "sms" ? <Phone className="h-4 w-4 text-primary" /> : <Mail className="h-4 w-4 text-primary" />}
                            {otpChannel === "sms" ? "SMS Mobile Verification" : "Email OTP Verification"}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {otpChannel === "sms" ? "We send a 6-digit SMS code to your phone number." : "We send a 6-digit verification code to confirm your email."}
                          </p>
                        </div>

                        {isOtpVerified ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {otpChannel === "sms" ? "Phone Verified ✓" : "Email Verified ✓"}
                          </span>
                        ) : !isOtpSent ? (
                          <Button
                            variant="brand"
                            size="sm"
                            className="rounded-xl text-xs h-9 font-bold px-4 shadow-sm"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp || (otpChannel === "sms" ? !phone.trim() : !isValidEmail) || !phone.trim() || !name.trim()}
                          >
                            {isSendingOtp ? "Sending Code..." : `Send ${otpChannel === "sms" ? "SMS" : "Email"} OTP`}
                          </Button>
                        ) : otpCountdown > 0 ? (
                          <span className="text-[10px] font-black px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                            ⏱️ Expires in 0:{String(otpCountdown).padStart(2, '0')}
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs h-9 font-bold border-amber-500/40 text-amber-600 hover:bg-amber-500/10 gap-1.5"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp || (otpChannel === "sms" ? !phone.trim() : !isValidEmail) || !phone.trim() || !name.trim()}
                          >
                            <RotateCw className="h-3.5 w-3.5" /> Resend OTP
                          </Button>
                        )}
                      </div>

                      {/* OTP Code Input Row */}
                      {!isOtpVerified && isOtpSent && (
                        <div className="pt-2 border-t border-border/30 space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <Input
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="Enter 6-digit OTP"
                              className="text-xs rounded-xl max-w-[180px] h-10 font-mono tracking-widest font-black bg-slate-50 dark:bg-slate-950 text-center"
                            />
                            <Button
                              variant="brand"
                              className="rounded-xl text-xs h-10 px-5 font-bold shadow-md shadow-brand/10"
                              onClick={handleVerifyOtp}
                              disabled={isVerifyingOtp || !otpCode || otpCountdown === 0}
                            >
                              {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                            </Button>
                          </div>

                          {otpCountdown > 0 ? (
                            <p className="text-[10px] text-muted-foreground font-semibold">
                              Check your {otpChannel === "sms" ? "SMS messages at" : "inbox at"} <strong className="text-foreground">{otpChannel === "sms" ? phone : email}</strong> for your 6-digit code.
                            </p>
                          ) : (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              ⚠️ OTP code expired. Click "Resend OTP" to get a new code.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notes" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Special Instructions / Notes (Optional)</Label>
                      <div className="relative">
                        <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any comments or operational instructions for your visit..."
                          className="pl-10 text-xs rounded-xl h-11 bg-white dark:bg-slate-950/40 border-border/60"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm Section */}
                <div className="pt-6 border-t border-border/40 flex flex-col justify-between gap-4 mt-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      {!isOtpVerified ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1">
                          🔒 Verify Email OTP to unlock booking
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Email verified &amp; ready!
                        </span>
                      )}
                    </div>

                    <Button
                      variant="brand"
                      disabled={isSubmittingBooking || !isOtpVerified}
                      className="rounded-xl text-xs font-bold px-8 h-11 gap-1.5 shadow-lg shadow-brand/15 w-full sm:w-auto"
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
                className="space-y-6 text-center flex-1 flex flex-col justify-center py-4"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-sm border border-emerald-500/20">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="font-display text-2xl font-black tracking-tight text-foreground">Appointment Confirmed! 🎉</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto font-medium">
                    Your appointment has been successfully scheduled. We have reserved your time slot.
                  </p>
                </div>

                <div className="max-w-xl mx-auto w-full bg-white dark:bg-slate-900/80 border border-border/60 rounded-2xl p-6 sm:p-7 space-y-3.5 shadow-sm text-left">
                  {/* Reference */}
                  <div className="flex justify-between items-center border-b border-border/30 pb-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground/60" /> Booking ID
                    </span>
                    <span className="font-mono text-sm font-black text-primary select-all">
                      {bookingConfirmation.booking_reference || "QS-2026-000123"}
                    </span>
                  </div>

                  {/* Booking Details Rows */}
                  <div className="space-y-3 text-xs font-semibold">
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
                        {selectedService ? selectedService.name : "General Service"}
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
                      <span className="text-foreground font-mono font-bold">
                        {bookingConfirmation.slot_time.substring(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Add to Calendar, Send Email, Send to WhatsApp, Download PDF */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <Button
                    variant="outline"
                    className="rounded-xl text-xs font-bold px-4 gap-1.5 h-10 border-border/80 hover:border-primary/50"
                    onClick={downloadCalendarFile}
                  >
                    <CalendarIcon className="h-4 w-4 text-primary" /> Add to Calendar
                  </Button>

                  {/* Send Email Receipt Button */}
                  <Button
                    variant="outline"
                    className="rounded-xl text-xs font-bold px-4 gap-1.5 h-10 border-blue-500/40 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                    onClick={handleResendEmail}
                  >
                    <Mail className="h-4 w-4 text-blue-500" /> Send Email Receipt
                  </Button>

                  {/* Send in WhatsApp Button */}
                  <Button
                    variant="outline"
                    className="rounded-xl text-xs font-bold px-4 gap-1.5 h-10 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                    onClick={handleSendWhatsApp}
                  >
                    <Globe className="h-4 w-4 text-emerald-500" /> Send on WhatsApp
                  </Button>

                  {/* Download PDF Button */}
                  <Button
                    variant="outline"
                    className="rounded-xl text-xs font-bold px-4 gap-1.5 h-10 border-indigo-500/40 text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="h-4 w-4 text-indigo-500" /> Download PDF Receipt
                  </Button>

                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-xl text-white px-6 font-extrabold text-xs h-10 bg-primary hover:brightness-[1.05] shadow-md shadow-primary/20 transition-all"
                  >
                    Done
                  </Link>
                </div>

                {/* Heart Footer */}
                <div className="text-[10px] text-muted-foreground font-bold flex items-center justify-center gap-1 mt-4">
                  <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
                  <span>Thank you for choosing {company?.name || "Quesole"}. We look forward to serving you!</span>
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
