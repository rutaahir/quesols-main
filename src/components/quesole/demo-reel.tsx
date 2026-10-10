import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, CheckCircle2, ChevronLeft, ChevronRight, Pause, Play, QrCode, Smartphone, Timer, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import img1 from "@/assets/1.jpeg";
import img2 from "@/assets/2.jpeg";
import img3 from "@/assets/3.jpeg";
import img4 from "@/assets/4.jpeg";
import img5 from "@/assets/5.jpeg";

const STEPS = [
  {
    id: 1,
    image: img1,
    icon: QrCode,
    title: "Scan the branch QR",
    subtitle: "Instant Touchless Entry",
    body: "No app, no hardware, no paper roll. The customer points their smartphone camera at the desk QR code to join the line instantly.",
    highlight: "Scan & Enter"
  },
  {
    id: 2,
    image: img2,
    icon: Smartphone,
    title: "Token issued instantly",
    subtitle: "Real-Time Digital Pass",
    body: "Token A104 lands directly on their phone screen with their assigned service, counter destination, and current queue position.",
    highlight: "Token A104 Issued"
  },
  {
    id: 3,
    image: img3,
    icon: Timer,
    title: "Live position tracking",
    subtitle: "Transparent Wait Intelligence",
    body: "Ahead-of-you count and estimated waiting times update dynamically in real-time as counters call the next customer.",
    highlight: "Live Position #3"
  },
  {
    id: 4,
    image: img4,
    icon: Bell,
    title: "Smart notification",
    subtitle: "Proactive Automated Alerts",
    body: "\"You're next — please head to Counter 03\" fires via WhatsApp/SMS two turns before their service time.",
    highlight: "Proceed to Counter 03"
  },
  {
    id: 5,
    image: img5,
    icon: CheckCircle2,
    title: "Served on time",
    subtitle: "Seamless Completion Analytics",
    body: "The service agent closes the ticket with one tap, updating real-time branch analytics and recording customer feedback.",
    highlight: "Ticket Completed"
  },
];

const STEP_MS = 4000;

export function DemoReel({
  playing = true,
  className,
  onStepChange,
}: {
  playing?: boolean;
  className?: string;
  onStepChange?: (stepIndex: number) => void;
}) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!playing || reduce) return;
    const id = setInterval(() => {
      setI((v) => {
        const next = (v + 1) % STEPS.length;
        if (onStepChange) onStepChange(next);
        return next;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [playing, reduce, onStepChange]);

  const goToStep = (index: number) => {
    setI(index);
    if (onStepChange) onStepChange(index);
  };

  const step = STEPS[i]!;
  const Icon = step.icon;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-slate-50 shadow-2xl backdrop-blur-xl",
        className
      )}
    >
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-violet-600/30 blur-[120px]" />
      </div>

      <div className="relative p-4 sm:p-6 lg:p-8">
        {/* Top Bar Header */}
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
              Quesole · Customer Journey
            </span>
          </div>
          <div className="rounded-full bg-white/10 px-3.5 py-1 font-mono text-xs font-semibold text-slate-200 backdrop-blur-md border border-white/10">
            {String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </div>
        </div>

        {/* Main Content Grid: Image + Description */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          {/* Image Showcase Container (7 cols on desktop) */}
          <div className="relative lg:col-span-7">
            <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/15 bg-slate-900/80 shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 h-full w-full"
                >
                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                </motion.div>
              </AnimatePresence>

              {/* Floating Highlight Badge over Image */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <motion.div
                  key={`badge-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/85 px-4 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md"
                >
                  <Icon className="h-4 w-4 text-indigo-400" />
                  <span>{step.highlight}</span>
                </motion.div>
                <div className="text-[11px] font-semibold text-slate-300 bg-slate-900/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  Step {i + 1} of 5
                </div>
              </div>
            </div>
          </div>

          {/* Details & Interactive Steps List (5 cols on desktop) */}
          <div className="flex flex-col justify-between space-y-5 lg:col-span-5 lg:space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`desc-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-3"
              >
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  <Icon className="h-4 w-4" />
                  <span>{step.subtitle}</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-white sm:text-3xl leading-tight">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  {step.body}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Step Selection Thumbnails / Nav */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Customer Steps:
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {STEPS.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => goToStep(idx)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center rounded-xl p-2 transition-all duration-300 border cursor-pointer",
                      idx === i
                        ? "border-indigo-500 bg-indigo-500/25 text-white shadow-lg shadow-indigo-500/20"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/25 hover:bg-white/10 hover:text-slate-200"
                    )}
                  >
                    <span className="text-[11px] font-bold">0{idx + 1}</span>
                    <span className="mt-0.5 truncate text-[9px] opacity-80 max-w-full px-0.5">
                      {s.title.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar Timeline at Bottom */}
        <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
          <button
            onClick={() => goToStep((i - 1 + STEPS.length) % STEPS.length)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-1 gap-2">
            {STEPS.map((_, k) => (
              <button
                key={k}
                onClick={() => goToStep(k)}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15 cursor-pointer"
                aria-label={`Go to step ${k + 1}`}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                  initial={false}
                  animate={{ width: k < i ? "100%" : k === i ? "100%" : "0%" }}
                  transition={{
                    duration: k === i && playing && !reduce ? STEP_MS / 1000 : 0.2,
                    ease: "linear",
                  }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={() => goToStep((i + 1) % STEPS.length)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DemoReelModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [playing, setPlaying] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-white/15 bg-slate-950 p-2 sm:p-4 text-slate-50 shadow-2xl sm:rounded-3xl">
        <DialogTitle className="sr-only">
          Quesole Customer Journey Product Demo
        </DialogTitle>
        {open ? <DemoReel playing={playing} /> : null}
        <div className="mt-2 flex items-center justify-between px-3 pb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPlaying((p) => !p)}
            className="text-slate-300 hover:bg-white/10 hover:text-white font-medium text-xs"
          >
            {playing ? <Pause className="mr-1.5 h-3.5 w-3.5 text-indigo-400" /> : <Play className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />}
            {playing ? "Pause Auto-play" : "Play Demo"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close demo"
            className="text-slate-300 hover:bg-white/10 hover:text-white font-medium text-xs"
          >
            <X className="mr-1.5 h-3.5 w-3.5 text-slate-400" /> Close (Esc)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

