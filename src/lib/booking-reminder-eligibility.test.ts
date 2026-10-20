import { describe, expect, it } from "vitest";
import {
  bookingStartsTomorrowAt,
  calendarDateInTimeZone,
  evaluateBookingReminderSend,
  isBookingStartsTomorrowEvent,
} from "@/lib/booking-reminder-eligibility";

const PARENT_ID = "parent-1";
const FRIEND_ID = "friend-1";

function upcomingBooking(startDate: string) {
  return {
    id: "booking-1",
    status: "upcoming",
    start_date: startDate,
    cancelled_at: null,
    pet_parent_id: PARENT_ID,
    pet_friend_id: FRIEND_ID,
  };
}

describe("booking reminder eligibility", () => {
  it("recognizes booking-starts-tomorrow events only", () => {
    expect(isBookingStartsTomorrowEvent("booking_starts_tomorrow_parent")).toBe(true);
    expect(isBookingStartsTomorrowEvent("booking_starts_tomorrow_friend")).toBe(true);
    expect(isBookingStartsTomorrowEvent("booking_confirmed")).toBe(false);
  });

  it("schedules 09:00 UTC on the calendar day before start_date", () => {
    const now = new Date("2026-09-29T05:58:00.000Z");
    const scheduled = bookingStartsTomorrowAt("2026-10-20", now);
    expect(scheduled?.toISOString()).toBe("2026-10-19T09:00:00.000Z");
  });

  it("does not schedule a reminder whose 09:00 UTC slot is already past", () => {
    const now = new Date("2026-10-19T09:00:01.000Z");
    expect(bookingStartsTomorrowAt("2026-10-20", now)).toBeNull();
  });

  it("uses Europe/Tallinn calendar dates, not UTC, for starts-today", () => {
    const utcStillYesterday = new Date("2026-10-19T21:30:00.000Z");
    expect(calendarDateInTimeZone(utcStillYesterday)).toBe("2026-10-20");

    const decision = evaluateBookingReminderSend({
      eventType: "booking_starts_tomorrow_parent",
      userId: PARENT_ID,
      booking: upcomingBooking("2026-10-20"),
      now: utcStillYesterday,
    });
    expect(decision).toEqual({ send: false, reason: "starts_today" });
  });

  it("sends a future upcoming booking to the matching parent recipient", () => {
    const decision = evaluateBookingReminderSend({
      eventType: "booking_starts_tomorrow_parent",
      userId: PARENT_ID,
      booking: upcomingBooking("2026-10-25"),
      now: new Date("2026-10-24T09:00:00.000Z"),
    });
    expect(decision).toEqual({ send: true });
  });

  it("sends a future upcoming booking to the matching friend recipient", () => {
    const decision = evaluateBookingReminderSend({
      eventType: "booking_starts_tomorrow_friend",
      userId: FRIEND_ID,
      booking: upcomingBooking("2026-10-25"),
      now: new Date("2026-10-24T09:00:00.000Z"),
    });
    expect(decision).toEqual({ send: true });
  });

  it("skips a missing booking", () => {
    expect(
      evaluateBookingReminderSend({
        eventType: "booking_starts_tomorrow_parent",
        userId: PARENT_ID,
        booking: null,
      }),
    ).toEqual({ send: false, reason: "missing_booking" });
  });

  it("skips cancelled bookings even if start_date is in the future", () => {
    expect(
      evaluateBookingReminderSend({
        eventType: "booking_starts_tomorrow_friend",
        userId: FRIEND_ID,
        booking: {
          ...upcomingBooking("2026-11-01"),
          status: "cancelled",
          cancelled_at: "2026-10-01T12:00:00.000Z",
        },
        now: new Date("2026-10-20T09:00:00.000Z"),
      }),
    ).toEqual({ send: false, reason: "cancelled" });
  });

  it("skips completed and active bookings", () => {
    expect(
      evaluateBookingReminderSend({
        eventType: "booking_starts_tomorrow_parent",
        userId: PARENT_ID,
        booking: { ...upcomingBooking("2026-11-01"), status: "completed" },
        now: new Date("2026-10-20T09:00:00.000Z"),
      }),
    ).toEqual({ send: false, reason: "not_upcoming" });

    expect(
      evaluateBookingReminderSend({
        eventType: "booking_starts_tomorrow_parent",
        userId: PARENT_ID,
        booking: { ...upcomingBooking("2026-11-01"), status: "active" },
        now: new Date("2026-10-20T09:00:00.000Z"),
      }),
    ).toEqual({ send: false, reason: "not_upcoming" });
  });

  it("skips bookings that already started in Europe/Tallinn", () => {
    expect(
      evaluateBookingReminderSend({
        eventType: "booking_starts_tomorrow_parent",
        userId: PARENT_ID,
        booking: upcomingBooking("2026-10-19"),
        now: new Date("2026-10-20T07:00:00.000Z"),
      }),
    ).toEqual({ send: false, reason: "already_started" });
  });

  it("skips the wrong participant for the event type", () => {
    expect(
      evaluateBookingReminderSend({
        eventType: "booking_starts_tomorrow_parent",
        userId: FRIEND_ID,
        booking: upcomingBooking("2026-10-25"),
        now: new Date("2026-10-24T09:00:00.000Z"),
      }),
    ).toEqual({ send: false, reason: "wrong_recipient" });
  });
});
