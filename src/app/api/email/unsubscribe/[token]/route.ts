import { NextResponse } from "next/server";
import { findRecipientByUnsubscribeToken, recordMarketingUnsubscribe } from "@/lib/email-campaigns/store-bulk";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const recipient = await findRecipientByUnsubscribeToken(token);
  if (!recipient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ok = await recordMarketingUnsubscribe(recipient.email);
  if (!ok) return NextResponse.json({ error: "Could not unsubscribe" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
