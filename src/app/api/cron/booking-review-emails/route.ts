import { processPendingBookingReviewEmails } from "@/lib/booking-review-emails";
import { createCronHandlers } from "@/lib/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET+POST /api/cron/booking-review-emails
 * Daily recovery/backfill for review reminder emails on completed bookings.
 *
 * Vercel Cron (see vercel.json): daily at 08:00 UTC — valid on Hobby (once/day).
 * Auth: Authorization: Bearer CRON_SECRET (Vercel) or x-cron-secret
 */
async function run(_request: Request) {
  const result = await processPendingBookingReviewEmails();
  return Response.json({ ok: true, ...result });
}

export const { GET, POST } = createCronHandlers(run);
