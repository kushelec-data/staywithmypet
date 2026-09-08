import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { OPEN_TRACKING_DISCLAIMER } from "@/lib/email-campaigns/dto";
import { getCampaignDetail } from "@/lib/email-campaigns/store";

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
