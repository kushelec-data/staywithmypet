import { runWeeklyMatchmaking } from "@/lib/matchmaking/run-weekly";
import { isInternalSecretAuthorized } from "@/lib/security/internal-secret-auth";
import { NextResponse } from "next/server";

/**
 * POST /api/cron/weekly-matchmaking
 * Weekly Pet Parent ↔ Pet Friend recommendations + one digest email per user.
 *
 * Vercel Cron (see vercel.json): Tuesdays 07:00 UTC.
 * Auth: Authorization: Bearer CRON_SECRET or x-cron-secret
 */
export async function POST(request: Request) {
  if (!isInternalSecretAuthorized(request, { allowEmailInternalHeader: true })) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWeeklyMatchmaking();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
