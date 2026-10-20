import type { BookingStatus } from "@/types/database";

/** Booking dates are calendar dates; "today" and "tomorrow" use Estonia local time. */
export const BOOKING_REMINDER_TIMEZONE = "Europe/Tallinn";

/** Existing reminder send time: 09:00 UTC on the calendar day before start_date. */
export const BOOKING_STARTS_TOMORROW_UTC_HOUR = 9;

export const BOOKING_STARTS_TOMORROW_EVENTS = [
  "booking_starts_tomorrow_parent",
  "booking_starts_tomorrow_friend",
] as const;

export type BookingStartsTomorrowEvent = (typeof BOOKING_STARTS_TOMORROW_EVENTS)[number];

export type BookingReminderSkipReason =
  | "missing_booking"
  | "cancelled"
  | "not_upcoming"
  | "starts_today"
  | "already_started"
  | "wrong_recipient";

export type BookingReminderSnapshot = {
  id?: string | null;
  status?: string | null;
  start_date?: string | null;
  cancelled_at?: string | null;
  pet_parent_id?: string | null;
  pet_friend_id?: string | null;
};

export function isBookingStartsTomorrowEvent(
  eventType: string,
): eventType is BookingStartsTomorrowEvent {
  return (BOOKING_STARTS_TOMORROW_EVENTS as readonly string[]).includes(eventType);
}

export function calendarDateInTimeZone(
  now: Date,
  timeZone = BOOKING_REMINDER_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((row) => row.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function normalizeCalendarDate(value: string | null | undefined): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value?.trim() ?? "");
  return match?.[1] ?? null;
}

export function addCalendarDays(isoDate: string, days: number): string | null {
  const date = normalizeCalendarDate(isoDate);
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(utc.getTime())) return null;
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/**
 * Queue time for the existing "starts tomorrow" reminder:
 * 09:00 UTC on the calendar day before `startDate`.
 * Returns null when that instant is already in the past (do not schedule stale copy).
 */
export function bookingStartsTomorrowAt(
  startDate: string,
  now: Date = new Date(),
): Date | null {
  const start = normalizeCalendarDate(startDate);
  if (!start) return null;
  const reminderDay = addCalendarDays(start, -1);
  if (!reminderDay) return null;
  const reminder = new Date(`${reminderDay}T${String(BOOKING_STARTS_TOMORROW_UTC_HOUR).padStart(2, "0")}:00:00.000Z`);
  if (Number.isNaN(reminder.getTime()) || reminder.getTime() <= now.getTime()) return null;
  return reminder;
}

function isCancelledBooking(booking: BookingReminderSnapshot): boolean {
  if (booking.status === "cancelled") return true;
  return Boolean(booking.cancelled_at?.trim());
}

function recipientMatchesEvent(
  eventType: BookingStartsTomorrowEvent,
  userId: string,
  booking: BookingReminderSnapshot,
): boolean {
  if (eventType === "booking_starts_tomorrow_parent") {
    return Boolean(booking.pet_parent_id && booking.pet_parent_id === userId);
  }
  return Boolean(booking.pet_friend_id && booking.pet_friend_id === userId);
}

export function evaluateBookingReminderSend(input: {
  eventType: string;
  userId: string;
  booking: BookingReminderSnapshot | null;
  now?: Date;
}): { send: true } | { send: false; reason: BookingReminderSkipReason } {
  if (!isBookingStartsTomorrowEvent(input.eventType)) {
    return { send: true };
  }
  if (!input.booking?.id) {
    return { send: false, reason: "missing_booking" };
  }
  if (isCancelledBooking(input.booking)) {
    return { send: false, reason: "cancelled" };
  }
  if (input.booking.status !== ("upcoming" satisfies BookingStatus)) {
    return { send: false, reason: "not_upcoming" };
  }
  if (!recipientMatchesEvent(input.eventType, input.userId, input.booking)) {
    return { send: false, reason: "wrong_recipient" };
  }

  const startDate = normalizeCalendarDate(input.booking.start_date);
  if (!startDate) {
    return { send: false, reason: "missing_booking" };
  }

  const today = calendarDateInTimeZone(input.now ?? new Date());
  if (startDate === today) {
    return { send: false, reason: "starts_today" };
  }
  if (startDate < today) {
    return { send: false, reason: "already_started" };
  }
  return { send: true };
}
