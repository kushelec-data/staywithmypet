"use client";

import { CalendarLegendSwatch } from "@/components/calendar/CalendarLegendSwatch";
import { useLanguage } from "@/context/LanguageContext";

export type CalendarLegendMode = "availability-select" | "availability-readonly" | "request-select";

type CalendarInlineLegendProps = {
  mode: CalendarLegendMode;
  compact?: boolean;
  className?: string;
};

type LegendItemProps = {
  kind: "available" | "past" | "booked" | "unavailable" | "selected";
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

/** Inline legend under booking/availability calendars — colors match day tiles via `legendSwatchClass`. */
export function CalendarInlineLegend({ mode, compact = false, className = "" }: CalendarInlineLegendProps) {
  const { t } = useLanguage();
  const copy = t.bookingCalendar;

  return (
    <ul
      className={`flex flex-wrap gap-x-3 gap-y-1.5 font-semibold text-foreground/80 ${
        compact ? "text-[0.65rem]" : "text-xs"
      } ${className}`}
      aria-label="Calendar legend"
    >
      <LegendItem kind="available" label={copy.legendAvailable} />
      <LegendItem kind="past" label={copy.legendPast} />
      <LegendItem kind="booked" label={copy.legendBooked} />
      {mode === "availability-readonly" || mode === "request-select" ? (
        <LegendItem kind="unavailable" label={copy.legendUnavailable} />
      ) : null}
      {mode !== "availability-readonly" ? (
        <LegendItem kind="selected" label={copy.legendSelected} />
      ) : null}
    </ul>
  );
}
