"use client";

import { CalendarLegendSwatch } from "@/components/calendar/CalendarLegendSwatch";
import { CALENDAR_LEGEND } from "@/lib/calendar-design-tokens";
import { useLanguage } from "@/context/LanguageContext";

export type CalendarLegendMode = "availability-select" | "availability-readonly" | "request-select";

type CalendarInlineLegendProps = {
  mode?: CalendarLegendMode;
  compact?: boolean;
  className?: string;
};

type LegendItemProps = {
  kind: "available" | "booked" | "pending" | "unavailable";
  label: string;
};

function LegendItem({ kind, label }: LegendItemProps) {
  return (
    <li className="flex items-center gap-1.5">
      <CalendarLegendSwatch kind={kind} />
      {label}
    </li>
  );
}

/** Inline legend under booking/availability calendars — unified four-state palette. */
export function CalendarInlineLegend({
  compact = false,
  className = "",
}: CalendarInlineLegendProps) {
  const { t } = useLanguage();
  const copy = t.bookingCalendar;

  return (
    <ul
      className={`${compact ? CALENDAR_LEGEND.rowCompact : CALENDAR_LEGEND.row} ${className}`}
      aria-label="Calendar legend"
    >
      <LegendItem kind="available" label={copy.legendAvailable} />
      <LegendItem kind="booked" label={copy.legendBooked} />
      <LegendItem kind="pending" label={copy.legendPending} />
      <LegendItem kind="unavailable" label={copy.legendUnavailable} />
    </ul>
  );
}
