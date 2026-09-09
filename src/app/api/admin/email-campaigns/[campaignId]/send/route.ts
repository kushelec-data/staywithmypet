import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/require-api";
import { jsonLooksLikeSecretDump } from "@/lib/email-campaigns/dto";
import { sendCampaignNextBatch } from "@/lib/email-campaigns/send";
import type { SendMode } from "@/lib/email-campaigns/send-queue";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdminApi();
  if (gate.response) return gate.response;

  const body = (await request.json().catch(() => null)) as {
    confirm?: boolean;
    continueExisting?: boolean;
    leaseId?: string;
    mode?: SendMode;
  } | null;

  const { campaignId } = await context.params;
  const mode: SendMode = body?.mode === "failed" || body?.mode === "resume" ? body.mode : "pending";
  const result = await sendCampaignNextBatch({
    campaignId,
    mode,
    confirm: Boolean(body?.confirm),
    continueExisting: Boolean(body?.continueExisting),
    leaseId: typeof body?.leaseId === "string" ? body.leaseId : undefined,
  });

  const payload = {
    ok: result.ok,
    blocked: result.blocked,
    leaseId: result.leaseId,
    done: result.done,
    delayMs: result.delayMs,
    remaining: result.remaining,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped,
    campaignStatus: result.campaignStatus,
  };
  if (jsonLooksLikeSecretDump(payload)) {
    return NextResponse.json({ error: "Refusing to return secrets." }, { status: 500 });
  }
  if (result.blocked && !result.ok) {
    return NextResponse.json(payload, { status: result.blocked.includes("already sending") ? 409 : 400 });
  }
  return NextResponse.json(payload);
}
