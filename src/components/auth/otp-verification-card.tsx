import { useState, useEffect } from "react";
import { Loader2, ArrowRight, ArrowLeft, Mail, RefreshCw, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OtpVerificationCardProps {
  maskedEmail: string;
  tempToken: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  brandPrimaryColor?: string;
  portalName?: string;
}

export function OtpVerificationCard({
  maskedEmail,
  tempToken,
  onVerify,
  onResend,
  onBack,
  brandPrimaryColor = "#4F46E5",
  portalName = "Quesole",
}: OtpVerificationCardProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify ?? otp).trim();
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code sent to your email.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onVerify(code);
    } catch (err: any) {
      setError(err?.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await onResend();
      setCountdown(60);
      setOtp("");
      toast.success("New code sent", {
        description: `A fresh 6-digit verification code was sent to ${maskedEmail}.`,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to resend code. Please try again.");
      toast.error("Resend failed", { description: err?.message || "Please wait a moment." });
    } finally {
      setResending(false);
    }
  };

  // Auto-submit when user finishes typing 6 digits
  const handleOtpChange = (val: string) => {
    setOtp(val);
    setError(null);
    if (val.length === 6) {
      handleVerify(val);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-4 text-left"
    >
      {/* Header with Email Icon & Title */}
      <div className="flex items-center gap-3.5 pb-1">
        <div 
          style={{ backgroundColor: `${brandPrimaryColor}15`, borderColor: `${brandPrimaryColor}30`, color: brandPrimaryColor }}
          className="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm"
        >
          <Mail className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Verify your email
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-normal mt-0.5">
            Two-step security verification for {portalName}
          </p>
        </div>
      </div>

      {/* Target Email Banner */}
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          We sent a 6-digit security code to{" "}
          <strong className="text-slate-900 dark:text-white font-mono">{maskedEmail}</strong>.
          Enter the code below to complete your login.
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* 6-Digit OTP Input */}
      <div className="py-2 flex flex-col items-center justify-center space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
          Enter 6-Digit Security Code
        </label>
        
        <div className="flex justify-center w-full">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={handleOtpChange}
            containerClassName="gap-2 sm:gap-2.5 justify-center"
          >
            <InputOTPGroup className="gap-2 sm:gap-2.5">
              <InputOTPSlot index={0} className="w-11 h-13 sm:w-12 sm:h-14 text-lg sm:text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" />
              <InputOTPSlot index={1} className="w-11 h-13 sm:w-12 sm:h-14 text-lg sm:text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" />
              <InputOTPSlot index={2} className="w-11 h-13 sm:w-12 sm:h-14 text-lg sm:text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" />
            </InputOTPGroup>
            <span className="text-slate-400 font-bold px-1 select-none">—</span>
            <InputOTPGroup className="gap-2 sm:gap-2.5">
              <InputOTPSlot index={3} className="w-11 h-13 sm:w-12 sm:h-14 text-lg sm:text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" />
              <InputOTPSlot index={4} className="w-11 h-13 sm:w-12 sm:h-14 text-lg sm:text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" />
              <InputOTPSlot index={5} className="w-11 h-13 sm:w-12 sm:h-14 text-lg sm:text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 text-center">
          Code is valid for 10 minutes · Check spam or promotions folder if delayed
        </p>
      </div>

      {/* Verify Button */}
      <button
        type="button"
        disabled={loading || otp.length !== 6}
        onClick={() => handleVerify()}
        style={{
          background: `linear-gradient(135deg, ${brandPrimaryColor}, #4338CA)`,
        }}
        className={cn(
          "w-full h-11 sm:h-12 rounded-xl text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 border-none cursor-pointer",
          (loading || otp.length !== 6) && "opacity-60 cursor-not-allowed shadow-none"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying Code...
          </>
        ) : (
          <>
            Verify & Continue to Console <ArrowRight className="h-4 w-4 ml-0.5" />
          </>
        )}
      </button>

      {/* Resend and Return Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-semibold cursor-pointer border-none bg-transparent p-1 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to credentials
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resending || loading}
          className={cn(
            "inline-flex items-center gap-1.5 font-bold cursor-pointer border-none bg-transparent p-1 transition-colors",
            countdown > 0 
              ? "text-slate-400 dark:text-slate-500 cursor-not-allowed" 
              : "text-indigo-600 dark:text-indigo-400 hover:underline"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", resending && "animate-spin")} />
          {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
        </button>
      </div>
    </motion.div>
  );
}
