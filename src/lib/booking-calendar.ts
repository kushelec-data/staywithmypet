import { formatDateRange } from "@/lib/date-format";
import { eachISODateInRangeInclusive, localISODate } from "@/lib/pet-availability";
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
  { index: 0, bg: "bg-emerald-100", ring: "ring-emerald-300/70", text: "text-emerald-900", tint: "rgba(16, 185, 129, 0.22)" },
  { index: 1, bg: "bg-sky-100", ring: "ring-sky-300/70", text: "text-sky-900", tint: "rgba(14, 165, 233, 0.22)" },
  { index: 2, bg: "bg-violet-100", ring: "ring-violet-300/70", text: "text-violet-900", tint: "rgba(139, 92, 246, 0.22)" },
  { index: 3, bg: "bg-amber-100", ring: "ring-amber-300/70", text: "text-amber-900", tint: "rgba(245, 158, 11, 0.24)" },
  { index: 4, bg: "bg-rose-100", ring: "ring-rose-300/70", text: "text-rose-900", tint: "rgba(244, 63, 94, 0.2)" },
  { index: 5, bg: "bg-teal-100", ring: "ring-teal-300/70", text: "text-teal-900", tint: "rgba(20, 184, 166, 0.22)" },
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
  color: CalendarBookingColor;
};

export type DayBookingSlice = {
  booking: CalendarBooking;
  /** Primary label/avatar for the cell (depends on view role). */
  displayName: string;
  displayPhotoUrl: string | null;
};

export type CalendarViewRole = "pet-parent" | "pet-friend" | "involved" | "public";

export function expandBookingToDates(booking: Pick<CalendarBooking, "startDate" | "endDate">): string[] {
  return eachISODateInRangeInclusive(booking.startDate, booking.endDate);
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
    for (const iso of expandBookingToDates(booking)) {
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
): string {
  return formatDateRange(start, end, locale);
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
