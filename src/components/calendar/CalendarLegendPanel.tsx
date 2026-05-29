"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { useLanguage } from "@/context/LanguageContext";
import {
  LEGEND_AVAILABLE_CLASS,
  LEGEND_BOOKED_CLASS,
  LEGEND_PAST_CLASS,
  LEGEND_UNAVAILABLE_CLASS,
} from "@/lib/calendar-date-state";

const SWATCH = "h-5 w-5 shrink-0 rounded-full";

type LegendRowProps = {
  swatchClass: string;
  label: string;
};

function LegendRow({ swatchClass, label }: LegendRowProps) {
  return (
    <li className="flex items-center gap-3">
      <span className={`${SWATCH} ${swatchClass}`} aria-hidden />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </li>
  );
}

export function CalendarLegendPanel({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const copy = t.dashboardCalendar;

  return (
    <AccountCard className={`p-5 sm:p-6 ${className}`}>
      <h2 className="font-heading text-base font-semibold text-foreground">{copy.legendTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{copy.legendIntro}</p>
      <ul className="mt-4 space-y-3" aria-label={copy.legendTitle}>
        <LegendRow swatchClass={LEGEND_AVAILABLE_CLASS} label={copy.legendAvailable} />
        <LegendRow swatchClass={LEGEND_BOOKED_CLASS} label={copy.legendBooked} />
        <LegendRow swatchClass={LEGEND_UNAVAILABLE_CLASS} label={copy.legendUnavailable} />
        <LegendRow swatchClass={LEGEND_PAST_CLASS} label={copy.legendPast} />
      </ul>
    </AccountCard>
  );
}
