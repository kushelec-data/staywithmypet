import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { applyTrackingToHtml, defaultSeptemberBodies } from "@/lib/email-campaigns/html";
import { clickTrackingUrl, openTrackingUrl } from "@/lib/email-campaigns/personalize";
import { CAMPAIGN_TRACKED_LINKS } from "@/lib/email-campaigns/events";
import { getCampaignDetail } from "@/lib/email-campaigns/store";
import type { CampaignLanguage } from "@/lib/email-campaigns/locale";
import { CANONICAL_CAMPAIGN_EMAIL_ORIGIN } from "@/lib/email-campaigns/public-base";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { language?: string };
  const language: CampaignLanguage = body.language === "et" ? "et" : "en";

  const origin = CANONICAL_CAMPAIGN_EMAIL_ORIGIN;
  const clickUrls = Object.fromEntries(
    CAMPAIGN_TRACKED_LINKS.map((link) => [link.key, clickTrackingUrl(`preview-${link.key}`, origin)]),
  );
  const openPixelUrl = openTrackingUrl("preview-open", origin);

  if (campaignId === "new") {
    const bodies = defaultSeptemberBodies(`${CANONICAL_CAMPAIGN_EMAIL_ORIGIN}/logo.png`);
    const html = applyTrackingToHtml(language === "et" ? bodies.htmlEt : bodies.htmlEn, {
      openPixelUrl,
      clickUrls,
    });
    return NextResponse.json({ language, html });
  }

  const detail = await getCampaignDetail(campaignId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const html = applyTrackingToHtml(language === "et" ? detail.htmlEt : detail.htmlEn, {
    openPixelUrl,
    clickUrls,
  });
  return NextResponse.json({ language, html, subject: language === "et" ? detail.subjectEt : detail.subjectEn });
}
