import { processDueScheduledCampaigns } from "@/lib/email-campaigns/scheduled-send";
import { isInternalSecretAuthorized } from "@/lib/security/internal-secret-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isInternalSecretAuthorized(request, { allowEmailInternalHeader: true })) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueScheduledCampaigns();
  return NextResponse.json({ ok: true, ...result });
}
