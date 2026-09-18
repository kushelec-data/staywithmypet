import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { campaignLanguageLabel, isCampaignContentLocked, nextCampaignVersion } from "@/lib/email-campaigns/versioning";
import {
  bilingualCampaignDisplayName,
  campaignLanguageModeFromRecord,
  campaignRecipientSummary,
  englishOnlyCampaignNotice,
  formatSendCompletedMessage,
  parseSendLanguageMode,
  recipientSendRouting,
  resolveRecipientSendLanguage,
  resolveSendLanguage,
  sendActionLabel,
  showCampaignEstonianPreview,
} from "@/lib/email-campaigns/send-language";
import { parseCampaignCsv, mapCampaignCsvLanguage } from "@/lib/email-campaigns/csv-import";
import { resolveDuplicateRecipientImport } from "@/lib/email-campaigns/recipient-upsert";
import { campaignBatchConfig, chunkIds } from "@/lib/email-campaigns/batch-config";
import {
  anotherAdminHoldsLease,
  canStartBulkSend,
  deriveBulkCampaignStatus,
  progressFromRecipientRows,
  runSequentialSends,
  selectSendableRecipientIds,
} from "@/lib/email-campaigns/send-queue";
import { bulkSendConsentGate, canDeliverCampaignRecipient, classifyCampaignRecipientDelivery, filterDeliverableCampaignRecipients, filterMarketingEligible, hasMarketingEmailConsent } from "@/lib/email-campaigns/marketing-consent";
import { campaignEligibilityBreakdown, campaignEligibilityLines } from "@/lib/email-campaigns/consent-summary";
import { htmlHasExpectedLanguageMarkers, planRecipientSend, selectCampaignContent } from "@/lib/email-campaigns/locale";
import { clickTrackingUrl, openTrackingUrl, personalizeCampaignHtml, unsubscribeUrl } from "@/lib/email-campaigns/personalize";
import { jsonLooksLikeSecretDump } from "@/lib/email-campaigns/dto";
import { LIVING_WELL_20_SEP_EN_SUBJECT, LIVING_WELL_20_SEP_EN_TEMPLATE_KEY, CAMPAIGN_TRACKED_LINKS } from "@/lib/email-campaigns/events";
import { createOpaqueToken, trackingUrlContainsIdentityLeak } from "@/lib/email-campaigns/tokens";
import { defaultSeptemberBodies } from "@/lib/email-campaigns/html";

describe("send language mode", () => {
  it("routes Gerly/Triin to ET and Kush/Umut to EN from saved recipient rows, ignoring preview language", () => {
    const previewLanguage = "et";
    void previewLanguage;
    expect(parseSendLanguageMode(previewLanguage)).toBe("et");
    expect(resolveSendLanguage("automatic", "et")).toBe("et");
    expect(resolveSendLanguage("automatic", "en")).toBe("en");
    expect(bilingualCampaignDisplayName("September community events (Estonian)")).toBe("September community events");
    expect(sendActionLabel("test", "automatic")).toBe("Send test — mixed EN/ET");

    const fields = {
      subjectEn: "EN subject",
      subjectEt: "ET subject",
      htmlEn: "<p>VIEW EVENT</p>",
      htmlEt: "<p>VAATA SÜNDMUST</p>",
    };
    const savedRows = [
      { name: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "et" },
      { name: "Triin Hook", email: "triin@example.com", language: "et" },
      { name: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" },
      { name: "Umut Vedat", email: "umut@example.com", language: "en" },
    ];
    const routing = recipientSendRouting(savedRows, "automatic");
    expect(routing.map((row) => `${row.name} -> ${row.sendLabel}`)).toEqual([
      "Gerly Kullamaa -> Estonian",
      "Triin Hook -> Estonian",
      "Kush Chadha -> English",
      "Umut Vedat -> English",
    ]);
    const keys = CAMPAIGN_TRACKED_LINKS.map((link) => link.key);
    const smtp = savedRows.map((row) => {
      const language = resolveSendLanguage("automatic", row.language);
      const selected = selectCampaignContent(language, fields);
      const plan = planRecipientSend({
        email: row.email,
        language,
        ...fields,
        linkKeys: keys,
        destinationsOk: true,
      });
      return { email: row.email, subject: plan.subject, html: selected.html, template: plan.template, previewLanguage };
    });
    expect(smtp).toEqual([
      { email: "gerlykullamaa@gmail.com", subject: "ET subject", html: fields.htmlEt, template: "ET", previewLanguage: "et" },
      { email: "triin@example.com", subject: "ET subject", html: fields.htmlEt, template: "ET", previewLanguage: "et" },
      { email: "kusheducation@gmail.com", subject: "EN subject", html: fields.htmlEn, template: "EN", previewLanguage: "et" },
      { email: "umut@example.com", subject: "EN subject", html: fields.htmlEn, template: "EN", previewLanguage: "et" },
    ]);
    expect(formatSendCompletedMessage("test", { sent: 4, failed: 0, sentEstonian: 2, sentEnglish: 2 })).toBe(
      "4 emails sent successfully",
    );
    expect(formatSendCompletedMessage("test", { sent: 0, failed: 0 })).toBe("No eligible recipients were found");
    expect(formatSendCompletedMessage("test", { sent: 0, failed: 2, failures: [{ email: "a@b.com", reason: "template_mismatch" }] })).toBe(
      "No emails were sent\na@b.com: template_mismatch",
    );
    expect(formatSendCompletedMessage("test", { sent: 1, failed: 1 })).toBe("1 sent · 1 failed");
    expect(formatSendCompletedMessage("test", { sent: 0, failed: 1, failures: [{ reason: "SMTP_PASSWORD=secret" }] })).not.toContain("secret");
    expect(formatSendCompletedMessage("test", { sent: 0, failed: 1 })).not.toContain("Email sent successfully");
    expect(recipientSendRouting(savedRows, "en").every((row) => row.sendLanguage === "en")).toBe(true);
    expect(recipientSendRouting(savedRows, "et").every((row) => row.sendLanguage === "et")).toBe(true);
  });
});

describe("english_only campaign language mode", () => {
  const fields = {
    subjectEn: LIVING_WELL_20_SEP_EN_SUBJECT,
    subjectEt: LIVING_WELL_20_SEP_EN_SUBJECT,
    htmlEn: "<p>SEE EVENT &amp; JOIN US →</p>",
    htmlEt: "<p>SEE EVENT &amp; JOIN US →</p>",
  };

  it("sends English HTML to EN and ET recipients without changing stored language", () => {
    const gerlyStored = "et";
    const kushStored = "en";
    const gerlySend = resolveRecipientSendLanguage({
      campaignLanguageMode: "english_only",
      sendLanguageMode: "automatic",
      recipientLanguage: gerlyStored,
    });
    const kushSend = resolveRecipientSendLanguage({
      campaignLanguageMode: "english_only",
      sendLanguageMode: "automatic",
      recipientLanguage: kushStored,
    });
    expect(gerlySend).toBe("en");
    expect(kushSend).toBe("en");
    expect(gerlyStored).toBe("et");
    expect(kushStored).toBe("en");
    expect(selectCampaignContent(gerlySend, fields)).toMatchObject({
      language: "en",
      subject: LIVING_WELL_20_SEP_EN_SUBJECT,
      html: fields.htmlEn,
      template: "EN",
    });
    expect(selectCampaignContent(kushSend, fields).html).toBe(fields.htmlEn);
    const routing = recipientSendRouting(
      [
        { name: "Gerly", email: "gerly@example.com", language: "et" },
        { name: "Kush", email: "kush@example.com", language: "en" },
      ],
      "automatic",
      "english_only",
    );
    expect(routing.every((row) => row.sendLanguage === "en")).toBe(true);
    expect(routing.find((row) => row.email === "gerly@example.com")?.storedLanguage).toBe("et");
    expect(campaignLanguageModeFromRecord({ templateKey: LIVING_WELL_20_SEP_EN_TEMPLATE_KEY })).toBe("english_only");
    expect(campaignLanguageModeFromRecord({ languageMode: "automatic", templateKey: "september_community_events" })).toBe(
      "automatic",
    );
    expect(campaignRecipientSummary(2, "english_only")).toBe("2 recipients · English email");
    expect(htmlHasExpectedLanguageMarkers(fields.htmlEn, "en")).toBe(true);
    expect(englishOnlyCampaignNotice()).toBe("This campaign will be sent in English to all eligible recipients.");
    expect(showCampaignEstonianPreview("english_only")).toBe(false);
    expect(showCampaignEstonianPreview("automatic")).toBe(true);
  });

  it("sends English to an EN CSV recipient on english_only campaigns", () => {
    expect(
      resolveRecipientSendLanguage({
        campaignLanguageMode: "english_only",
        sendLanguageMode: "automatic",
        recipientLanguage: "en",
      }),
    ).toBe("en");
    expect(selectCampaignContent("en", fields).html).toBe(fields.htmlEn);
  });

  it("sends English to an ET CSV recipient on english_only campaigns", () => {
    expect(
      resolveRecipientSendLanguage({
        campaignLanguageMode: "english_only",
        sendLanguageMode: "automatic",
        recipientLanguage: "et",
      }),
    ).toBe("en");
    expect(selectCampaignContent("en", fields).html).toBe(fields.htmlEn);
    expect(selectCampaignContent("en", fields).html).not.toBeUndefined();
  });

  it("keeps bilingual campaigns on automatic EN/ET routing", () => {
    expect(resolveRecipientSendLanguage({ campaignLanguageMode: "automatic", sendLanguageMode: "automatic", recipientLanguage: "et" })).toBe(
      "et",
    );
    expect(resolveRecipientSendLanguage({ campaignLanguageMode: "automatic", sendLanguageMode: "automatic", recipientLanguage: "en" })).toBe(
      "en",
    );
    const bilingual = {
      subjectEn: "EN subject",
      subjectEt: "ET subject",
      htmlEn: "<p>VIEW EVENT</p>",
      htmlEt: "<p>VAATA SÜNDMUST</p>",
    };
    expect(selectCampaignContent("et", bilingual).template).toBe("ET");
    expect(selectCampaignContent("en", bilingual).template).toBe("EN");
  });
});

describe("CSV import", () => {
  it("maps Gerly Estonian / Kush English CSV into ET vs EN SMTP content", () => {
    const parsed = parseCampaignCsv(`Gerly,Kullamaa,gerlykullamaa@gmail.com,Estonian
Kush,Chadha,kusheducation@gmail.com,English`);
    expect(parsed.recipients).toEqual([
      { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "et" },
      { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" },
    ]);
    const fields = {
      subjectEn: "EN subject",
      subjectEt: "ET subject",
      htmlEn: "<p>VIEW EVENT</p>",
      htmlEt: "<p>VAATA SÜNDMUST</p>",
    };
    const keys = CAMPAIGN_TRACKED_LINKS.map((link) => link.key);
    const gerly = planRecipientSend({
      email: parsed.recipients[0].email,
      language: parsed.recipients[0].language,
      ...fields,
      linkKeys: keys,
      destinationsOk: true,
    });
    const kush = planRecipientSend({
      email: parsed.recipients[1].email,
      language: parsed.recipients[1].language,
      ...fields,
      linkKeys: keys,
      destinationsOk: true,
    });
    expect(selectCampaignContent(parsed.recipients[0].language, fields)).toMatchObject({
      template: "ET",
      subject: "ET subject",
      html: fields.htmlEt,
    });
    expect(selectCampaignContent(parsed.recipients[1].language, fields)).toMatchObject({
      template: "EN",
      subject: "EN subject",
      html: fields.htmlEn,
    });
    expect(gerly).toMatchObject({ language: "et", subject: "ET subject", template: "ET" });
    expect(kush).toMatchObject({ language: "en", subject: "EN subject", template: "EN" });
  });

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

  it("updates language on an existing unsent duplicate instead of keeping EN", () => {
    expect(resolveDuplicateRecipientImport(null)).toBe("insert");
    expect(resolveDuplicateRecipientImport({ status: "pending" })).toBe("update_language");
    expect(resolveDuplicateRecipientImport({ status: "failed" })).toBe("update_language");
    expect(resolveDuplicateRecipientImport({ status: "sent" })).toBe("skip_sent");
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
    expect(canStartBulkSend("sent", false).ok).toBe(false);
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
    expect(etPlan.sponsorTokens).toBe(7);
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

describe("CSV campaign recipient eligibility", () => {
  it("allows a CSV recipient without a newsletter_subscribers row", () => {
    const classified = classifyCampaignRecipientDelivery("csv-only@example.com", {
      newsletterSubscribed: false,
      unsubscribed: false,
    });
    expect(classified.missingNewsletter).toBe(true);
    expect(classified.canDeliver).toBe(true);
    expect(classified.blockReason).toBeNull();
    expect(canDeliverCampaignRecipient("csv-only@example.com", { newsletterSubscribed: false, unsubscribed: false })).toBe(true);
    expect(hasMarketingEmailConsent({ email: "csv-only@example.com", newsletterSubscribed: false, unsubscribed: false })).toBe(
      false,
    );
  });

  it("blocks a CSV recipient with an explicit unsubscribe", () => {
    const classified = classifyCampaignRecipientDelivery("out@example.com", {
      newsletterSubscribed: true,
      unsubscribed: true,
    });
    expect(classified.canDeliver).toBe(false);
    expect(classified.blockReason).toBe("unsubscribed");
  });

  it("always blocks explicit unsubscribe, even without a newsletter row", () => {
    expect(
      canDeliverCampaignRecipient("always-out@example.com", { newsletterSubscribed: false, unsubscribed: true }),
    ).toBe(false);
    expect(
      canDeliverCampaignRecipient("always-out@example.com", { newsletterSubscribed: true, unsubscribed: true, suppressed: false }),
    ).toBe(false);
    expect(
      classifyCampaignRecipientDelivery("suppressed@example.com", {
        newsletterSubscribed: false,
        unsubscribed: false,
        suppressed: true,
      }).blockReason,
    ).toBe("suppressed");
  });

  it("does not group missing newsletter signup with unsubscribed", () => {
    const rows = [
      { email: "ok@example.com" },
      { email: "missing-news@example.com" },
      { email: "out@example.com" },
    ];
    const consent = new Map([
      ["ok@example.com", { newsletterSubscribed: true, unsubscribed: false }],
      ["missing-news@example.com", { newsletterSubscribed: false, unsubscribed: false }],
      ["out@example.com", { newsletterSubscribed: true, unsubscribed: true }],
    ]);
    const registered = filterMarketingEligible(rows, consent);
    expect(registered.eligible.map((row) => row.email)).toEqual(["ok@example.com"]);
    const csv = filterDeliverableCampaignRecipients(rows, consent);
    expect(csv.eligible.map((row) => row.email)).toEqual(["ok@example.com", "missing-news@example.com"]);
    expect(csv.excluded.map((row) => row.email)).toEqual(["out@example.com"]);
    expect(bulkSendConsentGate([{ email: "ok@example.com", consented: true }]).allowed).toBe(true);
    expect(bulkSendConsentGate([]).allowed).toBe(true);
  });

  it("reports correct eligibility counts for a 138-person CSV campaign", () => {
    const rows = Array.from({ length: 138 }, (_, index) => ({
      email: index === 0 ? "unsubscribed@example.com" : `person${index}@example.com`,
      status: "pending",
      newsletterSubscribed: index === 1,
      unsubscribed: index === 0,
      suppressed: false,
    }));
    const counts = campaignEligibilityBreakdown(rows);
    expect(campaignEligibilityLines(counts)).toEqual([
      "CSV recipients: 138",
      "Explicitly unsubscribed: 1",
      "Suppressed/opted out: 0",
      "Invalid: 0",
      "Duplicates: 0",
      "Eligible to send: 137",
    ]);
    expect(counts.warning).toBe("1 explicitly unsubscribed. These recipients will not be emailed.");
    expect(counts.warning).not.toContain("not subscribed to marketing emails");
    const withDupes = campaignEligibilityBreakdown([
      { email: "a@example.com", status: "pending", unsubscribed: false },
      { email: "A@example.com", status: "pending", unsubscribed: false },
      { email: "bad", status: "pending", unsubscribed: false },
      { email: "suppressed@example.com", status: "pending", suppressed: true },
      { email: "out@example.com", status: "pending", unsubscribed: true },
    ]);
    expect(withDupes).toMatchObject({
      csvRecipients: 5,
      duplicates: 1,
      invalid: 1,
      suppressed: 1,
      explicitlyUnsubscribed: 1,
      eligible: 1,
    });
  });

  it("never writes newsletter or unsubscribe records during CSV import or send", () => {
    const files = [
      "src/lib/email-campaigns/csv-import.ts",
      "src/lib/email-campaigns/send.ts",
      "src/app/api/admin/email-campaigns/[campaignId]/recipients/route.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(join(process.cwd(), relative), "utf8");
      expect(source).not.toMatch(/newsletter_subscribers/);
      expect(source).not.toMatch(/email_marketing_unsubscribes/);
    }
    const storeBulk = readFileSync(join(process.cwd(), "src/lib/email-campaigns/store-bulk.ts"), "utf8");
    const addRecipientsFn = storeBulk.slice(
      storeBulk.indexOf("export async function addRecipientsToExistingCampaign"),
      storeBulk.indexOf("export async function removeDraftRecipient"),
    );
    expect(addRecipientsFn).not.toMatch(/newsletter_subscribers/);
    expect(addRecipientsFn).not.toMatch(/email_marketing_unsubscribes/);
    expect(storeBulk).toMatch(/from\("newsletter_subscribers"\)\.select\("email"\)/);
    expect(storeBulk).not.toMatch(/from\("newsletter_subscribers"\)\.(insert|upsert|update|delete)/);
    const send = readFileSync(join(process.cwd(), "src/lib/email-campaigns/send.ts"), "utf8");
    expect(send.lastIndexOf("await classifyRecipientForDelivery")).toBeLessThan(send.indexOf("sendCampaignSmtpEmail({"));
    expect(send.split("classifyRecipientForDelivery(").length - 1).toBeGreaterThanOrEqual(3);
    expect(send).toContain('html.includes("swmp.invalid")');
    expect(send).toContain("unsubscribeToken");
  });

  it("hides Preview Estonian and uses English-only copy on the campaign screen", () => {
    const source = readFileSync(join(process.cwd(), "src/components/admin/EmailCampaignDetailClient.tsx"), "utf8");
    expect(source).toContain("showCampaignEstonianPreview(languageMode)");
    expect(source).toContain("englishOnlyCampaignNotice()");
    expect(source).toContain("campaignEligibilityLines(consent)");
    expect(source).not.toContain("Eligible recipients:");
    expect(source).not.toContain("Blocked recipients:");
    expect(source).not.toContain("not subscribed to marketing emails or have unsubscribed");
    expect(source).toMatch(/englishOnly\s*\?[\s\S]*englishOnlyCampaignNotice\(\)[\s\S]*Each person still receives their CSV language/);
  });
});

describe("client payload safety", () => {
  it("does not treat normal progress JSON as an SMTP secret dump", () => {
    expect(jsonLooksLikeSecretDump({ sent: 1, failed: 0, from: "Stay With My Pet <info@staywithmypet.ee>" })).toBe(false);
    expect(jsonLooksLikeSecretDump({ SMTP_PASSWORD: "secret" })).toBe(true);
  });
});

describe("campaign versions", () => {
  it("freezes sent content and increments versions", () => {
    expect(isCampaignContentLocked("draft")).toBe(false);
    expect(isCampaignContentLocked("sent")).toBe(true);
    expect(isCampaignContentLocked("test_sent")).toBe(true);
    expect(isCampaignContentLocked("scheduled")).toBe(true);
    expect(nextCampaignVersion([1])).toBe(2);
    expect(campaignLanguageLabel({ subjectEn: "EN", subjectEt: "ET" })).toBe("EN + ET");
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
