import { processDueScheduledCampaigns } from "@/lib/email-campaigns/scheduled-send";
import { createCronHandlers } from "@/lib/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run(_request: Request) {
  const result = await processDueScheduledCampaigns();
  return Response.json({ ok: true, ...result });
}

export const { GET, POST } = createCronHandlers(run, { allowEmailInternalHeader: true });
