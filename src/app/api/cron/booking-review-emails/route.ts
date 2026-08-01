import { processPendingBookingReviewEmails } from "@/lib/booking-review-emails";
import { isInternalSecretAuthorized } from "@/lib/security/internal-secret-auth";
import { NextResponse } from "next/server";

/**
 * POST /api/cron/booking-review-emails
 * Daily recovery/backfill for review reminder emails on completed bookings.
 *
 * Vercel Cron (see vercel.json): daily at 08:00 UTC — valid on Hobby plan.
 * Auth: Authorization: Bearer CRON_SECRET (Vercel) or x-cron-secret
 */
export async function POST(request: Request) {
  if (!isInternalSecretAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingBookingReviewEmails();
  return NextResponse.json({ ok: true, ...result });
}
