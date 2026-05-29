import {
  expandBookingToDates,
  monthBounds,
  type CalendarBooking,
} from "@/lib/booking-calendar";
import { todayISODate } from "@/lib/calendar-date-state";

export function nextAvailableDate(
  availabilityDates: string[],
  blockingBookedDateSet: Set<string>,
  today = todayISODate(),
): string | null {
  const next = availabilityDates
    .filter((iso) => iso >= today && !blockingBookedDateSet.has(iso))
    .sort();
  return next[0] ?? null;
}

export function upcomingBookingsForInsights(
  bookings: CalendarBooking[],
  today = todayISODate(),
  limit = 5,
): CalendarBooking[] {
  return bookings
    .filter(
      (b) =>
        (b.status === "upcoming" || b.status === "active") && b.endDate >= today,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit);
}

export function bookedDaysCountInMonth(
  bookings: CalendarBooking[],
  year: number,
  month: number,
): number {
  const { start, end } = monthBounds(year, month);
  const dates = new Set<string>();

  for (const booking of bookings) {
    if (booking.status === "cancelled") continue;
    for (const iso of expandBookingToDates(booking)) {
      if (iso >= start && iso <= end) dates.add(iso);
    }
  }

  return dates.size;
}
