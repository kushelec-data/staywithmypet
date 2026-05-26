"use client";

import { HeroStoryCarousel } from "@/components/home/HeroStoryCarousel";
import { PetMascotCTA } from "@/components/marketing/PetMascotCTA";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { CONTENT_CONTAINER, HEADING_HERO } from "@/lib/layout";

const TRUST_CARD_KEYS = ["verified", "reviews", "safeChat"] as const;
const TRUST_ICONS = ["✓", "★", "💬"] as const;

function HeroTrustBadges({ labels }: { labels: string[] }) {
  return (
    <ul
      className="mt-2 flex flex-wrap justify-center gap-1 sm:mt-2.5 sm:gap-1.5 lg:justify-end"
      aria-label="Platform trust highlights"
    >
      {labels.map((label, index) => (
        <li
          key={label}
          className="inline-flex max-w-full items-center rounded-full border border-border bg-surface/70 px-2 py-0.5 text-[10px] font-medium text-foreground/85 shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[11px]"
        >
          <span className="mr-0.5 shrink-0 text-[10px] text-brand-teal/90 sm:mr-1 sm:text-[11px]" aria-hidden>
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

      <div className={`${CONTENT_CONTAINER} relative py-5 sm:py-10 lg:py-12`}>
        <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
          <div className="min-w-0 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal sm:text-sm sm:tracking-[0.2em]">
              {t.hero.eyebrow}
            </p>

            <h1 className={`${HEADING_HERO} mx-auto mt-3 max-w-xl sm:mt-4 lg:mx-0`}>{t.hero.title}</h1>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base lg:mx-0">
              {t.hero.subtitle}
            </p>

            <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3 sm:mt-7 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:justify-start">
              <Button href="/how-it-works#pet-parent-workflow" size="lg">
                {t.hero.findCareCta}
              </Button>
              <Button href="/how-it-works#pet-friend-workflow" variant="secondary" size="lg">
                {t.hero.becomeFriendCta}
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full min-w-0 max-w-md lg:max-w-none">
            <HeroStoryCarousel />
            <HeroTrustBadges labels={trustCards} />
          </div>
        </div>
        <PetMascotCTA />
      </div>
    </section>
  );
}
