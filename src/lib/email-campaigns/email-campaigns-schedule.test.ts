import { describe, expect, it } from "vitest";
import {
  campaignConsentSummary,
  campaignConsentWarning,
  canEnableCampaignSend,
} from "@/lib/email-campaigns/consent-summary";
import {
  applyScheduledSendOnce,
  canScheduleCampaign,
  parseScheduleDateTime,
  recipientsForScheduledDelivery,
  skipUnconsentedAtSendTime,
  tryClaimScheduledCampaign,
  wallTimeInTimeZoneToUtc,
} from "@/lib/email-campaigns/schedule";
import { campaignOverviewStats, filterCampaignRecipients, topClickedLinks } from "@/lib/email-campaigns/analytics";
import { resolveSendLanguage } from "@/lib/email-campaigns/send-language";
import { selectCampaignContent } from "@/lib/email-campaigns/locale";
import { bulkSendConsentGate } from "@/lib/email-campaigns/marketing-consent";
import { canStartBulkSend } from "@/lib/email-campaigns/send-queue";
import { isCampaignContentLocked } from "@/lib/email-campaigns/versioning";

describe("consent warning", () => {
  it("shows no warning when blockedCount is 0", () => {
    expect(campaignConsentWarning(0)).toBeNull();
    const summary = campaignConsentSummary([
      { status: "pending", consented: true },
      { status: "pending", consented: true },
    ]);
    expect(summary.blocked).toBe(0);
    expect(summary.warning).toBeNull();
    expect(summary.eligible).toBe(2);
    expect(canEnableCampaignSend({ recipientCount: 2, blockedCount: 0, pendingCount: 2 })).toBe(true);
    expect(bulkSendConsentGate([]).allowed).toBe(true);
  });

  it("shows a clear warning when blockedCount is greater than 0", () => {
    const summary = campaignConsentSummary([
      { status: "pending", consented: true },
      { status: "pending", consented: false },
      { status: "pending", consented: false },
    ]);
    expect(summary.blocked).toBe(2);
    expect(summary.eligible).toBe(1);
    expect(summary.warning).toBe(
      "2 recipients cannot receive this campaign because they are not subscribed to marketing emails or have unsubscribed.",
    );
    expect(campaignConsentWarning(2)).toContain("not subscribed to marketing emails");
  });
});

describe("campaign schedule", () => {
  it("creates a future Europe/Tallinn schedule without sending", () => {
    const parsed = parseScheduleDateTime({ date: "2026-09-13", time: "10:00", timezone: "Europe/Tallinn" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.timezone).toBe("Europe/Tallinn");
    expect(parsed.scheduledAt).toBe(wallTimeInTimeZoneToUtc("2026-09-13", "10:00", "Europe/Tallinn"));
    expect(canScheduleCampaign("draft", 4)).toBe(true);
    expect(canScheduleCampaign("sent", 4)).toBe(false);
  });

  it("cancels a schedule back to a draftable state", () => {
    expect(canScheduleCampaign("scheduled", 4)).toBe(true);
    expect(isCampaignContentLocked("scheduled")).toBe(true);
    expect(isCampaignContentLocked("draft")).toBe(false);
  });

  it("sends a due scheduled campaign once using saved recipient languages", () => {
    const now = "2026-09-13T07:00:01.000Z";
    const campaign = {
      id: "c1",
      status: "scheduled",
      scheduledAt: "2026-09-13T07:00:00.000Z",
      leaseId: null,
      leaseUntil: null,
    };
    const claim = tryClaimScheduledCampaign(campaign, now, "lease-1");
    expect(claim.ok).toBe(true);
    const recipients = [
      { id: "gerly", status: "pending", consented: true, language: "et" },
      { id: "kush", status: "pending", consented: true, language: "en" },
    ];
    const first = applyScheduledSendOnce({ status: "scheduled", scheduledAt: campaign.scheduledAt, sentIds: [] }, recipients, now, claim);
    expect(first.sentIds).toEqual(["gerly", "kush"]);
    const fields = { subjectEn: "EN", subjectEt: "ET", htmlEn: "<p>EN</p>", htmlEt: "<p>ET</p>" };
    expect(selectCampaignContent(resolveSendLanguage("automatic", "et"), fields).subject).toBe("ET");
    expect(selectCampaignContent(resolveSendLanguage("automatic", "en"), fields).subject).toBe("EN");
    const secondClaim = tryClaimScheduledCampaign({ ...campaign, status: "sending", leaseId: "lease-1", leaseUntil: "2099-01-01T00:00:00.000Z" }, now, "lease-2");
    expect(secondClaim.ok).toBe(false);
    const second = applyScheduledSendOnce({ status: "sending", scheduledAt: campaign.scheduledAt, sentIds: first.sentIds }, recipients.map((row) => ({ ...row, status: "sent" })), now, secondClaim);
    expect(second.sentIds).toEqual(["gerly", "kush"]);
  });

  it("does not send twice when the scheduler runs in duplicate", () => {
    const now = "2026-09-13T07:00:01.000Z";
    const base = {
      id: "c1",
      status: "scheduled" as const,
      scheduledAt: "2026-09-13T07:00:00.000Z",
      leaseId: null as string | null,
      leaseUntil: null as string | null,
    };
    const first = tryClaimScheduledCampaign(base, now, "lease-1");
    const afterFirst = first.ok
      ? { ...base, status: "sending" as const, leaseId: "lease-1", leaseUntil: "2099-01-01T00:00:00.000Z" }
      : base;
    const duplicate = tryClaimScheduledCampaign(afterFirst, now, "lease-2");
    expect(first.ok).toBe(true);
    expect(duplicate.ok).toBe(false);
    expect(canStartBulkSend("sent", false).ok).toBe(false);
  });

  it("re-checks consent at send time and skips unsubscribed people", () => {
    const rows = [
      { id: "ok", status: "pending", consented: true },
      { id: "later-unsub", status: "pending", consented: false },
      { id: "already", status: "sent", consented: true },
    ];
    const result = skipUnconsentedAtSendTime(rows);
    expect(result.toSend.map((row) => row.id)).toEqual(["ok"]);
    expect(result.skipped.map((row) => row.id)).toEqual(["later-unsub"]);
    expect(recipientsForScheduledDelivery(rows).map((row) => row.id)).toEqual(["ok"]);
  });
});

describe("campaign analytics", () => {
  it("counts overview rates, language split, filters, and top links", () => {
    const rows = [
      { name: "Gerly", email: "gerly@example.com", language: "et", status: "sent", openedAt: "t", clickedAt: "t", unsubscribed: false },
      { name: "Kush", email: "kush@example.com", language: "en", status: "sent", openedAt: "t", clickedAt: null, unsubscribed: false },
      { name: "Out", email: "out@example.com", language: "en", status: "failed", openedAt: null, clickedAt: null, unsubscribed: true },
      { name: "Wait", email: "wait@example.com", language: "et", status: "pending", openedAt: null, clickedAt: null, unsubscribed: false },
    ];
    const stats = campaignOverviewStats(rows);
    expect(stats).toMatchObject({
      recipients: 4,
      sent: 2,
      opened: 2,
      clicked: 1,
      failed: 1,
      unsubscribed: 1,
      english: 2,
      estonian: 2,
      openRate: 100,
      clickRate: 50,
    });
    expect(filterCampaignRecipients(rows, "kush", "all").map((row) => row.email)).toEqual(["kush@example.com"]);
    expect(filterCampaignRecipients(rows, "", "et")).toHaveLength(2);
    expect(filterCampaignRecipients(rows, "", "opened")).toHaveLength(2);
    expect(filterCampaignRecipients(rows, "", "clicked")).toHaveLength(1);
    expect(filterCampaignRecipients(rows, "", "failed")).toHaveLength(1);
    expect(
      topClickedLinks(
        [
          { linkKey: "event_13_sep", recipientId: "r1" },
          { linkKey: "event_13_sep", recipientId: "r1" },
          { linkKey: "sponsor_petcity", recipientId: "r2" },
        ],
        [
          { key: "event_13_sep", type: "event", label: "13 September event" },
          { key: "sponsor_petcity", type: "sponsor", label: "PetCity" },
        ],
      ),
    ).toEqual([
      { link: "event_13_sep", type: "Event", label: "13 September event", clicks: 2, uniqueClicks: 1 },
      { link: "sponsor_petcity", type: "Sponsor", label: "PetCity", clicks: 1, uniqueClicks: 1 },
    ]);
  });
});
