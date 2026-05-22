import "server-only";

import type Stripe from "stripe";
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

/** Pre-2026-05 rename env vars — read as fallback when canonical vars are unset. */
const LEGACY_STRIPE_PRICE_ENV_BY_PLAN_ID: Record<string, string> = {
  "one-time-owner": "STRIPE_PRICE_ONE_TIME_OWNER",
  "3-month-owner": "STRIPE_PRICE_3_MONTH_OWNER",
  "1-year-owner": "STRIPE_PRICE_1_YEAR_OWNER",
  "one-time-friend": "STRIPE_PRICE_ONE_TIME_FRIEND",
  "3-month-friend": "STRIPE_PRICE_3_MONTH_FRIEND",
  "1-year-friend": "STRIPE_PRICE_1_YEAR_FRIEND",
};

export function stripePriceEnvVarForPlanId(planId: string): string | null {
  return STRIPE_PRICE_ENV_BY_PLAN_ID[planId] ?? null;
}

function readEnvPrice(envName: string): string | null {
  const value = process.env[envName]?.trim();
  return value || null;
}

export function resolveStripePriceId(planId: string): string | null {
  const envName = stripePriceEnvVarForPlanId(planId);
  if (!envName) return null;
  const canonical = readEnvPrice(envName);
  if (canonical) return canonical;
  const legacyEnv = LEGACY_STRIPE_PRICE_ENV_BY_PLAN_ID[planId];
  if (!legacyEnv) return null;
  return readEnvPrice(legacyEnv);
}

/** Last 4 chars of a Stripe price id for logs (never log full id). */
export function stripePriceIdSuffix(priceId: string): string {
  const trimmed = priceId.trim();
  if (trimmed.length <= 4) return trimmed || "????";
  return trimmed.slice(-4);
}

export function isValidStripePriceIdFormat(priceId: string): boolean {
  const trimmed = priceId.trim();
  return trimmed.startsWith("price_") && trimmed.length > 10;
}

export function stripeCheckoutPriceError(planId: string, priceId: string | null): string | null {
  if (!priceId?.trim()) {
    const envName = stripePriceEnvVarForPlanId(planId);
    if (!envName) return `Unknown plan: ${planId}`;
    return `Missing or invalid price ID for ${planId} (set ${envName})`;
  }
  if (!isValidStripePriceIdFormat(priceId)) {
    const envName = stripePriceEnvVarForPlanId(planId) ?? "STRIPE_PRICE_*";
    return `Missing or invalid price ID for ${planId} (${envName} must be a Stripe price_… id, got …${stripePriceIdSuffix(priceId)})`;
  }
  return null;
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
  if (!resolveStripePriceId(planId)) {
    const priceEnv = stripePriceEnvVarForPlanId(planId);
    return priceEnv ?? planId;
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
  if (missing === "STRIPE_SECRET_KEY" || missing === "NEXT_PUBLIC_SITE_URL") {
    return `Missing ${missing}`;
  }
  if (missing) {
    const envName = stripePriceEnvVarForPlanId(planId);
    return `Missing or invalid price ID for ${planId} (set ${envName ?? missing})`;
  }
  return stripeCheckoutPriceError(planId, resolveStripePriceId(planId));
}

/** Ensures Stripe Price type matches checkout mode (payment vs subscription). */
export async function validateStripePriceForCheckout(
  stripe: Stripe,
  planId: string,
  priceId: string,
  mode: "payment" | "subscription",
): Promise<string | null> {
  const formatError = stripeCheckoutPriceError(planId, priceId);
  if (formatError) return formatError;

  const envName = stripePriceEnvVarForPlanId(planId) ?? "STRIPE_PRICE_*";
  try {
    const price = await stripe.prices.retrieve(priceId);
    const isRecurring = price.type === "recurring";
    if (mode === "payment" && isRecurring) {
      return `Missing or invalid price ID for ${planId}: ${envName} must be a one-time Stripe price (found recurring). Use mode payment for one-time plans.`;
    }
    if (mode === "subscription" && !isRecurring) {
      return `Missing or invalid price ID for ${planId}: ${envName} must be a recurring subscription price (found one-time). Use mode subscription for 3-month and 1-year plans.`;
    }
    return null;
  } catch {
    return `Missing or invalid price ID for ${planId}: ${envName} price …${stripePriceIdSuffix(priceId)} not found in Stripe.`;
  }
}

export function logStripeCheckoutPlanResolution(
  context: string,
  planId: string,
  role: MembershipRole,
): void {
  const envName = stripePriceEnvVarForPlanId(planId);
  const priceId = resolveStripePriceId(planId);
  const billingInterval = billingIntervalFromPlanId(planId);
  const mode = stripeCheckoutMode(billingInterval);
  console.log(`[stripe:${context}] checkout plan`, {
    planId,
    role,
    envVar: envName,
    priceConfigured: Boolean(priceId),
    priceSuffix: priceId ? stripePriceIdSuffix(priceId) : null,
    priceFormatOk: priceId ? isValidStripePriceIdFormat(priceId) : false,
    mode,
    billingInterval,
  });
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
