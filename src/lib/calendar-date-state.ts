import type { CSSProperties } from "react";
import {
  isBlockingBookingStatus,
  type CalendarBookingColor,
  type DayBookingSlice,
} from "@/lib/booking-calendar";
import {
  calendarCellClassName,
  calendarCellStyle,
  calendarLegendBackground,
  CALENDAR_COLORS,
  type CalendarCellFill,
  type CalendarLegendKind,
  CALENDAR_LEGEND,
} from "@/lib/calendar-design-tokens";
import { localISODate } from "@/lib/pet-availability";

/** Local calendar YYYY-MM-DD for "today" (browser / server local timezone). */
export function todayISODate(reference = new Date()): string {
  return localISODate(reference);
}

export function isPastDate(iso: string, today = todayISODate()): boolean {
  if (!iso) return false;
  return iso < today;
}

export function hasCompletedBooking(slices: DayBookingSlice[]): boolean {
  return slices.some((s) => s.booking.status === "completed");
}

export function hasFutureBlockingBooking(
  iso: string,
  slices: DayBookingSlice[],
  today = todayISODate(),
): boolean {
  if (isPastDate(iso, today)) return false;
  return slices.some((s) => isBlockingBookingStatus(s.booking.status));
}

/** Grey past/completed styling (with optional avatar). */
export function isPastOrCompletedDay(
  iso: string,
  slices: DayBookingSlice[],
  today = todayISODate(),
): boolean {
  return isPastDate(iso, today) || hasCompletedBooking(slices);
}

export type CalendarDayVisual =
  | "past"
  | "past-completed"
  | "future-booked"
  | "future-pending"
  | "available"
  | "selected"
  | "default"
  | "unavailable";

export type ResolveCalendarDayInput = {
  iso: string;
  today?: string;
  slices: DayBookingSlice[];
  mode: "availability-select" | "availability-readonly" | "request-select";
  isSelected: boolean;
  isAvailable: boolean;
  blockingBooked: boolean;
};

export type ResolvedCalendarDay = {
  visual: CalendarDayVisual;
  canSelect: boolean;
  canOpenBooking: boolean;
  showAvatars: boolean;
  /** @deprecated Unified palette — always null. */
  tint: string | null;
  cellFill: CalendarCellFill;
  cellStyle: CSSProperties;
  /** Interaction + layout classes for the day cell container. */
  cellClassName: string;
  ariaLabel: string;
  title: string;
};

/** Shared legend swatch dimensions (inline legend + dashboard panel). */
export const CALENDAR_LEGEND_SWATCH_SHAPE = CALENDAR_LEGEND.swatch;

/** @deprecated Use calendarLegendBackground — kept for callers expecting class strings. */
export const CALENDAR_SWATCH = {
  past: "",
  pastCompleted: "",
  booked: "",
  available: "",
  unavailable: "",
  selected: "",
  selectedReadonly: "",
} as const;

export const LEGEND_PAST_CLASS = "";
export const LEGEND_BOOKED_CLASS = "";
export const LEGEND_AVAILABLE_CLASS = "";
export const LEGEND_UNAVAILABLE_CLASS = "";
export const LEGEND_SELECTED_CLASS = "";

export const PASTEL_LEGEND_PAST_CLASS = LEGEND_PAST_CLASS;
export const PASTEL_LEGEND_BOOKED_CLASS = LEGEND_BOOKED_CLASS;
export const PASTEL_LEGEND_AVAILABLE_CLASS = LEGEND_AVAILABLE_CLASS;
export const PASTEL_LEGEND_UNAVAILABLE_CLASS = LEGEND_UNAVAILABLE_CLASS;
export const PASTEL_LEGEND_SELECTED_CLASS = LEGEND_SELECTED_CLASS;

export function legendSwatchClass(
  kind: CalendarLegendKind | "past" | "selected",
): string {
  return CALENDAR_LEGEND.swatch;
}

/** @deprecated Cell styling is inline via `cellStyle`. */
export const PAST_DAY_CELL = "";
export const PAST_COMPLETED_CELL = "";
export const PUBLIC_BOOKED_CELL = "";
export const AVAILABLE_CELL = "";
export const AVAILABLE_TODAY_CELL = "";
export const READONLY_AVAILABLE_CELL = "";
export const READONLY_AVAILABLE_TODAY_CELL = "";
export const SELECTED_CELL = "";
export const READONLY_SELECTED_CELL = "";
export const DEFAULT_SELECT_CELL = "";
export const DEFAULT_TODAY_SELECT_CELL = "";
export const UNAVAILABLE_REQUEST_CELL = "";
export const HIGH_CONTRAST_UNAVAILABLE_CELL = UNAVAILABLE_REQUEST_CELL;
export const PASTEL_PAST_DAY_CELL = PAST_DAY_CELL;
export const PASTEL_PAST_COMPLETED_CELL = PAST_COMPLETED_CELL;
export const PASTEL_PUBLIC_BOOKED_CELL = PUBLIC_BOOKED_CELL;
export const PASTEL_AVAILABLE_CELL = READONLY_AVAILABLE_CELL;
export const PASTEL_AVAILABLE_TODAY_CELL = READONLY_AVAILABLE_TODAY_CELL;
export const PASTEL_UNAVAILABLE_CELL = UNAVAILABLE_REQUEST_CELL;
export const PASTEL_DEFAULT_SELECT_CELL = DEFAULT_SELECT_CELL;
export const PASTEL_DEFAULT_TODAY_SELECT_CELL = DEFAULT_TODAY_SELECT_CELL;

export function legendSwatchStyle(
  kind: CalendarLegendKind | "past" | "selected",
): CSSProperties {
  if (kind === "past") {
    return {
      backgroundColor: calendarLegendBackground("unavailable"),
      borderColor: CALENDAR_COLORS.border,
    };
  }
  if (kind === "selected") {
    return {
      backgroundColor: calendarLegendBackground("available"),
      borderColor: CALENDAR_COLORS.selectedBorder,
      borderWidth: 2,
    };
  }
  return {
    backgroundColor: calendarLegendBackground(kind),
    borderColor: CALENDAR_COLORS.border,
  };
}

/** @deprecated Unified booked styling — per-booking tints removed. */
export function bookingColorClasses(_color: CalendarBookingColor): string {
  return "cursor-not-allowed";
}

function resolveCellFill(input: {
  iso: string;
  today: string;
  slices: DayBookingSlice[];
  mode: ResolveCalendarDayInput["mode"];
  isSelected: boolean;
  isAvailable: boolean;
  blockingBooked: boolean;
  past: boolean;
  futureBooked: boolean;
  pastOrCompleted: boolean;
  visibility: "full" | "public";
  primaryBooking?: DayBookingSlice["booking"];
}): CalendarCellFill {
  const {
    past,
    futureBooked,
    pastOrCompleted,
    mode,
    isSelected,
    isAvailable,
    blockingBooked,
    slices,
    visibility,
    primaryBooking,
  } = input;

  if (past && !slices.length && !blockingBooked) return "past";
  if (pastOrCompleted) return "past";

  if (futureBooked) {
    if (visibility === "public") return "booked";
    if (primaryBooking?.status === "upcoming") return "pending";
    return "booked";
  }

  if (mode === "availability-readonly") {
    return isAvailable ? "available" : "unavailable";
  }

  if (mode === "request-select") {
    return isAvailable ? "available" : "unavailable";
  }

  if (mode === "availability-select" && isSelected) {
    return "available";
  }

  return "default";
}

export function resolveCalendarDay(
  input: ResolveCalendarDayInput,
  labels: {
    pastUnavailable: string;
    pastCompleted: string;
    booked: string;
    alreadyBooked: string;
    notAvailable: string;
    available: string;
    selected: string;
    iso: string;
  },
  options?: {
    visibility?: "full" | "public";
    disabled?: boolean;
    primaryTint?: string | null;
    primaryColor?: CalendarBookingColor;
    /** @deprecated Ignored — unified palette. */
    highContrast?: boolean;
    /** @deprecated Ignored — unified palette. */
    variant?: "default" | "pastel";
  },
): ResolvedCalendarDay {
  const today = input.today ?? todayISODate();
  const past = isPastDate(input.iso, today);
  const futureBooked =
    hasFutureBlockingBooking(input.iso, input.slices, today) ||
    (input.blockingBooked && !past);
  const pastOrCompleted =
    isPastOrCompletedDay(input.iso, input.slices, today) ||
    (input.blockingBooked && past);
  const isToday = input.iso === today;
  const visibility = options?.visibility ?? "full";
  const disabled = options?.disabled ?? false;
  const readonly = input.mode === "availability-readonly";
  const primaryBooking = input.slices[0]?.booking;
  const hasBookingSlice = input.slices.length > 0;

  const canSelectBase =
    !disabled &&
    !past &&
    !futureBooked &&
    !pastOrCompleted &&
    !input.blockingBooked &&
    !hasCompletedBooking(input.slices) &&
    !readonly;

  let canSelect = canSelectBase;
  if (input.mode === "request-select") {
    canSelect = canSelectBase && input.isAvailable;
  }

  const canOpenBooking =
    !disabled &&
    visibility === "full" &&
    futureBooked &&
    Boolean(primaryBooking);

  const showAvatars =
    visibility === "full" && hasBookingSlice && (pastOrCompleted || futureBooked);

  const cellFill = resolveCellFill({
    iso: input.iso,
    today,
    slices: input.slices,
    mode: input.mode,
    isSelected: input.isSelected,
    isAvailable: input.isAvailable,
    blockingBooked: input.blockingBooked,
    past,
    futureBooked,
    pastOrCompleted,
    visibility,
    primaryBooking,
  });

  const isSelectedBorder = input.isSelected && !readonly;
  const cellStyle = calendarCellStyle({
    fill: cellFill,
    isToday: isToday && !isSelectedBorder,
    isSelected: isSelectedBorder,
  });

  const canInteract = readonly
    ? false
    : resolvedCanInteract(canSelect, canOpenBooking);

  const cellClassName = calendarCellClassName({
    canInteract,
    isDisabled: !readonly && !canSelect && !canOpenBooking,
  });

  let visual: CalendarDayVisual = "default";
  if (isSelectedBorder) {
    visual = "selected";
  } else if (past && !hasBookingSlice && !input.blockingBooked) {
    visual = "past";
  } else if (pastOrCompleted) {
    visual = "past-completed";
  } else if (futureBooked) {
    visual =
      cellFill === "pending" && visibility !== "public" ? "future-pending" : "future-booked";
  } else if (readonly && input.isAvailable) {
    visual = "available";
  } else if (readonly) {
    visual = "unavailable";
  } else if (input.mode === "request-select" && input.isAvailable) {
    visual = "available";
  } else if (input.mode === "request-select") {
    visual = "unavailable";
  }

  let ariaLabel = labels.iso;
  let title = labels.iso;
  if (past && !hasBookingSlice) {
    ariaLabel = labels.pastUnavailable;
    title = labels.pastUnavailable;
  } else if (pastOrCompleted) {
    ariaLabel = labels.pastCompleted;
    title = labels.pastCompleted;
  } else if (futureBooked) {
    ariaLabel =
      input.mode === "request-select" ? labels.alreadyBooked : labels.booked;
    title = ariaLabel;
  } else if (
    (input.mode === "request-select" || readonly) &&
    !input.isAvailable &&
    !past &&
    !futureBooked &&
    !pastOrCompleted
  ) {
    ariaLabel = labels.notAvailable;
    title = labels.notAvailable;
  } else if (input.isSelected) {
    ariaLabel = `${labels.selected}: ${labels.iso}`;
    title = ariaLabel;
  } else if (visual === "available") {
    ariaLabel = `${labels.available}: ${labels.iso}`;
    title = ariaLabel;
  }

  return {
    visual,
    canSelect,
    canOpenBooking,
    showAvatars,
    tint: null,
    cellFill,
    cellStyle,
    cellClassName,
    ariaLabel,
    title,
  };
}

function resolvedCanInteract(canSelect: boolean, canOpenBooking: boolean): boolean {
  return canSelect || canOpenBooking;
}

/** Strip past dates from a selection list. */
export function filterPastDates(dates: string[], today = todayISODate()): string[] {
  return dates.filter((d) => !isPastDate(d, today));
}
