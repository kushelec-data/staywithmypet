import { describe, expect, it } from "vitest";
import { formatMembershipDate, isMembershipActive } from "@/lib/membership";
import { computeMembershipEndDate } from "@/lib/stripe-plans";
import {
  canOneTimeStartNewArrangement,
  computeOneTimeInitialEndDate,
  computeOneTimeRestartEndDate,
  isOneTimeMembershipActive,
  planOneTimeBookingCancellationUpdate,
  planOneTimeBookingCompletionUpdate,
  planOneTimeBookingLinkUpdate,
  type OneTimeMembershipRow,
} from "@/lib/one-time-membership";

function oneTimeRow(
  overrides: Partial<OneTimeMembershipRow> = {},
): OneTimeMembershipRow {
  return {
    plan_id: "one-time-owner",
    status: "active",
    start_date: "2026-07-25T12:00:00.000Z",
    end_date: "2026-08-01T12:00:00.000Z",
    linked_booking_id: null,
    consumed_at: null,
    cancellation_restart_used: false,
    ...overrides,
  };
}

describe("One-Time membership lifecycle", () => {
  const activationStart = new Date("2026-07-25T12:00:00.000Z");

  it("activation gives 7 days", () => {
    const end = computeOneTimeInitialEndDate(activationStart);
    expect(end).toBe("2026-08-01T12:00:00.000Z");
    expect(computeMembershipEndDate("one_time", activationStart)).toBe(end);
  });

  it("unused membership expires after 7 days", () => {
    const row = oneTimeRow({
      end_date: computeOneTimeInitialEndDate(activationStart),
    });
    expect(isOneTimeMembershipActive(row, new Date("2026-07-31T23:59:59.000Z"))).toBe(true);
    expect(isOneTimeMembershipActive(row, new Date("2026-08-02T00:00:00.000Z"))).toBe(false);
    expect(isMembershipActive(row as never, new Date("2026-08-02T00:00:00.000Z"))).toBe(false);
  });

  it("one confirmed booking consumes/locks entitlement", () => {
    const linked = oneTimeRow({ linked_booking_id: "booking-1" });
    expect(canOneTimeStartNewArrangement(linked)).toBe(false);
    expect(planOneTimeBookingLinkUpdate(linked, "booking-2")).toBeNull();
  });

  it("rejected request does not consume it", () => {
    const row = oneTimeRow();
    expect(row.linked_booking_id).toBeNull();
    expect(canOneTimeStartNewArrangement(row)).toBe(true);
    expect(planOneTimeBookingLinkUpdate(row, "booking-1")).toEqual({
      linkedBookingId: "booking-1",
    });
  });

  it("cancellation restarts entitlement for one month", () => {
    const linked = oneTimeRow({
      linked_booking_id: "booking-1",
      cancellation_restart_used: false,
    });
    const cancelledAt = "2026-08-10T15:30:00.000Z";
    const planned = planOneTimeBookingCancellationUpdate({
      membership: linked,
      bookingId: "booking-1",
      cancelledAt,
    });

    expect(planned).toEqual({
      action: "restart",
      startDate: cancelledAt,
      endDate: computeOneTimeRestartEndDate(new Date(cancelledAt)),
      cancellationRestartUsed: true,
      linkedBookingId: null,
    });
    expect(planned.action === "restart" ? planned.endDate : "").toBe(
      "2026-09-10T15:30:00.000Z",
    );
  });

  it("repeated cancellation does not repeatedly extend it", () => {
    const linkedAgain = oneTimeRow({
      linked_booking_id: "booking-2",
      cancellation_restart_used: true,
      end_date: "2026-09-10T15:30:00.000Z",
    });
    const secondCancel = planOneTimeBookingCancellationUpdate({
      membership: linkedAgain,
      bookingId: "booking-2",
      cancelledAt: "2026-08-20T10:00:00.000Z",
    });

    expect(secondCancel).toEqual({
      action: "exhaust",
      consumedAt: "2026-08-20T10:00:00.000Z",
      status: "expired",
      linkedBookingId: null,
    });

    const repeat = planOneTimeBookingCancellationUpdate({
      membership: {
        ...linkedAgain,
        linked_booking_id: null,
        consumed_at: "2026-08-20T10:00:00.000Z",
        status: "expired",
      },
      bookingId: "booking-2",
      cancelledAt: "2026-08-20T10:00:00.000Z",
    });
    expect(repeat.action).toBe("none");
  });

  it("completed booking permanently consumes it", () => {
    const linked = oneTimeRow({ linked_booking_id: "booking-1" });
    const planned = planOneTimeBookingCompletionUpdate(
      linked,
      "booking-1",
      "2026-08-05T09:00:00.000Z",
    );

    expect(planned).toEqual({
      consumedAt: "2026-08-05T09:00:00.000Z",
      status: "expired",
      linkedBookingId: "booking-1",
    });

    const after = oneTimeRow({
      linked_booking_id: "booking-1",
      consumed_at: "2026-08-05T09:00:00.000Z",
      status: "expired",
    });
    expect(isOneTimeMembershipActive(after)).toBe(false);
    expect(canOneTimeStartNewArrangement(after)).toBe(false);
  });

  it("no refund logic exists in lifecycle planners", () => {
    const planned = planOneTimeBookingCancellationUpdate({
      membership: oneTimeRow({ linked_booking_id: "booking-1" }),
      bookingId: "booking-1",
      cancelledAt: "2026-08-10T15:30:00.000Z",
    });
    expect(planned.action).toBe("restart");
    expect(JSON.stringify(planned)).not.toMatch(/refund/i);
  });

  it("displayed expiry and cancellation times are correct", () => {
    const endIso = computeOneTimeInitialEndDate(activationStart);
    expect(formatMembershipDate(endIso)).toBe("Aug 1, 2026");

    const cancelledAt = "2026-08-10T15:30:00.000Z";
    const restartEnd = computeOneTimeRestartEndDate(new Date(cancelledAt));
    expect(formatMembershipDate(restartEnd)).toBe("Sep 10, 2026");
  });
});
