import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { duplicateCampaignVersion } from "@/lib/email-campaigns/store";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId } = await context.params;
  const created = await duplicateCampaignVersion(campaignId, gate.session.userId);
  if ("error" in created) return NextResponse.json({ error: created.error }, { status: 400 });
  return NextResponse.json({ id: created.id, sent: false });
}
