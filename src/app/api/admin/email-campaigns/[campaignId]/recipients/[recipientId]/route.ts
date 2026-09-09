import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { getRecipientActivity } from "@/lib/email-campaigns/store";
import { removeDraftRecipient } from "@/lib/email-campaigns/store-bulk";

type RouteContext = { params: Promise<{ campaignId: string; recipientId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId, recipientId } = await context.params;
  const activity = await getRecipientActivity(campaignId, recipientId);
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    recipient: activity.recipient,
    events: activity.events.map((event) => ({
      type: event.type,
      at: event.at,
      linkKey: event.linkKey,
      linkType: event.linkType ?? null,
      linkLabel: event.linkLabel ?? null,
    })),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const { campaignId, recipientId } = await context.params;
  const result = await removeDraftRecipient(campaignId, recipientId);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Cannot remove" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
