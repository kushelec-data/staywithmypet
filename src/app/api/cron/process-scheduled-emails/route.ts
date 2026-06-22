import { processDueScheduledEmails } from "@/lib/email-send";
import { NextResponse } from "next/server";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() || process.env.EMAIL_INTERNAL_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

/**
 * POST /api/cron/process-scheduled-emails
 * Sends due review reminders, booking-starts-tomorrow, and other scheduled transactional emails.
 *
 * Vercel Cron (see vercel.json): hourly — POST /api/cron/process-scheduled-emails
 * Auth: Authorization: Bearer CRON_SECRET (Vercel) or x-cron-secret / x-email-internal-secret
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueScheduledEmails();
  return NextResponse.json({ ok: true, ...result });
}
