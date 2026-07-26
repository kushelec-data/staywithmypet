import "server-only";

import {
  sendTransactionalEmail,
  type EmailTemplateContext,
} from "@/lib/email-send";
import {
  membershipActivationEmailUniqueKey,
  membershipEmailContext as buildMembershipEmailContext,
} from "@/lib/membership-email-content";
import type { UserMembership } from "@/lib/membership";

export { membershipEmailContext } from "@/lib/membership-email-content";

function logMembershipActivationEmailFailure(
  membership: UserMembership,
  userId: string,
  uniqueKey: string,
  reason: string,
): void {
  console.error("[membership-email] activation send failed", {
    plan_id: membership.plan_id,
    user_id: userId,
    membership_role: membership.role,
    email_event_key: uniqueKey,
    reason,
  });
}

export function triggerMembershipConfirmationEmail(
  userId: string,
  membership: UserMembership,
  recipientName?: string,
): void {
  const uniqueKey = membershipActivationEmailUniqueKey(membership);
  const context: EmailTemplateContext = buildMembershipEmailContext(membership, recipientName);

  void sendTransactionalEmail({
    eventType: "membership_activated",
    userId,
    uniqueKey,
    requestId: membership.stripe_checkout_session_id ?? membership.id,
    context,
  })
    .then((result) => {
      if (result.sent) return;
      if (result.skipped && result.reason === "duplicate") return;
      if (result.skipped && result.reason === "no_api_key") return;

      const reason = result.reason ?? "unknown";
      logMembershipActivationEmailFailure(membership, userId, uniqueKey, reason);
    })
    .catch((err) => {
      logMembershipActivationEmailFailure(
        membership,
        userId,
        uniqueKey,
        err instanceof Error ? err.message : String(err),
      );
    });
}

export function triggerMembershipExpiryReminderEmail(
  userId: string,
  membership: UserMembership,
  recipientName?: string,
): void {
  void sendTransactionalEmail({
    eventType: "membership_expiry_reminder",
    userId,
    requestId: membership.id,
    context: buildMembershipEmailContext(membership, recipientName),
  }).catch((err) => {
    console.error("[membership-email] expiry reminder queue failed", {
      plan_id: membership.plan_id,
      user_id: userId,
      membership_role: membership.role,
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

export function triggerMembershipRenewalReminderEmail(
  userId: string,
  membership: UserMembership,
  recipientName?: string,
): void {
  void sendTransactionalEmail({
    eventType: "membership_renewal_reminder",
    userId,
    requestId: membership.id,
    context: buildMembershipEmailContext(membership, recipientName),
  }).catch((err) => {
    console.error("[membership-email] renewal reminder queue failed", {
      plan_id: membership.plan_id,
      user_id: userId,
      membership_role: membership.role,
      message: err instanceof Error ? err.message : String(err),
    });
  });
}
