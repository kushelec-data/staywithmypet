import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { OPEN_TRACKING_DISCLAIMER } from "@/lib/email-campaigns/dto";
import { getCampaignDetail, updateCampaignContent } from "@/lib/email-campaigns/store";
import { mergeSeptemberTemplateConfig } from "@/lib/email-campaigns/template-config";
import { resolveCampaignCopy } from "@/lib/email-campaigns/html";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const detail = await getCampaignDetail(campaignId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = JSON.stringify(detail);
  if (/SMTP_PASSWORD|service_role|open_token|click_token/i.test(json)) {
    return NextResponse.json({ error: "Refusing to return sensitive fields" }, { status: 500 });
  }

  return NextResponse.json({
    from: CAMPAIGN_FROM_HEADER,
    openTrackingNote: OPEN_TRACKING_DISCLAIMER,
    campaign: {
      id: detail.id,
      name: detail.name,
      status: detail.status,
      subjectEn: detail.subjectEn,
      subjectEt: detail.subjectEt,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      version: detail.version,
      language: detail.language,
      contentLocked: detail.contentLocked,
      copy: detail.copy,
      summary: {
        recipients: detail.summary.recipients,
        sent: detail.summary.sent,
        opened: detail.summary.opened,
        uniqueClicks: detail.summary.uniqueClicks,
        failed: detail.summary.failed,
      },
      recipients: detail.recipients,
    },
    preview: {
      htmlEn: detail.htmlEn,
      htmlEt: detail.htmlEt,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const updated = await updateCampaignContent(campaignId, {
    name: typeof body.name === "string" ? body.name : undefined,
    subjectEn: String(body.subjectEn ?? ""),
    subjectEt: String(body.subjectEt ?? ""),
    templateConfig: mergeSeptemberTemplateConfig(body.templateConfig),
    copy: resolveCampaignCopy({
      preheaderEn: typeof body.preheaderEn === "string" ? body.preheaderEn : undefined,
      preheaderEt: typeof body.preheaderEt === "string" ? body.preheaderEt : undefined,
      bodyBeforeEn: typeof body.bodyBeforeEn === "string" ? body.bodyBeforeEn : undefined,
      bodyAfterEn: typeof body.bodyAfterEn === "string" ? body.bodyAfterEn : undefined,
      bodyBeforeEt: typeof body.bodyBeforeEt === "string" ? body.bodyBeforeEt : undefined,
      bodyAfterEt: typeof body.bodyAfterEt === "string" ? body.bodyAfterEt : undefined,
      bodyEn: typeof body.bodyEn === "string" ? body.bodyEn : undefined,
      bodyEt: typeof body.bodyEt === "string" ? body.bodyEt : undefined,
    }),
  });
  if ("error" in updated) {
    const status = updated.error.includes("already sent") ? 409 : 400;
    return NextResponse.json({ error: updated.error }, { status });
  }
  return NextResponse.json({ ok: true, sent: false });
}
