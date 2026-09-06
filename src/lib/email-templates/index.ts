import type { EmailEventType, EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";
import {
  buildBookingCompletedEmail,
  buildBookingConfirmedEmail,
  buildBookingStartsTomorrowFriendEmail,
  buildBookingStartsTomorrowParentEmail,
  buildRequestDeclinedByYouEmail,
  buildRequestDeclinedNotifyEmail,
  buildRequestReceivedEmail,
  buildRequestSentEmail,
  buildReviewReminderFriendEmail,
  buildReviewReminderParentEmail,
} from "@/lib/email-templates/booking-emails";
import { buildMatchDigestEmail } from "@/lib/email-templates/match-digest";
import type { EmailLocale } from "@/lib/email-templates/locale";
import {
  buildMembershipActivatedEmail,
  buildMembershipExpiryReminderEmail,
  buildMembershipRenewalReminderEmail,
  buildNewMessageEmail,
  buildProfileCompletedEmail,
  buildProfileVerifiedEmail,
} from "@/lib/email-templates/platform-emails";

export function buildAutomatedEmailTemplate(
  eventType: EmailEventType,
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  switch (eventType) {
    case "profile_completed":
      return buildProfileCompletedEmail(ctx, locale);
    case "profile_verified":
      return buildProfileVerifiedEmail(ctx, locale);
    case "membership_activated":
      return buildMembershipActivatedEmail(ctx, locale);
    case "membership_renewal_reminder":
      return buildMembershipRenewalReminderEmail(ctx, locale);
    case "membership_expiry_reminder":
      return buildMembershipExpiryReminderEmail(ctx, locale);
    case "new_message":
      return buildNewMessageEmail(ctx, locale);
    case "request_sent":
      return buildRequestSentEmail(ctx, locale);
    case "request_received":
      return buildRequestReceivedEmail(ctx, locale);
    case "request_declined_by_you":
      return buildRequestDeclinedByYouEmail(ctx, locale);
    case "request_declined":
      return buildRequestDeclinedNotifyEmail(ctx, locale);
    case "booking_confirmed":
      return buildBookingConfirmedEmail(ctx, locale);
    case "booking_completed":
      return buildBookingCompletedEmail(ctx, locale);
    case "review_reminder_parent":
      return buildReviewReminderParentEmail(ctx, locale);
    case "review_reminder_friend":
      return buildReviewReminderFriendEmail(ctx, locale);
    case "booking_starts_tomorrow_parent":
      return buildBookingStartsTomorrowParentEmail(ctx, locale);
    case "booking_starts_tomorrow_friend":
      return buildBookingStartsTomorrowFriendEmail(ctx, locale);
    case "match_digest":
      return buildMatchDigestEmail(ctx, locale);
    default:
      throw new Error(`[email-templates] no automated template for event: ${eventType}`);
  }
}

export {
  buildProfileCompletedEmail,
  buildProfileVerifiedEmail,
  buildMembershipActivatedEmail,
  buildMembershipRenewalReminderEmail,
  buildMembershipExpiryReminderEmail,
  buildNewMessageEmail,
} from "@/lib/email-templates/platform-emails";
export {
  buildRequestSentEmail,
  buildRequestReceivedEmail,
  buildRequestDeclinedByYouEmail,
  buildRequestDeclinedNotifyEmail,
  buildBookingConfirmedEmail,
  buildBookingCompletedEmail,
  buildReviewReminderParentEmail,
  buildReviewReminderFriendEmail,
  buildBookingStartsTomorrowParentEmail,
  buildBookingStartsTomorrowFriendEmail,
} from "@/lib/email-templates/booking-emails";
export { resolveEmailLocale } from "@/lib/email-templates/locale";
