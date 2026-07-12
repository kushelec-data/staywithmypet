import { isCronRecoveryConfigured } from "@/lib/booking-completion";
import { processPendingBookingReviewEmails } from "@/lib/booking-review-emails";
import { NextResponse } from "next/server";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() || process.env.EMAIL_INTERNAL_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

/**
 * POST /api/cron/booking-review-emails
 * Daily recovery/backfill for review reminder emails on completed bookings.
 *
 * Vercel Cron (see vercel.json): daily at 08:00 UTC — valid on Hobby plan.
 * Auth: Authorization: Bearer CRON_SECRET (Vercel) or x-cron-secret
 */
export async function POST(request: Request) {
  if (!isCronRecoveryConfigured()) {
    console.error(
      "[cron:booking-review-emails] CRON_SECRET or EMAIL_INTERNAL_SECRET is not configured",
    );
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingBookingReviewEmails();
  return NextResponse.json({ ok: true, ...result });
}
