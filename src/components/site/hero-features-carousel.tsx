import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  QrCode,
  Smartphone,
  Printer,
  Tablet,
  MonitorPlay,
  Volume2,
  Users,
  Send,
  Maximize2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface HeroFeatureCard {
  id: number;
  number: string;
  title: string;
  subtitle: string;
  tag: string;
  description: string;
  image: string;
  icon: any;
  badgeBg: string;
  badgeText: string;
  accentGradient: string;
}

export const HERO_FEATURE_CARDS: HeroFeatureCard[] = [
  {
    id: 1,
    number: "01",
    title: "QR Code Entry",
    subtitle: "Touchless Smartphone Token",
    tag: "Mobile Web App",
    description:
      "Customers scan an entrance or desk QR code using their standard smartphone camera. Generates a live digital queue ticket instantly with zero app download required.",
    image: "/hero-cards/card-1.jpg",
    icon: QrCode,
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeText: "text-blue-600 dark:text-blue-400",
    accentGradient: "from-blue-600 to-indigo-600",
  },
  {
    id: 2,
    number: "02",
    title: "Self-Service Kiosk",
    subtitle: "Interactive Touchscreen Terminal",
    tag: "Hardware Station",
    description:
      "Commercial freestanding touchscreen kiosks for walk-in visitor registration, appointment check-ins, language selection, and intelligent category routing.",
    image: "/hero-cards/card-2.jpg",
    icon: Smartphone,
    badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    badgeText: "text-indigo-600 dark:text-indigo-400",
    accentGradient: "from-indigo-600 to-violet-600",
  },
  {
    id: 3,
    number: "03",
    title: "Thermal KOT Printer",
    subtitle: "High-Speed Ticket Dispenser",
    tag: "Thermal POS",
    description:
      "Heavy-duty POS thermal receipt printer dispensing crisp paper tickets with scannable QR codes, live estimated wait times, and counter instructions.",
    image: "/hero-cards/card-3.jpg",
    icon: Printer,
    badgeBg: "bg-sky-500/10 dark:bg-sky-500/20",
    badgeText: "text-sky-600 dark:text-sky-400",
    accentGradient: "from-sky-600 to-blue-600",
  },
  {
    id: 4,
    number: "04",
    title: "Tablet Desk Station",
    subtitle: "Reception Counter Check-In",
    tag: "Counter Tablet",
    description:
      "Compact desktop tablet stands on reception counters for guided visitor registration, purpose selection, and instant token generation.",
    image: "/hero-cards/card-4.jpg",
    icon: Tablet,
    badgeBg: "bg-violet-500/10 dark:bg-violet-500/20",
    badgeText: "text-violet-600 dark:text-violet-400",
    accentGradient: "from-violet-600 to-purple-600",
  },
  {
    id: 5,
    number: "05",
    title: "Digital Display Board",
    subtitle: "4K Central Queue TV Screen",
    tag: "Smart TV & WebOS",
    description:
      "4K ultra-wide waiting hall screens streaming real-time 'Now Serving' token numbers, counter destinations, flashing alerts, and upcoming queue positions.",
    image: "/hero-cards/card-5.jpg",
    icon: MonitorPlay,
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeText: "text-blue-600 dark:text-blue-400",
    accentGradient: "from-blue-600 to-cyan-600",
  },
  {
    id: 6,
    number: "06",
    title: "Multilingual Speaker",
    subtitle: "Acoustic Audio Callouts",
    tag: "Voice Engine",
    description:
      "Intelligent acoustic sound announcement system automatically broadcasting token numbers and counter directions in multiple customizable languages.",
    image: "/hero-cards/card-6.jpg",
    icon: Volume2,
    badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    badgeText: "text-cyan-600 dark:text-cyan-400",
    accentGradient: "from-cyan-600 to-teal-600",
  },
  {
    id: 7,
    number: "07",
    title: "Operator Workbench",
    subtitle: "Counter Executive Terminal",
    tag: "Agent Web App",
    description:
      "Dedicated web terminal for counter executives to call the next customer, reassign tickets, hold, transfer, and record service analytics in real-time.",
    image: "/hero-cards/card-7.jpg",
    icon: Users,
    badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    badgeText: "text-indigo-600 dark:text-indigo-400",
    accentGradient: "from-indigo-600 to-blue-600",
  },
  {
    id: 8,
    number: "08",
    title: "WhatsApp & SMS Pass",
    subtitle: "Real-Time Digital Ticket Alerts",
    tag: "WhatsApp API",
    description:
      "Direct WhatsApp and SMS integration sending digital queue passes, estimated wait times, and proactive turn reminders before service.",
    image: "/hero-cards/card-8.jpg",
    icon: Send,
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    accentGradient: "from-emerald-600 to-teal-600",
  },
];

const AUTO_INTERVAL_MS = 3800;

export function HeroFeaturesCarousel({
  className,
}: {
  className?: string;
  embedded?: boolean;
}) {
  // Triple array to enable infinite circular wrapping smoothly
  const items = [...HERO_FEATURE_CARDS, ...HERO_FEATURE_CARDS, ...HERO_FEATURE_CARDS];
  const totalOriginal = HERO_FEATURE_CARDS.length; // 8

  // Start in the middle set (index 8)
  const [index, setIndex] = useState(totalOriginal);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedCard, setSelectedCard] = useState<HeroFeatureCard | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [gapWidth, setGapWidth] = useState(20);

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  // Measure card width and responsive gap dynamically with ResizeObserver and window fallback
  const updateDimensions = useCallback(() => {
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const cardsPerView = screenWidth >= 1024 ? 4 : screenWidth >= 768 ? 3 : screenWidth >= 540 ? 2 : 1;
    const computedGap = screenWidth >= 1024 ? 20 : screenWidth >= 640 ? 16 : 12;
    setGapWidth(computedGap);

    let containerWidth = 0;
    if (containerRef.current && containerRef.current.clientWidth > 0) {
      containerWidth = containerRef.current.clientWidth;
    } else if (typeof window !== "undefined") {
      const maxW = Math.min(window.innerWidth * 0.98, 1728);
      const horizontalPadding = window.innerWidth >= 1024 ? 96 : window.innerWidth >= 640 ? 64 : 16;
      containerWidth = maxW - horizontalPadding;
    }

    if (containerWidth > 0) {
      const calculatedWidth = (containerWidth - (cardsPerView - 1) * computedGap) / cardsPerView;
      if (calculatedWidth > 0) {
        setCardWidth(calculatedWidth);
      }
    }
  }, []);

  useEffect(() => {
    updateDimensions();

    const raf = requestAnimationFrame(() => {
      updateDimensions();
    });

    const timer = setTimeout(() => {
      updateDimensions();
    }, 120);

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateDimensions);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [updateDimensions]);

  // Handle circular wrap around seamlessly
  const handleNext = useCallback(() => {
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= totalOriginal * 2) {
        return totalOriginal;
      }
      return next;
    });
  }, [totalOriginal]);

  const handlePrev = useCallback(() => {
    setIndex((prev) => {
      const next = prev - 1;
      if (next < totalOriginal) {
        return totalOriginal * 2 - 1;
      }
      return next;
    });
  }, [totalOriginal]);

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying || isHovered) return;

    const timer = setInterval(() => {
      handleNext();
    }, AUTO_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPlaying, isHovered, handleNext]);

  // Current active original index (0 to 7) for indicator pills
  const activeOriginalIndex = index % totalOriginal;

  const jumpToIndex = (origIdx: number) => {
    setIndex(totalOriginal + origIdx);
  };

  return (
    <div
      id="hero-features-overlay"
      aria-label="Quesols Hardware & Digital Touchpoints"
      className={cn("relative w-full select-none", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mx-auto w-full max-w-[1728px] w-[98%] px-2 sm:px-8 lg:px-12">
        {/* Carousel Outer Track with Gutters for Navigation Arrows */}
        <div
          className="relative group/track"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Side Left Navigation Arrow */}
          <button
            onClick={handlePrev}
            aria-label="Previous card"
            className="absolute -left-2 sm:-left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-30 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 shadow-md backdrop-blur-md hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Side Right Navigation Arrow */}
          <button
            onClick={handleNext}
            aria-label="Next card"
            className="absolute -right-2 sm:-right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-30 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 shadow-md backdrop-blur-md hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Carousel Viewport Container: Shows exactly 4 items per row on Desktop */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl sm:rounded-2xl py-1"
          >
            <motion.div
              className="flex items-stretch"
              style={{
                gap: `${gapWidth}px`,
              }}
              animate={{
                x: -(index * (cardWidth + gapWidth)),
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 26,
                mass: 0.8,
              }}
            >
              {items.map((card, idx) => {
                const Icon = card.icon;
                const isCurrentFocus = idx === index;

                return (
                  <div
                    key={`${card.id}-${idx}`}
                    style={
                      cardWidth > 0
                        ? {
                            width: `${cardWidth}px`,
                            minWidth: `${cardWidth}px`,
                            maxWidth: `${cardWidth}px`,
                            flex: `0 0 ${cardWidth}px`,
                          }
                        : undefined
                    }
                    onClick={() => setSelectedCard(card)}
                    className="shrink-0 group cursor-pointer w-full sm:w-[calc((100%-12px)/2)] md:w-[calc((100%-32px)/3)] lg:w-[calc((100%-60px)/4)]"
                  >
                    <div
                      className={cn(
                        "relative h-full flex flex-col justify-between rounded-xl sm:rounded-2xl border p-2 sm:p-2.5 transition-all duration-300",
                        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
                        "border-slate-200/90 dark:border-slate-800/90",
                        "shadow-[0_8px_24px_-6px_rgba(15,23,42,0.12),0_2px_8px_rgba(0,0,0,0.04)]",
                        "hover:shadow-[0_16px_36px_-8px_rgba(79,70,229,0.22)]",
                        "hover:border-indigo-400/80 dark:hover:border-indigo-500/80",
                        "hover:-translate-y-1",
                        isCurrentFocus && "ring-2 ring-indigo-500/30 border-indigo-500/50"
                      )}
                    >
                      {/* Top Image Showcase Area */}
                      <div className="relative w-full aspect-[16/9] max-h-24 sm:max-h-28 lg:max-h-32 rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner">
                        <img
                          src={card.image}
                          alt={card.title}
                          loading="lazy"
                          className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-106"
                        />

                        {/* Subtle Vignette Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity duration-300" />

                        {/* Top-Left Number Pill Badge */}
                        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center justify-center px-1.5 py-0.5 rounded-full bg-slate-900/80 dark:bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold shadow-xs">
                          {card.number}
                        </div>

                        {/* Top-Right Circular Icon Badge */}
                        <div
                          className={cn(
                            "absolute top-1.5 right-1.5 sm:top-2 sm:right-2",
                            "flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full",
                            "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs",
                            "border border-slate-200/80 dark:border-slate-700/80",
                            "text-indigo-600 dark:text-indigo-400",
                            "group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 transition-all duration-200 group-hover:scale-110"
                          )}
                          title={card.subtitle}
                        >
                          <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>

                        {/* Expand Hint Overlay Badge on Hover */}
                        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-0.5 group-hover:translate-y-0">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-semibold shadow-xs border border-slate-200/60 dark:border-slate-700">
                            <Maximize2 className="h-2 w-2" />
                            View
                          </span>
                        </div>
                      </div>

                      {/* Card Content Information */}
                      <div className="mt-2 sm:mt-2.5 flex flex-col justify-between flex-1">
                        <div>
                          <h3 className="font-display text-[12px] sm:text-[13px] lg:text-[14px] font-bold text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                            {card.title}
                          </h3>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                            {card.subtitle}
                          </p>
                        </div>

                        {/* Card Footer Tag & Subtle Action Circle */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 px-1.5 py-0.5 rounded-md">
                            {card.tag}
                          </span>
                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/70 group-hover:translate-x-0.5 transition-all">
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Bottom Pagination Dots & Play/Pause Controls */}
        <div className="mt-1 sm:mt-1.5 flex items-center justify-center gap-2">
          {/* Indicator Pills */}
          <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {HERO_FEATURE_CARDS.map((card, idx) => {
              const isActive = activeOriginalIndex === idx;
              return (
                <button
                  key={card.id}
                  onClick={() => jumpToIndex(idx)}
                  className="group py-0.5 px-0.5 focus:outline-none cursor-pointer"
                  title={`${card.number}. ${card.title}`}
                >
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      isActive
                        ? "w-5 sm:w-6 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_6px_rgba(79,70,229,0.5)]"
                        : "w-1.5 bg-slate-300/80 dark:bg-slate-700/80 group-hover:bg-slate-400 dark:group-hover:bg-slate-600"
                    )}
                  />
                </button>
              );
            })}

            <div className="h-2.5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Auto-Slide Play/Pause Toggle */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause auto-slide" : "Resume auto-slide"}
              className="flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="h-2 w-2" /> : <Play className="h-2 w-2 fill-current ml-0.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Inspect High-Res Modal for Selected Card */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          {selectedCard && (
            <div>
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                <img
                  src={selectedCard.image}
                  alt={selectedCard.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm shadow-md">
                    {selectedCard.number}
                  </span>
                  <span className="rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-slate-900 dark:text-white shadow-sm border border-white/40 dark:border-slate-800">
                    {selectedCard.subtitle}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <DialogTitle className="font-display text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {selectedCard.title}
                </DialogTitle>
                <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedCard.description}
                </p>

                <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Included in Quesols Enterprise Orchestration Plan</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      asChild
                      variant="brand"
                      size="sm"
                      className="w-full sm:w-auto justify-center"
                    >
                      <Link to="/pricing">
                        Configure in Plan
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
