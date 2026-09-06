import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking-review-emails", () => ({
  processPendingBookingReviewEmails: vi.fn(async () => ({ processed: 0 })),
}));

vi.mock("@/lib/email-send", () => ({
  processDueScheduledEmails: vi.fn(async () => ({ processed: 0 })),
}));

vi.mock("@/lib/matchmaking/run-weekly", () => ({
  runWeeklyMatchmaking: vi.fn(async () => ({
    ok: true,
    batchId: "batch",
    expired: 0,
    candidatesScored: 0,
    inserted: 0,
    emailsSent: 0,
    notificationsCreated: 0,
    skippedEmpty: true,
  })),
}));

import { POST as bookingReviewPost } from "@/app/api/cron/booking-review-emails/route";
import { POST as scheduledEmailsPost } from "@/app/api/cron/process-scheduled-emails/route";
import { POST as emailSendPost } from "@/app/api/emails/send/route";
import { POST as weeklyMatchPost } from "@/app/api/cron/weekly-matchmaking/route";

describe("cron/internal route authorization", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.CRON_SECRET;
    delete process.env.EMAIL_INTERNAL_SECRET;
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("booking-review-emails returns 401 when secret is missing", async () => {
    const response = await bookingReviewPost(new Request("https://example.com/api/cron/booking-review-emails", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("booking-review-emails returns 401 for wrong secret", async () => {
    process.env.CRON_SECRET = "expected-secret";
    const response = await bookingReviewPost(
      new Request("https://example.com/api/cron/booking-review-emails", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("process-scheduled-emails accepts x-email-internal-secret when configured", async () => {
    process.env.EMAIL_INTERNAL_SECRET = "internal-secret";
    const response = await scheduledEmailsPost(
      new Request("https://example.com/api/cron/process-scheduled-emails", {
        method: "POST",
        headers: { "x-email-internal-secret": "internal-secret" },
      }),
    );
    expect(response.status).toBe(200);
  });

  it("emails/send rejects CRON_SECRET when EMAIL_INTERNAL_SECRET is required", async () => {
    process.env.CRON_SECRET = "cron-secret";
    process.env.EMAIL_INTERNAL_SECRET = "email-secret";
    const response = await emailSendPost(
      new Request("https://example.com/api/emails/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cron-secret": "cron-secret",
        },
        body: JSON.stringify({ event_type: "test", user_id: "user-1" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("weekly-matchmaking returns 401 when secret is missing", async () => {
    const response = await weeklyMatchPost(
      new Request("https://example.com/api/cron/weekly-matchmaking", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });
});
