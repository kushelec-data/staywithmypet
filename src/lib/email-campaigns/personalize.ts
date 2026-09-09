import {
  CANONICAL_CAMPAIGN_EMAIL_ORIGIN,
  requireCampaignEmailOrigin,
} from "@/lib/email-campaigns/public-base";
import { applyTrackingToHtml, htmlToPlainText } from "@/lib/email-campaigns/html";
import type { CampaignLanguage } from "@/lib/email-campaigns/locale";

function trackingOrigin(origin?: string): string {
  if (origin) {
    const required = requireCampaignEmailOrigin({ EMAIL_PUBLIC_BASE_URL: origin });
    if (!required.ok) {
      throw new Error(required.reason);
    }
    return required.origin;
  }
  return CANONICAL_CAMPAIGN_EMAIL_ORIGIN;
}

export function openTrackingUrl(token: string, origin?: string): string {
  return `${trackingOrigin(origin)}/api/email/track/open/${token}`;
}

export function clickTrackingUrl(token: string, origin?: string): string {
  return `${trackingOrigin(origin)}/api/email/track/click/${token}`;
}

export function personalizeCampaignHtml(input: {
  htmlEn: string;
  htmlEt: string;
  language: CampaignLanguage;
  openToken: string;
  clickTokens: Record<string, string>;
  origin?: string;
}): { html: string; text: string } {
  const origin = trackingOrigin(input.origin);
  const template = input.language === "et" ? input.htmlEt : input.htmlEn;
  const clickUrls = Object.fromEntries(
    Object.entries(input.clickTokens).map(([key, token]) => [key, clickTrackingUrl(token, origin)]),
  );
  const html = applyTrackingToHtml(template, {
    openPixelUrl: openTrackingUrl(input.openToken, origin),
    clickUrls,
  });
  return { html, text: htmlToPlainText(html) };
}
