import "server-only";

import { queueEmailEvent, type EmailTemplateContext } from "@/lib/email-send";
import {
  MEMBERSHIP_PLAN_CATALOG,
  membershipPlanLabel,
  resolvePlanName,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";

function planPriceFromCatalog(role: MembershipRole, planId: string): string {
  const prices: Record<string, string> = {
    "one-time-owner": "€18",
    "3-month-owner": "€79",
    "1-year-owner": "€249",
    "one-time-friend": "€12",
    "3-month-friend": "€49",
    "1-year-friend": "€119",
  };
  return prices[planId] ?? "—";
}

export function membershipEmailContext(
  membership: UserMembership,
  recipientName?: string,
): EmailTemplateContext {
  const planName =
    membershipPlanLabel(membership) ?? resolvePlanName(membership.role, membership.plan_id);
  const catalog = MEMBERSHIP_PLAN_CATALOG[membership.role];
  const billingPeriod =
    catalog.find((p) => p.id === membership.plan_id)?.billingPeriod ?? "period";

  return {
    recipientName,
    packageName: `${planName} (${planPriceFromCatalog(membership.role, membership.plan_id)} per ${billingPeriod})`,
    dateFrom: membership.start_date,
    membershipEndDate: membership.end_date,
    renewalDate: membership.auto_renew ? membership.end_date : null,
    autoRenew: Boolean(membership.auto_renew),
  };
}

export function triggerMembershipConfirmationEmail(
  userId: string,
  membership: UserMembership,
  recipientName?: string,
): void {
  queueEmailEvent({
    eventType: "membership_activated",
    userId,
    requestId: membership.id,
    context: membershipEmailContext(membership, recipientName),
  });
}

export function triggerMembershipExpiryReminderEmail(
  userId: string,
  membership: UserMembership,
  recipientName?: string,
): void {
  queueEmailEvent({
    eventType: "membership_expiry_reminder",
    userId,
    requestId: membership.id,
    context: membershipEmailContext(membership, recipientName),
  });
}

export function triggerMembershipRenewalReminderEmail(
  userId: string,
  membership: UserMembership,
  recipientName?: string,
): void {
  queueEmailEvent({
    eventType: "membership_renewal_reminder",
    userId,
    requestId: membership.id,
    context: membershipEmailContext(membership, recipientName),
  });
}
