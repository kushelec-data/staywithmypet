"use client";

import { DogStoryMedia } from "@/components/marketing/DogStoryMedia";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { MEMBERSHIP_PATH } from "@/lib/auth-routing";
import { PAGE_CONTAINER, PAGE_SECTION_TIGHT } from "@/lib/layout";

type DogStoryCTAProps = {
  withPageShell?: boolean;
  className?: string;
  compact?: boolean;
  membershipHref?: string;
  findPetsHref?: string;
};

export function DogStoryCTA({
  withPageShell = true,
  className = "",
  compact = false,
  membershipHref = `${MEMBERSHIP_PATH}?role=friend`,
  findPetsHref = "/find-pets",
}: DogStoryCTAProps) {
  const { t } = useLanguage();
  const copy = t.dogStory;

  const panel = (
    <div
      className={`overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-br from-mint/35 via-surface to-cream/80 p-5 shadow-md shadow-black/5 sm:p-8 ${
        compact ? "" : "lg:p-10"
      } ${className}`}
    >
      <div
        className={`grid items-center gap-6 ${
          compact ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-10"
        }`}
      >
        <div className={compact ? "text-center" : "min-w-0 text-center lg:text-left"}>
          <h2 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">
            {copy.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{copy.subtitle}</p>
          <div
            className={`mt-6 flex w-full flex-col gap-3 sm:flex-row ${
              compact ? "sm:justify-center" : "sm:justify-center lg:justify-start"
            }`}
          >
            <Button href={membershipHref} size="lg" className="sm:w-auto">
              {copy.startMembership}
            </Button>
            <Button href={findPetsHref} size="lg" variant="secondary" className="sm:w-auto">
              {copy.meetPetsNearby}
            </Button>
          </div>
        </div>

        <DogStoryMedia
          hookMessage={copy.hookMessage}
          animationAlt={copy.animationAlt}
          className={compact ? "mx-auto" : "mx-auto lg:mx-0 lg:justify-self-end"}
        />
      </div>
    </div>
  );

  if (!withPageShell) {
    return panel;
  }

  return (
    <section className={PAGE_SECTION_TIGHT}>
      <div className={PAGE_CONTAINER}>{panel}</div>
    </section>
  );
}
