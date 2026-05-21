import type { MembershipPlanDefinition } from "@/lib/membership";

/** Env var per catalog plan_id (TEST mode Stripe Price ids). */
export const STRIPE_PRICE_ENV_BY_PLAN_ID: Record<string, string> = {
  "one-time-owner": "STRIPE_PRICE_ONE_TIME_OWNER",
  "3-month-owner": "STRIPE_PRICE_3_MONTH_OWNER",
  "1-year-owner": "STRIPE_PRICE_1_YEAR_OWNER",
  "one-time-friend": "STRIPE_PRICE_ONE_TIME_FRIEND",
  "3-month-friend": "STRIPE_PRICE_3_MONTH_FRIEND",
  "1-year-friend": "STRIPE_PRICE_1_YEAR_FRIEND",
};

export function resolveStripePriceId(planId: string): string | null {
  const envName = STRIPE_PRICE_ENV_BY_PLAN_ID[planId];
  if (!envName) return null;
  const value = process.env[envName]?.trim();
  return value || null;
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
