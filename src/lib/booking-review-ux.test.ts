import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Booking } from "@/lib/bookings";
import {
  fetchMyReviewForBooking,
  isDuplicateReviewError,
  userNeedsToReviewBooking,
} from "@/lib/reviews";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function completedBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1",
    requestId: "req-1",
    petId: "pet-1",
    petName: "Milo",
    petParentId: "parent-1",
    petFriendId: "friend-1",
    otherPartyName: "Alex",
    careType: "Walks",
    careTypeRaw: "walks",
    status: "completed",
    displayStatus: "completed",
    startDate: "2026-08-01",
    endDate: "2026-08-02",
    requestedDates: null,
    createdAt: "2026-07-30T10:00:00Z",
    createdAtLabel: "Jul 30, 2026",
    completedAt: "2026-08-02T18:00:00Z",
    completedAtLabel: "Aug 2, 2026",
    cancelledAt: null,
    cancelledAtLabel: null,
    cancelledReason: null,
    ...overrides,
  };
}

describe("booking review UX", () => {
  it("treats reviews_one_per_reviewer_per_booking unique violations as duplicate reviews", () => {
    const error = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "reviews_one_per_reviewer_per_booking"',
      details: "Key (booking_id, reviewer_id)=(booking-1, user-1) already exists.",
      hint: null,
    } as PostgrestError;

    expect(isDuplicateReviewError(error)).toBe(true);
  });

  it("uses fetchMyReviewForBooking as the shared existence check", () => {
    const source = [
      readSource("src/lib/reviews.ts"),
      readSource("src/components/reviews/BookingReviewAction.tsx"),
      readSource("src/components/dashboard/DashboardReviewPromptBanner.tsx"),
      readSource("src/components/messages/BookingReviewBanner.tsx"),
      readSource("src/lib/booking-review-prompt.ts"),
    ].join("\n");

    expect(source).toContain("fetchMyReviewForBooking");
    expect(source).toContain("fetchMyReviewsForBookings");
  });

  it("always verifies review status on mount in BookingReviewAction", () => {
    const source = readSource("src/components/reviews/BookingReviewAction.tsx");

    expect(source).toContain("fetchMyReviewDisplayForBooking");
    expect(source).not.toMatch(/if \(existingReviewProp !== undefined\)[\s\S]*return;/);
    expect(source).toContain("loadingReview");
    expect(source).toContain("<SubmittedReviewCard");
  });

  it("hides dashboard and message review prompts when a review already exists", () => {
    const dashboardSource = readSource("src/components/dashboard/DashboardReviewPromptBanner.tsx");
    const bannerSource = readSource("src/components/messages/BookingReviewBanner.tsx");

    expect(dashboardSource).toContain("fetchMyReviewForBooking");
    expect(dashboardSource).toContain("alreadyReviewed");
    expect(bannerSource).toContain("fetchMyReviewForBooking");
    expect(bannerSource).toContain("setVisible(!review)");
  });

  it("shows submitted review summary instead of leave review when review exists", () => {
    const source = readSource("src/components/reviews/SubmittedReviewCard.tsx");

    expect(source).toContain("reviewSubmitted");
    expect(source).toContain("ReviewStars");
    expect(source).toContain("reviewedOn");
    expect(source).not.toContain("Edit review");
    expect(source).not.toContain("View review");
  });

  it("determines review eligibility from booking role and existing review", () => {
    const booking = completedBooking();
    expect(userNeedsToReviewBooking(booking, "parent-1", null)).toBe(true);
    expect(
      userNeedsToReviewBooking(booking, "parent-1", {
        reviewerId: "parent-1",
      }),
    ).toBe(false);
    expect(userNeedsToReviewBooking(booking, "other-user", null)).toBe(false);
  });

  it("documents that review editing is not implemented", () => {
    const source = readSource("src/components/reviews/BookingReviewAction.tsx");
    expect(source).not.toMatch(/edit review/i);
    expect(source).not.toContain("updateReview");
  });

  it("exports fetchMyReviewForBooking for booking-level existence checks", () => {
    expect(typeof fetchMyReviewForBooking).toBe("function");
  });
});

describe("fetchFirstBookingNeedingReview source", () => {
  it("skips bookings that already have a review from the current user", () => {
    const source = readSource("src/lib/booking-review-prompt.ts");
    expect(source).toContain("fetchMyReviewsForBookings");
    expect(source).toContain("reviewMap.has(booking.id)");
  });
});
