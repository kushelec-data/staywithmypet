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
      className={`tehnopol-badge-in w-fit max-w-[680px] rounded-[17px] border border-[#E4DED2] bg-white/95 px-4 py-3 shadow-[0_2px_12px_rgba(43,43,43,0.06)] sm:px-4 ${className}`}
      role="note"
      aria-label={`${copy.primary}. ${copy.secondary}`}
    >
      <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-3.5">
        <Image
          src="/images/partners/tehnopol-logo.jpg"
          alt="Tehnopol Startup Incubator"
          width={140}
          height={36}
          className="h-[28px] w-auto shrink-0 sm:h-[32px]"
          priority
        />
        <div className="min-w-0 text-left">
          <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-brand-teal">
            {copy.label}
          </p>
          <p className="text-sm font-semibold leading-snug text-[#2B2B2B] sm:text-[0.9375rem]">
            {copy.primary}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-[#6B6560] sm:text-[0.8125rem]">
            {copy.secondary}
          </p>
        </div>
      </div>
    </div>
  );
}
