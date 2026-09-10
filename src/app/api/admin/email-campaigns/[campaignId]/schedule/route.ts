import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { cancelCampaignSchedule, getCampaignDetail, scheduleCampaign } from "@/lib/email-campaigns/store";
import { canScheduleCampaign, parseScheduleDateTime } from "@/lib/email-campaigns/schedule";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const body = (await request.json().catch(() => null)) as { date?: string; time?: string; timezone?: string } | null;
  const parsed = parseScheduleDateTime({
    date: String(body?.date ?? ""),
    time: String(body?.time ?? ""),
    timezone: typeof body?.timezone === "string" ? body.timezone : undefined,
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const detail = await getCampaignDetail(campaignId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canScheduleCampaign(detail.status, detail.recipients.length)) {
    return NextResponse.json({ error: "Add recipients, then schedule from a draft." }, { status: 400 });
  }

  const result = await scheduleCampaign(campaignId, {
    scheduledAt: parsed.scheduledAt,
    timezone: parsed.timezone,
    scheduledBy: gate.session.userId,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, scheduled: true, sent: false });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;
  const { campaignId } = await context.params;
  const result = await cancelCampaignSchedule(campaignId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, scheduled: false });
}
