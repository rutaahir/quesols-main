import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Building,
  Layers,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldAlert,
  MapPin,
  Map,
  Phone,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Globe,
  Loader2,
  ShieldCheck,
  RotateCw,
  Check,
  FileText,
  Download,
  Sparkles,
  Clock,
  Circle,
  Calendar,
  Receipt,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { useQuesole } from "@/lib/quesole/store";
import { getApiUrl } from "@/lib/api-config";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BillingPlanConfigurator } from "@/components/console/billing-plan-configurator";
import { generateAndDownloadInvoicePDF } from "@/lib/quesole/invoice-pdf";
import { AnimatedAuthBackground } from "@/components/auth/animated-auth-background";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, PHONE_COUNTRY_CODES } from "@/lib/location-data";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Register your company — Itemized Plan Builder | Quesole" },
      {
        name: "description",
        content: "Configure your custom queue management plan with itemized components and start immediately.",
      },
    ],
  }),
  component: SignupPage,
});

const INDUSTRIES = [
  "Healthcare",
  "Banking & Finance",
  "Government",
  "Retail & Service",
  "Education",
  "Telecom",
  "Corporate Office",
  "Other",
];

interface Form {
  company: string;
  industry: string;
  otherIndustry: string;
  country: string;
  state: string;
  city: string;
  customCity: string;
  address: string;
  website: string;
  hp_field: string;
  adminName: string;
  email: string;
  password: string;
  confirmPassword: string;
  captchaInput: string;
  countryCode: string;
  phone: string;
  cardName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  simulateFailure: boolean;
  durationMonths?: number;
  solution?: string;
  branches?: any[];
}

interface FormInputFieldProps {
  id: string;
  label: string;
  required?: boolean | undefined;
  optional?: boolean | undefined;
  type?: string | undefined;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (() => void) | undefined;
  error?: boolean | undefined;
  errorMessage?: string | undefined;
  placeholder?: string | undefined;
  icon?: React.ComponentType<{ className?: string }> | undefined;
  rightElement?: React.ReactNode | undefined;
  children?: React.ReactNode | undefined;
}

function FormInputField({
  id,
  label,
  required,
  optional,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  errorMessage,
  placeholder,
  icon: Icon,
  rightElement,
  children,
}: FormInputFieldProps) {
  return (
    <div className="w-full space-y-1.5 text-left">
      <label htmlFor={id} className="text-[12px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center min-h-[22px]">
        {label}
        {required && <span className="text-rose-500 ml-0.5 font-bold">*</span>}
        {optional && <span className="text-slate-400 font-normal ml-1 text-xs">(Optional)</span>}
      </label>
      <div
        className={cn(
          "h-11 sm:h-12 w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 flex items-center transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 focus-within:bg-white dark:focus-within:bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
          error && "border-destructive/80 focus-within:border-destructive focus-within:ring-destructive/10"
        )}
      >
        {Icon && (
          <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mr-2.5" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400/90"
        />
        {rightElement && (
          <div className="shrink-0 flex items-center ml-2">
            {rightElement}
          </div>
        )}
      </div>
      {error && errorMessage && (
        <p className="text-xs font-semibold text-destructive mt-1 ml-1 text-left flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
      {children}
    </div>
  );
}

interface FormSelectFieldProps {
  id: string;
  label: string;
  required?: boolean | undefined;
  value: string;
  onValueChange: (v: string) => void;
  options: { label: string; value: string }[] | string[];
  placeholder?: string | undefined;
  icon?: React.ComponentType<{ className?: string }> | undefined;
  error?: boolean | undefined;
  errorMessage?: string | undefined;
}

function FormSelectField({
  id,
  label,
  required,
  value,
  onValueChange,
  options,
  placeholder,
  icon: Icon,
  error,
  errorMessage,
}: FormSelectFieldProps) {
  return (
    <div className="w-full space-y-1.5 text-left">
      <label htmlFor={id} className="text-[12px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center min-h-[22px]">
        {label}
        {required && <span className="text-rose-500 ml-0.5 font-bold">*</span>}
      </label>
      <div
        className={cn(
          "h-11 sm:h-12 w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 flex items-center transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 focus-within:bg-white dark:focus-within:bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
          error && "border-destructive/80 focus-within:border-destructive focus-within:ring-destructive/10"
        )}
      >
        {Icon && (
          <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mr-2.5" />
        )}
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="h-full w-full border-none shadow-none focus:ring-0 p-0 text-sm font-medium text-slate-900 dark:text-slate-100 bg-transparent flex items-center justify-between cursor-pointer outline-none">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-border/80 bg-white dark:bg-slate-950 shadow-xl max-h-60 z-50">
            {options.map((opt) => {
              const val = typeof opt === "string" ? opt : opt.value;
              const lbl = typeof opt === "string" ? opt : opt.label;
              return (
                <SelectItem key={val} value={val} className="text-sm font-medium">
                  {lbl}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      {error && errorMessage && (
        <p className="text-xs font-semibold text-destructive mt-1 ml-1 text-left">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  return (
    <button 
      onClick={toggleTheme} 
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm border border-slate-200 dark:border-slate-800 cursor-pointer"
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-500" />}
    </button>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { session, state, actions, signIn } = useQuesole();
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [invoiceDone, setInvoiceDone] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"online" | "invoice_request">("online");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupQuote, setSignupQuote] = useState<any | null>(null);
  const [companyAddons, setCompanyAddons] = useState<Record<string, number>>({});
  const [comingFromPayment, setComingFromPayment] = useState(false);
  const [portalConfig, setPortalConfig] = useState<any>(null);

  // Always scroll to top when changing steps or completing invoice
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, invoiceDone, done]);

  const getComponentRate = (key: string, defaultPrice: number = 100) => {
    const comp = state.planComponents.find((c) => c.key === key);
    return comp ? Number(comp.price_per_unit) : defaultPrice;
  };

  const [captchaCode, setCaptchaCode] = useState("");
  const generateCaptcha = () => {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    setCaptchaCode(code);
  };
  useEffect(() => {
    generateCaptcha();
  }, []);

  const [form, setForm] = useState<Form>({
    company: "",
    industry: "Healthcare",
    otherIndustry: "",
    country: "India",
    state: "Gujarat",
    city: "Ahmedabad",
    customCity: "",
    address: "",
    website: "",
    hp_field: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
    captchaInput: "",
    countryCode: "+91",
    phone: "",
    cardName: "Admin Cardholder",
    cardNumber: "4242 •••• •••• 4242",
    cardExpiry: "12/28",
    cardCvc: "123",
    simulateFailure: false,
    durationMonths: 1,
  });

  // Corporate Invoice Request details state
  const [invoiceDetails, setInvoiceDetails] = useState({
    billingName: "",
    billingAddress: "",
    billerEmail: "",
    contactPerson: "",
    contactPhone: "",
    gstNumber: "",
    furtherInstructions: "",
  });
  const [invoiceErrors, setInvoiceErrors] = useState<Record<string, string>>({});

  // Auto-sync invoice details from form inputs
  useEffect(() => {
    setInvoiceDetails((prev) => ({
      billingName: prev.billingName || form.company || "",
      billingAddress: prev.billingAddress || form.address || `${form.city || ""}, ${form.country || "India"}`.trim(),
      billerEmail: prev.billerEmail || form.email || "",
      contactPerson: prev.contactPerson || form.adminName || "",
      contactPhone: prev.contactPhone || (form.phone ? `${form.countryCode} ${form.phone}` : ""),
      gstNumber: prev.gstNumber || "",
      furtherInstructions: prev.furtherInstructions || "",
    }));
  }, [form.company, form.adminName, form.email, form.phone, form.address, form.city, form.country, form.countryCode]);

  // Plan Timing calculations for Review & Invoice
  const durationMonths = form.durationMonths || 1;
  const planTiming = useMemo(() => {
    const termLabel =
      durationMonths === 1 ? "1 Month (Monthly Subscription)" :
      durationMonths === 3 ? "3 Months (Quarterly · 5% Discount)" :
      durationMonths === 6 ? "6 Months (Semi-Annual · 10% Discount)" :
      "12 Months (Annual Commitment · 20% Discount)";

    const now = new Date();
    const startDate = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const endObj = new Date(now);
    endObj.setMonth(endObj.getMonth() + durationMonths);
    const endDate = endObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    return {
      durationMonths,
      termLabel,
      startDate,
      endDate,
      renewalDate: endDate,
    };
  }, [durationMonths]);

  const selectedCountryObj = useMemo(() => {
    return COUNTRIES.find((c) => c.name === form.country) || COUNTRIES[0];
  }, [form.country]);

  const availableStates = useMemo(() => {
    return selectedCountryObj?.states || [];
  }, [selectedCountryObj]);

  const selectedStateObj = useMemo(() => {
    return availableStates.find((s) => s.name === form.state) || availableStates[0];
  }, [availableStates, form.state]);

  const availableCities = useMemo(() => {
    return selectedStateObj?.cities || [];
  }, [selectedStateObj]);

  const selectedPhoneCountry = useMemo(() => {
    return PHONE_COUNTRY_CODES.find((p) => p.code === form.countryCode) || PHONE_COUNTRY_CODES[0]!;
  }, [form.countryCode]);

  // Handle URL step parameter or unpurchased plan redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step");
      if (stepParam === "1" || (session && session.role === "company_admin" && !session.hasPurchasedPlan)) {
        setStep(1);
      }
    }
  }, [session]);

  // Pre-fill form from existing session if available
  useEffect(() => {
    if (session && !form.company) {
      const existingCompany = state.companies.find((c) => String(c.id) === String(session?.companyId));
      if (existingCompany) {
        setForm((f) => ({
          ...f,
          company: existingCompany.name || f.company,
          email: session?.email || f.email,
          adminName: session?.name || f.adminName,
          phone: existingCompany.supportPhone || existingCompany.contact || f.phone,
          address: existingCompany.address || f.address,
          city: existingCompany.city || f.city,
          country: existingCompany.country || f.country,
          state: existingCompany.state || f.state,
          industry: existingCompany.industry || f.industry,
          otherIndustry: existingCompany.customIndustry || f.otherIndustry,
        }));
      }
    }
  }, [session, state.companies]);

  const activeComponents = useMemo(() => {
    return state.planComponents.filter((c) => c.is_active);
  }, [state.planComponents]);

  const [selections, setSelections] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    state.planComponents.forEach((c) => {
      init[c.key] = c.default_included_qty;
    });
    return init;
  });

  useEffect(() => {
    if (state.planComponents.length > 0 && Object.keys(selections).length === 0) {
      const init: Record<string, number> = {};
      state.planComponents.forEach((c) => {
        init[c.key] = c.default_included_qty;
      });
      setSelections(init);
    }
  }, [state.planComponents, selections]);

  const [dirtyFields, setDirtyFields] = useState<Record<string, boolean>>({});
  const [emailCheckStatus, setEmailCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailCheckMessage, setEmailCheckMessage] = useState<string>("");

  const setFormKey = <K extends keyof Form>(k: K, v: Form[K]) => {
    setDirtyFields((prev) => ({ ...prev, [k]: true }));
    setForm((f) => ({ ...f, [k]: v }));
  };

  const handleBlur = (k: keyof Form) => {
    setDirtyFields((prev) => ({ ...prev, [k]: true }));
  };

  const markDirty = (k: keyof Form) => {
    setDirtyFields((prev) => ({ ...prev, [k]: true }));
  };

  // Real-time debounced email availability check
  useEffect(() => {
    const email = form.email.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailCheckStatus("idle");
      setEmailCheckMessage("");
      return;
    }

    setEmailCheckStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(getApiUrl(`/api/companies/register-step1/?email=${encodeURIComponent(email)}`));
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setEmailCheckStatus("available");
            setEmailCheckMessage("Work email is available");
          } else {
            setEmailCheckStatus("taken");
            setEmailCheckMessage(data.message || "An account with this email already exists. Please sign in.");
          }
        } else {
          setEmailCheckStatus("idle");
        }
      } catch {
        setEmailCheckStatus("idle");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [form.email]);

  // Real-time password criteria computation
  const passwordHasLength = form.password.length >= 6;
  const passwordHasLetter = /[a-zA-Z]/.test(form.password);
  const passwordHasNumber = /[0-9]/.test(form.password);

  const errors: Partial<Record<keyof Form, string>> = {};
  if (step === 0) {
    if (form.company.trim().length < 3) errors.company = "Company name must be at least 3 characters.";
    if (form.industry === "Other" && form.otherIndustry.trim().length < 2) errors.otherIndustry = "Please specify your industry.";
    if (!form.country) errors.country = "Select your country.";
    if (!form.state) errors.state = "Select your state.";
    if (!form.city) errors.city = "Select your city.";
    if (form.city === "Other" && form.customCity.trim().length < 2) errors.customCity = "Specify your city name.";
    if (form.address.trim().length < 5) errors.address = "Specify complete company address (min 5 characters).";
    if (form.adminName.trim().length < 3) errors.adminName = "Enter administrator's full name (min 3 characters).";
    
    if (!form.email.trim()) {
      errors.email = "Work email is required.";
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      errors.email = "Valid work email required (e.g. name@company.com).";
    } else if (emailCheckStatus === "taken") {
      errors.email = emailCheckMessage || "An account with this email already exists. Please sign in.";
    }

    const cleanPhone = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) {
      errors.phone = "Contact phone number is required.";
    } else if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      errors.phone = "Phone number must be between 8 and 15 digits.";
    }

    if (!form.password) {
      errors.password = "Password is required.";
    } else if (form.password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    } else if (!passwordHasLetter) {
      errors.password = "Password must contain at least one letter.";
    } else if (!passwordHasNumber) {
      errors.password = "Password must contain at least one number.";
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = "Confirm password is required.";
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!form.captchaInput.trim()) {
      errors.captchaInput = "Security verification code is required.";
    } else if (form.captchaInput.trim() !== captchaCode) {
      errors.captchaInput = "Incorrect security code.";
    }
  }

  const isFieldInvalid = (k: keyof Form) => {
    return (touched || !!dirtyFields[k]) && !!errors[k];
  };

  const getFieldError = (k: keyof Form): string | undefined => {
    return isFieldInvalid(k) ? errors[k] : undefined;
  };

  const valid = Object.keys(errors).length === 0;

  const [savingStep1, setSavingStep1] = useState(false);

  async function handleNextStep1() {
    setTouched(true);
    // Mark all existing errors as dirty so they highlight immediately
    setDirtyFields((prev) => {
      const next = { ...prev };
      Object.keys(errors).forEach((k) => {
        next[k] = true;
      });
      return next;
    });

    if (!valid) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.getElementById(firstErrorKey);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }
      if (errors.password) {
        toast.error(errors.password);
      } else if (errors.confirmPassword) {
        toast.error(errors.confirmPassword);
      } else if (errors.email) {
        toast.error(errors.email);
      } else if (errors.captchaInput) {
        toast.error("Incorrect security code.");
      } else {
        toast.error("Please fill all required administrator fields correctly before proceeding.");
      }
      return;
    }

    setSavingStep1(true);
    try {
      const finalCity = form.city === "Other" && form.customCity ? form.customCity.trim() : form.city;
      const finalIndustry = form.industry === "Other" ? (form.otherIndustry.trim() || "Other") : form.industry;

      await actions.saveRegistrationStep1({
        companyName: form.company.trim(),
        industry: finalIndustry,
        customIndustry: form.industry === "Other" ? form.otherIndustry.trim() : "",
        country: form.country,
        state: form.state,
        city: finalCity,
        address: form.address.trim(),
        contactName: form.adminName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        countryCode: form.countryCode,
        website: form.website.trim(),
      });

      toast.success("Profile saved! Please configure your subscription plan.");
      setTouched(false);
      setStep(1);
    } catch (err: any) {
      console.error("Step 1 save error:", err);
      const msg = err?.message || "Failed to save profile. Please check details and try again.";
      const lower = msg.toLowerCase();
      if (lower.includes("password")) {
        setDirtyFields((prev) => ({ ...prev, password: true }));
        document.getElementById("password")?.focus();
      } else if (lower.includes("email")) {
        setDirtyFields((prev) => ({ ...prev, email: true }));
        document.getElementById("email")?.focus();
      } else if (lower.includes("company")) {
        setDirtyFields((prev) => ({ ...prev, company: true }));
        document.getElementById("company")?.focus();
      }
      toast.error(msg);
    } finally {
      setSavingStep1(false);
    }
  }

  const handleDownloadInvoicePDF = () => {
    if (!signupQuote) return;
    const finalCity = form.city === "Other" && form.customCity ? form.customCity.trim() : form.city;
    const fullPhone = form.phone ? `${form.countryCode} ${form.phone}` : "—";
    generateAndDownloadInvoicePDF({
      companyName: form.company,
      contactName: form.adminName,
      email: form.email,
      phone: fullPhone,
      city: finalCity,
      country: form.country,
      billingName: invoiceDetails.billingName.trim() || form.company,
      billingAddress: invoiceDetails.billingAddress.trim() || form.address || `${finalCity}, ${form.country}`,
      billerEmail: invoiceDetails.billerEmail.trim() || form.email,
      contactPerson: invoiceDetails.contactPerson.trim() || form.adminName,
      contactPhone: invoiceDetails.contactPhone.trim() || fullPhone,
      gstNumber: invoiceDetails.gstNumber.trim(),
      furtherInstructions: invoiceDetails.furtherInstructions.trim(),
      planTiming: {
        termLabel: planTiming.termLabel,
        startDate: planTiming.startDate,
        endDate: planTiming.endDate,
        renewalDate: planTiming.renewalDate,
      },
      branches: form.branches,
      durationMonths: form.durationMonths || 1,
      itemized: signupQuote.itemized || {},
      monthlyTotal: Number(signupQuote.raw_total || 0),
      contractSubtotal: Number(signupQuote.total || 0),
      discountPercent: signupQuote.discount_percent,
      discountAmount: signupQuote.discount_amount,
      gstPercent: Number(signupQuote.gst_percent || 18),
      gstAmount: Number(signupQuote.gst_amount || 0),
      grandTotal: Number(signupQuote.grand_total || 0),
    });
  };

  async function handleSubmitPayment() {
    if (paymentMode === "invoice_request") {
      const invErrs: Record<string, string> = {};
      if (!invoiceDetails.billingName.trim()) invErrs.billingName = "Billing legal name is required.";
      if (!invoiceDetails.billingAddress.trim()) invErrs.billingAddress = "Billing street address is required.";
      if (!invoiceDetails.billerEmail.trim()) {
        invErrs.billerEmail = "Biller / accounts email is required.";
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(invoiceDetails.billerEmail.trim())) {
        invErrs.billerEmail = "Enter a valid billing email address.";
      }
      if (!invoiceDetails.contactPerson.trim()) invErrs.contactPerson = "Contact person name is required.";
      if (!invoiceDetails.contactPhone.trim()) invErrs.contactPhone = "Contact phone number is required.";

      if (Object.keys(invErrs).length > 0) {
        setInvoiceErrors(invErrs);
        const firstKey = Object.keys(invErrs)[0];
        document.getElementById(`inv_${firstKey}`)?.focus();
        toast.error("Please fill all required corporate billing fields.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const finalCity = form.city === "Other" && form.customCity ? form.customCity.trim() : form.city;
      const finalIndustry = form.industry === "Other" ? (form.otherIndustry.trim() || "Other") : form.industry;
      const fullPhone = form.phone ? `${form.countryCode} ${form.phone}` : "9999999999";

      const mappedBranches = form.branches ? form.branches.map((b) => ({
        name: b.name,
        mode: b.mode,
        channel_type: b.channel_type || "ONSITE_ONLY",
        service_qty: b.serviceQty,
        operator_qty: b.operatorQty,
        kiosk_qty: b.kioskQty,
        token_delivery_selections: b.tokenDeliverySelections,
        addons: {
          operator_screens: b.addons?.operator_screens || 0,
          paper_roll_screens: b.addons?.paper_roll_screens || 0,
          services: b.addons?.services || 0,
          printed_qr: b.addons?.printed_qr || 0,
        },
      })) : [];

      await actions.checkoutItemizedRegistration({
        companyName: form.company,
        industry: finalIndustry,
        city: finalCity,
        contactName: form.adminName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: fullPhone,
        itemizedSelections: selections,
        branches: mappedBranches,
        companyAddons: companyAddons,
        durationMonths: form.durationMonths || 1,
        quoteId: signupQuote?.quote_id,
        simulateFailure: paymentMode === "online" ? form.simulateFailure : false,
        portalName: portalConfig?.portalName,
        logoUrl: portalConfig?.logoUrl,
        primaryColor: portalConfig?.primaryColor,
        displayAddress: portalConfig?.displayAddress,
        enabledCustomerFields: portalConfig?.enabledCustomerFields,
        enabledBookingFields: portalConfig?.enabledBookingFields,
        enabledNotificationChannels: portalConfig?.enabledNotificationChannels,
        companySlug: portalConfig?.companySlug,
        website: form.website,
        hpField: form.hp_field,
        paymentMode: paymentMode,
        invoiceDetails: paymentMode === "invoice_request" ? {
          billing_name: invoiceDetails.billingName.trim(),
          billing_address: invoiceDetails.billingAddress.trim(),
          biller_email: invoiceDetails.billerEmail.trim(),
          contact_person: invoiceDetails.contactPerson.trim(),
          contact_phone: invoiceDetails.contactPhone.trim(),
          gst_number: invoiceDetails.gstNumber.trim(),
          further_instructions: invoiceDetails.furtherInstructions.trim(),
          plan_timing: {
            term_label: planTiming.termLabel,
            duration_months: planTiming.durationMonths,
            start_date: planTiming.startDate,
            end_date: planTiming.endDate,
            renewal_date: planTiming.renewalDate,
          }
        } : {},
      });

      if (paymentMode === "invoice_request") {
        handleDownloadInvoicePDF();
        setSubmitting(false);
        setInvoiceDone(true);
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        toast.success("Invoice PDF downloaded & request sent to Superadmin!");
      } else {
        await signIn(form.email.trim(), form.password, portalConfig?.companySlug);
        setSubmitting(false);
        setDone(true);
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        toast.success("Account activated successfully!");
      }
    } catch (err: any) {
      setSubmitting(false);
      const msg = err?.message || "Registration failed";
      const lower = msg.toLowerCase();
      
      // If error belongs to Step 0 (credentials or profile)
      if (lower.includes("password") || lower.includes("email") || lower.includes("company") || lower.includes("phone")) {
        setStep(0);
        setTouched(true);
        if (lower.includes("password")) {
          setDirtyFields((prev) => ({ ...prev, password: true, confirmPassword: true }));
          setTimeout(() => document.getElementById("password")?.focus(), 150);
        } else if (lower.includes("email")) {
          setDirtyFields((prev) => ({ ...prev, email: true }));
          setTimeout(() => document.getElementById("email")?.focus(), 150);
        } else if (lower.includes("company")) {
          setDirtyFields((prev) => ({ ...prev, company: true }));
          setTimeout(() => document.getElementById("company")?.focus(), 150);
        } else if (lower.includes("phone")) {
          setDirtyFields((prev) => ({ ...prev, phone: true }));
          setTimeout(() => document.getElementById("phone")?.focus(), 150);
        }
        toast.error(`Please update your details: ${msg}`);
        return;
      }

      // If error belongs to Step 1 (branches or quote configuration)
      if (lower.includes("branch") || lower.includes("kiosk") || lower.includes("desk") || lower.includes("quote") || lower.includes("channel") || lower.includes("operator")) {
        setStep(1);
        toast.error(`Please review your plan settings: ${msg}`);
        return;
      }

      toast.error(msg);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F8F9FE] dark:bg-[#080C16] text-foreground font-sans relative overflow-x-hidden py-3 sm:py-5 px-0 flex flex-col items-center justify-start selection:bg-indigo-500/20">
      
      {/* Dynamic Animated Futuristic Kiosk & Lobby Background */}
      <AnimatedAuthBackground />

      {/* Top Header bar with Logo, Status Pill, and Theme Toggle - 90% screen width */}
      <div className="w-[90vw] max-w-[90vw] flex items-center justify-between mb-2.5 sm:mb-3.5 px-1 z-20 transition-all">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Logo size={36} />
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/75 dark:bg-slate-900/75 border border-slate-200/70 dark:border-slate-800 backdrop-blur-md text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Smart Queue Intelligence</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Sign In
            </Link>
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Floating Glassmorphic Card Container - 90% screen width */}
      <div className="relative z-10 w-[90vw] max-w-[90vw] transition-all duration-300">
        <div className="relative backdrop-blur-2xl bg-white/94 dark:bg-[#0c101d]/92 rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 md:p-8 lg:p-9 shadow-[0_30px_100px_-15px_rgba(79,70,229,0.22),0_4px_30px_-5px_rgba(0,0,0,0.04),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_30px_100px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.1)_inset] border border-white/80 dark:border-white/10 overflow-hidden">
          
          {/* Top Edge Specular Glow */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />
          
          {invoiceDone ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-4 max-w-xl mx-auto"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-inner">
                <FileText className="h-10 w-10 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Pending Superadmin Approval</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-snug text-[#181B34] dark:text-white">
                  Invoice Request Received!
                </h1>
                <p className="text-sm text-muted-foreground/90 font-medium">
                  We have generated and downloaded your official invoice quote for <strong>{form.company}</strong>. Your inquiry has been routed directly to our Superadmin executive team.
                </p>
              </div>

              {/* Inquiry Status Summary Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-5 text-left space-y-3.5 text-xs shadow-sm">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/40 font-semibold">
                  <span className="text-muted-foreground">Inquiry Status</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Under Executive Review
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Billed Legal Entity</span>
                    <strong className="text-foreground text-sm">{invoiceDetails.billingName || form.company}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Invoice Grand Total</span>
                    <strong className="text-emerald-600 text-sm font-black">₹{Number(signupQuote?.grand_total || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Contact Person & Phone</span>
                    <span className="font-medium text-foreground">{invoiceDetails.contactPerson || form.adminName} ({invoiceDetails.contactPhone || form.phone || "—"})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Biller / Accounts Email</span>
                    <span className="font-medium text-foreground">{invoiceDetails.billerEmail || form.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">GSTIN / Tax ID</span>
                    <span className="font-semibold text-foreground">{invoiceDetails.gstNumber ? invoiceDetails.gstNumber.toUpperCase() : "Not Applicable / Unregistered"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Plan Timing & Term</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{planTiming.termLabel}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11.5px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  <strong>Next steps:</strong> Our corporate accounts team will contact you shortly via email or phone. As soon as Superadmin approves and activates your company, your operations dashboard will be instantly accessible upon login.
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleDownloadInvoicePDF}
                  className="flex-1 h-12 rounded-xl font-bold border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                >
                  <Download className="mr-2 h-4 w-4" /> Download Invoice Copy (PDF)
                </Button>
                <Button
                  variant="brand"
                  type="button"
                  onClick={() => navigate({ to: "/login" })}
                  className="flex-1 h-12 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-indigo-500/25 cursor-pointer"
                >
                  Go to Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>
              <h1 className="font-display text-3xl font-black tracking-tight leading-none text-[#181B34] dark:text-white">
                Welcome to Quesole!
              </h1>
              <p className="text-sm text-muted-foreground/80 font-medium max-w-sm mx-auto">
                Your subscription for <strong>{form.company}</strong> is active. Your company workspace is ready.
              </p>
              <Button
                variant="brand"
                size="lg"
                onClick={() => navigate({ to: "/app" })}
                className="w-full h-13 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 font-bold text-base shadow-lg shadow-indigo-500/20 cursor-pointer border-none text-white"
              >
                Enter Command Console <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Stepper with centered background track */}
              <div className="relative max-w-xl mx-auto mb-4 sm:mb-5 select-none px-4">
                {/* Connecting track line placed at vertical center of circles (14px) */}
                <div className="absolute top-3.5 sm:top-4 left-8 right-8 h-[2px] bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0">
                  <div
                    className="h-full bg-[#4F46E5] transition-all duration-300"
                    style={{
                      width: step === 0 ? "0%" : step === 1 ? "50%" : "100%",
                    }}
                  />
                </div>

                <div className="relative z-10 flex items-start justify-between">
                  {/* Step 1: COMPANY & ADMIN */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ring-4 ring-white dark:ring-[#0c101d]",
                      step >= 0 ? "bg-[#4F46E5] text-white" : "border-2 border-slate-300 bg-white text-slate-400"
                    )}>
                      {step > 0 ? <Check className="h-4 w-4 stroke-[2.5]" /> : "1"}
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mt-1.5 text-center whitespace-nowrap",
                      step >= 0 ? "text-[#4F46E5]" : "text-slate-400 dark:text-slate-500"
                    )}>
                      Company & Admin
                    </span>
                  </div>

                  {/* Step 2: BUILD YOUR PLAN */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ring-4 ring-white dark:ring-[#0c101d]",
                      step >= 1 
                        ? (step > 1 ? "bg-[#4F46E5] text-white" : "bg-[#4F46E5] text-white ring-[#4F46E5]/20") 
                        : "border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900"
                    )}>
                      {step > 1 ? <Check className="h-4 w-4 stroke-[2.5]" /> : "2"}
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mt-1.5 text-center whitespace-nowrap",
                      step === 1 ? "text-[#4F46E5]" : (step > 1 ? "text-[#4F46E5]" : "text-slate-400 dark:text-slate-500")
                    )}>
                      Build Your Plan
                    </span>
                  </div>

                  {/* Step 3: PAYMENT */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ring-4 ring-white dark:ring-[#0c101d]",
                      step >= 2 
                        ? "bg-[#4F46E5] text-white ring-[#4F46E5]/20" 
                        : "border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900"
                    )}>
                      3
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mt-1.5 text-center whitespace-nowrap",
                      step >= 2 ? "text-[#4F46E5]" : "text-slate-400 dark:text-slate-500"
                    )}>
                      Payment
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 0: Registration Form matching the plan page width (max-w-6xl) with efficient space utilization */}
              {step === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 sm:space-y-5"
                >
                  {/* Card Title Header with purple icon */}
                  <div className="flex items-center gap-3.5 text-left pb-1">
                    <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-[#4F46E5] shrink-0 shadow-sm">
                      <Building2 className="h-6 w-6 text-[#4F46E5]" />
                    </div>
                    <div>
                      <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#181B34] dark:text-white tracking-tight leading-tight">
                        Create your company account
                      </h1>
                      <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-normal mt-0.5">
                        Set up your workspace in a few simple steps.
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Company Profile */}
                  <div className="space-y-3.5">
                    {/* Section Header Divider */}
                    <div className="flex items-center justify-between pb-0.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#4F46E5]" />
                        <span className="text-xs sm:text-sm font-bold text-[#181B34] dark:text-white">
                          Company Profile
                        </span>
                      </div>
                      <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800 mx-3 hidden sm:block" />
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                        Tell us about your company
                      </span>
                    </div>

                    {/* Row 1: Company Name, Industry, Contact Phone (3 columns on desktop) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                      <FormInputField
                        id="company"
                        label="Company Name"
                        required
                        value={form.company}
                        onChange={(v) => setFormKey("company", v)}
                        onBlur={() => handleBlur("company")}
                        error={isFieldInvalid("company")}
                        errorMessage={getFieldError("company")}
                        placeholder="Enter company name"
                        icon={Building2}
                      />

                      <FormSelectField
                        id="industry"
                        label="Industry"
                        required
                        value={form.industry}
                        onValueChange={(v) => setFormKey("industry", v)}
                        options={INDUSTRIES}
                        placeholder="Select Industry"
                        icon={Layers}
                        error={isFieldInvalid("industry")}
                        errorMessage={getFieldError("industry")}
                      />

                      {/* Combined Contact Phone Field with Country Code */}
                      <div className="w-full space-y-1.5 text-left">
                        <label htmlFor="phone" className="text-[12px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center min-h-[22px]">
                          Contact Phone <span className="text-rose-500 ml-0.5 font-bold">*</span>
                        </label>
                        <div
                          className={cn(
                            "h-11 sm:h-12 w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3 flex items-center transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 focus-within:bg-white dark:focus-within:bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                            isFieldInvalid("phone") && "border-destructive/80 focus-within:border-destructive focus-within:ring-destructive/10"
                          )}
                        >
                          <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mr-1.5" />
                          
                          {/* Country Code Selector */}
                          <Select
                            value={form.countryCode}
                            onValueChange={(v) => setFormKey("countryCode", v)}
                          >
                            <SelectTrigger className="border-none shadow-none focus:ring-0 p-0 h-auto text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer outline-none bg-transparent w-auto shrink-0 pr-1">
                              <SelectValue>
                                <span className="flex items-center gap-1">
                                  <span className="text-sm">{selectedPhoneCountry.flag}</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPhoneCountry.code}</span>
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-60 rounded-xl border border-border/80 bg-white dark:bg-slate-950 shadow-xl z-50">
                              {PHONE_COUNTRY_CODES.map((pc) => (
                                <SelectItem key={pc.code} value={pc.code} className="text-xs font-medium">
                                  {pc.flag} {pc.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 shrink-0" />

                          <input
                            id="phone"
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setFormKey("phone", e.target.value.replace(/[^\d\s-]/g, ""))}
                            onBlur={() => handleBlur("phone")}
                            placeholder="Enter contact number"
                            className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400/90"
                          />
                        </div>
                        {isFieldInvalid("phone") && getFieldError("phone") && (
                          <p className="text-xs font-semibold text-destructive mt-1 ml-1 text-left flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{getFieldError("phone")}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* If Industry === "Other", show specify input */}
                    {form.industry === "Other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                      >
                        <FormInputField
                          id="otherIndustry"
                          label="Specify Other Industry"
                          required
                          value={form.otherIndustry}
                          onChange={(v) => setFormKey("otherIndustry", v)}
                          onBlur={() => handleBlur("otherIndustry")}
                          error={isFieldInvalid("otherIndustry")}
                          errorMessage={getFieldError("otherIndustry")}
                          placeholder="e.g. Legal Services, Hospitality, Aviation"
                          icon={Building2}
                        />
                      </motion.div>
                    )}

                    {/* Row 2: Country, State, City (3 columns on desktop) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                      <FormSelectField
                        id="country"
                        label="Country"
                        required
                        value={form.country}
                        onValueChange={(val) => {
                          const cObj = COUNTRIES.find((c) => c.name === val) || COUNTRIES[0];
                          const firstState = cObj?.states[0]?.name || "";
                          const firstCity = cObj?.states[0]?.cities[0] || "";
                          setForm((f) => ({
                            ...f,
                            country: val,
                            countryCode: cObj?.phoneCode || f.countryCode,
                            state: firstState,
                            city: firstCity,
                            customCity: "",
                          }));
                          markDirty("country");
                        }}
                        options={COUNTRIES.map((c) => ({ label: c.name, value: c.name }))}
                        placeholder="Select Country"
                        icon={MapPin}
                        error={isFieldInvalid("country")}
                        errorMessage={getFieldError("country")}
                      />

                      <FormSelectField
                        id="state"
                        label="State / Province"
                        required
                        value={form.state}
                        onValueChange={(val) => {
                          const sObj = availableStates.find((s) => s.name === val);
                          const firstCity = sObj?.cities[0] || "";
                          setForm((f) => ({
                            ...f,
                            state: val,
                            city: firstCity,
                            customCity: "",
                          }));
                          markDirty("state");
                        }}
                        options={availableStates.map((s) => ({ label: s.name, value: s.name }))}
                        placeholder="Select State"
                        icon={Map}
                        error={isFieldInvalid("state")}
                        errorMessage={getFieldError("state")}
                      />

                      <FormSelectField
                        id="city"
                        label="City"
                        required
                        value={form.city}
                        onValueChange={(val) => {
                          setFormKey("city", val);
                          markDirty("city");
                        }}
                        options={availableCities.map((c) => ({ label: c, value: c }))}
                        placeholder="Select City"
                        icon={Building}
                        error={isFieldInvalid("city")}
                        errorMessage={getFieldError("city")}
                      />
                    </div>

                    {/* Custom City when City is "Other" */}
                    {form.city === "Other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                      >
                        <FormInputField
                          id="customCity"
                          label="Specify City Name"
                          required
                          value={form.customCity}
                          onChange={(v) => setFormKey("customCity", v)}
                          onBlur={() => handleBlur("customCity")}
                          error={isFieldInvalid("customCity")}
                          errorMessage={getFieldError("customCity")}
                          placeholder="Enter your city name"
                          icon={Building}
                        />
                      </motion.div>
                    )}

                    {/* Row 3: Registered Address (spans 2 cols) & Company Website (1 col) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
                      <div className="lg:col-span-2">
                        <FormInputField
                          id="address"
                          label="Registered Address"
                          required
                          value={form.address}
                          onChange={(v) => setFormKey("address", v)}
                          onBlur={() => handleBlur("address")}
                          error={isFieldInvalid("address")}
                          errorMessage={getFieldError("address")}
                          placeholder="Enter your registered street, building, or premises address"
                          icon={MapPin}
                        />
                      </div>
                      <div className="lg:col-span-1">
                        <FormInputField
                          id="website"
                          label="Company Website"
                          optional
                          value={form.website}
                          onChange={(v) => setFormKey("website", v)}
                          onBlur={() => handleBlur("website")}
                          placeholder="https://www.yourcompany.com"
                          icon={Globe}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Company Admin Credentials */}
                  <div className="space-y-3.5 pt-1">
                    {/* Section Header Divider */}
                    <div className="flex items-center justify-between pb-0.5">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#4F46E5]" />
                        <span className="text-xs sm:text-sm font-bold text-[#181B34] dark:text-white">
                          Company Admin Credentials
                        </span>
                      </div>
                      <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800 mx-3 hidden sm:block" />
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                        Set up your administrator account
                      </span>
                    </div>

                    {/* 4 columns on desktop! */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                      <FormInputField
                        id="adminName"
                        label="Name of Contact Person"
                        required
                        value={form.adminName}
                        onChange={(v) => setFormKey("adminName", v)}
                        onBlur={() => handleBlur("adminName")}
                        error={isFieldInvalid("adminName")}
                        errorMessage={getFieldError("adminName")}
                        placeholder="Enter full name"
                        icon={User}
                      />

                      <FormInputField
                        id="email"
                        label="Work Email"
                        required
                        type="email"
                        value={form.email}
                        onChange={(v) => setFormKey("email", v)}
                        onBlur={() => handleBlur("email")}
                        error={isFieldInvalid("email")}
                        errorMessage={getFieldError("email")}
                        placeholder="name@yourcompany.com"
                        icon={Mail}
                        rightElement={
                          emailCheckStatus === "checking" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                          ) : emailCheckStatus === "available" && !isFieldInvalid("email") ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : isFieldInvalid("email") ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : null
                        }
                      >
                        {emailCheckStatus === "available" && !isFieldInvalid("email") && form.email && (
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 ml-1 text-left flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Work email is available</span>
                          </p>
                        )}
                        {emailCheckStatus === "taken" && (
                          <div className="mt-1 ml-1 text-xs text-rose-500 font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>Email already registered.</span>
                            </span>
                            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
                              Sign In &rarr;
                            </Link>
                          </div>
                        )}
                      </FormInputField>

                      <FormInputField
                        id="password"
                        label="Password (Min. 8 chars)"
                        required
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(v) => setFormKey("password", v)}
                        onBlur={() => handleBlur("password")}
                        error={isFieldInvalid("password")}
                        errorMessage={getFieldError("password")}
                        placeholder="Create a password"
                        icon={Lock}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      >
                        {/* Real-time criteria status badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all duration-200",
                              passwordHasLength
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            )}
                          >
                            {passwordHasLength ? <Check className="h-3 w-3 stroke-[2.5]" /> : <Circle className="h-2.5 w-2.5 stroke-[2.5]" />}
                            6+ chars
                          </span>

                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all duration-200",
                              passwordHasLetter
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            )}
                          >
                            {passwordHasLetter ? <Check className="h-3 w-3 stroke-[2.5]" /> : <Circle className="h-2.5 w-2.5 stroke-[2.5]" />}
                            1+ letter
                          </span>

                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all duration-200",
                              passwordHasNumber
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            )}
                          >
                            {passwordHasNumber ? <Check className="h-3 w-3 stroke-[2.5]" /> : <Circle className="h-2.5 w-2.5 stroke-[2.5]" />}
                            1+ number
                          </span>
                        </div>
                      </FormInputField>

                      <div className="w-full space-y-1.5 text-left">
                        <div className="flex items-center justify-between min-h-[22px]">
                          <label htmlFor="confirmPassword" className="text-[12px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                            Confirm Password <span className="text-rose-500 ml-0.5 font-bold">*</span>
                          </label>
                          {form.confirmPassword.length > 0 && (
                            <span className={cn(
                              "text-[10px] sm:text-[11px] font-semibold flex items-center gap-1",
                              form.confirmPassword === form.password ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                            )}>
                              {form.confirmPassword === form.password ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Match
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" /> Mismatch
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "h-11 sm:h-12 w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 flex items-center transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 focus-within:bg-white dark:focus-within:bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                            isFieldInvalid("confirmPassword") && "border-destructive/80 focus-within:border-destructive focus-within:ring-destructive/10"
                          )}
                        >
                          <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mr-2.5" />
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={form.confirmPassword}
                            onChange={(e) => setFormKey("confirmPassword", e.target.value)}
                            onBlur={() => handleBlur("confirmPassword")}
                            placeholder="Confirm your password"
                            className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400/90"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1 shrink-0 ml-1 border-none bg-transparent"
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {isFieldInvalid("confirmPassword") && getFieldError("confirmPassword") && (
                          <p className="text-xs font-semibold text-destructive mt-1 ml-1 text-left flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{getFieldError("confirmPassword")}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Security Verification & Submit Action */}
                  <div className="space-y-3 pt-1">
                    {/* Section Header Divider */}
                    <div className="flex items-center justify-between pb-0.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#4F46E5]" />
                        <span className="text-xs sm:text-sm font-bold text-[#181B34] dark:text-white">
                          Security Verification
                        </span>
                      </div>
                      <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800 mx-3 hidden sm:block" />
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                        Please verify characters to continue
                      </span>
                    </div>

                    {/* Captcha Box & Input & Continue Button in responsive 3-column row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-end">
                      {/* Dotted Box Display */}
                      <div className="w-full space-y-1.5 text-left">
                        <label className="text-[12px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center min-h-[22px]">
                          Security Code
                        </label>
                        <div className="h-11 sm:h-12 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/60 dark:bg-indigo-950/40 px-3.5 flex items-center justify-between relative overflow-hidden select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#4f46e5_1.5px,transparent_1.5px)] [background-size:12px_12px]" />
                          <span className="font-mono text-xl sm:text-2xl font-bold tracking-[0.35em] text-[#1E2342] dark:text-white flex-1 text-center pl-3">
                            {captchaCode}
                          </span>
                          <button
                            type="button"
                            onClick={generateCaptcha}
                            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-transform active:rotate-180 duration-300 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 cursor-pointer shrink-0 z-10 border-none bg-transparent"
                            aria-label="Refresh Captcha"
                          >
                            <RotateCw className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Captcha Input */}
                      <div className="w-full space-y-1.5 text-left">
                        <div className="flex items-center justify-between min-h-[22px]">
                          <label htmlFor="captchaInput" className="text-[12px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                            Enter Security Code <span className="text-rose-500 ml-0.5 font-bold">*</span>
                          </label>
                          {form.captchaInput.length > 0 && (
                            <span className={cn(
                              "text-[10px] sm:text-[11px] font-semibold flex items-center gap-1",
                              form.captchaInput.trim() === captchaCode ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                            )}>
                              {form.captchaInput.trim() === captchaCode ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Verified
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Incomplete
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "h-11 sm:h-12 w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 flex items-center transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 focus-within:bg-white dark:focus-within:bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                            isFieldInvalid("captchaInput") && "border-destructive/80 focus-within:border-destructive focus-within:ring-destructive/10"
                          )}
                        >
                          <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mr-2.5" />
                          <input
                            id="captchaInput"
                            type="text"
                            value={form.captchaInput}
                            onChange={(e) => setFormKey("captchaInput", e.target.value)}
                            onBlur={() => handleBlur("captchaInput")}
                            placeholder="Enter security code"
                            className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400/90"
                          />
                        </div>
                        {isFieldInvalid("captchaInput") && getFieldError("captchaInput") && (
                          <p className="text-xs font-semibold text-destructive mt-1 ml-1 text-left flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{getFieldError("captchaInput")}</span>
                          </p>
                        )}
                      </div>

                      {/* Submit Action Button directly in 3rd column */}
                      <div className="w-full">
                        <button
                          type="button"
                          id="step0SubmitBtn"
                          disabled={savingStep1}
                          onClick={handleNextStep1}
                          className={cn(
                            "w-full h-11 sm:h-12 rounded-xl text-white font-semibold text-sm sm:text-base shadow-lg transition-all duration-200 flex items-center justify-center gap-2 border-none cursor-pointer",
                            !valid
                              ? "bg-slate-800/90 hover:bg-slate-800 text-slate-200 shadow-slate-900/20"
                              : "bg-gradient-to-r from-[#3B66F5] via-[#4F46E5] to-[#7C3AED] shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:brightness-105 active:scale-[0.99]"
                          )}
                        >
                          {savingStep1 ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Saving Profile...</span>
                            </>
                          ) : !valid ? (
                            <>
                              <ShieldAlert className="h-4 w-4 text-amber-400" />
                              <span>Complete Step 1 to Continue</span>
                            </>
                          ) : (
                            <>
                              <span>Continue to Plan Builder</span>
                              <ArrowRight className="h-4 w-4 ml-0.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Encryption Notice Footer */}
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 pt-1">
                      <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Your information is encrypted and securely stored.</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Itemized Billing Plan Configurator */}
              {step === 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <BillingPlanConfigurator
                    mode="registration"
                    initialStep={comingFromPayment ? 4 : 1}
                    initialData={{
                      solution: form.solution || "ONSITE_ONLINE",
                      branchesCount: selections["branches"] || 1,
                      durationMonths: form.durationMonths || 1,
                      branches: form.branches,
                      companyName: form.company,
                      locationAddress: form.address || form.city,
                      companyAddons: companyAddons,
                    }}
                    onSubmit={async (configData: any) => {
                      setSelections(configData.itemizedSelections);
                      setCompanyAddons(configData.companyAddons || {});
                      setFormKey("simulateFailure", configData.simulateFailure);
                      setSignupQuote(configData.quote);
                      setPortalConfig(configData);
                      setForm((f) => ({
                        ...f,
                        durationMonths: configData.durationMonths,
                        solution: configData.solution,
                        branches: configData.branches,
                      }));
                      setStep(2);
                    }}
                    onCancel={() => {
                      setComingFromPayment(false);
                      setStep(0);
                    }}
                  />
                </motion.div>
              )}

              {/* Step 2: Review & Payment */}
              {step === 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 text-left"
                >
                  {/* Review Page Header Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Step 3 of 3 · Final Verification
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Ready to Activate
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#181B34] dark:text-white mt-1">
                        Review & Subscription Checkout
                      </h2>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        Confirm deployment architecture, subscription duration, and select your activation method.
                      </p>
                    </div>
                    <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-900/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-200/80 sm:border-none dark:border-slate-800 w-full sm:w-auto">
                      <span className="text-xs text-muted-foreground font-semibold block sm:inline">Grand Total: </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-display text-2xl sm:text-3xl font-black">
                        ₹{signupQuote ? Number(signupQuote.grand_total).toLocaleString("en-IN") : "0"}
                      </span>
                      {form.durationMonths && form.durationMonths > 1 && (
                        <span className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider mt-0.5">
                          {form.durationMonths} Months Billed · Save {signupQuote?.discount_percent || 0}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1. Subscription Plan Timing Card */}
                  <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-purple-950/10 p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-100/60 dark:border-indigo-900/40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                            Subscription Plan & Timing
                          </h3>
                          <span className="text-[10.5px] text-muted-foreground font-medium">Contract duration and renewal cycle schedule</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                        {planTiming.termLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Term Duration
                        </span>
                        <strong className="text-foreground text-sm font-black block">
                          {form.durationMonths || 1} Month{(form.durationMonths || 1) > 1 ? "s" : ""}
                        </strong>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          {(form.durationMonths || 1) >= 12 ? "Annual Commitment" : (form.durationMonths || 1) >= 6 ? "Semi-Annual Term" : (form.durationMonths || 1) >= 3 ? "Quarterly Term" : "Monthly Flexible"}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Effective Start Date
                        </span>
                        <strong className="text-foreground text-sm font-bold block">
                          {planTiming.startDate}
                        </strong>
                        <span className="text-[10px] text-emerald-600 font-medium">Activation immediate</span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Renewal / End Date
                        </span>
                        <strong className="text-foreground text-sm font-bold block">
                          {planTiming.endDate}
                        </strong>
                        <span className="text-[10px] text-muted-foreground font-medium">Billed every {form.durationMonths || 1} mo</span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Volume Savings
                        </span>
                        <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-black block">
                          {signupQuote?.discount_percent > 0 ? `${signupQuote.discount_percent}% Discount` : "Standard Rate"}
                        </strong>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {signupQuote?.discount_amount > 0 ? `Saved ₹${Number(signupQuote.discount_amount).toLocaleString("en-IN")}` : "No lock-in"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Selected Company & Branches Specs Card */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 sm:p-5 space-y-3.5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-border/40">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Deployment Workspace</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Building2 className="h-4 w-4 text-[#4F46E5]" />
                          <span className="text-base font-extrabold text-foreground">{form.company}</span>
                          <span className="text-xs text-muted-foreground">({form.city}, {form.country})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                          Industry: {form.industry}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {form.branches?.length || 1} Location{(form.branches?.length || 1) > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2.5">
                      <span className="text-[10.5px] font-bold text-muted-foreground/80 uppercase tracking-wider block">Branch Specifications</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {form.branches && form.branches.map((b, idx) => (
                          <div key={idx} className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-xs space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground text-[12.5px] flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                                {b.name}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {b.mode === "SERVICE_BASED" ? "Service Based" : "Single Queue"}
                              </span>
                            </div>
                            <div className="text-muted-foreground text-[11px] flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                              <span>Counters: <strong className="text-foreground">{b.mode === "SERVICE_BASED" ? b.serviceQty : b.operatorQty}</strong></span>
                              <span>Kiosks: <strong className="text-foreground">{b.kioskQty}</strong></span>
                              <span>Delivery: <strong className="text-foreground">{b.tokenDeliverySelections?.join(", ") || "Screen Only"}</strong></span>
                            </div>
                            {b.address && (
                              <p className="text-[10.5px] text-muted-foreground truncate pt-0.5 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {b.address}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. Itemized Pricing Review Card */}
                  {signupQuote && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 sm:p-5 space-y-3 text-xs shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-indigo-600" /> Itemized Pricing Breakdown
                        </span>
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          Base Monthly: ₹{Number(signupQuote.raw_total).toLocaleString("en-IN")}/mo
                        </span>
                      </div>
                      
                      <div className="space-y-2 font-medium">
                        {Number(signupQuote.itemized.branches_subtotal) > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-border/20">
                            <span className="text-slate-600 dark:text-slate-400">
                              Branches Setup ({form.branches?.length || 1} {(form.branches?.length || 1) > 1 ? "locations" : "location"} x ₹{getComponentRate("branches")}/mo)
                            </span>
                            <span className="font-semibold text-foreground">₹{Number(signupQuote.itemized.branches_subtotal).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {Number(signupQuote.itemized.online_subtotal) > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-border/20">
                            <span className="text-slate-600 dark:text-slate-400">
                              Online Booking Module ({form.branches?.filter(b => b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID").length || 0} locations x ₹{getComponentRate("online_module", 5000)}/mo)
                            </span>
                            <span className="font-semibold text-foreground">₹{Number(signupQuote.itemized.online_subtotal).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {Number(signupQuote.itemized.operators_subtotal) > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-border/20">
                            <span className="text-slate-600 dark:text-slate-400">
                              Operator Counters ({form.branches?.reduce((acc, b) => acc + (b.operatorQty || 0), 0) || 0} workstations x ₹{getComponentRate("operator_screens", 1200)}/mo)
                            </span>
                            <span className="font-semibold text-foreground">₹{Number(signupQuote.itemized.operators_subtotal).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {Number(signupQuote.itemized.services_subtotal) > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-border/20">
                            <span className="text-slate-600 dark:text-slate-400">
                              Service Queue Categories ({form.branches?.reduce((acc, b) => acc + (b.serviceQty || 0), 0) || 0} lines x ₹{getComponentRate("services", 800)}/mo)
                            </span>
                            <span className="font-semibold text-foreground">₹{Number(signupQuote.itemized.services_subtotal).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {Number(signupQuote.itemized.kiosks_subtotal) > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-border/20">
                            <span className="text-slate-600 dark:text-slate-400">
                              Display Units & Physical Kiosks ({form.branches?.reduce((acc, b) => acc + (b.kioskQty || 0), 0) || 0} units x ₹{getComponentRate("paper_roll_screens", 1500)}/mo)
                            </span>
                            <span className="font-semibold text-foreground">₹{Number(signupQuote.itemized.kiosks_subtotal).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-1 border-b border-border/20 text-emerald-600">
                          <span className="font-medium">Self-Ticketing QR Display Poster Kit</span>
                          <span className="font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">FREE INCLUDED</span>
                        </div>
                        {Number(signupQuote.itemized.delivery_subtotal) > 0 && (
                          <div className="flex justify-between items-center py-1 border-b border-border/20">
                            <span className="text-slate-600 dark:text-slate-400">Notification Delivery Gateway (WhatsApp / SMS)</span>
                            <span className="font-semibold text-foreground">₹{Number(signupQuote.itemized.delivery_subtotal).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        
                        {/* Subtotal, discount, GST and Grand Total summary */}
                        <div className="pt-2 space-y-1.5 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Base Monthly Subtotal</span>
                            <span>₹{Number(signupQuote.raw_total).toLocaleString("en-IN")}/mo</span>
                          </div>
                          {signupQuote.discount_percent > 0 && (
                            <div className="flex justify-between text-emerald-600 font-semibold">
                              <span>Duration Discount ({signupQuote.discount_percent}% Off for {form.durationMonths} mo)</span>
                              <span>−₹{Number(signupQuote.discount_amount).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-muted-foreground font-semibold">
                            <span>Contract Subtotal ({form.durationMonths || 1} mo)</span>
                            <span>₹{Number(signupQuote.total).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Goods & Services Tax (GST {Number(signupQuote.gst_percent)}%)</span>
                            <span>₹{Number(signupQuote.gst_amount).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between items-center text-foreground font-black text-base pt-2 border-t border-border/80">
                            <span>Grand Total (INR)</span>
                            <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">
                              ₹{Number(signupQuote.grand_total).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Payment & Activation Method Selector */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90 flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-[#4F46E5]" /> Payment & Workspace Activation Method
                      </h3>
                      <span className="text-[11px] text-muted-foreground font-medium">Select preferred payment mode</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Option 1: Online Payment */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode("online")}
                        className={cn(
                          "relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none",
                          paymentMode === "online"
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/25 shadow-md shadow-indigo-500/10"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                              paymentMode === "online" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            )}>
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 dark:text-white block">Online Payment</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Instant Account & Dashboard Activation</span>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                            paymentMode === "online" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600"
                          )}>
                            {paymentMode === "online" && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] w-full">
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Live Console Access
                          </span>
                          <span className="text-slate-400">Cards, UPI, NetBanking</span>
                        </div>
                      </button>

                      {/* Option 2: Request for Invoice */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode("invoice_request")}
                        className={cn(
                          "relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none",
                          paymentMode === "invoice_request"
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/25 shadow-md shadow-indigo-500/10"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                              paymentMode === "invoice_request" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            )}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 dark:text-white block">Request for Invoice</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Download Proforma PDF & Offline Settlement</span>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                            paymentMode === "invoice_request" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600"
                          )}>
                            {paymentMode === "invoice_request" && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] w-full">
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <Download className="h-3 w-3" /> Auto Download Proforma PDF
                          </span>
                          <span className="text-slate-400">Superadmin Review</span>
                        </div>
                      </button>
                    </div>

                    {/* Conditional Box 1: Online Payment details */}
                    {paymentMode === "online" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Enter Payment Details</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Gateway Test Mode
                          </span>
                        </div>

                        <FormInputField
                          id="cardName"
                          label="Cardholder Name"
                          value={form.cardName}
                          onChange={(v) => setFormKey("cardName", v)}
                          placeholder="e.g. Admin Cardholder"
                          icon={User}
                        />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <FormInputField
                              id="cardNumber"
                              label="Card Number"
                              value={form.cardNumber}
                              onChange={(v) => setFormKey("cardNumber", v)}
                              placeholder="4242 •••• •••• 4242"
                              icon={CreditCard}
                            />
                          </div>
                          <FormInputField
                            id="cardExpiry"
                            label="Expiry / CVC"
                            value={`${form.cardExpiry} / ${form.cardCvc}`}
                            onChange={() => {}}
                            placeholder="MM/YY / CVC"
                          />
                        </div>

                        {/* Simulation Test switch */}
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-red-500">
                            <ShieldAlert className="h-5 w-5 shrink-0" />
                            <div className="text-xs font-semibold leading-normal">
                              <span>Simulate Gateway Failure</span>
                              <span className="text-[10px] text-muted-foreground/70 block font-normal mt-0.5">Toggle to test the payment rejection error</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={form.simulateFailure}
                            onChange={(e) => setFormKey("simulateFailure", e.target.checked)}
                            className="rounded border-red-500/30 text-red-500 h-4 w-4 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Conditional Box 2: Dedicated Corporate Invoice Billing Form */}
                    {paymentMode === "invoice_request" && (
                      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-purple-950/10 p-5 sm:p-6 space-y-5 shadow-xs">
                        <div className="flex items-start justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                Corporate Billing & Tax Invoice Details
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Please specify registered billing information. These details will be printed on your official proforma invoice and saved for Superadmin approval.
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-3 py-1 rounded-full shrink-0 hidden sm:inline-flex items-center gap-1">
                            <FileCheck className="h-3.5 w-3.5" /> GST Compliant
                          </span>
                        </div>

                        {/* 7 Invoice Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Field 1: Billing Legal Name */}
                          <div className="space-y-1.5 text-left">
                            <label htmlFor="inv_billingName" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                              Billing Name <span className="text-rose-500 ml-0.5 font-bold">*</span>
                            </label>
                            <div className={cn(
                              "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center transition-all focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/10 shadow-2xs",
                              invoiceErrors.billingName && "border-rose-500 focus-within:border-rose-500"
                            )}>
                              <Building2 className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                              <input
                                id="inv_billingName"
                                type="text"
                                value={invoiceDetails.billingName}
                                onChange={(e) => {
                                  setInvoiceDetails((prev) => ({ ...prev, billingName: e.target.value }));
                                  if (invoiceErrors.billingName) setInvoiceErrors((prev) => ({ ...prev, billingName: "" }));
                                }}
                                placeholder="Legal Entity / Registered Company Name"
                                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                              />
                            </div>
                            {invoiceErrors.billingName && (
                              <p className="text-[11px] font-semibold text-rose-500 ml-1">{invoiceErrors.billingName}</p>
                            )}
                          </div>

                          {/* Field 2: Biller Email */}
                          <div className="space-y-1.5 text-left">
                            <label htmlFor="inv_billerEmail" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                              Biller / Accounts Email <span className="text-rose-500 ml-0.5 font-bold">*</span>
                            </label>
                            <div className={cn(
                              "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center transition-all focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/10 shadow-2xs",
                              invoiceErrors.billerEmail && "border-rose-500 focus-within:border-rose-500"
                            )}>
                              <Mail className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                              <input
                                id="inv_billerEmail"
                                type="email"
                                value={invoiceDetails.billerEmail}
                                onChange={(e) => {
                                  setInvoiceDetails((prev) => ({ ...prev, billerEmail: e.target.value }));
                                  if (invoiceErrors.billerEmail) setInvoiceErrors((prev) => ({ ...prev, billerEmail: "" }));
                                }}
                                placeholder="e.g. accounts@company.com"
                                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                              />
                            </div>
                            {invoiceErrors.billerEmail && (
                              <p className="text-[11px] font-semibold text-rose-500 ml-1">{invoiceErrors.billerEmail}</p>
                            )}
                          </div>

                          {/* Field 3: Contact Person */}
                          <div className="space-y-1.5 text-left">
                            <label htmlFor="inv_contactPerson" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                              Contact Person <span className="text-rose-500 ml-0.5 font-bold">*</span>
                            </label>
                            <div className={cn(
                              "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center transition-all focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/10 shadow-2xs",
                              invoiceErrors.contactPerson && "border-rose-500 focus-within:border-rose-500"
                            )}>
                              <User className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                              <input
                                id="inv_contactPerson"
                                type="text"
                                value={invoiceDetails.contactPerson}
                                onChange={(e) => {
                                  setInvoiceDetails((prev) => ({ ...prev, contactPerson: e.target.value }));
                                  if (invoiceErrors.contactPerson) setInvoiceErrors((prev) => ({ ...prev, contactPerson: "" }));
                                }}
                                placeholder="Full name of representative"
                                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                              />
                            </div>
                            {invoiceErrors.contactPerson && (
                              <p className="text-[11px] font-semibold text-rose-500 ml-1">{invoiceErrors.contactPerson}</p>
                            )}
                          </div>

                          {/* Field 4: Contact Person Number */}
                          <div className="space-y-1.5 text-left">
                            <label htmlFor="inv_contactPhone" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                              Contact Person Number <span className="text-rose-500 ml-0.5 font-bold">*</span>
                            </label>
                            <div className={cn(
                              "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center transition-all focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/10 shadow-2xs",
                              invoiceErrors.contactPhone && "border-rose-500 focus-within:border-rose-500"
                            )}>
                              <Phone className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                              <input
                                id="inv_contactPhone"
                                type="text"
                                value={invoiceDetails.contactPhone}
                                onChange={(e) => {
                                  setInvoiceDetails((prev) => ({ ...prev, contactPhone: e.target.value }));
                                  if (invoiceErrors.contactPhone) setInvoiceErrors((prev) => ({ ...prev, contactPhone: "" }));
                                }}
                                placeholder="e.g. +91 98765 43210"
                                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                              />
                            </div>
                            {invoiceErrors.contactPhone && (
                              <p className="text-[11px] font-semibold text-rose-500 ml-1">{invoiceErrors.contactPhone}</p>
                            )}
                          </div>

                          {/* Field 5: Billing Address (Full width) */}
                          <div className="md:col-span-2 space-y-1.5 text-left">
                            <label htmlFor="inv_billingAddress" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                              Billing Address <span className="text-rose-500 ml-0.5 font-bold">*</span>
                            </label>
                            <div className={cn(
                              "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center transition-all focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/10 shadow-2xs",
                              invoiceErrors.billingAddress && "border-rose-500 focus-within:border-rose-500"
                            )}>
                              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                              <input
                                id="inv_billingAddress"
                                type="text"
                                value={invoiceDetails.billingAddress}
                                onChange={(e) => {
                                  setInvoiceDetails((prev) => ({ ...prev, billingAddress: e.target.value }));
                                  if (invoiceErrors.billingAddress) setInvoiceErrors((prev) => ({ ...prev, billingAddress: "" }));
                                }}
                                placeholder="Registered Office / Street Address, City, State, PIN"
                                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                              />
                            </div>
                            {invoiceErrors.billingAddress && (
                              <p className="text-[11px] font-semibold text-rose-500 ml-1">{invoiceErrors.billingAddress}</p>
                            )}
                          </div>

                          {/* Field 6: GST (If applicable) */}
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center justify-between">
                              <label htmlFor="inv_gstNumber" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                GST Number <span className="text-slate-400 font-normal">(If applicable)</span>
                              </label>
                              <span className="text-[10px] text-slate-400">Optional</span>
                            </div>
                            <div className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center transition-all focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/10 shadow-2xs">
                              <FileCheck className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                              <input
                                id="inv_gstNumber"
                                type="text"
                                value={invoiceDetails.gstNumber}
                                onChange={(e) => setInvoiceDetails((prev) => ({ ...prev, gstNumber: e.target.value }))}
                                placeholder="e.g. 24AAAAA0000A1Z5"
                                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 uppercase"
                              />
                            </div>
                          </div>

                          {/* Field 7: Further Instructions / PO Notes */}
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center justify-between">
                              <label htmlFor="inv_furtherInstructions" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                Further Instructions / PO Reference
                              </label>
                              <span className="text-[10px] text-slate-400">Optional</span>
                            </div>
                            <div className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center transition-all focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/10 shadow-2xs">
                              <FileText className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                              <input
                                id="inv_furtherInstructions"
                                type="text"
                                value={invoiceDetails.furtherInstructions}
                                onChange={(e) => setInvoiceDetails((prev) => ({ ...prev, furtherInstructions: e.target.value }))}
                                placeholder="e.g. PO-8921; wire transfer settlement"
                                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Process Highlights Timeline */}
                        <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2 text-xs">
                          <span className="font-bold text-indigo-950 dark:text-indigo-200 block text-[11px] uppercase tracking-wider">
                            What happens after clicking "Request Invoice"?
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-slate-600 dark:text-slate-300 text-[11.5px]">
                            <div className="flex items-start gap-2">
                              <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold">1</div>
                              <span><strong>Instant PDF Generation:</strong> Official GST-compliant proforma invoice downloads directly to your device.</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold">2</div>
                              <span><strong>Superadmin Dispatch:</strong> Your company profile and quote route to executive accounts for verification.</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold">3</div>
                              <span><strong>Console Unlock:</strong> Settle payment via wire/PO and log in immediately once approved.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-3">
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => {
                        setComingFromPayment(true);
                        setStep(1);
                      }}
                      className="flex-1 h-12 sm:h-[50px] rounded-xl font-bold border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to Plan Builder
                    </Button>
                    <Button 
                      type="button" 
                      disabled={submitting} 
                      onClick={handleSubmitPayment}
                      className={cn(
                        "flex-[1.5] h-12 sm:h-[50px] rounded-xl text-white font-semibold text-base shadow-lg transition-all duration-200 border-none cursor-pointer",
                        paymentMode === "invoice_request"
                          ? "bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:brightness-105 active:scale-[0.99]"
                          : "bg-gradient-to-r from-[#3B66F5] via-[#4F46E5] to-[#7C3AED] shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:brightness-105 active:scale-[0.99]"
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          {paymentMode === "invoice_request" ? "Submitting Inquiry & Generating PDF..." : "Authorizing..."}
                        </>
                      ) : paymentMode === "invoice_request" ? (
                        <>
                          <Download className="mr-2 h-5 w-5" />
                          Request Invoice & Download Proforma PDF
                        </>
                      ) : (
                        <>Authorize & Activate Account</>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Footer info below card */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <span>Protected by 256-bit SSL encryption. By continuing, you agree to Quesole's </span>
          <a href="#terms" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Terms of Service</a>
          <span> and </span>
          <a href="#privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
