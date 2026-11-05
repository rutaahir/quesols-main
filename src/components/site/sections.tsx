import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  BellRing,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  FileText,
  Gauge,
  Layers,
  Mail,
  Map,
  MonitorPlay,
  Play,
  Printer,
  QrCode,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Ticket,
  Timer,
  User,
  UserPlus,
  Users,
  Volume2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useInView, useScroll, useTransform, useReducedMotion, AnimatePresence, motion as m } from "motion/react";
import { SectionHeader } from "./section-header";
import { Button } from "@/components/ui/button";
import { TicketScene3D } from "@/components/quesole/ticket-scene-3d";
import { HeroBackground } from "@/components/quesole/hero-background";
import { DemoReelModal } from "@/components/quesole/demo-reel";
import { CountUp, EASE, FlipNumber, Magnetic, Reveal, TiltCard, motion } from "@/components/quesole/motion";
import { HOURLY_VOLUME, PLANS, WEEKLY_TREND } from "@/lib/quesole/seed";
import { cn } from "@/lib/utils";
import photoHealthcare from "@/assets/photo-healthcare.jpg";
import photoBanking from "@/assets/photo-banking.jpg";
import photoGovernment from "@/assets/photo-government.jpg";
import photoRetail from "@/assets/photo-retail.jpg";
import heroVideo from "@/assets/quesols.mp4";

import { HeroFeaturesCarousel } from "./hero-features-carousel";
export { HeroFeaturesCarousel };

type Tone = "plain" | "pearl" | "ice" | "ink";

const TONE_BG: Record<Tone, string> = {
  plain: "",
  pearl: "",
  ice: "",
  ink: "bg-ink text-foreground",
};

export function Section({
  id,
  className,
  children,
  eyebrow,
  title,
  lead,
  tone = "plain",
  align = "left",
  wide = false,
}: {
  id?: string;
  className?: string;
  children?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  lead?: string;
  tone?: Tone;
  align?: "left" | "center";
  wide?: boolean;
}) {
  const ink = tone === "ink";
  return (
    <section id={id} className={cn("relative z-10 w-full overflow-hidden", TONE_BG[tone])}>
      <div
        className={cn(
          "mx-auto w-full px-4 py-8 sm:py-10 lg:px-6 lg:py-12",
          wide ? "max-w-[1800px] w-[98%]" : "max-w-[1728px] w-[98%]",
          className,
        )}
      >
        {eyebrow || title ? (
          <Reveal className={cn("mb-6 sm:mb-8 max-w-3xl", align === "center" && "mx-auto text-center")}>
            {eyebrow ? (
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  ink
                    ? "border-primary/20 bg-primary/5 text-primary"
                    : "border-border bg-surface text-primary",
                )}
              >
                {eyebrow}
              </span>
            ) : null}
            {title ? (
              <h2
                className={cn(
                  "mt-5 font-display text-[2.5rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-[3.75rem] text-foreground",
                )}
              >
                {title}
              </h2>
            ) : null}
            {lead ? (
              <p
                className={cn(
                  "mt-5 text-lg leading-relaxed text-muted-foreground",
                )}
              >
                {lead}
              </p>
            ) : null}
          </Reveal>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/* ------------------------------- 01 HERO ------------------------------- */

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 0.6], [0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const textScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.96]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  const enter = (delay: number) => ({
    initial: { opacity: 0.9, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: EASE, delay: Math.min(delay, 0.15) },
  });

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current.play().catch((err) => {
        console.error("Video autoplay failed:", err);
      });
    }
  }, []);

  return (
    <section
      id="hero-section"
      ref={ref}
      className="relative z-20 flex h-[calc(100svh-clamp(56px,8vh,80px))] min-h-[520px] sm:min-h-[560px] lg:min-h-[620px] flex-col justify-between pt-14 sm:pt-16 pb-0 overflow-visible"
    >
      {/* Background Video - Full Clarity & High Impact */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <m.video
          ref={videoRef}
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
          style={{ scale: videoScale, y: videoY }}
          className="h-full w-full object-cover opacity-95 lg:opacity-100 filter brightness-[1.02] contrast-[1.05]"
        />
        {/* Soft, focused text protection gradient — ensures crystal clear text readability over video without a box */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/45 to-transparent lg:w-[58%] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Middle Content Row: Hero Copy with High-Contrast Highlighted Typography (No Container Box) */}
      <div className="mx-auto flex w-full max-w-[1728px] w-[98%] flex-1 items-center px-4 sm:px-8 lg:px-12 pb-[clamp(120px,18vh,180px)] sm:pb-[clamp(130px,20vh,190px)] lg:pb-[clamp(140px,20vh,200px)]">
        {/* Copy sitting directly over video with high contrast and smooth animations */}
        <m.div
          style={{ y: textY, opacity: textOpacity, scale: textScale }}
          className="flex flex-col items-start text-left w-full max-w-[min(100%,600px)] sm:max-w-[min(90%,640px)] lg:max-w-2xl py-2"
        >
          {/* Ultra-Premium Glassmorphic Eyebrow Badge */}
          <m.div
            {...enter(0)}
            className="inline-flex items-center gap-2 rounded-full border border-violet-300/80 dark:border-violet-700/80 bg-white/95 dark:bg-slate-900/95 px-3.5 py-1.5 shadow-[0_2px_14px_rgba(99,102,241,0.14)] backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-coral" />
            </span>
            <span className="text-xs font-bold tracking-wide text-slate-800 dark:text-slate-100">
              The Queue, Reimagined
            </span>
          </m.div>

          {/* Animated, Bold, Highly Visible Headline */}
          <h1 className="mt-3.5 font-display text-[clamp(1.85rem,6vw,2.5rem)] sm:text-[clamp(2.25rem,5vw,3rem)] lg:text-[3.5rem] xl:text-[4rem] font-black leading-[1.06] tracking-tight text-slate-950 dark:text-white drop-shadow-[0_2px_14px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
            <m.span {...enter(0.06)} className="inline-block">
              Smart Queue Management
            </m.span>
            <br className="hidden sm:inline" />
            <m.span
              {...enter(0.12)}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                backgroundSize: "200% auto",
              }}
              className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 dark:from-violet-400 dark:via-indigo-300 dark:to-cyan-300 drop-shadow-[0_4px_24px_rgba(99,102,241,0.4)] font-black"
            >
              Better Experience.
            </m.span>
          </h1>

          {/* Highly Legible Description with Highlighted Floating Badges */}
          <m.p
            {...enter(0.18)}
            className="mt-3 max-w-xl text-base sm:text-lg leading-relaxed text-slate-900 dark:text-slate-100 font-semibold drop-shadow-[0_1px_6px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
          >
            Smart queuing made flexible — generate tokens online or offline through{" "}
            <span className="inline-flex items-center font-bold text-indigo-800 dark:text-indigo-200 bg-white/95 dark:bg-indigo-950/90 px-2 py-0.5 rounded-lg border border-indigo-300 dark:border-indigo-700 shadow-sm backdrop-blur-md">
              QR codes
            </span>
            , displays,{" "}
            <span className="inline-flex items-center font-bold text-emerald-800 dark:text-emerald-200 bg-white/95 dark:bg-emerald-950/90 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-sm backdrop-blur-md">
              WhatsApp
            </span>{" "}
            or digital tickets, and route customers effortlessly across service counters.
          </m.p>

          {/* Highlighted Call-to-Actions with Hover Bounce */}
          <m.div {...enter(0.24)} className="mt-4 flex flex-wrap items-center gap-3">
            <Magnetic>
              <m.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.24 }}
              >
                <Button asChild size="default" variant="brand" className="group shadow-xl justify-center text-xs sm:text-sm font-bold h-10 px-5 rounded-xl hover:scale-105 active:scale-95 transition-all">
                  <Link to="/pricing">
                    Check All Plans
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </m.div>
            </Magnetic>
            <Button
              size="default"
              variant="glass"
              className="shadow-md justify-center text-xs sm:text-sm font-bold h-10 px-5 rounded-xl border-slate-300/90 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white hover:bg-white dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
              onClick={() => setDemoOpen(true)}
            >
              <Play className="h-3.5 w-3.5 fill-current mr-2 text-indigo-600 dark:text-indigo-400" /> Watch 60-second Demo
            </Button>
          </m.div>

          {/* High-Contrast Highlights List with Subtle Floating Pills */}
          <m.ul
            {...enter(0.3)}
            className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100"
          >
            {["Minimal Hardware required", "Instant setup", "99.9% SLA uptime"].map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-full border border-slate-200/90 dark:border-slate-700/90 shadow-sm backdrop-blur-md"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" /> {t}
              </li>
            ))}
          </m.ul>
        </m.div>
      </div>

      {/* Floating Image Cards Carousel Straddling the Bottom Boundary */}
      <div className="absolute bottom-0 left-0 right-0 z-30 translate-y-[45%] sm:translate-y-1/2 pointer-events-none">
        <div className="pointer-events-auto">
          <HeroFeaturesCarousel embedded />
        </div>
      </div>

      <DemoReelModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}

function ScrollCue() {
  return (
    <div className="pointer-events-none flex justify-center pb-1 sm:pb-2">
      <div className="relative h-8 sm:h-10 w-px overflow-hidden bg-border">
        <motion.span
          className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary"
          animate={{ y: [-4, 36], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  decimals = 0,
  suffix = "",
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setV(value);
    const id = setInterval(() => {
      setV((prev) => {
        const jitter = decimals ? (Math.random() - 0.45) * 0.6 : Math.round(Math.random() * 3);
        return Math.max(0, +(prev + jitter).toFixed(decimals));
      });
    }, 3500);
    return () => clearInterval(id);
  }, [decimals, inView, value]);

  return (
    <div ref={ref} className="panel px-2 py-2 sm:px-4 sm:py-3.5 text-center sm:text-left overflow-hidden">
      <dt className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-sm sm:text-2xl font-extrabold text-foreground tracking-tight">
        <CountUp value={v} decimals={decimals} suffix={suffix} duration={1.5} />
      </dd>
    </div>
  );
}

/* ----------------------------- 02 PROBLEM ------------------------------ */
/* Composition: full-bleed cinematic editorial spread, text over the image. */

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.18, 1.02]);
  const textY = useTransform(scrollYProgress, [0, 0.7], [20, -20]);

  return (
    <section ref={ref} id="about" className="relative z-10 isolate overflow-hidden pt-[clamp(120px,16vh,160px)] pb-16 sm:pb-20 lg:pb-24">
      <m.img
        style={{ y: imgY, scale }}
        src={photoGovernment}
        alt="A crowded government service hall with people waiting in rows of chairs"
        width={1920}
        height={1280}
        loading="lazy"
        className="absolute inset-0 -z-20 h-full w-full object-cover [filter:saturate(0.9)_contrast(1.02)]"
      />
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "linear-gradient(100deg, oklch(0.19 0.02 280 / 0.88) 0%, oklch(0.19 0.02 280 / 0.75) 45%, oklch(0.19 0.02 280 / 0.4) 100%)",
        }}
      />

      <m.div style={{ y: textY }} className="mx-auto flex w-full max-w-[1728px] w-[98%] flex-col justify-center px-4 py-6 sm:py-8 lg:py-10 lg:px-6">
        <Reveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Smart Queues. Happy People.
          </span>
          <h2 className="mt-6 font-display text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.5rem]">
            Waiting shouldn't
            <br />
            feel like <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 font-extrabold">waiting.</span>
          </h2>
          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-200">
            A crowded hall, an unclear line, a customer refreshing nothing. Most service delay isn't
            capacity — it's the absence of orchestration.
          </p>
        </Reveal>

        {/* Buttons Row */}
        <Reveal delay={0.1}>
          <div className="relative mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg" className="rounded-full font-bold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 shadow-lg px-6 py-2.5 flex items-center gap-2 group transition-all cursor-pointer hover:scale-105 active:scale-95">
              <a href="#services">
                <span>Explore Solutions</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
            <Button size="lg" className="rounded-full font-bold border border-white/20 bg-white/10 hover:bg-white/20 text-white shadow-sm px-6 py-2.5 flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95" onClick={() => setDemoOpen(true)}>
              <Play className="h-4 w-4 fill-white" /> Watch Demo
            </Button>
          </div>
        </Reveal>

        {/* Inline Tags Row */}
        <Reveal delay={0.15}>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-white/90">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald shrink-0" /> Real-time Analytics
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald shrink-0" /> Smart Notifications
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald shrink-0" /> Multi-Branch Ready
            </div>
          </div>
        </Reveal>

        {/* Horizontal Glassmorphic Card (4 columns) */}
        <m.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="mt-8 sm:mt-10 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-md p-6 lg:p-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 shadow-2xl"
        >
          {[
            {
              icon: Users,
              title: "Reduce Wait Time",
              body: "Optimize flow and serve more customers.",
              colorClass: "bg-violet-500/20 text-violet-400",
            },
            {
              icon: Activity,
              title: "Real-time Insights",
              body: "Make data-driven decisions instantly.",
              colorClass: "bg-blue-500/20 text-blue-400",
            },
            {
              icon: BellRing,
              title: "Smart Alerts",
              body: "Notify customers and staff in real-time.",
              colorClass: "bg-pink-500/20 text-pink-400",
            },
            {
              icon: ShieldCheck,
              title: "Secure & Reliable",
              body: "Enterprise-grade security. 99.9% uptime.",
              colorClass: "bg-emerald-500/20 text-emerald-400",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <m.div
                key={item.title}
                variants={{
                  hidden: { opacity: 0, y: 28, scale: 0.94, filter: "blur(4px)" },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                    transition: { type: "spring", stiffness: 220, damping: 20 },
                  },
                }}
                whileHover={{ scale: 1.04, y: -4, transition: { duration: 0.2 } }}
                className="group relative flex items-center justify-between gap-4 p-2.5 hover:bg-white/10 rounded-2xl transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-inner transition-transform group-hover:scale-110", item.colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-display text-sm font-bold text-white tracking-tight">{item.title}</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300 mt-0.5">{item.body}</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400/50 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
              </m.div>
            );
          })}
        </m.div>

      </m.div>
      <DemoReelModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}

/* ---------------------------- 03 HOW IT WORKS -------------------------- */
/* Composition: Reference-matched design — hero banner photo + 4 rich step cards with sub-method icons */

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const imgParallax = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  const steps = [
    {
      num: "01",
      title: "Token Generation",
      subtitle: "Let customers get their token easily from multiple channels.",
      color: "from-violet-600 via-indigo-600 to-indigo-700",
      topBorder: "from-violet-500 to-indigo-600",
      ringColor: "ring-violet-200 dark:ring-violet-900/50",
      glowColor: "rgba(124,58,237,0.35)",
      hoverBorder: "group-hover:border-violet-300 dark:group-hover:border-violet-600/80",
      hoverShadow: "group-hover:shadow-[0_24px_50px_-10px_rgba(124,58,237,0.22)]",
      hoverText: "group-hover:text-violet-600 dark:group-hover:text-violet-400",
      image: "/how-it-works/step1-token-gen.jpg",
      methods: [
        {
          icon: QrCode,
          label: "QR Code",
          sub: "Quick & Contactless",
          iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-400 border border-violet-200/70 dark:border-violet-800/60",
        },
        {
          icon: Smartphone,
          label: "Kiosk",
          sub: "On-site Token",
          iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60",
        },
        {
          icon: Compass,
          label: "Web Page",
          sub: "From Anywhere",
          iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400 border border-sky-200/70 dark:border-sky-800/60",
        },
      ],
    },
    {
      num: "02",
      title: "Token",
      subtitle: "Customers receive their token instantly through their preferred channel.",
      color: "from-indigo-600 via-violet-600 to-purple-600",
      topBorder: "from-indigo-500 to-violet-600",
      ringColor: "ring-indigo-200 dark:ring-indigo-900/50",
      glowColor: "rgba(79,70,229,0.35)",
      hoverBorder: "group-hover:border-indigo-300 dark:group-hover:border-indigo-600/80",
      hoverShadow: "group-hover:shadow-[0_24px_50px_-10px_rgba(79,70,229,0.22)]",
      hoverText: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
      image: "/how-it-works/step2-token.jpg",
      methods: [
        {
          icon: Send,
          label: "WhatsApp",
          sub: "Instant Updates",
          iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60",
        },
        {
          icon: Mail,
          label: "Email / SMS",
          sub: "Notify Customers",
          iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60",
        },
        {
          icon: Printer,
          label: "Print Slip (KOT)",
          sub: "On-site Print",
          iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60",
        },
      ],
    },
    {
      num: "03",
      title: "Call a Number",
      subtitle: "Call the next token through multiple channels for maximum visibility.",
      color: "from-blue-600 via-indigo-600 to-cyan-500",
      topBorder: "from-blue-500 via-indigo-500 to-cyan-500",
      ringColor: "ring-cyan-200 dark:ring-cyan-900/50",
      glowColor: "rgba(6,182,212,0.35)",
      hoverBorder: "group-hover:border-cyan-300 dark:group-hover:border-cyan-600/80",
      hoverShadow: "group-hover:shadow-[0_24px_50px_-10px_rgba(6,182,212,0.22)]",
      hoverText: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
      image: "/how-it-works/step3-call.jpg",
      methods: [
        {
          icon: MonitorPlay,
          label: "Display Screen",
          sub: "Live Token Display",
          iconBg: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/70 dark:text-cyan-400 border border-cyan-200/70 dark:border-cyan-800/60",
        },
        {
          icon: Volume2,
          label: "Voice Announcement",
          sub: "Clear Audio Callout",
          iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60",
        },
        {
          icon: BellRing,
          label: "Message / Alert",
          sub: "Real-time Notifications",
          iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60",
        },
      ],
    },
    {
      num: "04",
      title: "Now Serving",
      subtitle: "Operator serves the customer and updates status in real-time.",
      color: "from-emerald-500 via-teal-600 to-cyan-600",
      topBorder: "from-emerald-500 via-teal-500 to-cyan-500",
      ringColor: "ring-emerald-200 dark:ring-emerald-900/50",
      glowColor: "rgba(16,185,129,0.35)",
      hoverBorder: "group-hover:border-emerald-300 dark:group-hover:border-emerald-600/80",
      hoverShadow: "group-hover:shadow-[0_24px_50px_-10px_rgba(16,185,129,0.22)]",
      hoverText: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
      image: "/how-it-works/step4-serving.jpg",
      methods: [
        {
          icon: Smartphone,
          label: "Operator App",
          sub: "Serve & Update",
          iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-400 border border-violet-200/70 dark:border-violet-800/60",
        },
        {
          icon: MonitorPlay,
          label: "Operator Portal",
          sub: "Manage Queue",
          iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60",
        },
      ],
    },
  ] as const;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 36, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 22 } },
  };

  return (
    <section
      id="how-it-works-section"
      ref={sectionRef}
      className="relative z-10 w-full overflow-hidden bg-white dark:bg-slate-950"
    >
      {/* Background ambient lighting matching Quesols design system */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden>
        <div className="absolute top-1/4 -left-32 h-[450px] w-[450px] rounded-full bg-violet-400/8 dark:bg-violet-600/10 blur-[130px]" />
        <div className="absolute bottom-10 -right-32 h-[450px] w-[450px] rounded-full bg-cyan-400/8 dark:bg-cyan-600/10 blur-[130px]" />
      </div>

      {/* ── TOP BANNER: Hero Photo + Text Overlay ── */}
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(260px, 36vw, 480px)" }}>
        {/* Parallax Photo */}
        <m.div
          className="absolute inset-0 w-full h-[115%] -top-[7.5%]"
          style={{ y: imgParallax }}
        >
          <img
            src="/how-it-works-bg.jpg"
            alt="Modern service center reception with Now Serving display"
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        </m.div>

        {/* Scrim gradient with subtle brand violet-blue tint for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/98 via-white/85 to-white/10 dark:from-slate-950/98 dark:via-slate-950/80 dark:to-slate-950/10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/60 dark:to-slate-950/60 pointer-events-none" />

        {/* Text Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[1728px] w-[98%] px-5 sm:px-8 lg:px-10">
            <m.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[54%] sm:max-w-[46%] lg:max-w-[40%]"
            >
              {/* HOW IT WORKS pill with Quesols brand styling & pulsating coral dot */}
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/90 dark:border-violet-800/80 bg-white/95 dark:bg-slate-900/95 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300 shadow-xs backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-coral" />
                </span>
                HOW IT WORKS
              </span>

              {/* Headline with signature brand gradient */}
              <m.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="mt-3 sm:mt-4 font-display text-2xl sm:text-4xl lg:text-[3.2rem] xl:text-[3.6rem] font-black leading-[1.05] tracking-[-0.04em] text-slate-900 dark:text-white"
              >
                One journey,
                <br />
                orchestrated{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-300 dark:to-cyan-300 drop-shadow-xs">
                  end to end.
                </span>
              </m.h2>

              {/* Subtitle */}
              <m.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-2 sm:mt-3 text-xs sm:text-sm lg:text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium"
              >
                From check-in to service delivery, Quesols keeps everything
                connected so your customers always know what's next.
              </m.p>
            </m.div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Connected Timeline Wave & 4 Step Cards ── */}
      <div className="relative bg-white dark:bg-slate-950 px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 pt-2">
        {/* Subtle top divider line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-300/80 to-transparent dark:via-violet-800/60" />

        {/* ── 4 STEP CARDS GRID WITH BLUR-TO-FOCUS & SPRING ENTRANCE ── */}
        <m.div
          className="mx-auto w-full max-w-[1728px] w-[98%] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 pt-6 sm:pt-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-6%" }}
        >
          {steps.map((step) => (
            <m.div
              key={step.num}
              variants={{
                hidden: { opacity: 0, y: 48, scale: 0.94, filter: "blur(8px)" },
                show: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: { type: "spring", stiffness: 220, damping: 22 },
                },
              }}
              whileHover={{ y: -8, scale: 1.015, transition: { duration: 0.25, ease: "easeOut" } }}
              className={cn(
                "group relative flex flex-col rounded-[26px] sm:rounded-[30px] border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-[0_10px_35px_-12px_rgba(15,23,42,0.07)] transition-all duration-300 overflow-hidden",
                step.hoverBorder,
                step.hoverShadow
              )}
            >
              {/* Subtle top colored accent bar */}
              <div className={cn("h-[2.5px] w-full bg-gradient-to-r opacity-90 group-hover:opacity-100 transition-opacity", step.topBorder)} />

              {/* ── Card Header ── */}
              <div className="flex items-start justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  {/* Step number badge */}
                  <div
                    className={cn(
                      "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white font-black text-xs sm:text-sm shadow-md group-hover:scale-105 transition-transform duration-300 mt-0.5",
                      step.color
                    )}
                  >
                    {step.num}
                  </div>
                  {/* Title & Subtitle Stack */}
                  <div className="min-w-0">
                    <h3
                      className={cn(
                        "font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug transition-colors duration-200",
                        step.hoverText
                      )}
                    >
                      {step.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right Arrow Chevron Pill */}
                <div
                  className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-all duration-200 group-hover:translate-x-0.5"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* ── Mockup Visual Area (Photo-Realistic 3D Hardware & UI) ── */}
              <div className="relative mx-3 sm:mx-4 my-2.5 rounded-2xl overflow-hidden aspect-[4/3] bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 shadow-xs group/mockup">
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-full object-cover object-center group-hover/mockup:scale-105 transition-transform duration-600 ease-out"
                  loading="lazy"
                />
                {/* Subtle bottom glass lighting overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover/mockup:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>

              {/* ── Bottom Sub-Methods Row (Exact to Reference Image) ── */}
              <div
                className={cn(
                  "mt-auto px-3 sm:px-4 pt-3 pb-3.5 sm:pb-4 border-t border-slate-100 dark:border-slate-800/80",
                  step.methods.length === 2 ? "flex justify-around items-center" : "grid grid-cols-3 gap-1.5 sm:gap-2"
                )}
              >
                {step.methods.map((method) => {
                  const MIcon = method.icon;
                  return (
                    <div
                      key={method.label}
                      className="group/method flex flex-col items-center text-center p-1 sm:p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-200"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover/method:scale-110 shadow-2xs mb-1",
                          method.iconBg
                        )}
                      >
                        <MIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {method.label}
                      </span>
                      <span className="text-[8.5px] sm:text-[9.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {method.sub}
                      </span>
                    </div>
                  );
                })}
              </div>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
}

/* --------------------------- 04 POWERFUL FEATURES ----------------------- */
/* Composition: Open panoramic connected showcase with continuous workflow line */

interface FeatureItem {
  id: string;
  number: string;
  title: string;
  desc: string;
  checklist: string[];
  haloBg: string;
  pillBg: string;
  checkBg: string;
  arrowColor: string;
  floatingBadge?: "calendar" | "analytics";
  image: string;
  imageFallback: string;
}

const POWERFUL_FEATURES: FeatureItem[] = [
  {
    id: "queue",
    number: "01",
    title: "Smart Queue Management",
    desc: "Virtual queue, real-time updates and smart routing across all channels.",
    checklist: [
      "Live queue monitoring",
      "Smart token routing",
      "Reduced waiting time",
      "Better customer experience",
    ],
    haloBg: "bg-purple-100/80 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/40 shadow-[0_0_16px_rgba(147,51,234,0.22)]",
    pillBg: "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9]",
    checkBg: "bg-[#8b5cf6]",
    arrowColor: "text-purple-600 dark:text-purple-400",
    image: "/powerful-features/kiosk@2x.png",
    imageFallback: "/powerful-features/kiosk.png",
  },
  {
    id: "appointments",
    number: "02",
    title: "Appointment Scheduling",
    desc: "Let customers book slots online and reduce walk-in rush.",
    checklist: [
      "Online appointment booking",
      "Custom time slots",
      "Automated reminders",
      "Calendar integration",
    ],
    haloBg: "bg-blue-100/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/40 shadow-[0_0_16px_rgba(59,130,246,0.22)]",
    pillBg: "bg-gradient-to-br from-[#3b82f6] to-[#2563eb]",
    checkBg: "bg-[#3b82f6]",
    arrowColor: "text-blue-600 dark:text-blue-400",
    floatingBadge: "calendar",
    image: "/powerful-features/laptop@2x.png",
    imageFallback: "/powerful-features/laptop.png",
  },
  {
    id: "analytics",
    number: "03",
    title: "Analytics & Reports",
    desc: "Get real-time insights and detailed reports for smarter decisions.",
    checklist: [
      "Live analytics dashboard",
      "Customer insights",
      "Service performance",
      "Export & custom reports",
    ],
    haloBg: "bg-sky-100/80 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/40 shadow-[0_0_16px_rgba(2,132,199,0.22)]",
    pillBg: "bg-gradient-to-br from-[#0284c7] to-[#0369a1]",
    checkBg: "bg-[#0284c7]",
    arrowColor: "text-sky-600 dark:text-sky-400",
    floatingBadge: "analytics",
    image: "/powerful-features/monitor@2x.png",
    imageFallback: "/powerful-features/monitor.png",
  },
  {
    id: "locations",
    number: "04",
    title: "Multi-Location Support",
    desc: "Manage multiple branches from a single, unified platform.",
    checklist: [
      "Multiple branch management",
      "Centralized control",
      "Location-wise analytics",
      "Role-based access",
    ],
    haloBg: "bg-emerald-100/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/40 shadow-[0_0_16px_rgba(16,185,129,0.22)]",
    pillBg: "bg-gradient-to-br from-[#10b981] to-[#059669]",
    checkBg: "bg-[#10b981]",
    arrowColor: "text-emerald-600 dark:text-emerald-400",
    image: "/powerful-features/map@2x.png",
    imageFallback: "/powerful-features/map.png",
  },
];

export function LiveQueueDemo() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="live-demo"
      className="relative z-10 w-full overflow-hidden bg-gradient-to-b from-[#fbfcff] via-white to-[#f8faff] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 sm:py-14 lg:py-16 border-t border-slate-100/80 dark:border-slate-800/60"
    >
      {/* Background Atmosphere: Gentle Lavender (left), Pale Blue (center), Subtle Cyan (right) */}
      <div
        className="pointer-events-none absolute -top-32 -left-20 h-[520px] w-[520px] rounded-full bg-purple-200/25 blur-[120px] dark:bg-purple-900/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[420px] w-[600px] rounded-full bg-blue-100/30 blur-[130px] dark:bg-blue-900/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-20 -right-20 h-[520px] w-[520px] rounded-full bg-teal-100/25 blur-[120px] dark:bg-teal-900/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-1/4 h-[350px] w-[450px] rounded-full bg-indigo-100/20 blur-[100px] dark:bg-indigo-900/10"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-[1728px] px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Centered Heading & Introduction */}
        <div className="mx-auto max-w-4xl text-center mb-8 sm:mb-10 lg:mb-12">
          {/* Eyebrow Label */}
          <m.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 rounded-full border border-purple-200/90 dark:border-purple-800/60 bg-purple-50/80 dark:bg-purple-950/40 px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300 shadow-sm backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />
            POWERFUL FEATURES
          </m.div>

          {/* Main Heading */}
          <m.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.35rem] font-black tracking-[-0.03em] text-slate-900 dark:text-white leading-[1.12]"
          >
            Everything you need for
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600">
              modern queue management.
            </span>
          </m.h2>

          {/* Supporting Description */}
          <m.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-3.5 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400 font-normal"
          >
            A complete suite of tools designed to improve customer experience, streamline operations, and drive business growth.
          </m.p>
        </div>

        {/* 4 Connected Feature Areas Showcase (NO CARDS / NO BOXED PANELS) */}
        <div className="relative">
          {/* Continuous Connected Workflow Line (Desktop View: spans behind markers) */}
          <div className="hidden lg:block absolute -top-8 left-0 right-0 h-20 pointer-events-none z-0">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 1200 80"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="workflowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="35%" stopColor="#3b82f6" />
                  <stop offset="70%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* Subtle secondary dotted path */}
              <path
                d="M 60 48 C 110 46, 130 42, 150 42 C 210 42, 240 24, 300 24 C 360 24, 390 40, 450 40 C 510 40, 540 22, 600 22 C 660 22, 690 38, 750 38 C 810 38, 840 22, 900 22 C 960 22, 990 36, 1050 36 C 1090 36, 1120 34, 1140 32"
                stroke="url(#workflowGrad)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                strokeOpacity="0.4"
                fill="none"
              />

              {/* Main continuous undulating workflow line */}
              <m.path
                d="M 60 44 C 110 42, 130 38, 150 38 C 210 38, 240 20, 300 20 C 360 20, 390 36, 450 36 C 510 36, 540 18, 600 18 C 660 18, 690 34, 750 34 C 810 34, 840 18, 900 18 C 960 18, 990 32, 1050 32 C 1090 32, 1120 30, 1140 28"
                stroke="url(#workflowGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              />

              {/* Traveling softly glowing particle */}
              {!prefersReducedMotion && (
                <m.circle
                  r="3.5"
                  fill="#ffffff"
                  filter="drop-shadow(0 0 6px rgba(255,255,255,0.95))"
                  animate={{
                    cx: [60, 150, 300, 450, 600, 750, 900, 1050, 1140],
                    cy: [44, 38, 20, 36, 18, 34, 18, 32, 28],
                    opacity: [0, 1, 1, 1, 1, 1, 1, 1, 0],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              )}
            </svg>

            {/* Intermediate White Circle Arrow Markers Between Columns */}
            <div className="absolute top-[8px] left-[25%] -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400">
              <ArrowRight className="h-3 w-3 stroke-[2.5]" />
            </div>
            <div className="absolute top-[6px] left-[50%] -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <ArrowRight className="h-3 w-3 stroke-[2.5]" />
            </div>
            <div className="absolute top-[6px] left-[75%] -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400">
              <ArrowRight className="h-3 w-3 stroke-[2.5]" />
            </div>
          </div>

          {/* 4 Feature Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8 lg:gap-6 xl:gap-8 items-start relative z-10">
            {POWERFUL_FEATURES.map((feature, idx) => (
              <m.div
                key={feature.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: idx * 0.1 }}
                className="flex flex-col justify-between h-full group"
              >
                <div>
                  {/* Numbered Marker directly along workflow path */}
                  <div className="flex items-center mb-5">
                    <div className="relative flex items-center justify-center">
                      {/* Colored Halo */}
                      <span
                        className={cn(
                          "absolute -inset-1.5 rounded-full transition-transform duration-300 group-hover:scale-115",
                          feature.haloBg
                        )}
                      />
                      {/* Numbered Pill Circle */}
                      <div
                        className={cn(
                          "relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-white font-bold text-xs shadow-md tracking-tight",
                          feature.pillBg
                        )}
                      >
                        {feature.number}
                      </div>
                    </div>
                  </div>

                  {/* Heading */}
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors duration-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 font-normal">
                    {feature.desc}
                  </p>

                  {/* Capability Checklist with Relative Positioning for Floating Badges */}
                  <div className="relative mt-5">
                    <ul className="space-y-2.5">
                      {feature.checklist.map((item, i) => (
                        <m.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
                          className="flex items-center gap-2.5 text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 font-medium"
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white shadow-xs",
                              feature.checkBg
                            )}
                          >
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                          <span>{item}</span>
                        </m.li>
                      ))}
                    </ul>

                    {/* Floating Badges for Features 02 & 03 (Matching Reference) */}
                    {feature.floatingBadge === "calendar" && (
                      <m.div
                        animate={prefersReducedMotion ? {} : { y: [0, -6, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute right-0 top-8 sm:top-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 dark:bg-slate-800 shadow-[0_4px_16px_rgba(124,58,237,0.18)] border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 transition-transform hover:scale-110"
                        title="Calendar Integration"
                      >
                        <Calendar className="h-5 w-5" />
                      </m.div>
                    )}

                    {feature.floatingBadge === "analytics" && (
                      <m.div
                        animate={prefersReducedMotion ? {} : { y: [0, -6, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        className="absolute right-0 top-8 sm:top-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 dark:bg-slate-800 shadow-[0_4px_16px_rgba(37,99,235,0.18)] border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 transition-transform hover:scale-110"
                        title="Live Analytics"
                      >
                        <BarChart3 className="h-5 w-5" />
                      </m.div>
                    )}
                  </div>
                </div>

                {/* Product Visual Mockup Container (No Card Borders / Open Integration) */}
                <m.div
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 + idx * 0.1 }}
                  whileHover={prefersReducedMotion ? {} : { y: -6, scale: 1.02 }}
                  className="relative mt-8 sm:mt-10 w-full group/mockup flex items-end justify-center min-h-[190px] sm:min-h-[220px]"
                >
                  <img
                    src={feature.image}
                    alt={feature.title}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to 1x image if 2x fails to load
                      const target = e.currentTarget;
                      if (target.src !== feature.imageFallback) {
                        target.src = feature.imageFallback;
                      }
                    }}
                    className="w-full h-auto max-h-[250px] sm:max-h-[280px] object-contain drop-shadow-sm transition-all duration-300 group-hover/mockup:drop-shadow-lg"
                  />
                </m.div>
              </m.div>
            ))}
          </div>

          {/* Panoramic Desk Baseline Shadow & Reflection */}
          <div
            className="pointer-events-none absolute -bottom-4 left-0 right-0 h-16 bg-gradient-to-t from-slate-100/40 via-slate-50/10 to-transparent dark:from-slate-900/40 dark:via-transparent"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

/* --------------------------- 05 THE FOUR METHODS ----------------------- */
/* Composition: Left-side branch setup & lobby environment + Center workflow line + Right-side stacked configuration panels */

export function MethodsSection() {
  const [selectedDate, setSelectedDate] = useState("Today 15 Oct");
  const [selectedTime, setSelectedTime] = useState("09:00 AM");
  const prefersReducedMotion = useReducedMotion();

  const ROUTING_ROWS = [
    { service: "General", counter: "Counter 01", color: "bg-emerald-500" },
    { service: "Billing", counter: "Counter 02", color: "bg-blue-500" },
    { service: "Diagnostics", counter: "Counter 03", color: "bg-purple-500" },
    { service: "Consultation", counter: "Counter 04", color: "bg-amber-500" },
    { service: "Pharmacy", counter: "Counter 05", color: "bg-sky-500" },
  ];

  const NEXT_TOKENS = [
    { token: "A013", counter: "Counter 01" },
    { token: "B034", counter: "Counter 03" },
    { token: "C019", counter: "Counter 04" },
    { token: "A011", counter: "Counter 05" },
  ];

  const DATE_OPTIONS = [
    { label: "Today", date: "15 Oct", full: "Today 15 Oct" },
    { label: "Thu", date: "16 Oct", full: "Thu 16 Oct" },
    { label: "Fri", date: "17 Oct", full: "Fri 17 Oct" },
    { label: "Sat", date: "18 Oct", full: "Sat 18 Oct" },
  ];

  const TIME_OPTIONS = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM"];

  return (
    <section
      id="services"
      className="relative z-10 w-full overflow-hidden bg-gradient-to-b from-[#f8faff] via-white to-[#fbfcff] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 sm:py-14 lg:py-16 border-t border-slate-100/80 dark:border-slate-800/60"
    >
      {/* Ambient background illumination matching the reference */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-purple-200/20 blur-[130px] dark:bg-purple-900/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/3 left-1/3 h-[450px] w-[550px] rounded-full bg-blue-100/25 blur-[140px] dark:bg-blue-900/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 right-0 h-[450px] w-[450px] rounded-full bg-teal-100/20 blur-[120px] dark:bg-teal-900/15"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-[1728px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-start">
          
          {/* ================= LEFT SIDE: Heading, Lobby Visual & Stats ================= */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Eyebrow Label */}
              <m.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
                className="inline-flex items-center gap-2 rounded-full border border-purple-200/90 dark:border-purple-800/60 bg-purple-50/80 dark:bg-purple-950/40 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300 shadow-xs backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />
                BRANCH SETUP & CONFIGURATION
              </m.div>

              {/* Main Heading */}
              <m.h2
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-4 font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]"
              >
                Configure each branch
                <br />
                for how it{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600">
                  actually works.
                </span>
              </m.h2>

              {/* Supporting Text */}
              <m.p
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="mt-3.5 max-w-lg text-sm sm:text-[15px] leading-relaxed text-slate-500 dark:text-slate-400 font-normal"
              >
                Branches aren't identical. A two-counter city office and a diagnostics centre need different mechanics — Quesols ships all four.
              </m.p>
            </div>

            {/* Service Lobby Environment Illustration */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="relative mt-5 sm:mt-6 rounded-2xl overflow-hidden group/lobby"
            >
              <img
                src="/branch-setup/lobby@2x.png"
                alt="Quesols Service Lobby with Kiosk and Token Stand"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== "/branch-setup/lobby.png") {
                    target.src = "/branch-setup/lobby.png";
                  }
                }}
                className="w-full h-auto object-cover rounded-2xl drop-shadow-sm transition-transform duration-500 group-hover/lobby:scale-[1.01]"
              />
            </m.div>

            {/* Bottom 3 Statistics */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-3 sm:gap-4 items-center"
            >
              {/* Stat 1 */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 shadow-2xs">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">20+</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Service Types</div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">500K+</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Tokens Served</div>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 shadow-2xs">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">100+</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Happy Branches</div>
                </div>
              </div>
            </m.div>
          </div>

          {/* ================= RIGHT SIDE: Four Stacked Configuration Panels ================= */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            
            {/* PANEL 01 — QR WALK-IN QUEUE */}
            <m.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(139,92,246,0.12)] hover:border-purple-300 dark:hover:border-purple-700/60 transition-all duration-300"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                {/* Left Text Information */}
                <div className="flex items-start gap-4 max-w-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 shadow-xs">
                    <QrCode className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 tracking-wide block">
                      Method 01 - Most Used
                    </span>
                    <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                      QR walk-in queue
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 font-normal">
                      One queue, one scan. The customer submits name, contact and a note, and gets a live token page that updates as the line moves.
                    </p>
                    <Link
                      to="/q/b_axis_rajkot"
                      className="group/btn mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
                    >
                      <span>Try the QR flow</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>

                {/* Right Visualization: 4-Step Horizontal Process (No Hardware Mockups) */}
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800/80">
                  {/* Step 1: Scan */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 shadow-2xs">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <span className="mt-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">Scan</span>
                    <span className="text-[9px] text-slate-400 max-w-[70px] leading-tight">Scan QR code at kiosk or web page</span>
                  </div>

                  {/* Connector */}
                  <div className="w-5 sm:w-6 border-b border-dashed border-slate-300 dark:border-slate-700 mb-6 shrink-0" />

                  {/* Step 2: Fill 3 fields */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 text-blue-600 shadow-2xs">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="mt-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">Fill 3 fields</span>
                    <span className="text-[9px] text-slate-400 max-w-[70px] leading-tight">Name, Contact and Service</span>
                  </div>

                  {/* Connector */}
                  <div className="w-5 sm:w-6 border-b border-dashed border-slate-300 dark:border-slate-700 mb-6 shrink-0" />

                  {/* Step 3: Live token */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 text-purple-600 shadow-2xs">
                      <Ticket className="h-4 w-4" />
                    </div>
                    <span className="mt-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">Live token</span>
                    <span className="text-[9px] text-slate-400 max-w-[70px] leading-tight">Get your token instantly</span>
                  </div>

                  {/* Connector */}
                  <div className="w-5 sm:w-6 border-b border-dashed border-slate-300 dark:border-slate-700 mb-6 shrink-0" />

                  {/* Step 4: Called */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 text-amber-600 shadow-2xs">
                      <Bell className="h-4 w-4" />
                    </div>
                    <span className="mt-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">Called</span>
                    <span className="text-[9px] text-slate-400 max-w-[70px] leading-tight">Get notified when it’s your turn</span>
                  </div>
                </div>
              </div>
            </m.div>

            {/* PANEL 02 — MULTI-DESK SERVICE ROUTING */}
            <m.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.18 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(59,130,246,0.12)] hover:border-blue-300 dark:hover:border-blue-700/60 transition-all duration-300"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                {/* Left Text Information */}
                <div className="flex items-start gap-4 max-w-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 shadow-xs">
                    <Settings className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide block">
                      Method 02
                    </span>
                    <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                      Multi-desk service routing
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 font-normal">
                      The service chosen decides the desk. Counters specialise, and the queue balances itself.
                    </p>
                    <Link
                      to="/q/b_axis_bkc"
                      className="group/btn mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                    >
                      <span>Pick a service</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>

                {/* Right Visualization: 5-Row Routing Table */}
                <div className="w-full xl:w-[260px] shrink-0 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 p-2.5 divide-y divide-slate-100 dark:divide-slate-800/60 shadow-2xs">
                  {ROUTING_ROWS.map((row) => (
                    <div
                      key={row.service}
                      className="flex items-center justify-between py-1.5 px-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", row.color)} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{row.service}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <span className="text-[11px] font-mono">{row.counter}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </m.div>

            {/* PANEL 03 — NOW SERVING DISPLAY BOARD */}
            <m.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.24 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(2,132,199,0.12)] hover:border-sky-300 dark:hover:border-sky-700/60 transition-all duration-300"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                {/* Left Text Information */}
                <div className="flex items-start gap-4 max-w-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/40 text-sky-600 dark:text-sky-400 shadow-xs">
                    <MonitorPlay className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tracking-wide block">
                      Method 03
                    </span>
                    <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                      Now Serving display board
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 font-normal">
                      A full-screen board for the TV in the hall, with airport-style flips on every token change.
                    </p>
                    <Link
                      to="/services"
                      className="group/btn mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors"
                    >
                      <span>Open display board</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>

                {/* Right Visualization: 2-Part Now Serving Board (No Hardware Frame) */}
                <div className="w-full xl:w-[260px] shrink-0 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 flex items-center divide-x divide-slate-200 dark:divide-slate-700 shadow-2xs">
                  {/* Left: Now Serving */}
                  <div className="pr-4 flex flex-col items-center justify-center flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Now Serving</span>
                    <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight my-1">A012</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Counter 02</span>
                  </div>

                  {/* Right: Next Tokens List */}
                  <div className="pl-4 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Next Tokens</span>
                    <div className="space-y-1">
                      {NEXT_TOKENS.map((item) => (
                        <div key={item.token} className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          <span className="font-bold text-slate-900 dark:text-white">{item.token}</span>
                          <span className="text-[10px] text-slate-400">{item.counter}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </m.div>

            {/* PANEL 04 — REMOTE APPOINTMENTS */}
            <m.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-7 shadow-[0_6px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(16,185,129,0.12)] hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all duration-300"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                {/* Left Text Information */}
                <div className="flex items-start gap-4 max-w-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800/40 text-teal-600 dark:text-teal-400 shadow-xs">
                    <CalendarCheck className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 tracking-wide block">
                      Method 04
                    </span>
                    <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                      Remote appointments
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 font-normal">
                      Location, OTP, service, slot, confirmation — booked from the sofa, honoured at the branch.
                    </p>
                    <Link
                      to="/book"
                      className="group/btn mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 transition-colors"
                    >
                      <span>Book an appointment</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>

                {/* Right Visualization: Minimal Interactive Booking Slot Picker (No Device Frame) */}
                <div className="w-full xl:w-[260px] shrink-0 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                    <Calendar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Select a time slot</span>
                  </div>

                  {/* Date Selection Pills */}
                  <div className="flex items-center gap-1.5">
                    {DATE_OPTIONS.map((d) => {
                      const isSel = selectedDate === d.full;
                      return (
                        <button
                          key={d.full}
                          type="button"
                          onClick={() => setSelectedDate(d.full)}
                          className={cn(
                            "flex-1 py-1 px-1 rounded-lg text-center transition-all cursor-pointer",
                            isSel
                              ? "bg-purple-600 text-white font-bold shadow-xs scale-102"
                              : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-purple-300"
                          )}
                        >
                          <div className="text-[8px] font-semibold uppercase leading-none opacity-80">{d.label}</div>
                          <div className="text-[10px] font-bold leading-tight mt-0.5">{d.date}</div>
                        </button>
                      );
                    })}
                    <div className="flex h-7 w-5 items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-400">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Time Selection Pills */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {TIME_OPTIONS.map((t) => {
                      const isSel = selectedTime === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "py-1.5 rounded-lg text-[9px] font-bold text-center transition-all cursor-pointer",
                            isSel
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-purple-300"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </m.div>

          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------- 06 MULTI-BRANCH CENTRE ---------------------- */

const NODES = [
  { id: "amd", name: "Ahmedabad Central", x: 22, y: 30, waiting: 14, wait: 7.3, desks: 3 },
  { id: "srt", name: "Surat Hub", x: 46, y: 58, waiting: 9, wait: 5.2, desks: 4 },
  { id: "mum", name: "Mumbai West", x: 30, y: 74, waiting: 4, wait: 11.6, desks: 2 },
  { id: "rjt", name: "Rajkot City", x: 66, y: 24, waiting: 6, wait: 4.0, desks: 1 },
  { id: "del", name: "Delhi North", x: 78, y: 62, waiting: 21, wait: 16.7, desks: 3 },
];

const BRANCH_CHARTS: Record<string, { hour: string; tickets: number }[]> = {
  amd: [
    { hour: "9a", tickets: 12 },
    { hour: "11a", tickets: 28 },
    { hour: "1p", tickets: 18 },
    { hour: "3p", tickets: 32 },
    { hour: "5p", tickets: 14 },
  ],
  srt: [
    { hour: "9a", tickets: 8 },
    { hour: "11a", tickets: 19 },
    { hour: "1p", tickets: 12 },
    { hour: "3p", tickets: 24 },
    { hour: "5p", tickets: 10 },
  ],
  mum: [
    { hour: "9a", tickets: 5 },
    { hour: "11a", tickets: 15 },
    { hour: "1p", tickets: 9 },
    { hour: "3p", tickets: 22 },
    { hour: "5p", tickets: 8 },
  ],
  rjt: [
    { hour: "9a", tickets: 3 },
    { hour: "11a", tickets: 8 },
    { hour: "1p", tickets: 4 },
    { hour: "3p", tickets: 12 },
    { hour: "5p", tickets: 5 },
  ],
  del: [
    { hour: "9a", tickets: 22 },
    { hour: "11a", tickets: 45 },
    { hour: "1p", tickets: 30 },
    { hour: "3p", tickets: 52 },
    { hour: "5p", tickets: 26 },
  ],
};

export function CommandCentre() {
  const [active, setActive] = useState("amd");
  const [isAuto, setIsAuto] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const reduce = useReducedMotion();

  const nodeIds = useMemo(() => NODES.map((n) => n.id), []);

  useEffect(() => {
    if (!isAuto) return;

    const interval = setInterval(() => {
      setActive((currentActive) => {
        const idx = nodeIds.indexOf(currentActive);
        const nextIdx = (idx + 1) % nodeIds.length;
        return nodeIds[nextIdx]!;
      });
    }, 3800);

    return () => clearInterval(interval);
  }, [isAuto, nodeIds]);

  const handleNodeClick = (id: string) => {
    setActive(id);
    setIsAuto(false);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsAuto(true);
      timeoutRef.current = null;
    }, 7000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const node = NODES.find((n) => n.id === active) ?? NODES[0]!;

  return (
    <Section
      tone="ink"
      wide
    >
      <SectionHeader
        eyebrow="Command centre"
        title={["Every branch on {one canvas}."]}
        lead="Select a node to drill into a branch. In the product this is your company dashboard, updating continuously."
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <m.div
          initial={{ opacity: 0, y: 40, scale: 0.95, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <div className="panel-ink relative aspect-[4/3] overflow-hidden p-4 sm:aspect-[16/9] shadow-2xl">
            <div className="absolute inset-0 grid-faint opacity-25" aria-hidden />
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
              {NODES.filter((n) => n.id !== "amd").map((n) => (
                <m.line
                  key={n.id}
                  x1={NODES[0]!.x}
                  y1={NODES[0]!.y}
                  x2={n.x}
                  y2={n.y}
                  stroke="currentColor"
                  className={cn(
                    "transition-all duration-[500ms]",
                    active === n.id ? "text-coral" : "text-primary/25"
                  )}
                  strokeWidth={active === n.id ? "0.65" : "0.35"}
                  strokeDasharray={active === n.id ? "none" : "1.5 2"}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: EASE }}
                />
              ))}
            </svg>
            {NODES.map((n, idx) => (
              <m.button
                key={n.id}
                onClick={() => handleNodeClick(n.id)}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 18,
                  delay: 0.2 + idx * 0.08,
                }}
                whileHover={{ scale: 1.12 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                aria-label={n.name}
              >
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-[500ms]",
                    active === n.id
                      ? cn(!reduce && "scale-105", "border-transparent bg-brand text-primary-foreground shadow-[0_0_36px_-6px_oklch(0.62_0.17_300_/_0.5)]")
                      : "border-border/60 bg-surface/50 text-muted-foreground hover:border-border hover:bg-surface/85 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors duration-[500ms]",
                      active === n.id ? "animate-breathe bg-coral" : "bg-muted-foreground/60",
                    )}
                  />
                  <span className="hidden sm:inline">{n.name}</span>
                  <span className="sm:hidden">{n.id.toUpperCase()}</span>
                </span>
              </m.button>
            ))}
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, x: 45, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.15 }}
        >
          <motion.div key={node.id} className="panel-ink h-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Building2 className="h-4 w-4" /> Branch snapshot
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold text-foreground">{node.name}</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Cell label="Waiting" value={<CountUp value={node.waiting} />} />
              <Cell label="Avg wait" value={<CountUp value={node.wait} decimals={1} suffix=" min" />} />
              <Cell label="Desks open" value={<><CountUp value={node.desks} /> / 4</>} />
              <Cell label="Served today" value={<CountUp value={node.waiting * 17} />} />
            </div>
            <div className="mt-5 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(BRANCH_CHARTS[node.id as keyof typeof BRANCH_CHARTS] ?? BRANCH_CHARTS["amd"]) as any[]}>
                  <defs>
                    <linearGradient id="qsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="var(--violet)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="tickets"
                    stroke="oklch(0.8 0.1 300)"
                    strokeWidth={2}
                    fill="url(#qsArea)"
                    isAnimationActive={!reduce}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Button asChild variant="glass" className="mt-4 w-full">
              <Link to="/app">Open the live dashboard</Link>
            </Button>
          </motion.div>
        </m.div>
      </div>
    </Section>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface/50 backdrop-blur-sm px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-display text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}

/* ----------------------------- 07 ANALYTICS ---------------------------- */
/* Composition: oversized chart + supporting stat rail beside it.          */

const ANALYTICS_STATS = [
  { label: "Peak hour", value: "11:00–12:00", note: "38% of the day's tokens" },
  { label: "Avg handling time", value: "4m 12s", note: "down 22% since rollout" },
  { label: "SLA breaches", value: "3", note: "this week, all resolved" },
];

export function AnalyticsSection() {
  const [range, setRange] = useState<"week" | "hours">("hours");

  return (
    <Section
      id="analytics-section"
      tone="pearl"
      wide
    >
      <SectionHeader
        eyebrow="Business intelligence"
        title={["Peak hours, staff performance,", "{branch comparison}."]}
        lead="Charts that answer operational questions: when does the queue break, and which desk keeps it together?"
      />
      <div className="grid gap-6 lg:grid-cols-[2.1fr_1fr]">
        <m.div
          initial={{ opacity: 0, y: 40, scale: 0.95, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <div className="panel p-6 lg:p-8 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-2xl font-bold">
                  {range === "hours" ? "Ticket volume by hour" : "Served vs appointments this week"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Apollo Care Center · all branches · simulated dataset
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-border bg-muted/60 p-1">
                {(["hours", "week"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                      range === r
                        ? "bg-surface shadow-[var(--shadow-soft)] text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r === "hours" ? "By hour" : "By day"}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              key={range}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-8 h-[26rem] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                {range === "hours" ? (
                  <BarChart data={HOURLY_VOLUME}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "var(--accent)" }}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                      }}
                    />
                    <Bar dataKey="tickets" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={WEEKLY_TREND}>
                    <defs>
                      <linearGradient id="qsServed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="qsAppt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--coral)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                      }}
                    />
                    <Area type="monotone" dataKey="served" stroke="var(--primary)" strokeWidth={2} fill="url(#qsServed)" />
                    <Area type="monotone" dataKey="appointments" stroke="var(--coral)" strokeWidth={2} fill="url(#qsAppt)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          </div>
        </m.div>

        <div className="grid content-start gap-4">
          {ANALYTICS_STATS.map((s, i) => (
            <m.div
              key={s.label}
              initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-6%" }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 22,
                delay: 0.1 + i * 0.1,
              }}
              whileHover={{ x: 6, scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="rounded-3xl border border-border bg-surface/80 p-6 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-2 font-display text-3xl font-bold text-gradient">{s.value}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.note}</p>
              </div>
            </m.div>
          ))}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <div className="rounded-3xl border border-primary/25 bg-accent/60 p-6 shadow-sm">
              <p className="text-sm leading-relaxed text-foreground/80">
                Every chart is filtered by company, branch, desk and service — and exports straight
                into the weekly operations review.
              </p>
            </div>
          </m.div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------ 08 ALERTS ------------------------------ */
/* Composition: Alert Intelligence Hero + Connected Process Timeline + Bottom Features */

export function AlertIntelligence() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="alert-intelligence-section"
      className="relative overflow-hidden py-12 sm:py-16 lg:py-20 bg-[#FBFCFF] dark:bg-slate-950/80 transition-colors"
    >
      {/* Soft Ambient Background Blobs & Glowing Auras */}
      <div
        className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[520px] rounded-full bg-purple-200/25 blur-[120px] dark:bg-purple-900/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-10 right-10 h-[480px] w-[480px] rounded-full bg-blue-100/35 blur-[130px] dark:bg-blue-900/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 left-0 h-[400px] w-[400px] rounded-full bg-rose-100/20 blur-[130px] dark:bg-rose-950/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 h-[350px] w-[450px] rounded-full bg-cyan-100/25 blur-[120px] dark:bg-cyan-950/15"
        aria-hidden
      />

      {/* Undulating Pastel Wave Ribbon running across hero center */}
      <div className="pointer-events-none absolute inset-x-0 top-36 sm:top-40 lg:top-48 h-64 overflow-hidden opacity-75 dark:opacity-20" aria-hidden>
        <svg
          viewBox="0 0 1440 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="pastelWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.4" />
              <stop offset="35%" stopColor="#A5B4FC" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#BAE6FD" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="waveStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
              <stop offset="45%" stopColor="#6366F1" stopOpacity="0.25" />
              <stop offset="80%" stopColor="#38BDF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M -50 160 C 250 80, 480 240, 780 140 C 1080 40, 1260 210, 1500 120 L 1500 280 L -50 280 Z"
            fill="url(#pastelWaveGrad)"
          />
          <path
            d="M -50 160 C 250 80, 480 240, 780 140 C 1080 40, 1260 210, 1500 120"
            stroke="url(#waveStrokeGrad)"
            strokeWidth="1.5"
            strokeDasharray="6 8"
          />
        </svg>
      </div>

      <div className="relative mx-auto w-full max-w-[1728px] w-[98%] px-4 sm:px-6 lg:px-8 xl:px-12">
        
        {/* ============================================================== */}
        {/* 1. TOP HERO SECTION: Left (Heading & Info) + Right (Bell & Cards) */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
          
          {/* LEFT COLUMN: Badge, Headline & Subtitle */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Pill with vertical gradient accent bar */}
            <m.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2.5"
            >
              <span className="h-6 w-1 rounded-full bg-gradient-to-b from-[#FF7A3C] via-[#FF5A5F] to-[#6C4CF8]" />
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/90 dark:border-purple-800/60 bg-purple-50/80 dark:bg-purple-950/50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6C4CF8] dark:text-purple-300 shadow-2xs backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-[#6C4CF8] shadow-[0_0_8px_rgba(108,76,248,0.7)] animate-pulse" />
                ALERT INTELLIGENCE
              </div>
            </m.div>

            {/* Main Headline */}
            <m.h2
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 font-display text-4xl sm:text-5xl lg:text-[3.85rem] xl:text-[4.3rem] font-extrabold tracking-tight text-[#08132C] dark:text-white leading-[1.08]"
            >
              The queue tells you
              <br />
              before it{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4CF8] via-[#5B54FA] to-[#4D8DFF]">
                breaks
              </span>
              .
            </m.h2>

            {/* Description */}
            <m.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#69738A] dark:text-slate-400 font-normal"
            >
              Rules watch wait time, queue length, operator presence and device health — and escalate the moment a threshold slips.
            </m.p>
          </div>

          {/* RIGHT COLUMN: Glass Notification Bell + 4 Floating Metric Cards */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[360px] sm:min-h-[400px]">
            {/* Concentric blurred circles behind bell */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <span className="h-72 w-72 rounded-full border border-purple-200/40 dark:border-purple-800/20 bg-purple-50/20 dark:bg-purple-950/10 animate-[spin_60s_linear_infinite]" />
              <span className="absolute h-56 w-56 rounded-full border border-indigo-200/50 dark:border-indigo-800/30 bg-indigo-50/20 dark:bg-indigo-950/15" />
              <span className="absolute h-40 w-40 rounded-full border border-blue-200/60 dark:border-blue-800/40 bg-white/40 dark:bg-blue-950/20 shadow-[0_0_40px_rgba(108,76,248,0.15)]" />
              <span className="absolute h-28 w-28 rounded-full bg-gradient-to-tr from-purple-400/30 via-indigo-300/30 to-blue-400/30 blur-2xl animate-pulse" />
            </div>

            {/* Left Sound Wave Arcs (Warm pink/orange) */}
            <div className="pointer-events-none absolute left-[28%] sm:left-[30%] top-1/2 -translate-y-1/2 z-10" aria-hidden>
              <svg width="28" height="42" viewBox="0 0 28 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 11C8 17 8 25 12 31" stroke="url(#soundLeftGrad)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M22 6C16 16 16 26 22 36" stroke="url(#soundLeftGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                <defs>
                  <linearGradient id="soundLeftGrad" x1="0" y1="0" x2="0" y2="42" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF7A3C" />
                    <stop offset="1" stopColor="#FF5A5F" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Right Sound Wave Arcs (Cool sky/cyan) */}
            <div className="pointer-events-none absolute right-[28%] sm:right-[30%] top-1/2 -translate-y-1/2 z-10" aria-hidden>
              <svg width="28" height="42" viewBox="0 0 28 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 11C20 17 20 25 16 31" stroke="url(#soundRightGrad)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M6 6C12 16 12 26 6 36" stroke="url(#soundRightGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                <defs>
                  <linearGradient id="soundRightGrad" x1="0" y1="0" x2="0" y2="42" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4D8DFF" />
                    <stop offset="1" stopColor="#1ED6D2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Central 3D Glass Floating Notification Bell */}
            <m.div
              animate={{
                y: [0, -8, 0],
                rotate: [-1.2, 1.2, -1.2],
              }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative z-10 flex items-center justify-center select-none"
            >
              <img
                src="/glass-bell.png"
                alt="Notification Bell"
                className="w-36 h-36 sm:w-44 sm:h-44 object-contain filter drop-shadow-[0_20px_35px_rgba(108,76,248,0.24)]"
              />
            </m.div>

            {/* 1. TOP-LEFT CARD: Wait Time 15 min ↑ */}
            <m.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ y: -4, scale: 1.03 }}
              className="absolute top-2 left-0 sm:-left-2 z-20 rounded-[18px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-4 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] flex items-center gap-3 transition-all cursor-default"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4ED] dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/40 text-[#FF7A3C]">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] font-medium text-[#69738A] dark:text-slate-400">Wait time</div>
                <div className="text-sm sm:text-base font-extrabold text-[#08132C] dark:text-white flex items-center gap-1">
                  15 min
                  <span className="text-[#FF7A3C] font-black text-sm">↑</span>
                </div>
              </div>
            </m.div>

            {/* 2. TOP-RIGHT CARD: Queue Length 32 ↑ */}
            <m.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              whileHover={{ y: -4, scale: 1.03 }}
              className="absolute top-2 right-0 sm:-right-2 z-20 rounded-[18px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-4 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] flex items-center gap-3 transition-all cursor-default"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-[#4D8DFF]">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] font-medium text-[#69738A] dark:text-slate-400">Queue Length</div>
                <div className="text-sm sm:text-base font-extrabold text-[#08132C] dark:text-white flex items-center gap-1">
                  32
                  <span className="text-[#4D8DFF] font-black text-sm">↑</span>
                </div>
              </div>
            </m.div>

            {/* 3. BOTTOM-LEFT CARD: Device Health Online ● */}
            <m.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              whileHover={{ y: -4, scale: 1.03 }}
              className="absolute bottom-2 left-0 sm:left-1 z-20 rounded-[18px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-4 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] flex items-center gap-3 transition-all cursor-default"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-[#10B981]">
                <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] font-medium text-[#69738A] dark:text-slate-400">Device Health</div>
                <div className="text-sm sm:text-base font-extrabold text-[#08132C] dark:text-white flex items-center gap-1.5">
                  Online
                  <span className="h-2.5 w-2.5 rounded-full bg-[#21C55D] shadow-[0_0_8px_rgba(33,197,93,0.7)] animate-pulse" />
                </div>
              </div>
            </m.div>

            {/* 4. BOTTOM-RIGHT CARD: Operator Offline ● */}
            <m.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
              whileHover={{ y: -4, scale: 1.03 }}
              className="absolute bottom-2 right-0 sm:right-1 z-20 rounded-[18px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-4 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] flex items-center gap-3 transition-all cursor-default"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F2] dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 text-[#FF5A5F]">
                <User className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] font-medium text-[#69738A] dark:text-slate-400">Operator</div>
                <div className="text-sm sm:text-base font-extrabold text-[#08132C] dark:text-white flex items-center gap-1.5">
                  Offline
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5A5F] shadow-[0_0_8px_rgba(255,90,95,0.7)] animate-pulse" />
                </div>
              </div>
            </m.div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. HORIZONTAL PROCESS TIMELINE: 4 Connected Cards              */}
        {/* ============================================================== */}
        <div className="mt-8 sm:mt-10 lg:mt-12">
          {/* The 4 Timeline Process Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            
            {/* CARD 01 — Threshold slips */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-5 sm:p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_24px_50px_rgba(255,122,60,0.12)] hover:border-orange-200 dark:hover:border-orange-800/60 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF7A3C] text-white text-xs font-black shadow-sm shadow-orange-500/30">
                    01
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#FF7A3C] uppercase tracking-wider">
                    Step 1
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#08132C] dark:text-white">
                  Threshold slips
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#69738A] dark:text-slate-400">
                  Wait time crosses 15 min at Counter 03.
                </p>
              </div>

              {/* Bottom Metric Panel */}
              <div className="mt-6 rounded-2xl bg-[#FFF9F5] dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-orange-200/70 dark:border-orange-800/40 text-[#FF7A3C]">
                    <Clock className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-[#69738A] dark:text-slate-400">Wait Time</div>
                    <div className="text-base font-extrabold text-[#FF7A3C] leading-tight">16 min</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium text-[#69738A] dark:text-slate-400">Counter 03</div>
                  <div className="text-base font-black text-[#FF7A3C] leading-tight">↑</div>
                </div>
              </div>
            </m.div>

            {/* CARD 02 — Alert raised */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-5 sm:p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_24px_50px_rgba(255,90,95,0.12)] hover:border-rose-200 dark:hover:border-rose-800/60 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5A5F] text-white text-xs font-black shadow-sm shadow-rose-500/30">
                    02
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#FF5A5F] uppercase tracking-wider">
                    Step 2
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#08132C] dark:text-white">
                  Alert raised
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#69738A] dark:text-slate-400">
                  Branch admin is pinged in-app and by email.
                </p>
              </div>

              {/* Bottom Metric Panel */}
              <div className="mt-6 rounded-2xl bg-[#FFFBF7] dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-amber-200/70 dark:border-amber-800/40 text-[#FF7A3C]">
                    <Bell className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-[#69738A] dark:text-slate-400">Alert Sent</div>
                    <div className="text-base font-extrabold text-[#08132C] dark:text-white leading-tight">10:24 AM</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/50 px-2 py-0.5 text-[10px] font-semibold text-[#21C55D]">
                    In-App
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/50 px-2 py-0.5 text-[10px] font-semibold text-[#21C55D]">
                    Email
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                </div>
              </div>
            </m.div>

            {/* CARD 03 — Action taken */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="rounded-[26px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-5 sm:p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_24px_50px_rgba(108,76,248,0.12)] hover:border-purple-200 dark:hover:border-purple-800/60 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6C4CF8] text-white text-xs font-black shadow-sm shadow-purple-500/30">
                    03
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#6C4CF8] uppercase tracking-wider">
                    Step 3
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#08132C] dark:text-white">
                  Action taken
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#69738A] dark:text-slate-400">
                  Counter 04 opened, queue re-balanced instantly.
                </p>
              </div>

              {/* Bottom Metric Panel */}
              <div className="mt-6 rounded-2xl bg-[#F7F5FF] dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-purple-200/70 dark:border-purple-800/40 text-[#6C4CF8]">
                    <UserPlus className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-[#69738A] dark:text-slate-400">Counter 04</div>
                    <div className="text-base font-extrabold text-[#6C4CF8] leading-tight">Opened</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium text-[#69738A] dark:text-slate-400">Queue</div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/50 px-2 py-0.5 text-[10px] font-semibold text-[#21C55D]">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                    Balanced
                  </span>
                </div>
              </div>
            </m.div>

            {/* CARD 04 — Resolved (Grand Gradient Hero Card) */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="rounded-[26px] bg-gradient-to-br from-[#4D8DFF] via-[#2563EB] to-[#1ED6D2] p-5 sm:p-6 text-white shadow-[0_20px_50px_rgba(37,99,235,0.25)] hover:shadow-[0_28px_60px_rgba(6,182,212,0.35)] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#2563EB] text-xs font-black shadow-sm">
                    04
                  </span>
                  <span className="font-mono text-[11px] font-bold text-white/90 uppercase tracking-wider">
                    Step 4
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  Resolved
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/90">
                  Wait back to 6m 10s, breach logged for SLA.
                </p>
              </div>

              {/* Bottom Metric Panel (Frosted White Card) */}
              <div className="mt-6 rounded-2xl bg-white p-3.5 flex items-center justify-between text-slate-900 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-200/60 text-[#1ED6D2]">
                    <BarChart3 className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-[#69738A]">Current Wait Time</div>
                    <div className="text-base font-extrabold text-[#0891b2] leading-tight">6m 10s</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#21C55D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    SLA Logged
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                </div>
              </div>
            </m.div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. BOTTOM FEATURES: 3 Clean Columns with Separators             */}
        {/* ============================================================== */}
        <div className="mt-10 sm:mt-12 lg:mt-14 pt-8 sm:pt-10 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Feature 1 */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-start gap-4"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/40 text-[#6C4CF8] shadow-xs">
              <ShieldCheck className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="font-display text-base font-bold text-[#08132C] dark:text-white">
                Rules you build, not tickets you file
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-[#69738A] dark:text-slate-400">
                Combine a metric, a threshold and a channel. Enable per company, override per branch.
              </p>
            </div>
          </m.div>

          {/* Feature 2 */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-start gap-4 md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-8 lg:pl-12"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-800/40 text-[#FF7A3C] shadow-xs">
              <BellRing className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="font-display text-base font-bold text-[#08132C] dark:text-white">
                Notification centre with unread state
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-[#69738A] dark:text-slate-400">
                Alerts land in-app first with severity colouring, so nothing important gets buried.
              </p>
            </div>
          </m.div>

          {/* Feature 3 */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-start gap-4 md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-8 lg:pl-12"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/40 text-[#4D8DFF] shadow-xs">
              <CalendarCheck className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="font-display text-base font-bold text-[#08132C] dark:text-white">
                SLA reporting built in
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-[#69738A] dark:text-slate-400">
                Every breach is logged, so the weekly review argues from data instead of memory.
              </p>
            </div>
          </m.div>

        </div>

      </div>
    </section>
  );
}

/* ---------------------------- 09 USE CASES ----------------------------- */
const USE_CASES = [
  {
    img: photoHealthcare,
    title: "Healthcare",
    body: "OPD, diagnostics, pharmacy and billing queues that never collide — one patient, one visible journey through four departments.",
    stat: "38% shorter OPD waits",
    span: "lg:col-span-7",
    h: "h-[30rem]",
  },
  {
    img: photoBanking,
    title: "Banking",
    body: "Advisory appointments running alongside walk-in cash counters, without either blocking the other.",
    stat: "2.4× advisor utilisation",
    span: "lg:col-span-5",
    h: "h-[30rem]",
  },
  {
    img: photoGovernment,
    title: "Government",
    body: "Document verification halls with a fair, visible order that nobody has to argue about.",
    stat: "Zero paper tokens",
    span: "lg:col-span-5",
    h: "h-[26rem]",
  },
  {
    img: photoRetail,
    title: "Telecom & retail",
    body: "Service desks that route by request type, not by luck — activation, billing and repairs each land where they should.",
    stat: "91% first-desk resolution",
    span: "lg:col-span-7",
    h: "h-[26rem]",
  },
];

export function UseCases() {
  return (
    <Section
      id="use-cases-section"
      tone="pearl"
      wide
    >
      <SectionHeader
        eyebrow="In the wild"
        title={["Built for rooms", "full of {real people}."]}
        lead="Wherever a counter meets a queue, Quesole gives both sides the same clarity."
      />
      <div className="grid gap-5 lg:grid-cols-12">
        {USE_CASES.map((u, i) => (
          <m.div
            key={u.title}
            className={u.span}
            initial={{ opacity: 0, y: 50, scale: 0.94, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-6%" }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 22,
              delay: i * 0.1,
            }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
          >
            <article
              className={cn(
                "group relative overflow-hidden rounded-[2rem] border border-border shadow-[var(--shadow-soft)] hover:shadow-[0_24px_55px_-10px_rgba(0,0,0,0.25)] transition-shadow duration-500",
                u.h,
              )}
            >
              <img
                src={u.img}
                alt={`${u.title} service environment`}
                width={1600}
                height={1200}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.08] [filter:saturate(0.9)_contrast(1.06)]"
              />
              <div
                className="absolute inset-0"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(0deg, oklch(0.16 0.04 280 / 0.94) 0%, oklch(0.18 0.05 285 / 0.5) 45%, transparent 80%)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur shadow-xs">
                  {u.stat}
                </span>
                <h3 className="mt-4 font-display text-3xl font-bold text-white tracking-tight">{u.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80 opacity-0 transition-all duration-500 group-hover:opacity-100 lg:translate-y-2 lg:group-hover:translate-y-0">
                  {u.body}
                </p>
              </div>
            </article>
          </m.div>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------- 10 PRICING ------------------------------ */

export function PricingBlock({ compact = false }: { compact?: boolean }) {
  const [annual, setAnnual] = useState(false);

  return (
    <Section
      tone="ice"
    >
      <SectionHeader
        align="center"
        eyebrow="Pricing"
        title={
          compact
            ? ["Plans that {scale}", "with your branch count."]
            : ["Straightforward plans,", "no {counter tax}."]
        }
        lead="Every plan includes the customer token page, live simulation of your operation and unlimited customers."
      />
      <m.div
        initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-6%" }}
        transition={{ duration: 0.5 }}
        className="mb-12 flex justify-center"
      >
        <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface p-1.5 shadow-sm">
          {(["monthly", "annual"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setAnnual(k === "annual")}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer",
                (k === "annual") === annual
                  ? "bg-brand text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "monthly" ? "Monthly" : "Annual · save 2 months"}
            </button>
          ))}
        </div>
      </m.div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => (
          <m.div
            key={p.id}
            initial={{ opacity: 0, y: 50, scale: 0.93, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-6%" }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 22,
              delay: i * 0.1,
            }}
            whileHover={{ y: -8, scale: p.recommended ? 1.06 : 1.02, transition: { duration: 0.25 } }}
            className="h-full"
          >
            <div
              className={cn(
                "relative flex h-full flex-col rounded-[1.75rem] p-7 transition-all duration-300",
                p.recommended
                  ? "border border-primary/50 bg-surface shadow-[0_36px_90px_-40px_oklch(0.53_0.17_283_/_0.75)] lg:-mt-6 lg:p-9"
                  : "border border-border bg-surface/85 shadow-[var(--shadow-soft)] hover:shadow-lg backdrop-blur",
              )}
              style={
                p.recommended
                  ? {
                    backgroundImage:
                      "radial-gradient(120% 60% at 50% 0%, color-mix(in oklab, var(--violet) 12%, transparent), transparent 60%), linear-gradient(var(--surface), var(--surface))",
                  }
                  : undefined
              }
            >
              {p.recommended ? (
                <m.div
                  animate={{ opacity: [0.25, 0.45, 0.25] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute -inset-[3px] -z-10 rounded-[1.85rem] opacity-35 blur-[20px]"
                  style={{ background: "var(--gradient-brand)" }}
                  aria-hidden
                />
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                {p.recommended ? (
                  <span className="rounded-full bg-coral px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-coral-foreground shadow-xs animate-pulse">
                    Recommended
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.tagline}</p>
              <div className="mt-6 flex items-end gap-1.5">
                <motion.span
                  key={annual ? "a" : "m"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "font-display font-bold",
                    p.recommended ? "text-5xl text-gradient" : "text-4xl",
                  )}
                >
                  ₹{(annual ? p.annual : p.monthly).toLocaleString("en-IN")}
                </motion.span>
                <span className="pb-1.5 text-sm text-muted-foreground">
                  /{annual ? "year" : "month"}
                </span>
              </div>
              <ul className="mt-7 grid gap-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 grow" />
              <Button asChild variant={p.recommended ? "brand" : "outline"} size="lg" className="w-full mt-4 cursor-pointer hover:scale-102 active:scale-98 transition-all">
                <Link to="/signup">Choose {p.name}</Link>
              </Button>
            </div>
          </m.div>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------- 11 TRUST + CTA ---------------------------- */

const TRUST = [
  { title: "99.98% uptime", body: "Display boards and kiosks keep serving through network blips." },
  { title: "Scoped access", body: "Five roles, each seeing exactly their company, branch or desk." },
  { title: "Full audit trail", body: "Every approval, plan change and configuration edit is logged." },
  { title: "Privacy first", body: "Customer contact data is collected for one visit, not forever." },
];

export function TrustSection() {
  return (
    <Section
      id="partnerships"
      tone="pearl"
      wide
    >
      <SectionHeader
        eyebrow="Trust"
        title={["Multi-tenant by {architecture},", "not by convention."]}
        lead="Company and branch scoping is enforced in the data layer, so one tenant can never see another's queue."
      />
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        {/* illustrated architecture backdrop with depth */}
        <m.div
          initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
        >
          <div className="relative aspect-square w-full max-w-lg [perspective:1100px] mx-auto">
            <div
              className="absolute inset-0 rounded-full blur-3xl"
              aria-hidden
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--violet) 35%, transparent), transparent 65%)",
                opacity: 0.4,
              }}
            />
            <div className="absolute inset-0 [transform:rotateX(52deg)_rotateZ(-38deg)] [transform-style:preserve-3d]">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-[14%] rounded-3xl border border-primary/25 bg-surface/75 backdrop-blur shadow-2xl"
                  style={{ boxShadow: "var(--shadow-lift)" }}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.14, ease: EASE }}
                  animate={{ translateZ: [i * 70, i * 70 + 14, i * 70] }}
                >
                  <div className="grid-faint h-full w-full rounded-3xl opacity-60" />
                </motion.div>
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <motion.div
                className="grid h-24 w-24 place-items-center rounded-3xl bg-brand text-primary-foreground shadow-[var(--shadow-lift)]"
                animate={{ y: [0, -12, 0], rotate: [0, 2, -2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <ShieldCheck className="h-10 w-10 stroke-[2.2]" />
              </motion.div>
            </div>
          </div>
        </m.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TRUST.map((t, i) => (
            <m.div
              key={t.title}
              initial={{ opacity: 0, x: 35, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-6%" }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 22,
                delay: 0.1 + i * 0.1,
              }}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="h-full rounded-3xl border border-border bg-surface/85 p-6 backdrop-blur shadow-xs hover:shadow-md transition-shadow group">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand group-hover:text-primary-foreground">
                  <ShieldCheck className="h-6 w-6 stroke-[2]" />
                </div>
                <h3 className="mt-3.5 font-display text-lg font-bold text-foreground transition-colors group-hover:text-primary">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <Section id="contact" className="pb-24">
      <m.div
        initial={{ opacity: 0, y: 50, scale: 0.96, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-8%" }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
      >
        <div className="relative overflow-hidden rounded-[2.5rem] bg-brand px-6 py-20 text-center text-primary-foreground sm:px-12 shadow-[0_30px_80px_-20px_rgba(99,102,241,0.5)]">
          <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden>
            <svg viewBox="0 0 600 200" className="h-full w-full">
              {[0, 1, 2, 3].map((i) => (
                <motion.path
                  key={i}
                  d={`M0 ${60 + i * 30} C 150 ${20 + i * 30}, 300 ${110 + i * 20}, 600 ${50 + i * 26}`}
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.8, delay: i * 0.15, ease: EASE }}
                />
              ))}
            </svg>
          </div>
          <m.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl text-white drop-shadow-md"
          >
            Ready to make waiting smarter?
          </m.h2>
          <m.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative mx-auto mt-4 max-w-xl text-base opacity-95 sm:text-lg text-slate-100"
          >
            Spin up a branch, print a QR code and watch your first token move — in under five minutes.
          </m.p>
          <m.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative mt-9 flex flex-wrap justify-center gap-3.5"
          >
            <Magnetic>
              <Button asChild size="lg" variant="coral" className="rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">
                <Link to="/signup">Start your free trial</Link>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="glass" className="rounded-xl font-bold hover:scale-105 active:scale-95 transition-all">
              <Link to="/app">Book a demo walkthrough</Link>
            </Button>
          </m.div>
        </div>
      </m.div>
    </Section>
  );
}

export { ScrollControlledBackground } from "./scroll-controlled-background";
export { SectionHeader } from "./section-header";
