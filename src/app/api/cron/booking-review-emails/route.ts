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
 * Sends "Leave a Review" emails for completed bookings (manual or auto-completed).
 *
 * Vercel Cron (see vercel.json): hourly
 * Auth: Authorization: Bearer CRON_SECRET (Vercel) or x-cron-secret
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingBookingReviewEmails();
  return NextResponse.json({ ok: true, ...result });
}
