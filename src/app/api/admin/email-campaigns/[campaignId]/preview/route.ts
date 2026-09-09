import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { applyTrackingToHtml, defaultSeptemberBodies } from "@/lib/email-campaigns/html";
import { clickTrackingUrl, openTrackingUrl } from "@/lib/email-campaigns/personalize";
import { trackedLinksFromTemplateConfig } from "@/lib/email-campaigns/events";
import { getCampaignDetail } from "@/lib/email-campaigns/store";
import { selectCampaignContent } from "@/lib/email-campaigns/locale";
import { CANONICAL_CAMPAIGN_EMAIL_ORIGIN } from "@/lib/email-campaigns/public-base";
import { mergeSeptemberTemplateConfig } from "@/lib/email-campaigns/template-config";
import { SEPTEMBER_SUBJECT_EN, SEPTEMBER_SUBJECT_ET } from "@/lib/email-campaigns/events";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    language?: string;
    templateConfig?: unknown;
    bodyEn?: string;
    bodyEt?: string;
    preheaderEn?: string;
    preheaderEt?: string;
    subjectEn?: string;
    subjectEt?: string;
  };
  const templateConfig = mergeSeptemberTemplateConfig(body.templateConfig);

  const origin = CANONICAL_CAMPAIGN_EMAIL_ORIGIN;
  const clickUrls = Object.fromEntries(
    trackedLinksFromTemplateConfig(templateConfig).map((link) => [link.key, clickTrackingUrl(`preview-${link.key}`, origin)]),
  );
  const openPixelUrl = openTrackingUrl("preview-open", origin);

  if (campaignId === "new") {
    const bodies = defaultSeptemberBodies(`${CANONICAL_CAMPAIGN_EMAIL_ORIGIN}/logo.png`, templateConfig, {
      bodyEn: body.bodyEn,
      bodyEt: body.bodyEt,
      preheaderEn: body.preheaderEn,
      preheaderEt: body.preheaderEt,
      subjectEn: body.subjectEn ?? SEPTEMBER_SUBJECT_EN,
      subjectEt: body.subjectEt ?? SEPTEMBER_SUBJECT_ET,
    });
    const selected = selectCampaignContent(body.language, {
      subjectEn: body.subjectEn ?? SEPTEMBER_SUBJECT_EN,
      subjectEt: body.subjectEt ?? SEPTEMBER_SUBJECT_ET,
      htmlEn: bodies.htmlEn,
      htmlEt: bodies.htmlEt,
    });
    const html = applyTrackingToHtml(selected.html, {
      openPixelUrl,
      clickUrls,
    });
    return NextResponse.json({ language: selected.language, html, templateConfig, subject: selected.subject });
  }

  const detail = await getCampaignDetail(campaignId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const selected = selectCampaignContent(body.language, {
    subjectEn: detail.subjectEn,
    subjectEt: detail.subjectEt,
    htmlEn: detail.htmlEn,
    htmlEt: detail.htmlEt,
  });
  const html = applyTrackingToHtml(selected.html, {
    openPixelUrl,
    clickUrls,
  });
  return NextResponse.json({ language: selected.language, html, subject: selected.subject });
}
