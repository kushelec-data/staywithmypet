import { processDueScheduledEmails } from "@/lib/email-send";
import { isInternalSecretAuthorized } from "@/lib/security/internal-secret-auth";
import { NextResponse } from "next/server";

/**
 * POST /api/cron/process-scheduled-emails
 * Sends due review reminders, booking-starts-tomorrow, and other scheduled transactional emails.
 *
 * Vercel Cron (see vercel.json): hourly — POST /api/cron/process-scheduled-emails
 * Auth: Authorization: Bearer CRON_SECRET (Vercel) or x-cron-secret / x-email-internal-secret
 */
export async function POST(request: Request) {
  if (!isInternalSecretAuthorized(request, { allowEmailInternalHeader: true })) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueScheduledEmails();
  return NextResponse.json({ ok: true, ...result });
}
