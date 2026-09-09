import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { applyTrackingToHtml, defaultSeptemberBodies } from "@/lib/email-campaigns/html";
import { clickTrackingUrl, openTrackingUrl } from "@/lib/email-campaigns/personalize";
import { trackedLinksFromTemplateConfig } from "@/lib/email-campaigns/events";
import { getCampaignDetail } from "@/lib/email-campaigns/store";
import type { CampaignLanguage } from "@/lib/email-campaigns/locale";
import { CANONICAL_CAMPAIGN_EMAIL_ORIGIN } from "@/lib/email-campaigns/public-base";
import { mergeSeptemberTemplateConfig } from "@/lib/email-campaigns/template-config";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { language?: string; templateConfig?: unknown };
  const language: CampaignLanguage = body.language === "et" ? "et" : "en";
  const templateConfig = mergeSeptemberTemplateConfig(body.templateConfig);

  const origin = CANONICAL_CAMPAIGN_EMAIL_ORIGIN;
  const clickUrls = Object.fromEntries(
    trackedLinksFromTemplateConfig(templateConfig).map((link) => [link.key, clickTrackingUrl(`preview-${link.key}`, origin)]),
  );
  const openPixelUrl = openTrackingUrl("preview-open", origin);

  if (campaignId === "new") {
    const bodies = defaultSeptemberBodies(`${CANONICAL_CAMPAIGN_EMAIL_ORIGIN}/logo.png`, templateConfig);
    const html = applyTrackingToHtml(language === "et" ? bodies.htmlEt : bodies.htmlEn, {
      openPixelUrl,
      clickUrls,
    });
    return NextResponse.json({ language, html, templateConfig });
  }

  const detail = await getCampaignDetail(campaignId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const html = applyTrackingToHtml(language === "et" ? detail.htmlEt : detail.htmlEn, {
    openPixelUrl,
    clickUrls,
  });
  return NextResponse.json({ language, html, subject: language === "et" ? detail.subjectEt : detail.subjectEn });
}
