"use client";

import { CALENDAR_LEGEND_SWATCH_SHAPE, legendSwatchClass } from "@/lib/calendar-date-state";

type CalendarLegendSwatchKind = "past" | "booked" | "available" | "unavailable" | "selected";

type CalendarLegendSwatchProps = {
  kind: CalendarLegendSwatchKind;
  /** Dashboard panel uses a slightly larger swatch. */
  size?: "inline" | "panel";
};

const PANEL_SWATCH = "h-5 w-5 shrink-0 rounded-md";

export function CalendarLegendSwatch({ kind, size = "inline" }: CalendarLegendSwatchProps) {
  const shape = size === "panel" ? PANEL_SWATCH : CALENDAR_LEGEND_SWATCH_SHAPE;
  return <span className={`${shape} ${legendSwatchClass(kind)}`} aria-hidden />;
}
