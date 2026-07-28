"use client";

import { useLanguage } from "@/context/LanguageContext";
import Image from "next/image";

type TehnopolAcceleratorBadgeProps = {
  className?: string;
};

export function TehnopolAcceleratorBadge({ className = "" }: TehnopolAcceleratorBadgeProps) {
  const { t } = useLanguage();
  const copy = t.hero.tehnopolBadge;

  return (
    <div
      className={`tehnopol-badge-in w-fit max-w-[680px] rounded-[15px] border border-brand-teal/10 bg-gradient-to-br from-mint/25 via-mint/10 to-lavender/15 px-3 py-2 sm:px-3.5 sm:py-2.5 ${className}`}
      role="note"
      aria-label={`${copy.primary}. ${copy.secondary}`}
    >
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Image
          src="/images/partners/tehnopol-logo.jpg"
          alt="Tehnopol Startup Incubator"
          width={120}
          height={30}
          className="h-[26px] w-auto shrink-0 sm:h-[30px]"
          priority
        />
        <div className="min-w-0 text-left">
          <p className="mb-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.16em] text-brand-teal/75">
            {copy.label}
          </p>
          <p className="text-[0.8125rem] font-semibold leading-snug text-foreground sm:text-sm">
            {copy.primary}
          </p>
          <p className="mt-0.5 text-[0.6875rem] leading-snug text-muted sm:text-xs">
            {copy.secondary}
          </p>
        </div>
      </div>
    </div>
  );
}
