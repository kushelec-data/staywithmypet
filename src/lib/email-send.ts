import "server-only";

import { Resend } from "resend";
import {
  buildEmailTemplate,
  defaultUniqueKey,
  type EmailEventType,
  type EmailTemplateContext,
} from "@/lib/emails";
import { hydrateScheduledEmailContext } from "@/lib/email-scheduled-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError, isMissingRelationError } from "@/lib/supabase-errors";

export type { EmailEventType, EmailTemplateContext } from "@/lib/emails";
export { defaultUniqueKey } from "@/lib/emails";

export type SendTransactionalEmailInput = {
  eventType: EmailEventType;
  userId: string;
  uniqueKey?: string;
  context?: EmailTemplateContext;
  requestId?: string | null;
  bookingId?: string | null;
  scheduledFor?: Date;
};

export type SendTransactionalEmailResult = {
  sent: boolean;
  skipped: boolean;
  scheduled?: boolean;
  reason?: "duplicate" | "no_email" | "no_api_key" | "no_admin" | "send_failed" | "scheduled";
};

function emailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "StayWithMyPet <hello@staywithmypet.ee>";
}

async function resolveRecipientEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email.trim() || null;
}

async function hasEmailEvent(uniqueKey: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data, error } = await admin
    .from("email_events")
    .select("id, sent_at, scheduled_for")
    .eq("unique_key", uniqueKey)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return false;
    console.error("[email] dedupe check failed", error.message);
    return false;
  }

  return Boolean(data?.id);
}

async function recordEmailEvent(input: {
  userId: string;
  eventType: EmailEventType;
  uniqueKey: string;
  requestId?: string | null;
  bookingId?: string | null;
  scheduledFor?: Date | null;
  sent?: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const row: Record<string, unknown> = {
    user_id: input.userId,
    event_type: input.eventType,
    unique_key: input.uniqueKey,
    related_request_id: input.requestId ?? null,
    related_booking_id: input.bookingId ?? null,
  };

  if (input.scheduledFor) {
    row.scheduled_for = input.scheduledFor.toISOString();
    row.sent_at = null;
  } else if (input.sent !== false) {
    row.sent_at = new Date().toISOString();
  }

  const { error } = await admin.from("email_events").insert(row);

  if (error) {
    if (isMissingColumnError(error) && input.scheduledFor) {
      console.warn(
        "[email] scheduled_for column missing — apply supabase migration; skipping schedule record",
      );
      return;
    }
    if (!isMissingRelationError(error)) {
      console.error("[email] record event failed", error.message);
    }
  }
}

async function markEmailEventSent(uniqueKey: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { error } = await admin
    .from("email_events")
    .update({ sent_at: new Date().toISOString() })
    .eq("unique_key", uniqueKey)
    .is("sent_at", null);

  if (error && !isMissingRelationError(error)) {
    console.error("[email] mark sent failed", error.message);
  }
}

export async function scheduleTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const uniqueKey =
    input.uniqueKey?.trim() ||
    defaultUniqueKey(input.eventType, input.userId, {
      requestId: input.requestId ?? undefined,
      bookingId: input.bookingId ?? undefined,
    });

  if (await hasEmailEvent(uniqueKey)) {
    return { sent: false, skipped: true, reason: "duplicate" };
  }

  const scheduledFor = input.scheduledFor ?? null;
  if (!scheduledFor) {
    return sendTransactionalEmail(input);
  }

  const admin = createAdminClient();
  if (!admin) {
    return { sent: false, skipped: true, reason: "no_admin" };
  }

  await recordEmailEvent({
    userId: input.userId,
    eventType: input.eventType,
    uniqueKey,
    requestId: input.requestId,
    bookingId: input.bookingId,
    scheduledFor,
    sent: false,
  });

  return { sent: false, skipped: false, scheduled: true, reason: "scheduled" };
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const uniqueKey =
    input.uniqueKey?.trim() ||
    defaultUniqueKey(input.eventType, input.userId, {
      requestId: input.requestId ?? undefined,
      bookingId: input.bookingId ?? undefined,
    });

  if (await hasEmailEvent(uniqueKey)) {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin
        .from("email_events")
        .select("sent_at, scheduled_for")
        .eq("unique_key", uniqueKey)
        .maybeSingle();
      if (data?.scheduled_for && !data?.sent_at) {
        const due = new Date(data.scheduled_for).getTime() <= Date.now();
        if (due) {
          return sendScheduledRow(input, uniqueKey);
        }
      }
    }
    return { sent: false, skipped: true, reason: "duplicate" };
  }

  const to = await resolveRecipientEmail(input.userId);
  if (!to) {
    return { sent: false, skipped: true, reason: "no_email" };
  }

  const template = buildEmailTemplate(input.eventType, input.context ?? {});
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.info("[email] RESEND_API_KEY not set — would send:", {
      eventType: input.eventType,
      userId: input.userId,
      uniqueKey,
      to,
      subject: template.subject,
      text: template.text,
      requestId: input.requestId,
      bookingId: input.bookingId,
    });
    return { sent: false, skipped: true, reason: "no_api_key" };
  }

  const admin = createAdminClient();
  if (!admin) {
    console.warn("[email] SUPABASE_SERVICE_ROLE_KEY not set — cannot record sent events");
    return { sent: false, skipped: true, reason: "no_admin" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFromAddress(),
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error("[email] Resend error", error);
      return { sent: false, skipped: false, reason: "send_failed" };
    }

    const existing = await admin
      .from("email_events")
      .select("id")
      .eq("unique_key", uniqueKey)
      .maybeSingle();

    if (existing.data?.id) {
      await markEmailEventSent(uniqueKey);
    } else {
      await recordEmailEvent({
        userId: input.userId,
        eventType: input.eventType,
        uniqueKey,
        requestId: input.requestId,
        bookingId: input.bookingId,
      });
    }

    return { sent: true, skipped: false };
  } catch (err) {
    console.error("[email] send failed", err);
    return { sent: false, skipped: false, reason: "send_failed" };
  }
}

async function sendScheduledRow(
  input: SendTransactionalEmailInput,
  uniqueKey: string,
): Promise<SendTransactionalEmailResult> {
  const to = await resolveRecipientEmail(input.userId);
  if (!to) return { sent: false, skipped: true, reason: "no_email" };

  const template = buildEmailTemplate(input.eventType, input.context ?? {});
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info("[email] scheduled send skipped (no API key)", uniqueKey);
    return { sent: false, skipped: true, reason: "no_api_key" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFromAddress(),
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    if (error) {
      console.error("[email] Resend error (scheduled)", error);
      return { sent: false, skipped: false, reason: "send_failed" };
    }
    await markEmailEventSent(uniqueKey);
    return { sent: true, skipped: false };
  } catch (err) {
    console.error("[email] scheduled send failed", err);
    return { sent: false, skipped: false, reason: "send_failed" };
  }
}

export type DueScheduledEmailRow = {
  unique_key: string;
  user_id: string;
  event_type: EmailEventType;
  related_request_id: string | null;
  related_booking_id: string | null;
};

export async function fetchDueScheduledEmails(limit = 50): Promise<DueScheduledEmailRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("email_events")
    .select("unique_key, user_id, event_type, related_request_id, related_booking_id")
    .is("sent_at", null)
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", now)
    .limit(limit);

  if (error) {
    if (isMissingColumnError(error) || isMissingRelationError(error)) return [];
    console.error("[email] fetch due scheduled failed", error.message);
    return [];
  }

  return (data ?? []) as DueScheduledEmailRow[];
}

export async function processDueScheduledEmails(): Promise<{ processed: number; sent: number }> {
  const due = await fetchDueScheduledEmails();
  let sent = 0;

  for (const row of due) {
    const context = (await hydrateScheduledEmailContext(row)) ?? undefined;
    const result = await sendTransactionalEmail({
      eventType: row.event_type,
      userId: row.user_id,
      uniqueKey: row.unique_key,
      requestId: row.related_request_id,
      bookingId: row.related_booking_id,
      context,
    });
    if (result.sent) sent += 1;
  }

  return { processed: due.length, sent };
}

/** Fire-and-forget wrapper for mutation paths — never throws to callers. */
export function queueEmailEvent(input: SendTransactionalEmailInput): void {
  void sendTransactionalEmail(input).catch((err) => {
    console.error("[email] queue failed", err);
  });
}
