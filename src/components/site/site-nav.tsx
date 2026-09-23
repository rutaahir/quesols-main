import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Home, Info, Cpu, Play, Users, Mail, ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Home", icon: Home, badge: null },
  { to: "/about", label: "About Us", icon: Info, badge: null },
  { to: "/services", label: "Services", icon: Cpu, badge: "4 Methods" },
  { to: "/live-demo", label: "Live Demo", icon: Play, badge: "Interactive" },
  { to: "/partnerships", label: "Partnerships", icon: Users, badge: null },
  { to: "/contact", label: "Contact Us", icon: Mail, badge: null },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.3 });
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all duration-300 font-sans",
          scrolled ? "p-3" : "p-0"
        )}
      >
        <motion.div
          style={{ scaleX: progress }}
          className="absolute top-0 left-0 right-0 h-[3px] origin-left bg-gradient-to-r from-violet-600 to-blue-500 z-50"
          aria-hidden
        />
        <div
          className={cn(
            "transition-all duration-500 ease-out mx-auto w-full relative",
            scrolled
              ? "mt-2 max-w-6xl shadow-[0_20px_40px_-12px_rgba(99,102,241,0.25)] px-6 py-1.5 rounded-full"
              : "mt-0 max-w-full border-b border-white/10 bg-slate-950/60 backdrop-blur-md px-5 py-2.5 sm:px-8 shadow-none"
          )}
        >
          {scrolled && (
            <>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes nav-border-spin {
                  0% { transform: translate(-50%, -50%) rotate(0deg); }
                  100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
              `}} />
              <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-full">
                <div 
                  className="absolute left-1/2 top-1/2 h-[300%] w-[300%]"
                  style={{
                    background: "conic-gradient(from 0deg, #8b5cf6, #3b82f6, #ec4899, #8b5cf6)",
                    transform: "translate(-50%, -50%)",
                    animation: "nav-border-spin 6s linear infinite"
                  }}
                />
                <div 
                  className="absolute bg-white/94 dark:bg-slate-950/94 backdrop-blur-md rounded-full"
                  style={{
                    top: "1.5px",
                    right: "1.5px",
                    bottom: "1.5px",
                    left: "1.5px"
                  }}
                />
              </div>
            </>
          )}
          <nav className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5 hover:scale-105 transition-transform shrink-0">
              {!scrolled ? (
                <div className="bg-white rounded-full px-3.5 py-1 flex items-center justify-center shadow-sm border border-slate-200/40">
                  <Logo size={18} />
                </div>
              ) : (
                <Logo size={22} />
              )}
            </Link>

            <div className="hidden items-center gap-1 lg:gap-1.5 md:flex">
              {LINKS.map((l, idx) => (
                <Link
                  key={l.label}
                  to={l.to}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  activeOptions={{ exact: l.to === "/" }}
                >
                  {({ isActive }) => (
                    <span
                      className={cn(
                        "relative group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 whitespace-nowrap lg:text-sm lg:px-4 cursor-pointer",
                        isActive
                          ? (scrolled ? "text-brand font-extrabold" : "text-white font-extrabold")
                          : (scrolled ? "text-muted-foreground hover:text-brand" : "text-slate-200 hover:text-white")
                      )}
                    >
                      {hoveredIndex === idx && (
                        <motion.span
                          layoutId="navHoverBg"
                          className={cn(
                            "absolute inset-0 rounded-full -z-10",
                            scrolled ? "bg-brand/5 border border-brand/10" : "bg-white/10 border border-white/20"
                          )}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      )}
                      <l.icon className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                      <span>{l.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="activeUnderline"
                          className={cn(
                            "absolute bottom-[-1px] left-2 right-2 h-[2px] rounded-full",
                            scrolled
                              ? "bg-gradient-to-r from-violet-600 to-blue-500 shadow-[0_1px_8px_rgba(99,102,241,0.5)]"
                              : "bg-gradient-to-r from-white to-slate-200 shadow-[0_1px_8px_rgba(255,255,255,0.6)]"
                          )}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full font-bold px-4 py-2 transition-all duration-200",
                  scrolled
                    ? "text-foreground hover:bg-accent/50"
                    : "text-slate-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full font-bold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-brand/20 hover:scale-[1.03] transition-all duration-200 border-0 px-5 py-2 group">
                <Link to="/signup" className="flex items-center gap-1.5">
                  <span>Register</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            {/* Mobile Hamburger Trigger */}
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-900/80 text-white hover:bg-slate-800 md:hidden transition-all shadow-md active:scale-95 cursor-pointer"
              onClick={() => setOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </nav>
        </div>
      </header>

      {/* Off-Canvas Half-Width Full-Height Side Navigation Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Dark Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
            />

            {/* Right Side Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 w-[68vw] max-w-[290px] h-full bg-slate-950 text-white border-l border-white/15 shadow-2xl flex flex-col justify-between p-5 md:hidden overflow-y-auto"
            >
              {/* Header inside Side Drawer */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <div className="bg-white rounded-full px-3 py-0.5 flex items-center justify-center shadow-md">
                    <Logo size={16} />
                  </div>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Spaced Elegant Navigation Links */}
              <div className="my-auto py-4 space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-400 px-2 mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Navigation
                </div>

                {LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    activeOptions={{ exact: l.to === "/" }}
                  >
                    {({ isActive }) => (
                      <div
                        className={cn(
                          "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 border",
                          isActive
                            ? "bg-gradient-to-r from-violet-600/90 to-blue-600/90 text-white border-violet-400/40 shadow-md shadow-violet-600/20"
                            : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <l.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-violet-400")} />
                          <span>{l.label}</span>
                        </div>
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5", isActive ? "text-white" : "text-slate-600")} />
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              {/* Bottom CTAs Stack */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <Button asChild size="sm" className="w-full h-10 rounded-xl font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-lg border-0 text-xs group">
                  <Link to="/signup" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5">
                    <span>Register</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>

                <Button asChild variant="outline" size="sm" className="w-full h-10 rounded-xl font-bold border-white/20 bg-white/5 text-white hover:bg-white/15 text-xs">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>

                <div className="pt-1 text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
                  <span>Quesole • Operational</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
