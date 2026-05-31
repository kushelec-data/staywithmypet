"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { useLanguage } from "@/context/LanguageContext";
import { CalendarLegendSwatch } from "@/components/calendar/CalendarLegendSwatch";

type LegendRowProps = {
  kind: "past" | "booked" | "available" | "unavailable";
  label: string;
};

function LegendRow({ kind, label }: LegendRowProps) {
  return (
    <li className="flex items-center gap-3">
      <CalendarLegendSwatch kind={kind} size="panel" />
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
        <LegendRow kind="available" label={copy.legendAvailable} />
        <LegendRow kind="booked" label={copy.legendBooked} />
        <LegendRow kind="unavailable" label={copy.legendUnavailable} />
        <LegendRow kind="past" label={copy.legendPast} />
      </ul>
    </AccountCard>
  );
}
