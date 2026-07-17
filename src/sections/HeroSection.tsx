"use client";

import { HeroPuppyAssistant } from "@/components/home/HeroPuppyAssistant";
import { HeroStoryCarousel } from "@/components/home/HeroStoryCarousel";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { CONTENT_CONTAINER, HEADING_HERO } from "@/lib/layout";

const TRUST_CARD_KEYS = ["verified", "reviews", "safeChat"] as const;
const TRUST_ICONS = ["✓", "★", "💬"] as const;

function HeroTrustBadges({ labels }: { labels: string[] }) {
  return (
    <ul
      className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-5 lg:justify-end"
      aria-label="Platform trust highlights"
    >
      {labels.map((label, index) => (
        <li
          key={label}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-[11px] font-medium text-foreground/90 shadow-sm backdrop-blur-sm sm:text-xs"
        >
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-[10px] text-brand-teal sm:text-[11px]"
            aria-hidden
          >
            {TRUST_ICONS[index]}
          </span>
          <span className="truncate">{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function HeroSection() {
  const { locale, t } = useLanguage();
  const trustCards = TRUST_CARD_KEYS.map((key) => t.hero.trustCards[key]);

  return (
    <section
      id="hero"
      className="relative isolate overflow-x-hidden overflow-y-hidden border-b border-border bg-gradient-to-b from-mint/30 via-background to-cream/40"
    >
      <div
        className="pointer-events-none absolute -right-12 top-6 h-32 w-32 rounded-full bg-brand-teal/10 blur-3xl sm:-right-20 sm:top-8 sm:h-56 sm:w-56"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 bottom-2 h-24 w-24 rounded-full bg-mint/30 blur-3xl sm:-left-16 sm:bottom-4 sm:h-48 sm:w-48"
        aria-hidden
      />

      <HeroPuppyAssistant />

      <div className={`${CONTENT_CONTAINER} relative z-[1] py-5 sm:py-10 lg:py-12`}>
        <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
          <div className="relative z-[1] min-w-0 text-center lg:text-left">
            <p
              key={`${locale}-eyebrow`}
              className="inline-flex items-center gap-2 rounded-full border border-brand-teal/20 bg-brand-teal/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-teal sm:text-xs sm:tracking-[0.2em]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" aria-hidden />
              {t.hero.eyebrow}
            </p>

            <h1
              key={locale}
              className={`${HEADING_HERO} mx-auto mt-4 max-w-xl whitespace-pre-line sm:mt-5 lg:mx-0`}
            >
              {t.hero.title}
            </h1>

            <p
              key={`${locale}-subtitle`}
              className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base lg:mx-0"
            >
              {t.hero.subtitle}
            </p>

            <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3 sm:mt-7 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:justify-start">
              <Button href="/find-care" size="lg">
                {t.hero.findCareCta}
              </Button>
              <Button href="/find-pets" variant="secondary" size="lg">
                {t.hero.becomeFriendCta}
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full min-w-0 max-w-md lg:max-w-none">
            <HeroStoryCarousel />
            <HeroTrustBadges labels={trustCards} />
          </div>
        </div>
      </div>
    </section>
  );
}
