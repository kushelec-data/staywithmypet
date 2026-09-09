import { describe, expect, it } from "vitest";
import { parseCampaignCsv, mapCampaignCsvLanguage } from "@/lib/email-campaigns/csv-import";
import { campaignBatchConfig, chunkIds } from "@/lib/email-campaigns/batch-config";
import {
  anotherAdminHoldsLease,
  canStartBulkSend,
  deriveBulkCampaignStatus,
  progressFromRecipientRows,
  runSequentialSends,
  selectSendableRecipientIds,
} from "@/lib/email-campaigns/send-queue";
import { bulkSendConsentGate, filterMarketingEligible, hasMarketingEmailConsent } from "@/lib/email-campaigns/marketing-consent";
import { planRecipientSend, selectCampaignContent } from "@/lib/email-campaigns/locale";
import { clickTrackingUrl, openTrackingUrl, personalizeCampaignHtml, unsubscribeUrl } from "@/lib/email-campaigns/personalize";
import { jsonLooksLikeSecretDump } from "@/lib/email-campaigns/dto";
import { CAMPAIGN_TRACKED_LINKS } from "@/lib/email-campaigns/events";
import { createOpaqueToken, trackingUrlContainsIdentityLeak } from "@/lib/email-campaigns/tokens";
import { defaultSeptemberBodies } from "@/lib/email-campaigns/html";

describe("CSV import", () => {
  it("maps languages, trims, lowercases, rejects invalid, and removes duplicates", () => {
    expect(mapCampaignCsvLanguage("Estonian")).toBe("et");
    expect(mapCampaignCsvLanguage("English")).toBe("en");
    expect(mapCampaignCsvLanguage("et")).toBe("et");
    const parsed = parseCampaignCsv(`First Name,Last Name,E-mail address,Keel
Kush,Chadha,kusheducation@gmail.com,Estonian
Gerly,Kullamaa,gerlykullamaa@gmail.com,Estonian
John,Smith,john@example.com,English
John,Smith,JOHN@example.com,English
Nope,Bad,not-an-email,English
`);
    expect(parsed.recipients).toHaveLength(3);
    expect(parsed.estonian).toBe(2);
    expect(parsed.english).toBe(1);
    expect(parsed.invalid).toHaveLength(1);
    expect(parsed.duplicatesRemoved).toBe(1);
    expect(parsed.recipients.map((row) => row.email)).toEqual([
      "kusheducation@gmail.com",
      "gerlykullamaa@gmail.com",
      "john@example.com",
    ]);
  });
});

describe("batch processing", () => {
  it("chunks with env defaults", () => {
    expect(campaignBatchConfig({}).size).toBe(10);
    expect(campaignBatchConfig({}).delayMs).toBe(80_000);
    expect(campaignBatchConfig({ EMAIL_CAMPAIGN_BATCH_SIZE: "10", EMAIL_CAMPAIGN_BATCH_DELAY_MS: "80000" })).toEqual({
      size: 10,
      delayMs: 80_000,
    });
    expect(chunkIds(["a", "b", "c", "d"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("continues after one failure", async () => {
    const outcomes = await runSequentialSends(["1", "2", "3"], async (id) => (id === "2" ? "failed" : "sent"));
    expect(outcomes).toEqual({ sent: 2, failed: 1, skipped: 0 });
  });
});

describe("resume and retry", () => {
  const rows = [
    { id: "a", status: "sent" },
    { id: "b", status: "pending" },
    { id: "c", status: "failed" },
    { id: "d", status: "sending" },
  ];

  it("never selects already-sent recipients", () => {
    expect(selectSendableRecipientIds(rows, "pending")).toEqual(["b"]);
    expect(selectSendableRecipientIds(rows, "resume")).toEqual(["b", "c", "d"]);
    expect(selectSendableRecipientIds(rows, "failed")).toEqual(["c"]);
    expect(selectSendableRecipientIds(rows, "resume")).not.toContain("a");
  });
});

describe("simultaneous send protection", () => {
  it("blocks a second admin while a lease is active", () => {
    const lock = {
      status: "sending",
      leaseId: "lease-1",
      leaseUntil: "2099-01-01T00:00:00.000Z",
      nowIso: "2026-09-09T00:00:00.000Z",
    };
    expect(anotherAdminHoldsLease(lock, "lease-2")).toBe(true);
    expect(canStartBulkSend("sending", true).ok).toBe(false);
    expect(canStartBulkSend("draft", false).ok).toBe(true);
  });
});

describe("campaign status", () => {
  it("does not mark sent while pending remain", () => {
    expect(
      deriveBulkCampaignStatus({ pending: 40, sending: 0, sent: 32, failed: 0, leaseActive: false }),
    ).toBe("partially_sent");
    expect(deriveBulkCampaignStatus({ pending: 0, sending: 0, sent: 70, failed: 2, leaseActive: false })).toBe("sent");
    expect(deriveBulkCampaignStatus({ pending: 0, sending: 0, sent: 0, failed: 3, leaseActive: false })).toBe("failed");
  });
});

describe("language via selectCampaignContent", () => {
  it("ET recipient receives ET content and EN receives EN", () => {
    const fields = {
      subjectEn: "English subject",
      subjectEt: "Estonian subject",
      htmlEn: "<p>VIEW EVENT</p>",
      htmlEt: "<p>VAATA SÜNDMUST</p>",
    };
    expect(selectCampaignContent("et", fields).template).toBe("ET");
    expect(selectCampaignContent("et-EE", fields).subject).toBe("Estonian subject");
    expect(selectCampaignContent("en", fields).template).toBe("EN");
    expect(selectCampaignContent("unknown", fields).template).toBe("EN");
    const etPlan = planRecipientSend({
      email: "gerly@example.com",
      language: "et",
      ...fields,
      linkKeys: CAMPAIGN_TRACKED_LINKS.map((link) => link.key),
      destinationsOk: true,
    });
    expect(etPlan.template).toBe("ET");
    expect(etPlan.eventTokens).toBe(3);
    expect(etPlan.sponsorTokens).toBe(6);
  });
});

describe("tracking tokens", () => {
  it("keeps recipient-specific opaque tracking URLs on the production origin", () => {
    const { htmlEn, htmlEt } = defaultSeptemberBodies("https://www.staywithmypet.ee/logo.png");
    const openA = createOpaqueToken();
    const openB = createOpaqueToken();
    const clicksA = Object.fromEntries(CAMPAIGN_TRACKED_LINKS.map((link) => [link.key, createOpaqueToken()]));
    const clicksB = Object.fromEntries(CAMPAIGN_TRACKED_LINKS.map((link) => [link.key, createOpaqueToken()]));
    const unsub = createOpaqueToken();
    const htmlA = personalizeCampaignHtml({
      htmlEn,
      htmlEt,
      language: "et",
      openToken: openA,
      clickTokens: clicksA,
      origin: "https://www.staywithmypet.ee",
      unsubscribeToken: unsub,
    }).html;
    const htmlB = personalizeCampaignHtml({
      htmlEn,
      htmlEt,
      language: "en",
      openToken: openB,
      clickTokens: clicksB,
      origin: "https://www.staywithmypet.ee",
      unsubscribeToken: createOpaqueToken(),
    }).html;
    expect(htmlA).toContain(openTrackingUrl(openA));
    expect(htmlA).not.toContain(openTrackingUrl(openB));
    expect(htmlA).toContain(unsubscribeUrl(unsub));
    expect(htmlA).toContain("VAATA SÜNDMUST");
    expect(htmlB).toContain("VIEW EVENT");
    expect(clickTrackingUrl(clicksA.event_13_sep)).toContain("https://www.staywithmypet.ee/api/email/track/click/");
    expect(trackingUrlContainsIdentityLeak(htmlA, "gerly@example.com", "user-uuid")).toBe(false);
    expect(htmlA).not.toContain("user-uuid");
  });
});

describe("marketing opt-out", () => {
  it("excludes unsubscribed and non-newsletter emails from bulk send", () => {
    const rows = [
      { email: "ok@example.com" },
      { email: "nope@example.com" },
      { email: "out@example.com" },
    ];
    const consent = new Map([
      ["ok@example.com", { newsletterSubscribed: true, unsubscribed: false }],
      ["nope@example.com", { newsletterSubscribed: false, unsubscribed: false }],
      ["out@example.com", { newsletterSubscribed: true, unsubscribed: true }],
    ]);
    const filtered = filterMarketingEligible(rows, consent);
    expect(filtered.eligible.map((row) => row.email)).toEqual(["ok@example.com"]);
    expect(hasMarketingEmailConsent({ email: "ok@example.com", newsletterSubscribed: true, unsubscribed: false })).toBe(true);
    expect(bulkSendConsentGate([{ email: "ok@example.com", consented: true }]).allowed).toBe(true);
    expect(bulkSendConsentGate([{ email: "nope@example.com", consented: false }]).allowed).toBe(false);
  });
});

describe("client payload safety", () => {
  it("does not treat normal progress JSON as an SMTP secret dump", () => {
    expect(jsonLooksLikeSecretDump({ sent: 1, failed: 0, from: "Stay With My Pet <info@staywithmypet.ee>" })).toBe(false);
    expect(jsonLooksLikeSecretDump({ SMTP_PASSWORD: "secret" })).toBe(true);
  });
});

describe("progress summary", () => {
  it("counts processed vs remaining", () => {
    const progress = progressFromRecipientRows([
      { language: "et", status: "sent" },
      { language: "en", status: "failed" },
      { language: "et", status: "pending" },
    ]);
    expect(progress.processed).toBe(2);
    expect(progress.remaining).toBe(1);
    expect(progress.estonian).toBe(2);
    expect(progress.english).toBe(1);
  });
});
