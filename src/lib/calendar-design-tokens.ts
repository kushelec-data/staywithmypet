import type { CSSProperties } from "react";
import { CALENDAR_STATUS_HEX } from "@/lib/status-colors";

/** Shared calendar design tokens — colours from `status-colors.ts`. */
export const CALENDAR_COLORS = CALENDAR_STATUS_HEX;

export type CalendarLegendKind = "available" | "booked" | "pending" | "unavailable";

export type CalendarCellFill = CalendarLegendKind | "default" | "past";

export const CALENDAR_CELL = {
  aspect: "aspect-square",
  gap: "gap-1",
  gapCompact: "gap-0.5",
  round: "rounded-lg",
  roundCompact: "rounded-md",
  dayNumber: "text-sm font-semibold leading-none text-[#333333]",
  dayNumberCompact: "text-[0.7rem] font-semibold leading-none text-[#333333]",
} as const;

export const CALENDAR_SHELL = {
  outer: "overflow-x-auto rounded-2xl border bg-white p-3 sm:p-4",
  outerCompact: "overflow-x-auto rounded-xl border bg-white p-2 sm:p-2.5",
  borderStyle: { borderColor: CALENDAR_COLORS.border },
  maxWidth: "mx-auto w-full min-w-[min(100%,280px)] max-w-lg",
} as const;

export const CALENDAR_NAV = {
  row: "flex items-center justify-between gap-2",
  title: "min-w-0 flex-1 text-center font-heading text-base font-semibold text-[#333333] sm:text-lg",
  titleCompact: "min-w-0 flex-1 text-center font-heading text-sm font-semibold text-[#333333]",
  button:
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white text-base font-semibold text-[#333333] transition-colors hover:bg-[#F5F5F5] disabled:opacity-40",
  buttonCompact:
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white text-sm font-semibold text-[#333333] transition-colors hover:bg-[#F5F5F5] disabled:opacity-40",
  todayButton:
    "shrink-0 rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-[#333333] transition-colors hover:bg-[#F5F5F5] disabled:opacity-40 sm:text-sm",
  borderStyle: { borderColor: CALENDAR_COLORS.border },
} as const;

export const CALENDAR_WEEKDAY = {
  row: "grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#5C5C5C] sm:text-sm",
  rowCompact: "grid grid-cols-7 gap-0.5 text-center text-[0.65rem] font-semibold text-[#5C5C5C]",
} as const;

export const CALENDAR_LEGEND = {
  row: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#333333] sm:text-sm",
  rowCompact: "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.65rem] font-medium text-[#333333]",
  swatch: "h-4 w-4 shrink-0 rounded-md border",
  swatchBorder: { borderColor: CALENDAR_COLORS.border },
} as const;

export function calendarLegendBackground(kind: CalendarLegendKind): string {
  return CALENDAR_COLORS[kind];
}

export function calendarCellStyle(options: {
  fill: CalendarCellFill;
  isToday?: boolean;
  isSelected?: boolean;
}): CSSProperties {
  let bg: string = CALENDAR_COLORS.surface;
  if (options.fill === "past") {
    bg = CALENDAR_COLORS.unavailable;
  } else if (options.fill !== "default") {
    bg = CALENDAR_COLORS[options.fill];
  }

  const style: CSSProperties = {
    backgroundColor: bg,
  };

  if (options.isSelected) {
    style.borderColor = CALENDAR_COLORS.selectedBorder;
    style.borderWidth = 2;
    style.boxShadow = "0 1px 3px rgba(38, 93, 50, 0.18)";
  } else if (options.isToday) {
    style.borderColor = CALENDAR_COLORS.todayBorder;
    style.borderWidth = 2;
  }

  return style;
}

export function calendarCellClassName(options: {
  canInteract?: boolean;
  isDisabled?: boolean;
}): string {
  const parts = [
    "relative flex aspect-square items-center justify-center border border-transparent transition-colors",
    CALENDAR_CELL.round,
  ];
  if (options.isDisabled) {
    parts.push("cursor-not-allowed opacity-80");
  } else if (options.canInteract) {
    parts.push("cursor-pointer hover:brightness-[0.97]");
  } else {
    parts.push("cursor-default");
  }
  return parts.join(" ");
}
