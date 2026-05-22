import "server-only";

import type Stripe from "stripe";
import {
  MEMBERSHIP_PLAN_CATALOG,
  PLAN_BILLING_INTERVAL,
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

/** Resolve request/catalog plan id to a known MEMBERSHIP_PLAN_CATALOG id. */
export function normalizeCatalogPlanId(planId: string): string | null {
  const trimmed = planId.trim();
  if (!trimmed) return null;
  if (STRIPE_PRICE_ENV_BY_PLAN_ID[trimmed]) return trimmed;
  const lower = trimmed.toLowerCase();
  for (const role of Object.keys(MEMBERSHIP_PLAN_CATALOG) as MembershipRole[]) {
    const match = MEMBERSHIP_PLAN_CATALOG[role].find((p) => p.id === trimmed || p.id.toLowerCase() === lower);
    if (match) return match.id;
  }
  return null;
}

function stripeEnvSuffixForBillingInterval(
  billingInterval: MembershipPlanDefinition["billing_interval"],
): "1M" | "3M" | "12M" | null {
  if (billingInterval === "one_time") return "1M";
  if (billingInterval === "3_months") return "3M";
  if (billingInterval === "12_months") return "12M";
  return null;
}

export function stripePriceEnvVarForPlanId(planId: string): string | null {
  const catalogPlanId = normalizeCatalogPlanId(planId);
  if (catalogPlanId) {
    return STRIPE_PRICE_ENV_BY_PLAN_ID[catalogPlanId] ?? null;
  }
  const role = membershipRoleFromPlanId(planId);
  const interval = billingIntervalFromPlanId(planId);
  const suffix = stripeEnvSuffixForBillingInterval(interval);
  if (!role || !suffix) return null;
  const prefix = role === "pet_friend" ? "FRIEND" : "PARENT";
  return `STRIPE_PRICE_${prefix}_${suffix}`;
}

function readEnvPrice(envName: string): string | null {
  const value = process.env[envName]?.trim();
  return value || null;
}

export function resolveStripePriceId(planId: string): string | null {
  const catalogPlanId = normalizeCatalogPlanId(planId) ?? planId.trim();
  const envName = stripePriceEnvVarForPlanId(catalogPlanId);
  if (!envName) return null;
  const canonical = readEnvPrice(envName);
  if (canonical) return canonical;
  const legacyEnv = LEGACY_STRIPE_PRICE_ENV_BY_PLAN_ID[catalogPlanId];
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

/** Prefer longer / recurring plans when several env vars share the same price id. */
const PLAN_ID_FROM_STRIPE_PRICE_ORDER = [
  "1-year-owner",
  "3-month-owner",
  "one-time-owner",
  "1-year-friend",
  "3-month-friend",
  "one-time-friend",
] as const;

/** Reverse lookup: Stripe Price id → catalog plan_id (canonical + legacy env vars). */
export function planIdFromStripePriceId(priceId: string): string | null {
  const trimmed = priceId.trim();
  if (!trimmed) return null;
  for (const planId of PLAN_ID_FROM_STRIPE_PRICE_ORDER) {
    const canonicalEnv = STRIPE_PRICE_ENV_BY_PLAN_ID[planId];
    if (canonicalEnv && process.env[canonicalEnv]?.trim() === trimmed) return planId;
    const legacyEnv = LEGACY_STRIPE_PRICE_ENV_BY_PLAN_ID[planId];
    if (legacyEnv && process.env[legacyEnv]?.trim() === trimmed) return planId;
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
  const catalogPlanId = normalizeCatalogPlanId(planId) ?? planId.trim();
  const envName = stripePriceEnvVarForPlanId(catalogPlanId);
  const priceId = resolveStripePriceId(catalogPlanId);
  const billingInterval = billingIntervalFromPlanId(catalogPlanId);
  const mode = stripeCheckoutMode(billingInterval);
  const priceSuffix =
    priceId && priceId.length > 6 ? priceId.slice(-6) : priceId ? stripePriceIdSuffix(priceId) : null;
  console.log(`[stripe:${context}] checkout plan`, {
    selectedPlan: catalogPlanId,
    requestedPlan: planId,
    role,
    resolvedEnvVar: envName,
    priceConfigured: Boolean(priceId),
    priceSuffix,
    stripeMode: mode,
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
  const catalogPlanId = normalizeCatalogPlanId(planId);
  if (catalogPlanId && PLAN_BILLING_INTERVAL[catalogPlanId]) {
    return PLAN_BILLING_INTERVAL[catalogPlanId];
  }
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
