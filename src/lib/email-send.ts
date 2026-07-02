import "server-only";

import nodemailer from "nodemailer";
import {
  buildEmailTemplate,
  defaultUniqueKey,
  type EmailEventType,
  type EmailTemplateContext,
} from "@/lib/emails";
import { resolveEmailLocale } from "@/lib/email-templates/locale";
import { hydrateScheduledEmailContext } from "@/lib/email-scheduled-context";
import { readSmtpConfig, transactionalEmailFrom } from "@/lib/smtp-config";
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
  reason?: "duplicate" | "no_email" | "no_api_key" | "no_admin" | "send_failed" | "scheduled" | "review_submitted";
};

type EmailEventLogMeta = {
  userId: string;
  requestId?: string | null;
  bookingId?: string | null;
  uniqueKey?: string;
};

export function logEmailEventTrigger(
  eventType: EmailEventType,
  meta: EmailEventLogMeta,
): void {
  console.info("[email-event] trigger", {
    eventType,
    userId: meta.userId,
    requestId: meta.requestId ?? null,
    bookingId: meta.bookingId ?? null,
    uniqueKey: meta.uniqueKey ?? null,
  });
}

export function logEmailEventRecipient(
  eventType: EmailEventType,
  meta: EmailEventLogMeta & { email: string | null },
): void {
  console.info("[email-event] recipient", {
    eventType,
    userId: meta.userId,
    email: meta.email ?? "(none)",
    requestId: meta.requestId ?? null,
    bookingId: meta.bookingId ?? null,
  });
}

export function logEmailEventSendResult(
  eventType: EmailEventType,
  meta: EmailEventLogMeta,
  result: SendTransactionalEmailResult,
): void {
  console.info("[email-event] send result", {
    eventType,
    userId: meta.userId,
    requestId: meta.requestId ?? null,
    bookingId: meta.bookingId ?? null,
    ...result,
  });
}

type SmtpMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  eventType: EmailEventType;
  uniqueKey: string;
};

async function sendViaSmtp(message: SmtpMessage): Promise<boolean> {
  const smtp = readSmtpConfig();
  if (!smtp) {
    console.info("[email] SMTP credentials not set — would send:", {
      eventType: message.eventType,
      uniqueKey: message.uniqueKey,
      to: message.to,
      subject: message.subject,
    });
    return false;
  }

  const { host, port, user, password } = smtp;
  const secure = port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
    });

    await transporter.sendMail({
      from: transactionalEmailFrom(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    console.info("[email] SMTP send success", {
      eventType: message.eventType,
      uniqueKey: message.uniqueKey,
      to: message.to,
      subject: message.subject,
    });
    return true;
  } catch (err) {
    console.error("[email] SMTP send failed", {
      eventType: message.eventType,
      uniqueKey: message.uniqueKey,
      to: message.to,
      subject: message.subject,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function resolveRecipientEmail(userId: string): Promise<string | null> {
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

  const logMeta: EmailEventLogMeta = {
    userId: input.userId,
    requestId: input.requestId,
    bookingId: input.bookingId,
    uniqueKey,
  };

  logEmailEventTrigger(input.eventType, logMeta);

  if (await hasEmailEvent(uniqueKey)) {
    const result = { sent: false, skipped: true, reason: "duplicate" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
  }

  const scheduledFor = input.scheduledFor ?? null;
  if (!scheduledFor) {
    return sendTransactionalEmail({ ...input, uniqueKey });
  }

  const admin = createAdminClient();
  if (!admin) {
    const result = { sent: false, skipped: true, reason: "no_admin" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
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

  const result = { sent: false, skipped: false, scheduled: true, reason: "scheduled" as const };
  logEmailEventSendResult(input.eventType, logMeta, result);
  return result;
}

async function shouldSkipReviewReminderEmail(
  input: SendTransactionalEmailInput,
): Promise<boolean> {
  if (
    input.eventType !== "review_reminder_parent" &&
    input.eventType !== "review_reminder_friend"
  ) {
    return false;
  }
  if (!input.bookingId) return false;
  const { userHasReviewForBooking } = await import("@/lib/booking-review-emails");
  return userHasReviewForBooking(input.userId, input.bookingId);
}

async function skipReviewReminderIfSubmitted(
  input: SendTransactionalEmailInput,
  uniqueKey: string,
  logMeta: EmailEventLogMeta,
): Promise<SendTransactionalEmailResult | null> {
  if (!(await shouldSkipReviewReminderEmail(input))) return null;

  if (await hasEmailEvent(uniqueKey)) {
    await markEmailEventSent(uniqueKey);
  }

  const result = { sent: false, skipped: true, reason: "review_submitted" as const };
  logEmailEventSendResult(input.eventType, logMeta, result);
  return result;
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

  const logMeta: EmailEventLogMeta = {
    userId: input.userId,
    requestId: input.requestId,
    bookingId: input.bookingId,
    uniqueKey,
  };

  logEmailEventTrigger(input.eventType, logMeta);

  const reviewSkip = await skipReviewReminderIfSubmitted(input, uniqueKey, logMeta);
  if (reviewSkip) return reviewSkip;

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
          return sendScheduledRow(input, uniqueKey, logMeta);
        }
      }
    }
    const duplicateResult = { sent: false, skipped: true, reason: "duplicate" as const };
    logEmailEventSendResult(input.eventType, logMeta, duplicateResult);
    return duplicateResult;
  }

  const to = await resolveRecipientEmail(input.userId);
  logEmailEventRecipient(input.eventType, { ...logMeta, email: to });
  if (!to) {
    const result = { sent: false, skipped: true, reason: "no_email" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
  }

  const locale = await resolveEmailLocale(input.userId, input.context?.locale);
  const template = buildEmailTemplate(input.eventType, input.context ?? {}, locale);

  if (!readSmtpConfig()) {
    const result = { sent: false, skipped: true, reason: "no_api_key" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
  }

  const admin = createAdminClient();
  if (!admin) {
    console.warn("[email] SUPABASE_SERVICE_ROLE_KEY not set — cannot record sent events");
    const result = { sent: false, skipped: true, reason: "no_admin" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
  }

  const sent = await sendViaSmtp({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    eventType: input.eventType,
    uniqueKey,
  });

  if (!sent) {
    const result = { sent: false, skipped: false, reason: "send_failed" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
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

  const successResult = { sent: true, skipped: false };
  logEmailEventSendResult(input.eventType, logMeta, successResult);
  return successResult;
}

async function sendScheduledRow(
  input: SendTransactionalEmailInput,
  uniqueKey: string,
  logMeta: EmailEventLogMeta,
): Promise<SendTransactionalEmailResult> {
  const reviewSkip = await skipReviewReminderIfSubmitted(input, uniqueKey, logMeta);
  if (reviewSkip) return reviewSkip;

  const to = await resolveRecipientEmail(input.userId);
  logEmailEventRecipient(input.eventType, { ...logMeta, email: to });
  if (!to) {
    const result = { sent: false, skipped: true, reason: "no_email" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
  }

  const locale = await resolveEmailLocale(input.userId, input.context?.locale);
  const template = buildEmailTemplate(input.eventType, input.context ?? {}, locale);

  if (!readSmtpConfig()) {
    console.info("[email] scheduled send skipped (SMTP not configured)", uniqueKey);
    const result = { sent: false, skipped: true, reason: "no_api_key" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
  }

  const sent = await sendViaSmtp({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    eventType: input.eventType,
    uniqueKey,
  });

  if (!sent) {
    const result = { sent: false, skipped: false, reason: "send_failed" as const };
    logEmailEventSendResult(input.eventType, logMeta, result);
    return result;
  }

  await markEmailEventSent(uniqueKey);
  const successResult = { sent: true, skipped: false };
  logEmailEventSendResult(input.eventType, logMeta, successResult);
  return successResult;
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
