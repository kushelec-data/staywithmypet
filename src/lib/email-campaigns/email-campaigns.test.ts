import { describe, expect, it } from "vitest";
import { campaignLanguageFromPreferredLocale, eventButtonLabel, planRecipientSend, selectCampaignContent } from "@/lib/email-campaigns/locale";
import {
  CAMPAIGN_TRACKED_LINKS,
  DEFAULT_TEST_RECIPIENTS,
  destinationForLinkKey,
  ESTONIAN_TEST_RECIPIENTS,
  EVENT_13_SEP_URL,
  EVENT_20_SEP_URL,
  EVENT_27_SEP_URL,
  SEPTEMBER_EVENT_LINKS,
  SEPTEMBER_SPONSOR_LINKS,
  UNLINKED_SPONSORS,
} from "@/lib/email-campaigns/events";
import { clickRedirectFromTokenRow, clickTokensMatchCatalog } from "@/lib/email-campaigns/destinations";
import {
  applyTrackingToHtml,
  clickPlaceholder,
  campaignBodyTextToHtml,
  defaultSeptemberBodies,
  hrefsInHtml,
  OPEN_PIXEL_PLACEHOLDER,
  renderSeptemberCampaignHtml,
} from "@/lib/email-campaigns/html";
import { personalizeCampaignHtml, clickTrackingUrl, openTrackingUrl } from "@/lib/email-campaigns/personalize";
import {
  isEphemeralOrLocalEmailOrigin,
  requireCampaignEmailOrigin,
  resolveCampaignEmailOrigin,
} from "@/lib/email-campaigns/public-base";
import { applyOpenTracking, applyClickTracking, sendOutcomeUpdate, summarizeCampaignRecipients } from "@/lib/email-campaigns/tracking";
import { mergeSeptemberTemplateConfig } from "@/lib/email-campaigns/template-config";
import { trackingUrlContainsIdentityLeak, createOpaqueToken, isOpaqueTokenShape } from "@/lib/email-campaigns/tokens";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { toRecipientDto } from "@/lib/email-campaigns/dto";

describe("campaign language", () => {
  it("selects Estonian only for et locales", () => {
    expect(campaignLanguageFromPreferredLocale("et")).toBe("et");
    expect(campaignLanguageFromPreferredLocale("et-EE")).toBe("et");
    expect(campaignLanguageFromPreferredLocale("en")).toBe("en");
    expect(campaignLanguageFromPreferredLocale("ru")).toBe("en");
    expect(campaignLanguageFromPreferredLocale(null)).toBe("en");
  });

  it("uses EN or ET button labels", () => {
    expect(eventButtonLabel("en")).toBe("VIEW EVENT →");
    expect(eventButtonLabel("et")).toBe("VAATA SÜNDMUST →");
  });

  it("selects ET subject and body for et and EN for everything else", () => {
    const fields = {
      subjectEn: "English subject",
      subjectEt: "Estonian subject",
      htmlEn: "<p>VIEW EVENT</p>",
      htmlEt: "<p>VAATA SÜNDMUST</p>",
    };
    expect(selectCampaignContent("et", fields)).toMatchObject({ language: "et", subject: "Estonian subject", template: "ET" });
    expect(selectCampaignContent("ET", fields).html).toContain("VAATA SÜNDMUST");
    expect(selectCampaignContent("en", fields)).toMatchObject({ language: "en", subject: "English subject", template: "EN" });
    expect(selectCampaignContent("ru", fields).template).toBe("EN");
    expect(selectCampaignContent(null, fields).template).toBe("EN");
  });

  it("uses the same selector for preview and SMTP personalization", () => {
    const { htmlEn, htmlEt } = defaultSeptemberBodies("https://www.staywithmypet.ee/logo.png");
    const fields = {
      subjectEn: "🐾 Join us for a relaxed and inspiring Sunday all about life with pets!",
      subjectEt: "🐾 Tule veeda üks mõnus ja sisukas pühapäev koos teiste loomasõpradega!",
      htmlEn,
      htmlEt,
    };
    const et = selectCampaignContent("et", fields);
    const personalized = personalizeCampaignHtml({
      htmlEn,
      htmlEt,
      language: "et",
      openToken: createOpaqueToken(),
      clickTokens: Object.fromEntries(CAMPAIGN_TRACKED_LINKS.map((link) => [link.key, createOpaqueToken()])),
      origin: "https://www.staywithmypet.ee",
    });
    expect(et.subject).toBe(fields.subjectEt);
    expect(personalized.language).toBe("et");
    expect(personalized.html).toContain("VAATA SÜNDMUST →");
    expect(personalized.html).not.toContain("VIEW EVENT");
    const en = personalizeCampaignHtml({
      htmlEn,
      htmlEt,
      language: "en",
      openToken: createOpaqueToken(),
      clickTokens: Object.fromEntries(CAMPAIGN_TRACKED_LINKS.map((link) => [link.key, createOpaqueToken()])),
      origin: "https://www.staywithmypet.ee",
    });
    expect(en.html).toContain("VIEW EVENT →");
    expect(en.html).not.toContain("VAATA SÜNDMUST");
  });

  it("plans an Estonian test send without calling SMTP", () => {
    const { htmlEn, htmlEt } = defaultSeptemberBodies("https://www.staywithmypet.ee/logo.png");
    const keys = CAMPAIGN_TRACKED_LINKS.map((link) => link.key);
    const gerly = planRecipientSend({
      email: "gerlykullamaa@gmail.com",
      language: "et",
      subjectEn: "EN subject",
      subjectEt: "ET subject",
      htmlEn,
      htmlEt,
      linkKeys: keys,
      destinationsOk: true,
    });
    const kush = planRecipientSend({
      email: "kusheducation@gmail.com",
      language: "et",
      subjectEn: "EN subject",
      subjectEt: "ET subject",
      htmlEn,
      htmlEt,
      linkKeys: keys,
      destinationsOk: true,
    });
    expect(gerly).toMatchObject({
      language: "et",
      subject: "ET subject",
      template: "ET",
      trackingBase: "https://www.staywithmypet.ee",
      eventTokens: 3,
      sponsorTokens: 7,
      smtpReady: true,
    });
    expect(kush).toMatchObject({
      language: "et",
      template: "ET",
      eventTokens: 3,
      sponsorTokens: 7,
    });
  });

  it("refuses an empty token set instead of treating it as a valid catalog match", () => {
    expect(clickTokensMatchCatalog([], CAMPAIGN_TRACKED_LINKS).ok).toBe(false);
  });
});

describe("september HTML", () => {
  const htmlEn = renderSeptemberCampaignHtml({
    language: "en",
    logoUrl: "https://staywithmypet.ee/logo.png",
    openPixelUrl: OPEN_PIXEL_PLACEHOLDER,
    clickHrefs: Object.fromEntries(SEPTEMBER_EVENT_LINKS.map((l) => [l.key, clickPlaceholder(l.key)])),
  });
  const htmlEt = renderSeptemberCampaignHtml({
    language: "et",
    logoUrl: "https://staywithmypet.ee/logo.png",
    openPixelUrl: OPEN_PIXEL_PLACEHOLDER,
    clickHrefs: Object.fromEntries(SEPTEMBER_EVENT_LINKS.map((l) => [l.key, clickPlaceholder(l.key)])),
  });

  it("uses Estonian language for the Estonian campaign recipients without changing English recipients", () => {
    expect(ESTONIAN_TEST_RECIPIENTS.map((row) => row.language)).toEqual(["et", "et"]);
    expect(DEFAULT_TEST_RECIPIENTS.map((row) => row.language)).toEqual(["en", "en"]);
  });

  it("preserves English wording and three VIEW EVENT buttons", () => {
    expect(htmlEn).toContain("This September, we’re bringing the Stay With My Pet community together");
    expect(htmlEn.match(/VIEW EVENT →/g)?.length).toBe(3);
    expect(htmlEn).not.toContain("VAATA SÜNDMUST");
  });

  it("preserves Estonian wording from Emails for users.docx and ET buttons", () => {
    expect(htmlEt).toContain("Septembris toome Stay With My Peti kogukonna esimest korda kokku ka päriselus.");
    expect(htmlEt).toContain("Korraldame restoranis Moon kolm tasuta kogukonnaüritust");
    expect(htmlEt).toContain("Vali endale sobiv sündmus:");
    expect(htmlEt).toContain("13. september – eesti keeles");
    expect(htmlEt).toContain("Hea elu koos lemmikuga");
    expect(htmlEt).toContain("11.30 kogunemine | 12.00–14.00 programm");
    expect(htmlEt).toContain("Living Well With Pets");
    expect(htmlEt).toContain("Счастливая жизнь с питомцем");
    expect(htmlEt).toContain("Lisaks loengutele ootab sind kohapeal veel nii mõndagi");
    expect(htmlEt).toContain("Kohtumiseni Moonis!");
    expect(htmlEt).toContain("Gerly &amp; Stay With My Peti tiim");
    expect(htmlEt).toContain("Tule veeda üks mõnus ja sisukas pühapäev koos teiste loomasõpradega!");
    expect(htmlEt).toContain("Tasuta loengud, praktilised teadmised ja mõnus seltskond – vali endale sobiv sündmus.");
    expect(htmlEt.match(/VAATA SÜNDMUST →/g)?.length).toBe(3);
    expect(htmlEt).not.toContain("VIEW EVENT");
  });

  it("does not print Facebook URLs in the email", () => {
    expect(htmlEn).not.toContain("fb.me");
    expect(htmlEt).not.toContain("fb.me");
    expect(htmlEn).not.toContain("facebook.com");
    expect(htmlEn).not.toContain("petcity.ee");
    expect(htmlEn).not.toContain("gelatoladies.ee");
    expect(htmlEn).not.toContain("restoranmoon.ee");
    expect(htmlEn).not.toContain("koeratoit.ee");
    expect(htmlEn).not.toContain("yook.eu");
    expect(htmlEn).not.toContain("semujuice.eu");
    expect(htmlEn).toContain(">PetCity</a>");
    expect(htmlEn).toContain(">Platinum</a>");
    expect(htmlEn).toContain(">ViWell</a>");
    expect(htmlEn).toContain(">Semu</a>");
    expect(htmlEn).toContain(">YOOK</a>");
    expect(htmlEn).toContain(">Gelato Ladies</a>");
    expect(htmlEn).toContain(">Moon</a>");
    expect(htmlEn).toContain("ViWell");
    expect(htmlEn).toContain("Semu");
    expect(htmlEn).toContain("PetCity");
    expect(htmlEn).toMatch(/PetCity[\s\S]*Platinum[\s\S]*ViWell[\s\S]*Semu[\s\S]*YOOK[\s\S]*Gelato Ladies[\s\S]*Moon/);
    expect(htmlEn).toContain("text-decoration:none;cursor:pointer;");
    expect(UNLINKED_SPONSORS).toEqual([]);
    expect(SEPTEMBER_SPONSOR_LINKS).toHaveLength(7);
    expect(SEPTEMBER_SPONSOR_LINKS.map((l) => l.label)).toEqual([
      "PetCity",
      "Platinum",
      "ViWell",
      "Semu",
      "YOOK",
      "Gelato Ladies",
      "Moon",
    ]);
    expect(CAMPAIGN_TRACKED_LINKS.filter((l) => l.type === "event")).toHaveLength(3);
    expect(CAMPAIGN_TRACKED_LINKS.filter((l) => l.type === "sponsor")).toHaveLength(7);
  });

  it("personalizes with tracking URLs and no identity leak", () => {
    const openToken = createOpaqueToken();
    const clickTokens = Object.fromEntries(CAMPAIGN_TRACKED_LINKS.map((l) => [l.key, createOpaqueToken()]));
    const { html } = personalizeCampaignHtml({
      htmlEn,
      htmlEt,
      language: "en",
      openToken,
      clickTokens,
      origin: "https://www.staywithmypet.ee",
    });
    const hrefs = hrefsInHtml(html);
    const buttonHrefs = hrefs.filter((href) => href.includes("/api/email/track/click/"));
    expect(buttonHrefs).toHaveLength(CAMPAIGN_TRACKED_LINKS.length);
    expect(html).toContain(`/api/email/track/open/${openToken}`);
    expect(html).not.toContain("fb.me");
    expect(html).not.toContain("facebook.com/events");
    expect(html).not.toContain("petcity.ee");
    expect(trackingUrlContainsIdentityLeak(html, "gerlykullamaa@gmail.com", "0979d7ef-8766-4a0c-847c-9825516a7360")).toBe(false);
    for (const href of buttonHrefs) {
      expect(href).toMatch(/^https:\/\/www\.staywithmypet\.ee\/api\/email\/track\/click\/[A-Za-z0-9_-]{40,64}$/);
    }
    const gerlyTokens = Object.fromEntries(CAMPAIGN_TRACKED_LINKS.map((l) => [l.key, createOpaqueToken()]));
    const kushTokens = Object.fromEntries(CAMPAIGN_TRACKED_LINKS.map((l) => [l.key, createOpaqueToken()]));
    for (const link of CAMPAIGN_TRACKED_LINKS) {
      expect(gerlyTokens[link.key]).not.toBe(kushTokens[link.key]);
    }
    expect(gerlyTokens.sponsor_petcity).not.toBe(gerlyTokens.event_13_sep);
    expect(gerlyTokens.sponsor_platinum).not.toBe(gerlyTokens.sponsor_yook);
  });
});

describe("tracking state", () => {
  it("keeps first_opened_at on duplicate opens", () => {
    const first = applyOpenTracking(
      {
        first_opened_at: null,
        last_opened_at: null,
        first_clicked_at: null,
        last_clicked_at: null,
        click_count: 0,
        last_clicked_link_key: null,
      },
      "2026-09-08T10:00:00.000Z",
    );
    const second = applyOpenTracking(
      { ...first, first_clicked_at: null, last_clicked_at: null, click_count: 0, last_clicked_link_key: null },
      "2026-09-08T11:00:00.000Z",
    );
    expect(second.first_opened_at).toBe("2026-09-08T10:00:00.000Z");
    expect(second.last_opened_at).toBe("2026-09-08T11:00:00.000Z");
  });

  it("records clicks and destination keys", () => {
    const after = applyClickTracking(
      {
        first_opened_at: null,
        last_opened_at: null,
        first_clicked_at: null,
        last_clicked_at: null,
        click_count: 0,
        last_clicked_link_key: null,
      },
      "2026-09-08T12:00:00.000Z",
      "event_20_sep",
    );
    expect(after.click_count).toBe(1);
    expect(after.last_clicked_link_key).toBe("event_20_sep");
    expect(destinationForLinkKey("event_13_sep")).toBe(EVENT_13_SEP_URL);
    expect(destinationForLinkKey("event_20_sep")).toBe(EVENT_20_SEP_URL);
    expect(destinationForLinkKey("event_27_sep")).toBe(EVENT_27_SEP_URL);
    expect(destinationForLinkKey("sponsor_petcity")).toBe("https://www.petcity.ee/");
    expect(destinationForLinkKey("sponsor_platinum")).toBe("https://www.koeratoit.ee/");
    expect(destinationForLinkKey("sponsor_yook")).toBe("https://yook.eu/");
    expect(destinationForLinkKey("sponsor_gelato_ladies")).toBe("https://www.gelatoladies.ee/");
    expect(destinationForLinkKey("sponsor_moon")).toBe("https://restoranmoon.ee/");
    expect(destinationForLinkKey("sponsor_viwell")).toBe("https://viwelldrinks.com/");
    expect(destinationForLinkKey("sponsor_semu")).toBe("https://semujuice.eu/en");
  });

  it("does not let recipient identity change click destinations", () => {
    const token1 = { destination_url: EVENT_13_SEP_URL, link_key: "event_13_sep" };
    const token2 = { destination_url: EVENT_20_SEP_URL, link_key: "event_20_sep" };
    const token3 = { destination_url: EVENT_27_SEP_URL, link_key: "event_27_sep" };
    const gerly = { email: "gerlykullamaa@gmail.com", user_id: "gerly-uuid", display_name: "Gerly Kullamaa" };
    const kush = { email: "kusheducation@gmail.com", user_id: "kush-uuid", display_name: "Kush Chadha" };
    expect(clickRedirectFromTokenRow(token1, gerly)).toBe(EVENT_13_SEP_URL);
    expect(clickRedirectFromTokenRow(token1, kush)).toBe(EVENT_13_SEP_URL);
    expect(clickRedirectFromTokenRow(token2, gerly)).toBe(EVENT_20_SEP_URL);
    expect(clickRedirectFromTokenRow(token3, gerly)).toBe(EVENT_27_SEP_URL);
    expect(clickRedirectFromTokenRow({ destination_url: "https://www.koeratoit.ee/", link_key: "sponsor_platinum" }, gerly)).toBe(
      "https://www.koeratoit.ee/",
    );
    expect(clickRedirectFromTokenRow({ destination_url: "https://yook.eu/", link_key: "sponsor_yook" }, kush)).toBe("https://yook.eu/");
    expect(clickRedirectFromTokenRow({ destination_url: "https://www.facebook.com/gerly.kullamaa", link_key: "event_13_sep" }, gerly)).toBeNull();
  });

  it("redirects each confirmed sponsor homepage from the stored token URL", () => {
    const destinations = [
      ["sponsor_petcity", "https://www.petcity.ee/"],
      ["sponsor_platinum", "https://www.koeratoit.ee/"],
      ["sponsor_viwell", "https://viwelldrinks.com/"],
      ["sponsor_semu", "https://semujuice.eu/en"],
      ["sponsor_yook", "https://yook.eu/"],
      ["sponsor_gelato_ladies", "https://www.gelatoladies.ee/"],
      ["sponsor_moon", "https://restoranmoon.ee/"],
    ] as const;
    for (const [key, url] of destinations) {
      expect(clickRedirectFromTokenRow({ destination_url: url, link_key: key }, null)).toBe(url);
    }
  });

  it("lets composer overlay change a sponsor URL without changing HTML placeholders", () => {
    const overlay = mergeSeptemberTemplateConfig({
      sponsors: [{ key: "sponsor_moon", label: "Moon", destinationUrl: "https://restoranmoon.ee/" }],
    });
    expect(overlay.sponsors.find((s) => s.key === "sponsor_semu")?.destinationUrl).toBe("https://semujuice.eu/en");
    expect(overlay.sponsors.find((s) => s.key === "sponsor_platinum")?.destinationUrl).toBe("https://www.koeratoit.ee/");
    const preserved = mergeSeptemberTemplateConfig({
      sponsors: [
        { key: "sponsor_semu", label: "Semu", destinationUrl: null },
      ],
    });
    expect(preserved.sponsors.find((s) => s.key === "sponsor_semu")?.destinationUrl).toBeNull();
  });

  it("validates each event token against the catalog before send", () => {
    const rows = CAMPAIGN_TRACKED_LINKS.map((link) => ({
      link_key: link.key,
      destination_url: link.destinationUrl,
      token: "t".repeat(43),
    }));
    expect(clickTokensMatchCatalog(rows).ok).toBe(true);
    const broken = rows.map((row) =>
      row.link_key === "event_13_sep" ? { ...row, destination_url: "https://www.facebook.com/gerly.kullamaa" } : row,
    );
    expect(clickTokensMatchCatalog(broken).ok).toBe(false);
  });

  it("records send failures without treating them as sent", () => {
    expect(sendOutcomeUpdate(false, "smtp_not_configured")).toEqual({
      status: "failed",
      failure_reason: "smtp_not_configured",
    });
    expect(sendOutcomeUpdate(true).status).toBe("sent");
  });

  it("summarizes sent/opened/clicked/failed", () => {
    expect(
      summarizeCampaignRecipients([
        { status: "sent", first_opened_at: "x", first_clicked_at: "y" },
        { status: "failed", first_opened_at: null, first_clicked_at: null },
        { status: "sent", first_opened_at: null, first_clicked_at: null },
      ]),
    ).toEqual({ recipients: 3, sent: 2, opened: 1, uniqueClicks: 1, failed: 1 });
  });
});

describe("tokens and from address", () => {
  it("creates opaque tokens", () => {
    const token = createOpaqueToken();
    expect(isOpaqueTokenShape(token)).toBe(true);
    expect(token).not.toContain("@");
  });

  it("uses Stay With My Pet from header", () => {
    expect(CAMPAIGN_FROM_HEADER).toBe("Stay With My Pet <info@staywithmypet.ee>");
  });

  it("does not put message bodies on recipient analytics dto", () => {
    const dto = toRecipientDto({
      id: "r1",
      display_name: "Gerly",
      email: "gerlykullamaa@gmail.com",
      language: "en",
      status: "sent",
      sent_at: "2026-09-08T10:00:00.000Z",
      first_opened_at: null,
      first_clicked_at: null,
      last_opened_at: null,
      last_clicked_at: null,
      last_clicked_link_key: null,
      failure_reason: null,
    });
    expect(JSON.stringify(dto)).not.toMatch(/<html|VIEW EVENT|smtp|password/i);
  });

  it("keeps placeholders until tracking is applied", () => {
    const { htmlEn } = defaultSeptemberBodies("https://staywithmypet.ee/logo.png");
    const tracked = applyTrackingToHtml(htmlEn, {
      openPixelUrl: "https://staywithmypet.ee/api/email/track/open/abc",
      clickUrls: { event_13_sep: "https://staywithmypet.ee/api/email/track/click/t1" },
    });
    expect(htmlEn).toContain(OPEN_PIXEL_PLACEHOLDER);
    expect(tracked).toContain("/api/email/track/open/abc");
  });

  it("turns written email body into paragraphs without requiring HTML", () => {
    const html = campaignBodyTextToHtml("Hello friends.\n\nSee you soon.");
    expect(html).toContain("Hello friends.");
    expect(html).toContain("See you soon.");
    expect(html).not.toContain("<script");
    const custom = renderSeptemberCampaignHtml({
      language: "en",
      logoUrl: "https://staywithmypet.ee/logo.png",
      openPixelUrl: OPEN_PIXEL_PLACEHOLDER,
      clickHrefs: {},
      bodyText: "Custom intro for our community.",
    });
    expect(custom).toContain("Custom intro for our community.");
    expect(custom).toContain("VIEW EVENT");
    expect(custom).toContain(">Semu</a>");
  });
});

describe("campaign email public base URL", () => {
  it("builds production tracking URLs on www.staywithmypet.ee", () => {
    const token = createOpaqueToken();
    expect(clickTrackingUrl(token)).toBe(`https://www.staywithmypet.ee/api/email/track/click/${token}`);
    expect(openTrackingUrl(token)).toBe(`https://www.staywithmypet.ee/api/email/track/open/${token}`);
    expect(clickTrackingUrl(token).startsWith("https://www.staywithmypet.ee/")).toBe(true);
    expect(openTrackingUrl(token).startsWith("https://www.staywithmypet.ee/")).toBe(true);
  });

  it("rejects preview Vercel domains for real sends", () => {
    expect(
      requireCampaignEmailOrigin({
        EMAIL_PUBLIC_BASE_URL: "https://staywithmypet-git-development-kushelec-datas-projects.vercel.app",
      }).ok,
    ).toBe(false);
    expect(isEphemeralOrLocalEmailOrigin("https://something.vercel.app")).toBe(true);
    expect(() => clickTrackingUrl("token", "https://something.vercel.app")).toThrow();
  });

  it("rejects localhost for real sends", () => {
    expect(requireCampaignEmailOrigin({ EMAIL_PUBLIC_BASE_URL: "http://localhost:3000" }).ok).toBe(false);
    expect(isEphemeralOrLocalEmailOrigin("http://localhost:3000")).toBe(true);
    expect(isEphemeralOrLocalEmailOrigin("https://www.staywithmypet.ee")).toBe(false);
  });

  it("ignores NEXT_PUBLIC_SITE_URL when it is a Vercel deployment", () => {
    const resolved = resolveCampaignEmailOrigin({
      NEXT_PUBLIC_SITE_URL: "https://staywithmypet-abc123.vercel.app",
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.origin).toBe("https://www.staywithmypet.ee");
  });
});
