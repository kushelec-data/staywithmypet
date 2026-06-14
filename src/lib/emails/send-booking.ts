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
  | "review_reminder_friend"
  | "booking_starts_tomorrow_parent"
  | "booking_starts_tomorrow_friend";

type SendBookingEmailInput = {
  type: BookingEmailType;
  role: EmailRecipientRole;
  userId: string;
  data: EmailTemplateContext;
  requestId?: string | null;
  bookingId?: string | null;
  /** When set, email is queued for later delivery. */
  scheduleAt?: Date;
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

  if (input.scheduleAt) {
    void scheduleTransactionalEmail({
      ...payload,
      scheduledFor: input.scheduleAt,
    });
    return;
  }

  queueEmailEvent(payload);
}
