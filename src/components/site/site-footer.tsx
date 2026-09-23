import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/site/logo";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Walk-in queues", to: "/" },
      { label: "Service routing", to: "/" },
      { label: "Display boards", to: "/services" },
      { label: "Appointments", to: "/book" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Healthcare", to: "/" },
      { label: "Banking", to: "/" },
      { label: "Government", to: "/" },
      { label: "Telecom", to: "/" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Live demo", to: "/app" },
      { label: "Kiosk mode", to: "/kiosk/b_amd_central" },
      { label: "Join a queue", to: "/q/b_amd_central" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Start free", to: "/signup" },
      { label: "Privacy", to: "/" },
      { label: "Terms", to: "/" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-brand opacity-60"
        aria-hidden
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:px-8">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Queue, appointment and branch orchestration for teams that serve people all day,
            every day.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {col.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to as "/"}
                    className="text-sm text-foreground/80 transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 bg-accent/20 py-6 px-5 text-center">
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground flex flex-wrap items-center justify-center gap-2">
            <span>© 2026 QUESOLS</span>
            <span className="opacity-40">•</span>
            <span>ALL RIGHTS RESERVED</span>
            <span className="opacity-40">•</span>
            <span>DEVELOPED BY</span>
            <a
              href="https://technoadviser.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-black text-white bg-gradient-to-r from-brand via-indigo-600 to-purple-600 hover:from-brand/90 hover:to-purple-500 shadow-md transition-all hover:scale-105 active:scale-95 border border-white/20"
            >
              TECHNOADVISER
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
