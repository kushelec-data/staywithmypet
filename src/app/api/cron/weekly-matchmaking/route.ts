import { runWeeklyMatchmaking } from "@/lib/matchmaking/run-weekly";
import { createCronHandlers } from "@/lib/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET+POST /api/cron/weekly-matchmaking
 * Weekly Pet Parent ↔ Pet Friend recommendations + one digest email per user.
 *
 * Vercel Cron (see vercel.json): Tuesdays 07:00 UTC. Cron issues HTTP GET.
 * Auth: Authorization: Bearer CRON_SECRET or x-cron-secret
 */
async function run(_request: Request) {
  const result = await runWeeklyMatchmaking();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export const { GET, POST } = createCronHandlers(run, { allowEmailInternalHeader: true });
