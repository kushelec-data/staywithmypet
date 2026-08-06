"use client";

import { useLanguage } from "@/context/LanguageContext";
import Image from "next/image";

type TehnopolAcceleratorBadgeProps = {
  className?: string;
};

export function TehnopolAcceleratorBadge({ className = "" }: TehnopolAcceleratorBadgeProps) {
  const { t } = useLanguage();
  const copy = t.hero.tehnopolBadge.primary;

  return (
    <div
      className={`tehnopol-badge-in w-fit max-w-[min(100%,34rem)] rounded-xl border border-brand-teal/15 bg-gradient-to-br from-mint/30 via-mint/15 to-brand-teal/5 px-2.5 py-1.5 sm:px-3 sm:py-2 ${className}`}
      role="note"
      aria-label={copy}
    >
      <div className="flex items-center gap-2 sm:gap-2.5">
        <Image
          src="/images/partners/tehnopol-logo.jpg"
          alt="Tehnopol"
          width={120}
          height={30}
          className="h-[22px] w-auto shrink-0 sm:h-[24px]"
          priority
        />
        <p className="min-w-0 text-left text-[0.6875rem] font-medium leading-snug text-foreground/90 sm:text-xs">
          {copy}
        </p>
      </div>
    </div>
  );
}
