"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { CONTENT_CONTAINER, HEADING_HERO } from "@/lib/layout";

const TRUST_CARD_KEYS = ["verified", "reviews", "safeChat"] as const;
const TRUST_ICONS = ["✓", "★", "💬"] as const;

function HeroTrustBadges({ labels }: { labels: string[] }) {
  return (
    <ul
      className="mt-6 flex flex-wrap justify-center gap-1.5 sm:mt-7 sm:gap-2"
      aria-label="Platform trust highlights"
    >
      {labels.map((label, index) => (
        <li
          key={label}
          className="inline-flex max-w-full items-center rounded-full border border-border bg-surface/70 px-2.5 py-1 text-[10px] font-medium text-foreground/85 shadow-sm backdrop-blur-sm sm:text-[11px]"
        >
          <span className="mr-1 shrink-0 text-[10px] text-brand-teal/90 sm:text-[11px]" aria-hidden>
            {TRUST_ICONS[index]}
          </span>
          <span className="truncate">{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function HeroSection() {
  const { t } = useLanguage();
  const trustCards = TRUST_CARD_KEYS.map((key) => t.hero.trustCards[key]);

  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-border bg-gradient-to-b from-mint/30 via-background to-cream/40"
    >
      <div
        className="pointer-events-none absolute -right-12 top-6 h-32 w-32 rounded-full bg-brand-teal/10 blur-3xl sm:-right-20 sm:top-8 sm:h-56 sm:w-56"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 bottom-2 h-24 w-24 rounded-full bg-mint/30 blur-3xl sm:-left-16 sm:bottom-4 sm:h-48 sm:w-48"
        aria-hidden
      />

      <div className={`${CONTENT_CONTAINER} relative py-8 sm:py-12 lg:py-14`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal sm:text-sm sm:tracking-[0.2em]">
            {t.hero.eyebrow}
          </p>

          <h1 className={`${HEADING_HERO} mt-3 sm:mt-4`}>{t.hero.title}</h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
            {t.hero.subtitle}
          </p>

          <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3 sm:mt-7 sm:max-w-none sm:flex-row sm:justify-center">
            <Button href="/how-it-works#pet-parent-workflow" size="lg">
              {t.hero.findCareCta}
            </Button>
            <Button href="/how-it-works#pet-friend-workflow" variant="secondary" size="lg">
              {t.hero.becomeFriendCta}
            </Button>
          </div>

          <HeroTrustBadges labels={trustCards} />
        </div>
      </div>
    </section>
  );
}
