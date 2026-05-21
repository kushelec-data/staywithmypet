import { requestSentTemplate } from "@/lib/emails/templates/booking/request-sent";
import { requestReceivedTemplate } from "@/lib/emails/templates/booking/request-received";
import {
  requestDeclinedByYouTemplate,
  requestDeclinedNotifyTemplate,
} from "@/lib/emails/templates/booking/request-declined";
import { bookingConfirmedTemplate } from "@/lib/emails/templates/booking/confirmed";
import { bookingCompletedTemplate } from "@/lib/emails/templates/booking/completed";
import { reviewReminderParentTemplate } from "@/lib/emails/templates/reviews/parent-reviews-friend";
import { reviewReminderFriendTemplate } from "@/lib/emails/templates/reviews/friend-reviews-parent";
import { welcomePetParentTemplate } from "@/lib/emails/templates/welcome/pet-parent";
import { welcomePetFriendTemplate } from "@/lib/emails/templates/welcome/pet-friend";
import { emailVerifiedTemplate } from "@/lib/emails/templates/verification/email-verified";
import { phoneVerifiedTemplate } from "@/lib/emails/templates/verification/phone-verified";
import { profileCompletedTemplate } from "@/lib/emails/templates/verification/profile-complete";
import { membershipActivatedTemplate } from "@/lib/emails/templates/membership/activated";
import { membershipRenewalReminderTemplate } from "@/lib/emails/templates/membership/renewal-reminder";
import { membershipExpiryReminderTemplate } from "@/lib/emails/templates/membership/expiry-reminder";
import type { EmailEventType, EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export type { EmailEventType, EmailTemplate, EmailTemplateContext, EmailRecipientRole } from "@/lib/emails/types";

export function buildEmailTemplate(
  eventType: EmailEventType,
  ctx: EmailTemplateContext,
): EmailTemplate {
  switch (eventType) {
    case "welcome_pet_parent":
      return welcomePetParentTemplate(ctx);
    case "welcome_pet_friend":
      return welcomePetFriendTemplate(ctx);
    case "email_verified":
      return emailVerifiedTemplate(ctx);
    case "phone_verified":
      return phoneVerifiedTemplate(ctx);
    case "profile_completed":
      return profileCompletedTemplate(ctx);
    case "request_sent":
      return requestSentTemplate(ctx);
    case "request_received":
      return requestReceivedTemplate(ctx);
    case "request_declined_by_you":
      return requestDeclinedByYouTemplate(ctx);
    case "request_declined":
      return requestDeclinedNotifyTemplate(ctx);
    case "booking_confirmed":
      return bookingConfirmedTemplate(ctx);
    case "booking_completed":
      return bookingCompletedTemplate(ctx);
    case "review_reminder_parent":
      return reviewReminderParentTemplate(ctx);
    case "review_reminder_friend":
      return reviewReminderFriendTemplate(ctx);
    case "membership_activated":
      return membershipActivatedTemplate(ctx);
    case "membership_renewal_reminder":
      return membershipRenewalReminderTemplate(ctx);
    case "membership_expiry_reminder":
      return membershipExpiryReminderTemplate(ctx);
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

export function defaultUniqueKey(
  eventType: EmailEventType,
  userId: string,
  options?: { requestId?: string; bookingId?: string },
): string {
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
    case "request_sent":
      return `request_sent_${options?.requestId ?? "unknown"}_${userId}`;
    case "request_received":
      return `request_received_${options?.requestId ?? "unknown"}_${userId}`;
    case "request_declined_by_you":
      return `request_declined_by_you_${options?.requestId ?? "unknown"}_${userId}`;
    case "request_declined":
      return `request_declined_${options?.requestId ?? "unknown"}_${userId}`;
    case "booking_confirmed":
      return `booking_confirmed_${options?.bookingId ?? "unknown"}_${userId}`;
    case "booking_completed":
      return `booking_completed_${options?.bookingId ?? "unknown"}_${userId}`;
    case "review_reminder_parent":
      return `review_reminder_parent_${options?.bookingId ?? "unknown"}_${userId}`;
    case "review_reminder_friend":
      return `review_reminder_friend_${options?.bookingId ?? "unknown"}_${userId}`;
    case "membership_activated":
      return `membership_activated_${options?.requestId ?? userId}`;
    case "membership_renewal_reminder":
      return `membership_renewal_${options?.requestId ?? userId}`;
    case "membership_expiry_reminder":
      return `membership_expiry_${options?.requestId ?? userId}`;
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

/** @deprecated Legacy alias — use `review_reminder_parent` / `review_reminder_friend`. */
export type LegacyEmailEventType = "request_accepted" | "review_reminder";
