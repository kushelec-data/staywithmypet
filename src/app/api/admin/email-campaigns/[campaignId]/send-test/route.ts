import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { getCampaignDetail } from "@/lib/email-campaigns/store";
import { sendTestCampaign } from "@/lib/email-campaigns/send";
import { parseSendLanguageMode } from "@/lib/email-campaigns/send-language";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const body = (await request.json().catch(() => null)) as {
    confirm?: boolean;
    sendLanguageMode?: string;
    previewLanguage?: string;
  } | null;
  if (!body?.confirm) {
    return NextResponse.json(
      { error: "Send test requires explicit confirmation.", sent: false },
      { status: 400 },
    );
  }

  const { campaignId } = await context.params;
  const detail = await getCampaignDetail(campaignId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  void body.previewLanguage;

  const result = await sendTestCampaign(
    campaignId,
    detail.recipients.map((row) => row.id),
    parseSendLanguageMode(body.sendLanguageMode),
  );
  if (result.blocked) {
    return NextResponse.json({ ...result, ok: false }, { status: 409 });
  }
  if (!result.ok) {
    return NextResponse.json({ ...result, ok: false }, { status: 422 });
  }
  return NextResponse.json({ ...result, ok: true });
}
