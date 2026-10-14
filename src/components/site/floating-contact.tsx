import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll } from "motion/react";
import { MessageSquare, X, Phone, Mail, MapPin, ArrowRight, MessageCircle, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Stagger configurations for child elements
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 22 },
    },
  };

  return (
    <div
      className={cn(
        "fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-[50] font-sans flex flex-col items-center gap-3.5 pointer-events-auto select-none"
      )}
    >
      {/* Contact Card Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 25 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="w-[290px] sm:w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-violet to-ice p-[1.5px] shadow-[0_20px_50px_rgba(99,102,241,0.3)]"
          >
            {/* Inner Glassmorphic Container */}
            <div className="w-full h-full rounded-[1.9rem] bg-slate-950/95 backdrop-blur-xl p-4 text-white relative">
              
              {/* Top Header Controls */}
              <div className="flex items-center justify-between">
                
                {/* Glowing Avatar */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-violet to-ice shadow-lg border border-white/10">
                    <MessageSquare className="h-5 w-5 fill-white/10" />
                    <div className="absolute -inset-1 rounded-full border border-primary/30 animate-ping opacity-25" />
                    <div className="absolute -inset-2 rounded-full border border-violet/10" />
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-7.5 w-7.5 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all duration-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Title & Description */}
              <div className="mt-3.5 space-y-0.5">
                <h3 className="font-display text-xl font-extrabold leading-none tracking-tight text-white">
                  Let's Talk!
                </h3>
                <p className="text-[10px] text-slate-300 font-semibold">
                  We're here to help you optimize your queues.
                </p>
              </div>

              {/* Gradient Separator line */}
              <div className="relative my-3.5 flex items-center justify-center">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-violet to-transparent" />
                <div className="absolute h-1 w-1 rounded-full bg-ice shadow-[0_0_8px_#38bdf8] animate-pulse" />
              </div>

              {/* Contact Rows */}
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="space-y-2.5"
              >
                
                {/* Phone Row */}
                <motion.div
                  variants={itemVariants}
                  className="group relative flex items-center justify-between gap-2.5 rounded-xl border border-white/5 bg-slate-900/60 p-2.5 hover:bg-slate-900/90 hover:border-primary/30 hover:-translate-y-[1px] transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-slate-950 border border-white/5 text-violet-400 group-hover:scale-105 transition-transform">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider leading-none">Call Us</span>
                      <span className="text-xs font-black text-white block mt-0.5 select-all">+91 7043884422</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0 transform translate-x-1.5 group-hover:translate-x-0">
                    <a
                      href="tel:+917043884422"
                      title="Call directly"
                      className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 hover:scale-105 text-white shadow-sm transition-all border-0 cursor-pointer"
                    >
                      <Phone className="h-3 w-3" />
                    </a>
                    <a
                      href="https://wa.me/917043884422"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Chat on WhatsApp"
                      className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-green-500 hover:bg-green-600 hover:scale-105 text-white shadow-sm transition-all border-0 cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5 fill-current" />
                    </a>
                  </div>
                </motion.div>

                {/* Email Row */}
                <motion.a
                  variants={itemVariants}
                  href="mailto:hello@quesols.com"
                  className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/60 p-2.5 hover:bg-slate-900/90 hover:border-primary/30 hover:-translate-y-[1px] transition-all duration-300 text-left outline-none group shadow-sm"
                >
                  <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-slate-950 border border-white/5 text-ice group-hover:scale-105 transition-transform">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider leading-none">Email Us</span>
                    <span className="text-xs font-black text-white block mt-0.5 group-hover:text-primary transition-colors">
                      hello@quesols.com
                    </span>
                  </div>
                </motion.a>

                {/* Location Row */}
                <motion.div
                  variants={itemVariants}
                  className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/60 p-2.5 hover:-translate-y-[1px] transition-all duration-300 shadow-sm"
                >
                  <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-slate-950 border border-white/5 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider leading-none">Visit Us</span>
                    <span className="text-[11px] font-semibold text-white block mt-0.5 leading-tight">
                      Titanium Business Park, Makarba, Ahmedabad
                    </span>
                  </div>
                </motion.div>

                {/* Inquiry Buttons */}
                <motion.div variants={itemVariants} className="pt-1.5 space-y-3">
                  <Button
                    asChild
                    className="w-full h-9.5 rounded-full bg-gradient-to-r from-primary via-violet to-ice hover:opacity-95 font-bold shadow-lg border-0 cursor-pointer transform hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1.5 group text-white text-[11px] tracking-wide font-display"
                  >
                    <Link to="/contact" onClick={() => setIsOpen(false)}>
                      <span>Send Inquiry Now</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>

                  <div className="space-y-1.5 text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Prefer a quick chat?
                    </span>
                    
                    <a
                      href="https://wa.me/917043884422"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full h-8.5 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-transparent hover:bg-white/5 text-[11px] text-white font-extrabold transition-all cursor-pointer hover:border-green-500/50 duration-200"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-green-400 fill-current animate-pulse" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  </div>
                </motion.div>

              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPPER SIDE BUTTON: Scroll to Top Button with Circular Scroll Progress Ring */}
      <AnimatePresence>
        {hasScrolled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 15 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={scrollToTop}
            className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-lg border border-slate-200/90 dark:border-slate-800 cursor-pointer outline-none transition-shadow hover:shadow-xl"
            aria-label="Scroll back to top"
          >
            {/* Outer Circular Scroll Progress SVG Ring */}
            <svg className="absolute inset-0 -rotate-90 h-full w-full p-0.5 pointer-events-none" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                className="stroke-slate-200/70 dark:stroke-slate-800"
                strokeWidth="2.5"
                fill="none"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="16"
                stroke="url(#scroll-ring-gradient)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                style={{
                  pathLength: scrollYProgress,
                }}
              />
              <defs>
                <linearGradient id="scroll-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.53 0.17 283)" />
                  <stop offset="50%" stopColor="oklch(0.62 0.17 300)" />
                  <stop offset="100%" stopColor="oklch(0.7 0.16 42)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Up Arrow Icon */}
            <ArrowUp className="h-5 w-5 stroke-[2.5] relative z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* DOWN SIDE BUTTON: Message / Contact Action Button */}
      <div className="relative group">
        {/* Concentric Pulsing Halo Rings around the Message Button */}
        <div className="absolute inset-0 rounded-full bg-violet-600/30 blur-md animate-pulse pointer-events-none" />
        <div className="absolute -inset-1.5 rounded-full border-2 border-violet-500/30 animate-ping pointer-events-none opacity-30" />
        <div className="absolute -inset-2.5 rounded-full border border-violet-400/20 pointer-events-none" />
        <div className="absolute -inset-3.5 rounded-full border border-violet-400/10 pointer-events-none" />

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "relative flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full text-white shadow-2xl outline-none border-none cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95",
            isOpen
              ? "bg-slate-900 hover:bg-slate-950 text-white shadow-[0_10px_30px_rgba(15,23,42,0.5)]"
              : "bg-gradient-to-br from-violet-700 via-indigo-600 to-violet-800 shadow-[0_12px_35px_rgba(124,58,237,0.5)] hover:shadow-[0_15px_40px_rgba(124,58,237,0.6)]"
          )}
          aria-label="Toggle contact message dialog"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-6 w-6 stroke-[2.5]" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageSquare className="h-6 w-6 stroke-[2]" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

    </div>
  );
}
