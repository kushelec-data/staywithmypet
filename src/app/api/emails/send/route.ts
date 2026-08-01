import {
  sendTransactionalEmail,
  type EmailEventType,
  type EmailTemplateContext,
} from "@/lib/email-send";
import { isInternalSecretAuthorized } from "@/lib/security/internal-secret-auth";
import { NextResponse } from "next/server";

type SendEmailBody = {
  event_type: EmailEventType;
  user_id: string;
  unique_key?: string;
  request_id?: string | null;
  booking_id?: string | null;
  context?: EmailTemplateContext;
};

/**
 * Internal-only email dispatch (cron / workers). App flows use server actions in `email-events.ts`.
 */
export async function POST(request: Request) {
  if (!isInternalSecretAuthorized(request, { emailInternalOnly: true })) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SendEmailBody;
  try {
    body = (await request.json()) as SendEmailBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_type, user_id, unique_key, request_id, booking_id, context } = body;

  if (!event_type || !user_id) {
    return NextResponse.json({ error: "event_type and user_id are required" }, { status: 400 });
  }

  const result = await sendTransactionalEmail({
    eventType: event_type,
    userId: user_id,
    uniqueKey: unique_key,
    requestId: request_id,
    bookingId: booking_id,
    context,
  });

  return NextResponse.json(result);
}
