import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  checkReviewEmailConfiguration,
  onBookingCompleted,
} from "@/lib/booking-completion";
import {
  reviewReminderParticipants,
  reviewReminderUniqueKey,
  triggerBookingReviewRequestEmails,
} from "@/lib/booking-review-emails";

const mockCreateAdminClient = vi.fn();
const mockResolveRecipientEmail = vi.fn();
const mockSendBookingEmailAsync = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/email-send", () => ({
  resolveRecipientEmail: (...args: unknown[]) => mockResolveRecipientEmail(...args),
}));

vi.mock("@/lib/emails/send-booking", () => ({
  sendBookingEmailAsync: (...args: unknown[]) => mockSendBookingEmailAsync(...args),
}));

const BOOKING_ID = "booking-1";
const PARENT_ID = "parent-1";
const FRIEND_ID = "friend-1";

const completedBooking = {
  id: BOOKING_ID,
  request_id: "request-1",
  pet_id: "pet-1",
  pet_parent_id: PARENT_ID,
  pet_friend_id: FRIEND_ID,
  start_date: "2026-07-01",
  end_date: "2026-07-05",
  status: "completed",
  completed_at: "2026-07-06T10:00:00.000Z",
};

function makeAdminClient(overrides?: {
  booking?: typeof completedBooking | null;
  reviews?: Record<string, boolean>;
  emailEvents?: Record<string, boolean>;
}) {
  const reviews = overrides?.reviews ?? {};
  const emailEvents = overrides?.emailEvents ?? {};

  return {
    from(table: string) {
      const state = { filters: [] as [string, string][] };
      const api = {
        select: () => api,
        eq: (col: string, val: string) => {
          state.filters.push([col, val]);
          return api;
        },
        not: () => api,
        gte: () => api,
        order: () => api,
        limit: () => api,
        is: () => api,
        maybeSingle: async () => {
          if (table === "bookings") {
            return { data: overrides?.booking ?? completedBooking, error: null };
          }
          if (table === "requests") {
            return { data: { care_type: "daycare", requested_dates: ["2026-07-01"] }, error: null };
          }
          if (table === "pets") {
            return { data: { name: "Denny", species: "dog", breed: null }, error: null };
          }
          if (table === "profiles") {
            return { data: { display_name: "Member" }, error: null };
          }
          if (table === "reviews") {
            const reviewerId = state.filters.find(([c]) => c === "reviewer_id")?.[1];
            const bookingId = state.filters.find(([c]) => c === "booking_id")?.[1];
            const key = `${bookingId}:${reviewerId}`;
            return reviews[key]
              ? { data: { id: "review-1" }, error: null }
              : { data: null, error: null };
          }
          if (table === "email_events") {
            const uniqueKey = state.filters.find(([c]) => c === "unique_key")?.[1];
            return emailEvents[uniqueKey ?? ""]
              ? { data: { id: "event-1", sent_at: "2026-07-06T12:00:00.000Z" }, error: null }
              : { data: null, error: null };
          }
          return { data: null, error: null };
        },
      };
      return api;
    },
  };
}

describe("review reminder unique keys", () => {
  it("dedupes per booking and recipient", () => {
    expect(reviewReminderUniqueKey("review_reminder_parent", BOOKING_ID, PARENT_ID)).toBe(
      `review_reminder_parent_${BOOKING_ID}_${PARENT_ID}`,
    );
    expect(reviewReminderUniqueKey("review_reminder_friend", BOOKING_ID, FRIEND_ID)).toBe(
      `review_reminder_friend_${BOOKING_ID}_${FRIEND_ID}`,
    );
  });

  it("lists both participants independently", () => {
    const participants = reviewReminderParticipants({
      pet_parent_id: PARENT_ID,
      pet_friend_id: FRIEND_ID,
    });
    expect(participants).toHaveLength(2);
    expect(participants.map((p) => p.role)).toEqual(["pet_parent", "pet_friend"]);
  });
});

describe("triggerBookingReviewRequestEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASSWORD = "smtp-password";
    mockCreateAdminClient.mockReturnValue(makeAdminClient());
    mockResolveRecipientEmail.mockResolvedValue("user@example.com");
    mockSendBookingEmailAsync.mockResolvedValue({ sent: true, skipped: false });
  });

  it("sends two emails when neither participant reviewed", async () => {
    const result = await triggerBookingReviewRequestEmails(BOOKING_ID, "manual");
    expect(result.sent).toBe(2);
    expect(result.skipped).toBe(0);
    expect(mockSendBookingEmailAsync).toHaveBeenCalledTimes(2);
  });

  it("skips only Pet Parent when parent already reviewed", async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        reviews: { [`${BOOKING_ID}:${PARENT_ID}`]: true },
      }),
    );

    const result = await triggerBookingReviewRequestEmails(BOOKING_ID, "automatic");
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(mockSendBookingEmailAsync).toHaveBeenCalledTimes(1);
    expect(mockSendBookingEmailAsync.mock.calls[0]?.[0]?.type).toBe("review_reminder_friend");
  });

  it("skips only Pet Friend when friend already reviewed", async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        reviews: { [`${BOOKING_ID}:${FRIEND_ID}`]: true },
      }),
    );

    const result = await triggerBookingReviewRequestEmails(BOOKING_ID, "automatic");
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(mockSendBookingEmailAsync.mock.calls[0]?.[0]?.type).toBe("review_reminder_parent");
  });

  it("sends no emails when both already reviewed", async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        reviews: {
          [`${BOOKING_ID}:${PARENT_ID}`]: true,
          [`${BOOKING_ID}:${FRIEND_ID}`]: true,
        },
      }),
    );

    const result = await triggerBookingReviewRequestEmails(BOOKING_ID, "manual");
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(2);
    expect(mockSendBookingEmailAsync).not.toHaveBeenCalled();
  });

  it("does not resend when email_events already recorded", async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        emailEvents: {
          [`review_reminder_parent_${BOOKING_ID}_${PARENT_ID}`]: true,
          [`review_reminder_friend_${BOOKING_ID}_${FRIEND_ID}`]: true,
        },
      }),
    );

    const result = await triggerBookingReviewRequestEmails(BOOKING_ID, "cron");
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(2);
    expect(mockSendBookingEmailAsync).not.toHaveBeenCalled();
  });

  it("rejects bookings that are not completed", async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        booking: { ...completedBooking, status: "active", completed_at: null },
      }),
    );

    const result = await triggerBookingReviewRequestEmails(BOOKING_ID, "manual");
    expect(result.bookingNotEligible).toBe(true);
    expect(mockSendBookingEmailAsync).not.toHaveBeenCalled();
  });

  it("counts SMTP failure as skipped without duplicate send attempt in same run", async () => {
    mockSendBookingEmailAsync.mockResolvedValue({
      sent: false,
      skipped: false,
      reason: "send_failed",
    });

    const result = await triggerBookingReviewRequestEmails(BOOKING_ID, "manual");
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(2);
  });
});

describe("onBookingCompleted configuration", () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASSWORD = "smtp-password";
  });

  it("blocks when service role key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = await onBookingCompleted(BOOKING_ID, "manual");
    expect(result.configError).toBe(true);
    expect(result.missingConfig).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("reports missing SMTP configuration", () => {
    delete process.env.SMTP_PASSWORD;
    const status = checkReviewEmailConfiguration();
    expect(status.ok).toBe(false);
    expect(status.missing).toContain("SMTP_PASSWORD");
  });
});
