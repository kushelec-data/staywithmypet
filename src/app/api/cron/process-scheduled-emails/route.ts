import { processDueScheduledEmails } from "@/lib/email-send";
import { processDueScheduledCampaigns } from "@/lib/email-campaigns/scheduled-send";
import { createCronHandlers } from "@/lib/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET+POST /api/cron/process-scheduled-emails
 * Sends due review reminders, booking-starts-tomorrow, and other scheduled transactional emails.
 *
 * Vercel Cron (see vercel.json): daily 09:00 UTC — matches booking_starts_tomorrow
 * scheduled_for. Daily expressions are valid on Hobby (once/day) and Pro.
 * Auth: Authorization: Bearer CRON_SECRET (Vercel) or x-cron-secret / x-email-internal-secret
 */
async function run(_request: Request) {
  const result = await processDueScheduledEmails();
  const campaigns = await processDueScheduledCampaigns().catch(() => ({
    claimed: 0,
    continued: 0,
    finished: 0,
    skipped: 0,
  }));
  return Response.json({ ok: true, ...result, campaigns });
}

export const { GET, POST } = createCronHandlers(run, { allowEmailInternalHeader: true });
