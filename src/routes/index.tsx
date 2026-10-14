import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import {
  AlertIntelligence,
  AnalyticsSection,
  CommandCentre,
  FinalCta,
  Hero,
  HeroFeaturesCarousel,
  HowItWorks,
  LiveQueueDemo,
  MethodsSection,
  PricingBlock,
  ProblemSection,
  ScrollControlledBackground,
  TrustSection,
  UseCases,
} from "@/components/site/sections";

import { useScroll, useSpring, motion as m } from "motion/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quesole — Turn waiting into a smarter experience" },
      {
        name: "description",
        content:
          "Quesole orchestrates walk-in queues, multi-desk routing, Now Serving display boards and remote appointments across every branch, in real time.",
      },
      { property: "og:title", content: "Quesole — Queue orchestration for every branch" },
      {
        property: "og:description",
        content:
          "Four queuing methods, live dashboards and real-time alerts for healthcare, banking, government and retail service teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="min-h-screen">
      {/* Top Scroll Progress Indicator */}
      <m.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 origin-left z-[100] shadow-[0_0_12px_rgba(99,102,241,0.65)] pointer-events-none"
      />
      <SiteNav />
      <main>
        {/* Hero Section containing clear video background, copy, stats, and moving cards carousel in 100dvh */}
        <Hero />
        <ScrollControlledBackground />
        <ProblemSection />
        <HowItWorks />
        <LiveQueueDemo />
        <MethodsSection />
        <CommandCentre />
        <AnalyticsSection />
        <AlertIntelligence />
        <UseCases />
        <PricingBlock compact />
        <TrustSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
