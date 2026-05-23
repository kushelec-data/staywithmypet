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
export const LEGEND_PAST_CLASS = "bg-neutral-600";
export const LEGEND_BOOKED_CLASS = "bg-slate-500";
export const LEGEND_AVAILABLE_CLASS = "bg-emerald-600";
export const LEGEND_UNAVAILABLE_CLASS = "bg-neutral-200 ring-1 ring-neutral-300";
export const LEGEND_SELECTED_CLASS = "bg-brand-teal ring-2 ring-brand-teal/40";

/** Soft public-profile palette (mini card + modal). */
export const PASTEL_LEGEND_PAST_CLASS = "bg-stone-200";
export const PASTEL_LEGEND_BOOKED_CLASS = "bg-slate-300";
export const PASTEL_LEGEND_AVAILABLE_CLASS = "bg-emerald-100 ring-1 ring-emerald-300/50";
export const PASTEL_LEGEND_UNAVAILABLE_CLASS = "bg-neutral-100 ring-1 ring-neutral-200";
export const PASTEL_LEGEND_SELECTED_CLASS = "bg-brand-teal/25 ring-1 ring-brand-teal/35";

export function legendSwatchClass(
  kind: "past" | "booked" | "available" | "unavailable" | "selected",
  variant: "default" | "pastel" = "default",
): string {
  if (variant === "pastel") {
    switch (kind) {
      case "past":
        return PASTEL_LEGEND_PAST_CLASS;
      case "booked":
        return PASTEL_LEGEND_BOOKED_CLASS;
      case "available":
        return PASTEL_LEGEND_AVAILABLE_CLASS;
      case "unavailable":
        return PASTEL_LEGEND_UNAVAILABLE_CLASS;
      case "selected":
        return PASTEL_LEGEND_SELECTED_CLASS;
    }
  }
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
  "bg-neutral-600 text-neutral-100 cursor-not-allowed dark:bg-neutral-600 dark:text-neutral-100";

export const PAST_COMPLETED_CELL =
  "bg-neutral-600 text-neutral-200 cursor-not-allowed ring-1 ring-neutral-500 dark:bg-neutral-600 dark:text-neutral-200 dark:ring-neutral-500";

export const PUBLIC_BOOKED_CELL =
  "bg-slate-500 text-white cursor-not-allowed dark:bg-slate-500 dark:text-white";

export const AVAILABLE_CELL =
  "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700";

export const AVAILABLE_TODAY_CELL =
  "bg-emerald-600 text-white ring-2 ring-emerald-400 ring-offset-1 hover:bg-emerald-700 cursor-pointer dark:bg-emerald-600 dark:text-white dark:ring-emerald-400";

export const SELECTED_CELL =
  "bg-brand-teal text-white shadow-md shadow-brand-teal/25 ring-2 ring-brand-teal ring-offset-1 cursor-pointer";

export const READONLY_SELECTED_CELL =
  "bg-brand-teal/15 text-brand-teal ring-1 ring-brand-teal/25";

export const DEFAULT_SELECT_CELL =
  "bg-surface text-foreground ring-1 ring-neutral-200 hover:bg-mint/50 hover:ring-brand-teal/30 cursor-pointer dark:ring-neutral-600";

export const DEFAULT_TODAY_SELECT_CELL =
  "bg-surface text-foreground ring-2 ring-emerald-500 ring-offset-1 hover:bg-mint/50 cursor-pointer dark:ring-emerald-500";

export const UNAVAILABLE_REQUEST_CELL =
  "bg-neutral-200 text-neutral-500 cursor-not-allowed dark:bg-neutral-700/60 dark:text-neutral-400";

export const HIGH_CONTRAST_UNAVAILABLE_CELL =
  "bg-neutral-300 text-neutral-800 ring-2 ring-neutral-500 cursor-not-allowed dark:bg-neutral-600 dark:text-neutral-100 dark:ring-neutral-400";

export const PASTEL_PAST_DAY_CELL =
  "bg-stone-100 text-stone-400 cursor-not-allowed dark:bg-stone-800/40 dark:text-stone-500";

export const PASTEL_PAST_COMPLETED_CELL =
  "bg-stone-200/90 text-stone-500 cursor-not-allowed ring-1 ring-stone-200 dark:bg-stone-700/50 dark:text-stone-400";

export const PASTEL_PUBLIC_BOOKED_CELL =
  "bg-slate-200/95 text-slate-600 cursor-not-allowed dark:bg-slate-600/40 dark:text-slate-300";

export const PASTEL_AVAILABLE_CELL =
  "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70 cursor-default dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-800/50";

export const PASTEL_AVAILABLE_TODAY_CELL =
  "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-300/80 ring-offset-1 cursor-default dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-700";

export const PASTEL_UNAVAILABLE_CELL =
  "bg-neutral-50 text-neutral-400 cursor-not-allowed dark:bg-neutral-800/40 dark:text-neutral-500";

export const PASTEL_DEFAULT_SELECT_CELL =
  "bg-surface text-foreground/80 ring-1 ring-neutral-100 dark:ring-neutral-700";

export const PASTEL_DEFAULT_TODAY_SELECT_CELL =
  "bg-surface text-foreground ring-2 ring-emerald-200/80 ring-offset-1 dark:ring-emerald-800/60";

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
    /** @deprecated Prefer variant="pastel" on public surfaces. */
    highContrast?: boolean;
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
  const pastel = options?.variant === "pastel";
  const primaryBooking = input.slices[0]?.booking;
  const hasBookingSlice = input.slices.length > 0;

  const canSelectBase =
    !disabled &&
    !past &&
    !futureBooked &&
    !pastOrCompleted &&
    !input.blockingBooked &&
    !hasCompletedBooking(input.slices) &&
    input.mode !== "availability-readonly";

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
  if (input.isSelected && input.mode !== "availability-readonly") {
    visual = "selected";
  } else if (past && !hasBookingSlice && !input.blockingBooked) {
    visual = "past";
  } else if (pastOrCompleted) {
    visual = "past-completed";
  } else if (futureBooked) {
    visual = "future-booked";
  } else if (input.mode === "availability-readonly" && input.isAvailable) {
    visual = "available";
  } else if (input.mode === "availability-readonly") {
    visual = "unavailable";
  } else if (input.mode === "request-select" && input.isAvailable) {
    visual = "available";
  } else if (input.mode === "request-select") {
    visual = "unavailable";
  }

  let cellClassName = DEFAULT_SELECT_CELL;
  let tint: string | null = null;

  if (visual === "selected") {
    cellClassName =
      input.mode === "availability-readonly" ? READONLY_SELECTED_CELL : SELECTED_CELL;
  } else if (visual === "past") {
    cellClassName = pastel ? PASTEL_PAST_DAY_CELL : PAST_DAY_CELL;
  } else if (visual === "past-completed") {
    cellClassName = pastel ? PASTEL_PAST_COMPLETED_CELL : PAST_COMPLETED_CELL;
  } else if (visual === "future-booked") {
    if (visibility === "public" || pastel) {
      cellClassName = pastel ? PASTEL_PUBLIC_BOOKED_CELL : PUBLIC_BOOKED_CELL;
    } else if (options?.primaryColor) {
      cellClassName = bookingColorClasses(options.primaryColor);
      tint = options.primaryTint ?? options.primaryColor.tint;
    } else {
      cellClassName = PUBLIC_BOOKED_CELL;
    }
  } else if (visual === "available") {
    cellClassName = pastel
      ? isToday
        ? PASTEL_AVAILABLE_TODAY_CELL
        : PASTEL_AVAILABLE_CELL
      : isToday
        ? AVAILABLE_TODAY_CELL
        : AVAILABLE_CELL;
  } else if (visual === "unavailable") {
    cellClassName = pastel
      ? PASTEL_UNAVAILABLE_CELL
      : options?.highContrast
        ? HIGH_CONTRAST_UNAVAILABLE_CELL
        : UNAVAILABLE_REQUEST_CELL;
  } else if (isToday) {
    cellClassName = pastel ? PASTEL_DEFAULT_TODAY_SELECT_CELL : DEFAULT_TODAY_SELECT_CELL;
  } else if (pastel) {
    cellClassName = PASTEL_DEFAULT_SELECT_CELL;
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
    (input.mode === "request-select" || input.mode === "availability-readonly") &&
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
