import { formatBookingDatesForRow } from "@/lib/date-format";
import {
  eachISODateInRangeInclusive,
  localISODate,
  normalizeAvailabilityDates,
  parseISODateLocal,
} from "@/lib/pet-availability";
import type { BookingStatus } from "@/types/database";

/** Statuses that block new bookings and date selection. */
export const BOOKING_BLOCKING_STATUSES: BookingStatus[] = ["upcoming", "active"];

export type CalendarBookingColor = {
  index: number;
  bg: string;
  ring: string;
  text: string;
  tint: string;
};

const BOOKING_COLOR_PALETTE: CalendarBookingColor[] = [
  { index: 0, bg: "bg-status-booked-bg", ring: "ring-status-booked-border", text: "text-status-booked-text", tint: "rgba(245, 208, 214, 0.55)" },
  { index: 1, bg: "bg-status-pending-bg", ring: "ring-status-pending-border", text: "text-status-pending-text", tint: "rgba(255, 224, 138, 0.55)" },
  { index: 2, bg: "bg-status-available-bg", ring: "ring-status-available-border", text: "text-status-available-text", tint: "rgba(200, 237, 214, 0.55)" },
  { index: 3, bg: "bg-status-booked-bg/80", ring: "ring-status-booked-border", text: "text-status-booked-text", tint: "rgba(245, 208, 214, 0.45)" },
  { index: 4, bg: "bg-status-pending-bg/80", ring: "ring-status-pending-border", text: "text-status-pending-text", tint: "rgba(255, 224, 138, 0.45)" },
  { index: 5, bg: "bg-status-unavailable-bg", ring: "ring-status-unavailable-border", text: "text-status-unavailable-text", tint: "rgba(205, 209, 216, 0.55)" },
];

export function hashBookingColor(seed: string): CalendarBookingColor {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return BOOKING_COLOR_PALETTE[h % BOOKING_COLOR_PALETTE.length]!;
}

export type CalendarBooking = {
  id: string;
  petId: string;
  petName: string;
  petPhotoUrl: string | null;
  petParentId: string;
  parentName: string;
  parentPhotoUrl: string | null;
  petFriendId: string;
  friendName: string;
  friendPhotoUrl: string | null;
  status: BookingStatus;
  careType: string | null;
  startDate: string;
  endDate: string;
  requestedDates: string[];
  color: CalendarBookingColor;
};

export type DayBookingSlice = {
  booking: CalendarBooking;
  /** Primary label/avatar for the cell (depends on view role). */
  displayName: string;
  displayPhotoUrl: string | null;
};

export type CalendarViewRole = "pet-parent" | "pet-friend" | "involved" | "public";

/** Actual booked days from request selection; falls back to start–end span when missing. */
export function bookingOccurrenceDates(
  booking: Pick<CalendarBooking, "startDate" | "endDate" | "requestedDates">,
): string[] {
  const requested = normalizeAvailabilityDates(booking.requestedDates ?? []);
  if (requested.length) return requested;
  return eachISODateInRangeInclusive(booking.startDate, booking.endDate);
}

/** @deprecated use bookingOccurrenceDates */
export function expandBookingToDates(
  booking: Pick<CalendarBooking, "startDate" | "endDate" | "requestedDates">,
): string[] {
  return bookingOccurrenceDates(booking);
}

export function isBlockingBookingStatus(status: BookingStatus): boolean {
  return BOOKING_BLOCKING_STATUSES.includes(status);
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = localISODate(new Date(year, month, 1));
  const end = localISODate(new Date(year, month + 1, 0));
  return { start, end };
}

export function bookingOverlapsMonth(
  booking: Pick<CalendarBooking, "startDate" | "endDate">,
  monthStart: string,
  monthEnd: string,
): boolean {
  return booking.startDate <= monthEnd && booking.endDate >= monthStart;
}

export function resolveBookingCellDisplay(
  booking: CalendarBooking,
  viewRole: CalendarViewRole,
): { displayName: string; displayPhotoUrl: string | null } | null {
  if (viewRole === "public") return null;
  if (viewRole === "pet-friend") {
    return { displayName: booking.petName, displayPhotoUrl: booking.petPhotoUrl };
  }
  if (viewRole === "pet-parent") {
    return { displayName: booking.friendName, displayPhotoUrl: booking.friendPhotoUrl };
  }
  return { displayName: booking.friendName, displayPhotoUrl: booking.friendPhotoUrl };
}

/** Map ISO date → bookings touching that day (blocking statuses only by default). */
export function mergeBookingsByDay(
  bookings: CalendarBooking[],
  options?: { includeStatuses?: BookingStatus[] },
): Map<string, DayBookingSlice[]> {
  const allowed = new Set(options?.includeStatuses ?? BOOKING_BLOCKING_STATUSES);
  const map = new Map<string, DayBookingSlice[]>();

  for (const booking of bookings) {
    if (!allowed.has(booking.status)) continue;
    for (const iso of bookingOccurrenceDates(booking)) {
      const list = map.get(iso) ?? [];
      list.push({
        booking,
        displayName: booking.friendName,
        displayPhotoUrl: booking.friendPhotoUrl,
      });
      map.set(iso, list);
    }
  }

  return map;
}

export function applyViewRoleToDayMap(
  dayMap: Map<string, DayBookingSlice[]>,
  viewRole: CalendarViewRole,
): Map<string, DayBookingSlice[]> {
  if (viewRole === "public") {
    const out = new Map<string, DayBookingSlice[]>();
    for (const [iso, slices] of dayMap) {
      out.set(
        iso,
        slices.map((s) => ({
          booking: s.booking,
          displayName: "",
          displayPhotoUrl: null,
        })),
      );
    }
    return out;
  }

  const out = new Map<string, DayBookingSlice[]>();
  for (const [iso, slices] of dayMap) {
    out.set(
      iso,
      slices.map((s) => {
        const display = resolveBookingCellDisplay(s.booking, viewRole);
        return {
          booking: s.booking,
          displayName: display?.displayName ?? s.displayName,
          displayPhotoUrl: display?.displayPhotoUrl ?? s.displayPhotoUrl,
        };
      }),
    );
  }
  return out;
}

export function bookedDatesSet(dayMap: Map<string, DayBookingSlice[]>): Set<string> {
  return new Set(dayMap.keys());
}

export function formatBookingDateRange(
  start: string,
  end: string,
  locale?: string,
  requestedDates?: string[] | null,
): string {
  return formatBookingDatesForRow(
    { requestedDates, date_from: start, date_to: end },
    { locale },
  );
}

export function mondayIndex(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/** Immutable calendar month (month is 0-based, matching Date#getMonth). */
export type MonthCursor = { year: number; month: number };

export function monthCursorFromDate(d: Date): MonthCursor {
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function monthCursorToDate({ year, month }: MonthCursor): Date {
  return new Date(year, month, 1);
}

export function shiftMonthCursor(cursor: MonthCursor, delta: number): MonthCursor {
  const next = new Date(cursor.year, cursor.month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

function compareMonthCursor(a: MonthCursor, b: MonthCursor): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

function monthCursorFromIso(iso: string): MonthCursor | null {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return null;
  return { year: y, month: m - 1 };
}

/** Default visible month: current month, or the month of the next upcoming available/selected date. */
export function resolveInitialMonthCursor(
  available: string[],
  selected: string[],
  initialMonth?: Date,
  referenceDate: Date = new Date(),
): MonthCursor {
  const current = monthCursorFromDate(initialMonth ?? referenceDate);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const candidates = [...new Set([...available, ...selected])].sort();
  const firstUpcoming = candidates.find((iso) => {
    const date = parseISODateLocal(iso);
    return date !== null && date >= today;
  });

  if (firstUpcoming) {
    const target = monthCursorFromIso(firstUpcoming);
    if (target && compareMonthCursor(target, current) >= 0) {
      return target;
    }
  }

  return current;
}
