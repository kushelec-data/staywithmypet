import "server-only";

import {
  queueEmailEvent,
  scheduleTransactionalEmail,
  type SendTransactionalEmailInput,
} from "@/lib/email-send";
import type { EmailEventType, EmailRecipientRole, EmailTemplateContext } from "@/lib/emails/types";

export const REVIEW_REMINDER_DELAY_MS = 12 * 60 * 60 * 1000;

export type BookingEmailType =
  | "request_sent"
  | "request_received"
  | "request_declined_by_you"
  | "request_declined"
  | "booking_confirmed"
  | "booking_completed"
  | "review_reminder_parent"
  | "review_reminder_friend";

type SendBookingEmailInput = {
  type: BookingEmailType;
  role: EmailRecipientRole;
  userId: string;
  data: EmailTemplateContext;
  requestId?: string | null;
  bookingId?: string | null;
  /** When set, review reminders are queued for later (default 12h). */
  scheduleReviewAt?: Date;
};

function toEventType(type: BookingEmailType): EmailEventType {
  return type;
}

export function sendBookingEmail(input: SendBookingEmailInput): void {
  const eventType = toEventType(input.type);
  const payload: SendTransactionalEmailInput = {
    eventType,
    userId: input.userId,
    context: { ...input.data, recipientRole: input.role },
    requestId: input.requestId ?? null,
    bookingId: input.bookingId ?? null,
  };

  const isReview =
    eventType === "review_reminder_parent" || eventType === "review_reminder_friend";

  if (isReview && input.scheduleReviewAt) {
    void scheduleTransactionalEmail({
      ...payload,
      scheduledFor: input.scheduleReviewAt,
    });
    return;
  }

  queueEmailEvent(payload);
}
