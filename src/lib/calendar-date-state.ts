import {
  isBlockingBookingStatus,
  type CalendarBookingColor,
  type DayBookingSlice,
} from "@/lib/booking-calendar";
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
  tint: string | null;
  /** Tailwind classes for the day cell container. */
  cellClassName: string;
  ariaLabel: string;
  title: string;
};

/** Legend swatches — keep in sync with day cell backgrounds. */
export const LEGEND_PAST_CLASS = "bg-stone-100 ring-1 ring-stone-200/70";
export const LEGEND_BOOKED_CLASS = "bg-indigo-200/65 ring-1 ring-indigo-200/70";
export const LEGEND_AVAILABLE_CLASS = "bg-mint/50 ring-1 ring-emerald-200/60";
export const LEGEND_UNAVAILABLE_CLASS = "bg-neutral-200/55 ring-1 ring-neutral-300/80";
export const LEGEND_SELECTED_CLASS = "bg-mint/50 ring-2 ring-brand-teal/45";

/** @deprecated Alias — same palette as default legend classes. */
export const PASTEL_LEGEND_PAST_CLASS = LEGEND_PAST_CLASS;
export const PASTEL_LEGEND_BOOKED_CLASS = LEGEND_BOOKED_CLASS;
export const PASTEL_LEGEND_AVAILABLE_CLASS = LEGEND_AVAILABLE_CLASS;
export const PASTEL_LEGEND_UNAVAILABLE_CLASS = LEGEND_UNAVAILABLE_CLASS;
export const PASTEL_LEGEND_SELECTED_CLASS = LEGEND_SELECTED_CLASS;

export function legendSwatchClass(
  kind: "past" | "booked" | "available" | "unavailable" | "selected",
  /** @deprecated Variant is ignored; one palette site-wide. */
  _variant?: "default" | "pastel",
): string {
  switch (kind) {
    case "past":
      return LEGEND_PAST_CLASS;
    case "booked":
      return LEGEND_BOOKED_CLASS;
    case "available":
      return LEGEND_AVAILABLE_CLASS;
    case "unavailable":
      return LEGEND_UNAVAILABLE_CLASS;
    case "selected":
      return LEGEND_SELECTED_CLASS;
  }
}

export const PAST_DAY_CELL =
  "bg-stone-100 text-stone-600 cursor-not-allowed dark:bg-stone-800/30 dark:text-stone-400";

export const PAST_COMPLETED_CELL =
  "bg-stone-200/80 text-stone-500 cursor-not-allowed ring-1 ring-stone-200/70 dark:bg-stone-700/40 dark:text-stone-400 dark:ring-stone-600/50";

export const PUBLIC_BOOKED_CELL =
  "bg-indigo-200/65 text-indigo-950 cursor-not-allowed ring-1 ring-indigo-200/70 dark:bg-indigo-950/25 dark:text-indigo-200 dark:ring-indigo-800/50";

export const AVAILABLE_CELL =
  "bg-mint/50 text-emerald-900 ring-1 ring-emerald-200/60 hover:bg-mint/65 hover:ring-brand-teal/25 cursor-pointer dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-800/50";

export const AVAILABLE_TODAY_CELL =
  "bg-mint/50 text-emerald-900 ring-2 ring-brand-teal/35 ring-offset-1 hover:bg-mint/65 cursor-pointer dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-brand-teal/40";

export const READONLY_AVAILABLE_CELL =
  "bg-mint/50 text-emerald-900 ring-1 ring-emerald-200/60 cursor-default dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-emerald-800/50";

export const READONLY_AVAILABLE_TODAY_CELL =
  "bg-mint/50 text-emerald-900 ring-2 ring-brand-teal/35 ring-offset-1 cursor-default dark:bg-emerald-950/25 dark:text-emerald-200 dark:ring-brand-teal/40";

export const SELECTED_CELL =
  "bg-mint/45 text-brand-teal ring-2 ring-brand-teal ring-offset-1 shadow-sm hover:bg-mint/55 cursor-pointer dark:bg-mint/20 dark:text-brand-teal dark:ring-brand-teal/50";

export const READONLY_SELECTED_CELL =
  "bg-mint/30 text-brand-teal ring-2 ring-brand-teal/40 cursor-default dark:bg-mint/15";

export const DEFAULT_SELECT_CELL =
  "bg-surface text-foreground ring-1 ring-neutral-200/80 hover:bg-mint/40 hover:ring-brand-teal/25 cursor-pointer dark:ring-neutral-600/80";

export const DEFAULT_TODAY_SELECT_CELL =
  "bg-surface text-foreground ring-2 ring-brand-teal/35 ring-offset-1 hover:bg-mint/40 cursor-pointer dark:ring-brand-teal/40";

export const UNAVAILABLE_REQUEST_CELL =
  "bg-neutral-200/55 text-neutral-700 cursor-not-allowed ring-1 ring-neutral-300/80 dark:bg-neutral-800/40 dark:text-neutral-300 dark:ring-neutral-700/60";

/** @deprecated Alias — same as UNAVAILABLE_REQUEST_CELL. */
export const HIGH_CONTRAST_UNAVAILABLE_CELL = UNAVAILABLE_REQUEST_CELL;

/** @deprecated Aliases — same unified palette. */
export const PASTEL_PAST_DAY_CELL = PAST_DAY_CELL;
export const PASTEL_PAST_COMPLETED_CELL = PAST_COMPLETED_CELL;
export const PASTEL_PUBLIC_BOOKED_CELL = PUBLIC_BOOKED_CELL;
export const PASTEL_AVAILABLE_CELL = READONLY_AVAILABLE_CELL;
export const PASTEL_AVAILABLE_TODAY_CELL = READONLY_AVAILABLE_TODAY_CELL;
export const PASTEL_UNAVAILABLE_CELL = UNAVAILABLE_REQUEST_CELL;
export const PASTEL_DEFAULT_SELECT_CELL = DEFAULT_SELECT_CELL;
export const PASTEL_DEFAULT_TODAY_SELECT_CELL = DEFAULT_TODAY_SELECT_CELL;

export function bookingColorClasses(color: CalendarBookingColor): string {
  return `${color.bg} ${color.text} ring-1 ${color.ring} cursor-not-allowed`;
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
    /** @deprecated Ignored — same soft palette everywhere. */
    highContrast?: boolean;
    /** @deprecated Ignored — same soft palette everywhere. */
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

  let visual: CalendarDayVisual = "default";
  if (input.isSelected && !readonly) {
    visual = "selected";
  } else if (past && !hasBookingSlice && !input.blockingBooked) {
    visual = "past";
  } else if (pastOrCompleted) {
    visual = "past-completed";
  } else if (futureBooked) {
    visual = "future-booked";
  } else if (readonly && input.isAvailable) {
    visual = "available";
  } else if (readonly) {
    visual = "unavailable";
  } else if (input.mode === "request-select" && input.isAvailable) {
    visual = "available";
  } else if (input.mode === "request-select") {
    visual = "unavailable";
  }

  let cellClassName = DEFAULT_SELECT_CELL;
  let tint: string | null = null;

  if (visual === "selected") {
    cellClassName = readonly ? READONLY_SELECTED_CELL : SELECTED_CELL;
  } else if (visual === "past") {
    cellClassName = PAST_DAY_CELL;
  } else if (visual === "past-completed") {
    cellClassName = PAST_COMPLETED_CELL;
  } else if (visual === "future-booked") {
    if (visibility === "public") {
      cellClassName = PUBLIC_BOOKED_CELL;
    } else if (options?.primaryColor) {
      cellClassName = bookingColorClasses(options.primaryColor);
      tint = options.primaryTint ?? options.primaryColor.tint;
    } else {
      cellClassName = PUBLIC_BOOKED_CELL;
    }
  } else if (visual === "available") {
    if (readonly) {
      cellClassName = isToday ? READONLY_AVAILABLE_TODAY_CELL : READONLY_AVAILABLE_CELL;
    } else {
      cellClassName = isToday ? AVAILABLE_TODAY_CELL : AVAILABLE_CELL;
    }
  } else if (visual === "unavailable") {
    cellClassName = UNAVAILABLE_REQUEST_CELL;
  } else if (isToday) {
    cellClassName = DEFAULT_TODAY_SELECT_CELL;
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
    tint,
    cellClassName,
    ariaLabel,
    title,
  };
}

/** Strip past dates from a selection list. */
export function filterPastDates(dates: string[], today = todayISODate()): string[] {
  return dates.filter((d) => !isPastDate(d, today));
}
