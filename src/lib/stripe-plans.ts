import "server-only";

import {
  MEMBERSHIP_PLAN_CATALOG,
  type MembershipPlanDefinition,
  type MembershipRole,
} from "@/lib/membership";

export type StripeCheckoutReadiness = {
  ready: boolean;
  message: string | null;
};

/**
 * Catalog plan_id → Stripe Price env var.
 * PARENT = pet_parent (owner), FRIEND = pet_friend.
 * 1M = one-time, 3M = 3-month, 12M = 12-month.
 */
export const STRIPE_PRICE_ENV_BY_PLAN_ID: Record<string, string> = {
  "one-time-owner": "STRIPE_PRICE_PARENT_1M",
  "3-month-owner": "STRIPE_PRICE_PARENT_3M",
  "1-year-owner": "STRIPE_PRICE_PARENT_12M",
  "one-time-friend": "STRIPE_PRICE_FRIEND_1M",
  "3-month-friend": "STRIPE_PRICE_FRIEND_3M",
  "1-year-friend": "STRIPE_PRICE_FRIEND_12M",
};

export function stripePriceEnvVarForPlanId(planId: string): string | null {
  return STRIPE_PRICE_ENV_BY_PLAN_ID[planId] ?? null;
}

export function resolveStripePriceId(planId: string): string | null {
  const envName = stripePriceEnvVarForPlanId(planId);
  if (!envName) return null;
  const value = process.env[envName]?.trim();
  return value || null;
}

/** Reverse lookup: Stripe Price id → catalog plan_id (from STRIPE_PRICE_* env vars). */
export function planIdFromStripePriceId(priceId: string): string | null {
  const trimmed = priceId.trim();
  if (!trimmed) return null;
  for (const [planId, envName] of Object.entries(STRIPE_PRICE_ENV_BY_PLAN_ID)) {
    if (process.env[envName]?.trim() === trimmed) return planId;
  }
  return null;
}

export function membershipRoleFromPlanId(planId: string): MembershipRole | null {
  if (planId.endsWith("-friend")) return "pet_friend";
  if (planId.endsWith("-owner")) return "pet_parent";
  return null;
}

/** First missing env var required for checkout (secret, site URL, plan price). */
export function missingStripeCheckoutEnv(planId: string): string | null {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return "STRIPE_SECRET_KEY";
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return "NEXT_PUBLIC_SITE_URL";
  }
  const priceEnv = stripePriceEnvVarForPlanId(planId);
  if (!priceEnv) {
    return null;
  }
  if (!process.env[priceEnv]?.trim()) {
    return priceEnv;
  }
  return null;
}

/** Per-plan checkout config errors for a membership role (server-only). */
export function stripeCheckoutErrorsForRole(role: MembershipRole): Record<string, string | null> {
  const errors: Record<string, string | null> = {};
  for (const plan of MEMBERSHIP_PLAN_CATALOG[role]) {
    errors[plan.id] = stripeCheckoutConfigError(plan.id);
  }
  return errors;
}

/** True when secret, site URL, and all plan price env vars exist for the role. */
export function stripeCheckoutReadyForRole(role: MembershipRole): StripeCheckoutReadiness {
  for (const plan of MEMBERSHIP_PLAN_CATALOG[role]) {
    const err = stripeCheckoutConfigError(plan.id);
    if (err) return { ready: false, message: err };
  }
  return { ready: true, message: null };
}

export function stripeCheckoutConfigError(planId: string): string | null {
  const missing = missingStripeCheckoutEnv(planId);
  if (!missing) return null;
  return `Missing ${missing}`;
}

export function stripeCheckoutMode(
  billingInterval: MembershipPlanDefinition["billing_interval"],
): "payment" | "subscription" {
  return billingInterval === "one_time" ? "payment" : "subscription";
}

export function computeMembershipEndDate(
  billingInterval: MembershipPlanDefinition["billing_interval"],
  start: Date,
): string | null {
  if (billingInterval === "one_time") return null;
  const end = new Date(start);
  if (billingInterval === "3_months") {
    end.setMonth(end.getMonth() + 3);
  } else if (billingInterval === "12_months") {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end.toISOString();
}

export function billingIntervalFromPlanId(planId: string): MembershipPlanDefinition["billing_interval"] {
  if (planId.startsWith("one-time")) return "one_time";
  if (planId.includes("3-month")) return "3_months";
  return "12_months";
}

export function membershipPlansWithStripePrices<T extends { plan_id: string; future_stripe_price_id: string | null }>(
  plans: readonly T[],
): T[] {
  return plans.map((plan) => ({
    ...plan,
    future_stripe_price_id: resolveStripePriceId(plan.plan_id) ?? plan.future_stripe_price_id,
  }));
}
