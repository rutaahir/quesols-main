import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff, Sun, Moon, ShieldCheck, User, FileText, Clock, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/site/logo";
import { useQuesole } from "@/lib/quesole/store";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedAuthBackground } from "@/components/auth/animated-auth-background";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Quesole console" },
      {
        name: "description",
        content:
          "Sign in to the Quesole console to run branch queues, monitor live dashboards and manage appointments.",
      },
      { property: "og:title", content: "Sign in to Quesole" },
      { property: "og:description", content: "Access your queue operations console." },
    ],
  }),
  component: LoginPage,
});

interface FormInputFieldProps {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  errorMessage?: string | undefined;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  rightElement?: React.ReactNode;
}

function FormInputField({
  id,
  label,
  required,
  type = "text",
  value,
  onChange,
  error,
  errorMessage,
  placeholder,
  icon: Icon,
  rightElement,
}: FormInputFieldProps) {
  return (
    <div className="w-full space-y-1.5 text-left">
      <label htmlFor={id} className="text-[12px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center">
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
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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

function LoginPage() {
  const { signIn, signOut, state } = useQuesole();
  const navigate = useNavigate();
  const [email, setEmail] = useState("rhea.mehta@apollocare.in");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingInvoiceInfo, setPendingInvoiceInfo] = useState<{ companyName: string; email: string; companyId: string; slug?: string | undefined } | null>(null);

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    
    let hasError = false;
    if (!email.includes("@")) {
      setEmailError(true);
      hasError = true;
    } else {
      setEmailError(false);
    }

    if (password.length < 4) {
      setPasswordError(true);
      hasError = true;
    } else {
      setPasswordError(false);
    }

    if (hasError) {
      setError("Please fix the validation errors below.");
      return;
    }

    setError(null);
    setEmailError(false);
    setPasswordError(false);
    setLoading(true);
    
    try {
      const sessionData = await signIn(email, password);
      
      const company = state.companies.find((c) => String(c.id) === String(sessionData.companyId));
      const branch = state.branches.find((b) => String(b.id) === String(sessionData.branchId));
      
      const isPendingInvoice = 
        sessionData.onboardingStatus === "pending_invoice_approval" ||
        company?.onboardingStatus === "pending_invoice_approval";

      if (isPendingInvoice) {
        await signOut();
        setPendingInvoiceInfo({
          companyName: company?.name || sessionData.companyName || "Your Organization",
          email: sessionData.email,
          companyId: sessionData.companyId,
          slug: company?.slug || sessionData.companySlug,
        });
        toast.info("Invoice Request Pending Approval", {
          description: "Our executive team is reviewing your inquiry. Dashboard access will be activated once approved."
        });
        return;
      }

      toast.success("Signed in", { description: "Welcome back to your operations console." });
      
      if (sessionData.role === "super_admin") {
        void navigate({ to: "/app" });
      } else if (sessionData.role === "company_admin" && !sessionData.hasPurchasedPlan) {
        toast.info("Plan Selection Required", { description: "Please configure and purchase a plan to activate your dashboard." });
        void navigate({ to: "/signup", search: { step: 1 } });
      } else if (sessionData.role === "company_admin" && (company?.slug || sessionData.companySlug)) {
        void navigate({ to: "/$companySlug/admin", params: { companySlug: company?.slug || sessionData.companySlug! } });
      } else if (
        (sessionData.role === "branch_admin" || sessionData.role === "operator") &&
        company?.slug &&
        branch?.slug
      ) {
        void navigate({
          to: "/$companySlug/branches/$branchSlug",
          params: { companySlug: company.slug, branchSlug: branch.slug },
        });
      } else {
        void navigate({ to: "/app" });
      }
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
      toast.error("Sign in failed", { description: err?.message || "Please check your credentials." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F8F9FE] dark:bg-[#080C16] text-foreground font-sans relative overflow-x-hidden py-3 sm:py-5 px-3 sm:px-6 flex flex-col items-center justify-start selection:bg-indigo-500/20">
      
      {/* Dynamic Animated Futuristic Kiosk & Lobby Background */}
      <AnimatedAuthBackground />

      {/* Top Header bar with Logo, Status Pill, and Theme Toggle */}
      <div className="w-full max-w-[580px] flex items-center justify-between mb-2.5 sm:mb-3.5 px-1 z-20 transition-all">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Logo size={36} />
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/75 dark:bg-slate-900/75 border border-slate-200/70 dark:border-slate-800 backdrop-blur-md text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Smart Queue Platform</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Register
            </Link>
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Floating Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-[580px]"
      >
        <div className="relative backdrop-blur-2xl bg-white/94 dark:bg-[#0c101d]/92 rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 shadow-[0_30px_100px_-15px_rgba(79,70,229,0.22),0_4px_30px_-5px_rgba(0,0,0,0.04),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_30px_100px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.1)_inset] border border-white/80 dark:border-white/10 overflow-hidden space-y-4 sm:space-y-5">
          
          {/* Top Edge Specular Glow */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />
          
          {pendingInvoiceInfo ? (
            <div className="space-y-5 text-center py-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-inner">
                <Clock className="h-8 w-8 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Invoice Request Under Review</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Account Pending Approval
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Your registration and offline invoice request for <strong>{pendingInvoiceInfo.companyName}</strong> has been received by our Superadmin team.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/40 font-semibold">
                  <span className="text-muted-foreground">Inquiry Status</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Awaiting Executive Review
                  </span>
                </div>
                <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <p>• Our administrative executive will contact you shortly at <strong>{pendingInvoiceInfo.email}</strong> to verify and finalize your enterprise account onboarding.</p>
                  <p>• Once approved by Superadmin, your company command console will be activated and you can sign in directly.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (pendingInvoiceInfo.companyId) {
                      window.open(`/api/companies/${pendingInvoiceInfo.companyId}/invoice-pdf/`, "_blank");
                    }
                  }}
                  className="flex-1 h-11 rounded-xl font-bold border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer flex items-center justify-center text-xs sm:text-sm"
                >
                  <Download className="mr-2 h-4 w-4" /> Download Invoice PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPendingInvoiceInfo(null)}
                  className="flex-1 h-11 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer flex items-center justify-center text-xs sm:text-sm shadow-md shadow-indigo-500/20"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Return to Login
                </button>
              </div>

              <div className="pt-2 text-center text-xs text-muted-foreground">
                Need immediate assistance? Contact our team at{" "}
                <a href="mailto:support@quesole.com" className="text-indigo-600 font-semibold hover:underline">support@quesole.com</a>
              </div>
            </div>
          ) : (
            <>
              {/* Card Title Header with purple icon */}
              <div className="flex items-center gap-3.5 text-left pb-1">
                <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-[#4F46E5] shrink-0 shadow-sm">
                  <Lock className="h-6 w-6 text-[#4F46E5]" />
                </div>
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#181B34] dark:text-white tracking-tight leading-tight">
                    Sign in to your console
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-normal mt-0.5">
                    Access your operations and live queue monitors.
                  </p>
                </div>
              </div>

          {/* Section Divider */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[#4F46E5]" />
              <span className="text-xs sm:text-sm font-bold text-[#181B34] dark:text-white">
                Admin & Operator Credentials
              </span>
            </div>
            <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800 mx-3 hidden sm:block" />
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">
              Authorized access
            </span>
          </div>

          {/* Form */}
          <form className="space-y-3.5" onSubmit={submit}>
            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                {error}
              </div>
            )}

            <FormInputField
              id="email"
              label="Work Email Address"
              required
              type="email"
              value={email}
              onChange={setEmail}
              error={emailError}
              errorMessage="Enter a valid work email address"
              placeholder="name@company.com"
              icon={Mail}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between min-h-[22px]">
                <label htmlFor="password" className="text-[12px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                  Password <span className="text-rose-500 ml-0.5 font-bold">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div
                className={cn(
                  "h-11 sm:h-12 w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 flex items-center transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 focus-within:bg-white dark:focus-within:bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                  passwordError && "border-destructive/80 focus-within:border-destructive focus-within:ring-destructive/10"
                )}
              >
                <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mr-2.5" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400/90"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1 shrink-0 ml-1 border-none bg-transparent"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs font-semibold text-destructive mt-0.5 ml-1 text-left">
                  Password must be at least 4 characters
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-1.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 sm:h-12 rounded-xl text-white font-semibold text-sm sm:text-base shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:brightness-105 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 border-none cursor-pointer bg-gradient-to-r from-[#3B66F5] via-[#4F46E5] to-[#7C3AED]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Console <ArrowRight className="h-4 w-4 ml-0.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SSO Options */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Or sign in with
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toast.info("Single Sign-On is not configured for your domain.")}
                className="flex items-center justify-center gap-2 h-10 sm:h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <img src="https://www.svgrepo.com/show/355037/google.svg" className="h-4 w-4" alt="" />
                Google
              </button>
              <button
                type="button"
                onClick={() => toast.info("Single Sign-On is not configured for your domain.")}
                className="flex items-center justify-center gap-2 h-10 sm:h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <img src="https://www.svgrepo.com/show/448240/microsoft.svg" className="h-4 w-4" alt="" />
                Microsoft
              </button>
            </div>
          </div>

          {/* Footer inside card */}
          <div className="flex flex-col items-center justify-center gap-1.5 pt-1 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Don't have a company account yet?{" "}
              <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
                Register company
              </Link>
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Protected by 256-bit SSL encryption</span>
            </div>
          </div>
            </>
          )}
        </div>

        {/* Legal links below card */}
        <div className="mt-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
          <span>By signing in, you agree to Quesole's </span>
          <a href="#terms" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Terms of Service</a>
          <span> and </span>
          <a href="#privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Privacy Policy</a>.
        </div>
      </motion.div>
    </div>
  );
}
