import {
  MEMBERSHIP_PLAN_CATALOG,
  membershipPlanLabel,
  membershipPlanPrice,
  membershipRoleTitle,
  PLAN_BILLING_INTERVAL,
  resolvePlanName,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";
import type { EmailTemplateContext } from "@/lib/emails/types";

export type MembershipEmailLocale = "en" | "et";

const PLAN_DISPLAY_NAME: Record<
  MembershipEmailLocale,
  Record<"one_time" | "3_months" | "12_months", string>
> = {
  en: {
    one_time: "One Time",
    "3_months": "3 Month",
    "12_months": "1 Year",
  },
  et: {
    one_time: "Ühekordne",
    "3_months": "3 kuud",
    "12_months": "1 aasta",
  },
};

const ROLE_DISPLAY_NAME: Record<MembershipEmailLocale, Record<MembershipRole, string>> = {
  en: {
    pet_parent: "Pet Parent",
    pet_friend: "Pet Friend",
  },
  et: {
    pet_parent: "Loomaomanik",
    pet_friend: "Loomasõber",
  },
};

const AUTO_RENEW_LABEL: Record<MembershipEmailLocale, { yes: string; no: string }> = {
  en: { yes: "Yes", no: "No" },
  et: { yes: "Jah", no: "Ei" },
};

const PRICE_PERIOD_SUFFIX: Record<
  MembershipEmailLocale,
  Record<"3_months" | "12_months", string>
> = {
  en: {
    "3_months": "per 3 months",
    "12_months": "per year",
  },
  et: {
    "3_months": "3 kuu eest",
    "12_months": "aasta eest",
  },
};

function billingIntervalForPlan(planId: string): "one_time" | "3_months" | "12_months" | null {
  return PLAN_BILLING_INTERVAL[planId.trim()] ?? null;
}

export function membershipPlanDisplayName(
  planId: string,
  locale: MembershipEmailLocale = "en",
): string {
  const interval = billingIntervalForPlan(planId);
  if (interval) return PLAN_DISPLAY_NAME[locale][interval];
  return resolvePlanName("pet_parent", planId);
}

export function membershipRoleDisplayName(
  role: MembershipRole,
  locale: MembershipEmailLocale = "en",
): string {
  return ROLE_DISPLAY_NAME[locale][role] ?? membershipRoleTitle(role);
}

export function membershipAutoRenewDisplay(
  autoRenew: boolean,
  locale: MembershipEmailLocale = "en",
): string {
  return autoRenew ? AUTO_RENEW_LABEL[locale].yes : AUTO_RENEW_LABEL[locale].no;
}

/** Formatted price line for activation emails (no placeholder dashes). */
export function membershipPriceDisplay(
  planId: string,
  locale: MembershipEmailLocale = "en",
): string {
  const price = membershipPlanPrice(planId);
  if (!price) return "";

  const interval = billingIntervalForPlan(planId);
  if (!interval || interval === "one_time") return price;

  const suffix = PRICE_PERIOD_SUFFIX[locale][interval];
  return `${price} ${suffix}`;
}

export function membershipActivationEmailUniqueKey(membership: UserMembership): string {
  const checkoutSessionId = membership.stripe_checkout_session_id?.trim();
  if (checkoutSessionId) {
    return `membership_activated_${checkoutSessionId}`;
  }
  return `membership_activated_${membership.id}`;
}

function normalizeEmailDate(value: string | null | undefined): string | null | undefined {
  if (!value?.trim()) return value;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return trimmed;
}

export function membershipEmailContext(
  membership: UserMembership,
  recipientName?: string,
  locale: MembershipEmailLocale = "en",
): EmailTemplateContext {
  const planId = membership.plan_id.trim();
  const catalogPlan = MEMBERSHIP_PLAN_CATALOG[membership.role].find((p) => p.id === planId);
  const planName =
    membershipPlanLabel(membership) ??
    catalogPlan?.name ??
    membershipPlanDisplayName(planId, locale);

  return {
    recipientName,
    recipientRole: membership.role,
    locale,
    packageName: planName,
    membershipPrice: membershipPriceDisplay(planId, locale),
    membershipRoleLabel: membershipRoleDisplayName(membership.role, locale),
    dateFrom: normalizeEmailDate(membership.start_date) ?? membership.start_date,
    membershipEndDate: normalizeEmailDate(membership.end_date) ?? membership.end_date,
    renewalDate: membership.auto_renew ? normalizeEmailDate(membership.end_date) : null,
    autoRenew: Boolean(membership.auto_renew),
  };
}
