"use client";

import {
  CALENDAR_LEGEND,
  calendarLegendBackground,
  type CalendarLegendKind,
} from "@/lib/calendar-design-tokens";
import { legendSwatchStyle } from "@/lib/calendar-date-state";

type CalendarLegendSwatchKind = CalendarLegendKind | "past" | "selected";

type CalendarLegendSwatchProps = {
  kind: CalendarLegendSwatchKind;
  /** Dashboard panel uses a slightly larger swatch. */
  size?: "inline" | "panel";
};

const PANEL_SWATCH = "h-5 w-5 shrink-0 rounded-md border";

export function CalendarLegendSwatch({ kind, size = "inline" }: CalendarLegendSwatchProps) {
  const shape = size === "panel" ? PANEL_SWATCH : `${CALENDAR_LEGEND.swatch} border`;
  const style =
    kind === "available" ||
    kind === "booked" ||
    kind === "pending" ||
    kind === "unavailable"
      ? { backgroundColor: calendarLegendBackground(kind), ...CALENDAR_LEGEND.swatchBorder }
      : legendSwatchStyle(kind);

  return <span className={shape} style={style} aria-hidden />;
}
