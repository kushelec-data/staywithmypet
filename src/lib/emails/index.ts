import { buildAutomatedEmailTemplate } from "@/lib/email-templates";
import type { EmailLocale } from "@/lib/email-templates/locale";
import { welcomePetParentTemplate } from "@/lib/emails/templates/welcome/pet-parent";
import { welcomePetFriendTemplate } from "@/lib/emails/templates/welcome/pet-friend";
import {
  requestCancelledByYouTemplate,
  requestCancelledNotifyTemplate,
} from "@/lib/emails/templates/booking/request-cancelled";
import { emailVerifiedTemplate } from "@/lib/emails/templates/verification/email-verified";
import { phoneVerifiedTemplate } from "@/lib/emails/templates/verification/phone-verified";
import type { EmailEventType, EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export type { EmailEventType, EmailTemplate, EmailTemplateContext, EmailRecipientRole } from "@/lib/emails/types";

const AUTOMATED_EXCEL_E_EVENTS = new Set<EmailEventType>([
  "profile_completed",
  "profile_verified",
  "membership_activated",
  "membership_renewal_reminder",
  "membership_expiry_reminder",
  "new_message",
  "request_sent",
  "request_received",
  "request_declined_by_you",
  "request_declined",
  "booking_confirmed",
  "booking_completed",
  "review_reminder_parent",
  "review_reminder_friend",
  "booking_starts_tomorrow_parent",
  "booking_starts_tomorrow_friend",
]);

export function buildEmailTemplate(
  eventType: EmailEventType,
  ctx: EmailTemplateContext,
  locale: EmailLocale = ctx.locale ?? "en",
): EmailTemplate {
  if (AUTOMATED_EXCEL_E_EVENTS.has(eventType)) {
    return buildAutomatedEmailTemplate(eventType, ctx, locale);
  }

  if (eventType === "welcome_pet_parent") return welcomePetParentTemplate(ctx);
  if (eventType === "welcome_pet_friend") return welcomePetFriendTemplate(ctx);
  if (eventType === "email_verified") return emailVerifiedTemplate(ctx);
  if (eventType === "phone_verified") return phoneVerifiedTemplate(ctx);
  if (eventType === "request_cancelled_by_you") {
    return requestCancelledByYouTemplate(ctx, locale);
  }
  if (eventType === "request_cancelled") {
    return requestCancelledNotifyTemplate(ctx, locale);
  }

  throw new Error(`[emails] unsupported event type: ${eventType}`);
}

export function defaultUniqueKey(
  eventType: EmailEventType,
  userId: string,
  options?: {
    requestId?: string;
    bookingId?: string;
    conversationId?: string;
    messageId?: string;
    uniqueKey?: string;
  },
): string {
  if (options?.uniqueKey?.trim()) return options.uniqueKey.trim();

  switch (eventType) {
    case "welcome_pet_parent":
      return `welcome_pet_parent_${userId}`;
    case "welcome_pet_friend":
      return `welcome_pet_friend_${userId}`;
    case "email_verified":
      return `email_verified_${userId}`;
    case "phone_verified":
      return `phone_verified_${userId}`;
    case "profile_completed":
      return `profile_completed_${userId}`;
    case "profile_verified":
      return `profile_verified_${userId}`;
    case "request_sent":
      return `request_sent_${options?.requestId ?? "unknown"}_${userId}`;
    case "request_received":
      return `request_received_${options?.requestId ?? "unknown"}_${userId}`;
    case "request_declined_by_you":
      return `request_declined_by_you_${options?.requestId ?? "unknown"}_${userId}`;
    case "request_declined":
      return `request_declined_${options?.requestId ?? "unknown"}_${userId}`;
    case "request_cancelled_by_you":
      return `request_cancelled_by_you_${options?.requestId ?? "unknown"}_${userId}`;
    case "request_cancelled":
      return `request_cancelled_${options?.requestId ?? "unknown"}_${userId}`;
    case "booking_confirmed":
      return `booking_confirmed_${options?.bookingId ?? "unknown"}_${userId}`;
    case "booking_completed":
      return `booking_completed_${options?.bookingId ?? "unknown"}_${userId}`;
    case "review_reminder_parent":
      return `review_reminder_parent_${options?.bookingId ?? "unknown"}_${userId}`;
    case "review_reminder_friend":
      return `review_reminder_friend_${options?.bookingId ?? "unknown"}_${userId}`;
    case "booking_starts_tomorrow_parent":
      return `booking_starts_tomorrow_parent_${options?.bookingId ?? "unknown"}_${userId}`;
    case "booking_starts_tomorrow_friend":
      return `booking_starts_tomorrow_friend_${options?.bookingId ?? "unknown"}_${userId}`;
    case "membership_activated":
      return `membership_activated_${options?.requestId ?? userId}`;
    case "membership_renewal_reminder":
      return `membership_renewal_${options?.requestId ?? userId}`;
    case "membership_expiry_reminder":
      return `membership_expiry_${options?.requestId ?? userId}`;
    case "new_message":
      return `new_message_${options?.conversationId ?? "unknown"}_${options?.messageId ?? userId}`;
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

/** @deprecated Legacy alias — use `review_reminder_parent` / `review_reminder_friend`. */
export type LegacyEmailEventType = "request_accepted" | "review_reminder";
