import { buildEmailFromExcelColumnE } from "@/lib/email-templates/render-excel-e";
import type { EmailLocale } from "@/lib/email-templates/locale";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

/** Excel Column E rows 12–13 — Request sent (Pet Parent) */
function requestSentParent(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "request_sent_parent_subject",
    "request_sent_parent_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 15–16 — Request sent (Pet Friend) */
function requestSentFriend(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "request_sent_friend_subject",
    "request_sent_friend_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 19–20 — Request received (Pet Parent) */
function requestReceivedParent(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "request_received_parent_subject",
    "request_received_parent_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 22–23 — Request received (Pet Friend) */
function requestReceivedFriend(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "request_received_friend_subject",
    "request_received_friend_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 25–26 — Declined by you (Pet Parent) */
function requestDeclinedByYouParent(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "declined_by_you_parent_subject",
    "declined_by_you_parent_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 28–29 — Declined by you (Pet Friend) */
function requestDeclinedByYouFriend(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "declined_by_you_friend_subject",
    "declined_by_you_friend_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 31–32 — Declined notify (Pet Parent) */
function requestDeclinedNotifyParent(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "declined_notify_parent_subject",
    "declined_notify_parent_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 34–35 — Declined notify (Pet Friend) */
function requestDeclinedNotifyFriend(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "declined_notify_friend_subject",
    "declined_notify_friend_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 38–39 — Booking confirmed (Pet Parent) */
function bookingConfirmedParent(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "confirmed_parent_subject",
    "confirmed_parent_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 41–42 — Booking confirmed (Pet Friend) */
function bookingConfirmedFriend(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "confirmed_friend_subject",
    "confirmed_friend_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 45–46 — Review reminder (Pet Parent) */
function reviewReminderParent(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE("review_parent_subject", "review_parent_body", ctx, locale);
}

/** Excel Column E rows 48–49 — Review reminder (Pet Friend) */
function reviewReminderFriend(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return buildEmailFromExcelColumnE("review_friend_subject", "review_friend_body", ctx, locale);
}

/** Excel Column E rows 57–58 — Booking starts tomorrow (Pet Parent) */
export function buildBookingStartsTomorrowParentEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "booking_tomorrow_subject",
    "booking_tomorrow_parent_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 57, 61 — Booking starts tomorrow (Pet Friend) */
export function buildBookingStartsTomorrowFriendEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "booking_tomorrow_subject",
    "booking_tomorrow_friend_body",
    ctx,
    locale,
  );
}

export function buildRequestSentEmail(ctx: EmailTemplateContext, locale: EmailLocale): EmailTemplate {
  return ctx.recipientRole === "pet_friend"
    ? requestSentFriend(ctx, locale)
    : requestSentParent(ctx, locale);
}

export function buildRequestReceivedEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return ctx.recipientRole === "pet_friend"
    ? requestReceivedFriend(ctx, locale)
    : requestReceivedParent(ctx, locale);
}

export function buildRequestDeclinedByYouEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return ctx.recipientRole === "pet_friend"
    ? requestDeclinedByYouFriend(ctx, locale)
    : requestDeclinedByYouParent(ctx, locale);
}

export function buildRequestDeclinedNotifyEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return ctx.recipientRole === "pet_friend"
    ? requestDeclinedNotifyFriend(ctx, locale)
    : requestDeclinedNotifyParent(ctx, locale);
}

export function buildBookingConfirmedEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return ctx.recipientRole === "pet_friend"
    ? bookingConfirmedFriend(ctx, locale)
    : bookingConfirmedParent(ctx, locale);
}

export function buildReviewReminderParentEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return reviewReminderParent(ctx, locale);
}

export function buildReviewReminderFriendEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return reviewReminderFriend(ctx, locale);
}

/** Excel section 5 — completion uses review templates */
export function buildBookingCompletedEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return ctx.recipientRole === "pet_friend"
    ? reviewReminderFriend(ctx, locale)
    : reviewReminderParent(ctx, locale);
}
