import { getSiteOrigin } from "@/lib/site-url";
import { applyTrackingToHtml, htmlToPlainText } from "@/lib/email-campaigns/html";
import type { CampaignLanguage } from "@/lib/email-campaigns/locale";
import { SEPTEMBER_EVENT_LINKS } from "@/lib/email-campaigns/events";

export function openTrackingUrl(token: string, origin = getSiteOrigin()): string {
  return `${origin}/api/email/track/open/${token}`;
}

export function clickTrackingUrl(token: string, origin = getSiteOrigin()): string {
  return `${origin}/api/email/track/click/${token}`;
}

export function personalizeCampaignHtml(input: {
  htmlEn: string;
  htmlEt: string;
  language: CampaignLanguage;
  openToken: string;
  clickTokens: Record<string, string>;
  origin?: string;
}): { html: string; text: string } {
  const origin = input.origin ?? getSiteOrigin();
  const base = input.language === "et" ? input.htmlEt : input.htmlEn;
  const clickUrls = Object.fromEntries(
    SEPTEMBER_EVENT_LINKS.map((link) => [
      link.key,
      clickTrackingUrl(input.clickTokens[link.key] ?? "", origin),
    ]),
  );
  const html = applyTrackingToHtml(base, {
    openPixelUrl: openTrackingUrl(input.openToken, origin),
    clickUrls,
  });
  return { html, text: htmlToPlainText(html) };
}
