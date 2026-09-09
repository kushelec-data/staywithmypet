import { describe, expect, it } from "vitest";
import { campaignLanguageFromPreferredLocale, eventButtonLabel } from "@/lib/email-campaigns/locale";
import {
  CAMPAIGN_TRACKED_LINKS,
  destinationForLinkKey,
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

  it("preserves English wording and three VIEW EVENT buttons", () => {
    expect(htmlEn).toContain("This September, we’re bringing the Stay With My Pet community together");
    expect(htmlEn.match(/VIEW EVENT →/g)?.length).toBe(3);
    expect(htmlEn).not.toContain("VAATA SÜNDMUST");
  });

  it("preserves Estonian wording and ET buttons", () => {
    expect(htmlEt).toContain("Septembris toome Stay With My Peti kogukonna");
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
    expect(htmlEn).toContain(">PetCity</a>");
    expect(htmlEn).toContain(">Gelato Ladies</a>");
    expect(htmlEn).toContain(">Moon</a>");
    expect(htmlEn).toContain("Platinum");
    expect(htmlEn).toContain("ViWell");
    expect(htmlEn).toContain("Semu");
    expect(htmlEn).toContain("YOOK");
    expect(UNLINKED_SPONSORS).toEqual(["Platinum", "ViWell", "Semu", "YOOK"]);
    expect(SEPTEMBER_SPONSOR_LINKS).toHaveLength(3);
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
    expect(clickRedirectFromTokenRow({ destination_url: "https://www.facebook.com/gerly.kullamaa", link_key: "event_13_sep" }, gerly)).toBeNull();
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
