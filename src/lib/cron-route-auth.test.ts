import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking-review-emails", () => ({
  processPendingBookingReviewEmails: vi.fn(async () => ({ processed: 0 })),
}));

vi.mock("@/lib/email-send", () => ({
  processDueScheduledEmails: vi.fn(async () => ({ processed: 0, sent: 0, skipped: 0 })),
  sendTransactionalEmail: vi.fn(async () => ({ sent: false, skipped: true })),
}));

vi.mock("@/lib/email-campaigns/scheduled-send", () => ({
  processDueScheduledCampaigns: vi.fn(async () => ({
    claimed: 0,
    continued: 0,
    finished: 0,
    skipped: 0,
  })),
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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => null,
}));

import {
  GET as bookingReviewGet,
  POST as bookingReviewPost,
} from "@/app/api/cron/booking-review-emails/route";
import {
  GET as scheduledEmailsGet,
  POST as scheduledEmailsPost,
} from "@/app/api/cron/process-scheduled-emails/route";
import {
  GET as scheduledCampaignsGet,
  POST as scheduledCampaignsPost,
} from "@/app/api/cron/process-scheduled-campaigns/route";
import {
  GET as membershipRemindersGet,
  POST as membershipRemindersPost,
} from "@/app/api/cron/membership-reminders/route";
import { POST as emailSendPost } from "@/app/api/emails/send/route";
import {
  GET as weeklyMatchGet,
  POST as weeklyMatchPost,
} from "@/app/api/cron/weekly-matchmaking/route";
import { processDueScheduledEmails } from "@/lib/email-send";
import { processPendingBookingReviewEmails } from "@/lib/booking-review-emails";
import { processDueScheduledCampaigns } from "@/lib/email-campaigns/scheduled-send";
import { runWeeklyMatchmaking } from "@/lib/matchmaking/run-weekly";

describe("cron/internal route authorization", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.CRON_SECRET;
    delete process.env.EMAIL_INTERNAL_SECRET;
    vi.mocked(processDueScheduledEmails).mockClear();
    vi.mocked(processPendingBookingReviewEmails).mockClear();
    vi.mocked(processDueScheduledCampaigns).mockClear();
    vi.mocked(runWeeklyMatchmaking).mockClear();
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

  it("accepts authenticated cron GET and runs the same processor as POST", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const getResponse = await scheduledEmailsGet(
      new Request("https://example.com/api/cron/process-scheduled-emails", {
        method: "GET",
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    const postResponse = await scheduledEmailsPost(
      new Request("https://example.com/api/cron/process-scheduled-emails", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(processDueScheduledEmails).toHaveBeenCalledTimes(2);
  });

  it("rejects unauthorized cron GET", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const missing = await scheduledEmailsGet(
      new Request("https://example.com/api/cron/process-scheduled-emails", { method: "GET" }),
    );
    const wrong = await scheduledEmailsGet(
      new Request("https://example.com/api/cron/process-scheduled-emails", {
        method: "GET",
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(processDueScheduledEmails).not.toHaveBeenCalled();
  });

  it("exposes authenticated GET on the other cron routes", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const headers = { authorization: "Bearer cron-secret" };

    expect(
      (
        await bookingReviewGet(
          new Request("https://example.com/api/cron/booking-review-emails", { method: "GET", headers }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await weeklyMatchGet(
          new Request("https://example.com/api/cron/weekly-matchmaking", { method: "GET", headers }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await scheduledCampaignsGet(
          new Request("https://example.com/api/cron/process-scheduled-campaigns", { method: "GET", headers }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await scheduledCampaignsPost(
          new Request("https://example.com/api/cron/process-scheduled-campaigns", { method: "POST", headers }),
        )
      ).status,
    ).toBe(200);

    const membershipGet = await membershipRemindersGet(
      new Request("https://example.com/api/cron/membership-reminders", { method: "GET", headers }),
    );
    const membershipPost = await membershipRemindersPost(
      new Request("https://example.com/api/cron/membership-reminders", { method: "POST", headers }),
    );
    expect(membershipGet.status).toBe(503);
    expect(membershipPost.status).toBe(503);

    expect(processPendingBookingReviewEmails).toHaveBeenCalledTimes(1);
    expect(runWeeklyMatchmaking).toHaveBeenCalledTimes(1);
    expect(processDueScheduledCampaigns).toHaveBeenCalledTimes(2);
  });
});
