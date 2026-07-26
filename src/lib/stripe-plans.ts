import "server-only";

import { hasServerEnv, readServerEnv } from "@/lib/server-env";
import type Stripe from "stripe";
import {
  MEMBERSHIP_PLAN_CATALOG,
  PLAN_BILLING_INTERVAL,
  type CheckoutPlanDebugMeta,
  type MembershipPlanDefinition,
  type MembershipRole,
} from "@/lib/membership";
import { computeOneTimeInitialEndDate } from "@/lib/one-time-membership";

export type { CheckoutPlanDebugMeta };

export const KNOWN_CHECKOUT_PLAN_IDS = [
  "one-time-owner",
  "3-month-owner",
  "1-year-owner",
  "one-time-friend",
  "3-month-friend",
  "1-year-friend",
] as const;

export type CheckoutPlanId = (typeof KNOWN_CHECKOUT_PLAN_IDS)[number];

export type StripePlanType = "one_time" | "three_month" | "one_year";

/** Per-plan Stripe Price env vars (one env var per role × plan). */
export const STRIPE_PRICE_ENV_BY_PLAN: Record<CheckoutPlanId, string> = {
  "one-time-owner": "STRIPE_PARENT_ONE_TIME_PRICE_ID",
  "3-month-owner": "STRIPE_PARENT_PRICE_ID",
  "1-year-owner": "STRIPE_PARENT_ONE_YEAR_PRICE_ID",
  "one-time-friend": "STRIPE_FRIEND_ONE_TIME_PRICE_ID",
  "3-month-friend": "STRIPE_FRIEND_PRICE_ID",
  "1-year-friend": "STRIPE_FRIEND_ONE_YEAR_PRICE_ID",
};

export const STRIPE_MODE_BY_PLAN: Record<CheckoutPlanId, "payment" | "subscription"> = {
  "one-time-owner": "payment",
  "3-month-owner": "subscription",
  "1-year-owner": "subscription",
  "one-time-friend": "payment",
  "3-month-friend": "subscription",
  "1-year-friend": "subscription",
};

/** @deprecated Use STRIPE_PRICE_ENV_BY_PLAN */
export const STRIPE_PRICE_ENV_BY_PLAN_ID = STRIPE_PRICE_ENV_BY_PLAN;

export type StripeCheckoutReadiness = {
  ready: boolean;
  message: string | null;
};

export type PlanCheckoutDiagnostic = {
  planId: CheckoutPlanId;
  envVar: string;
  mode: "payment" | "subscription";
  ready: boolean;
  priceSuffix: string | null;
  message: string | null;
};

function isCheckoutPlanId(planId: string): planId is CheckoutPlanId {
  return (KNOWN_CHECKOUT_PLAN_IDS as readonly string[]).includes(planId);
}

/** Resolve request/catalog plan id to one of the six checkout plan ids (trim + catalog alias only). */
export function normalizeCatalogPlanId(planId: string): CheckoutPlanId | null {
  const trimmed = planId.trim();
  if (!trimmed) return null;
  if (isCheckoutPlanId(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  for (const role of Object.keys(MEMBERSHIP_PLAN_CATALOG) as MembershipRole[]) {
    const match = MEMBERSHIP_PLAN_CATALOG[role].find(
      (p) => p.id === trimmed || p.id.toLowerCase() === lower,
    );
    if (match && isCheckoutPlanId(match.id)) return match.id;
  }
  return null;
}

function readEnvPrice(envName: string): string | null {
  return readServerEnv(envName) ?? null;
}

export function stripePriceEnvVarForPlanId(planId: string): string | null {
  const catalogPlanId = normalizeCatalogPlanId(planId);
  if (!catalogPlanId) return null;
  return STRIPE_PRICE_ENV_BY_PLAN[catalogPlanId];
}

export function resolveStripePriceId(planId: string): string | null {
  const envName = stripePriceEnvVarForPlanId(planId);
  if (!envName) return null;
  const priceId = readEnvPrice(envName);
  return priceId?.trim() || null;
}

export function stripeCheckoutModeForPlanId(planId: string): "payment" | "subscription" | null {
  const catalogPlanId = normalizeCatalogPlanId(planId);
  if (!catalogPlanId) return null;
  return STRIPE_MODE_BY_PLAN[catalogPlanId];
}

export function stripePlanTypeForPlanId(planId: string): StripePlanType | null {
  const interval = billingIntervalFromPlanId(planId);
  if (interval === "one_time") return "one_time";
  if (interval === "3_months") return "three_month";
  if (interval === "12_months") return "one_year";
  return null;
}

export function durationMonthsForPlanId(planId: string): string | undefined {
  const interval = billingIntervalFromPlanId(planId);
  if (interval === "3_months") return "3";
  if (interval === "12_months") return "12";
  return undefined;
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
  const catalogPlanId = normalizeCatalogPlanId(planId);
  if (!catalogPlanId) return `Unknown plan: ${planId}`;
  const envName = STRIPE_PRICE_ENV_BY_PLAN[catalogPlanId];
  if (!priceId?.trim()) {
    return `Missing or invalid price ID for ${catalogPlanId} (set ${envName})`;
  }
  if (!isValidStripePriceIdFormat(priceId)) {
    return `Missing or invalid price ID for ${catalogPlanId} (${envName} must be a Stripe price_… id, got …${stripePriceIdSuffix(priceId)})`;
  }
  return null;
}

/** Reverse lookup: Stripe Price id → membership role (all per-plan env vars). */
export function membershipRoleFromStripePriceId(priceId: string): MembershipRole | null {
  const planId = planIdFromStripePriceId(priceId);
  return planId ? membershipRoleFromPlanId(planId) : null;
}

/** Reverse lookup: Stripe Price id → catalog plan_id (per-plan env vars only). */
export function planIdFromStripePriceId(priceId: string): string | null {
  const trimmed = priceId.trim();
  if (!trimmed) return null;
  for (const planId of KNOWN_CHECKOUT_PLAN_IDS) {
    const env = STRIPE_PRICE_ENV_BY_PLAN[planId];
    if (readServerEnv(env) === trimmed) return planId;
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
  if (!hasServerEnv("STRIPE_SECRET_KEY")) {
    return "STRIPE_SECRET_KEY";
  }
  if (!hasServerEnv("NEXT_PUBLIC_SITE_URL")) {
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

export function stripeCheckoutDiagnosticsForRole(role: MembershipRole): PlanCheckoutDiagnostic[] {
  return MEMBERSHIP_PLAN_CATALOG[role].map((plan) => {
    const catalogId = plan.id as CheckoutPlanId;
    const envVar = STRIPE_PRICE_ENV_BY_PLAN[catalogId];
    const priceId = resolveStripePriceId(catalogId);
    const err = stripeCheckoutConfigError(catalogId);
    return {
      planId: catalogId,
      envVar,
      mode: STRIPE_MODE_BY_PLAN[catalogId],
      ready: !err,
      priceSuffix: priceId ? stripePriceIdSuffix(priceId) : null,
      message: err,
    };
  });
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

  const envName = stripePriceEnvVarForPlanId(planId) ?? "STRIPE_*_PRICE_ID";
  const trimmedPriceId = priceId.trim();
  try {
    const price = await stripe.prices.retrieve(trimmedPriceId);
    const isRecurring = price.type === "recurring";
    if (mode === "payment" && isRecurring) {
      return `Missing or invalid price ID for ${planId}: ${envName} must be a one-time Stripe price (found recurring). Use mode payment for one-time plans.`;
    }
    if (mode === "subscription" && !isRecurring) {
      return `Missing or invalid price ID for ${planId}: ${envName} must be a recurring subscription price (found one-time). Use mode subscription for 3-month and 1-year plans.`;
    }
    return null;
  } catch {
    return `Missing or invalid price ID for ${planId}: ${envName} price …${stripePriceIdSuffix(trimmedPriceId)} not found in Stripe.`;
  }
}

export function logStripeCheckoutPlanResolution(
  context: string,
  planId: string,
  role: MembershipRole,
): void {
  const catalogPlanId = normalizeCatalogPlanId(planId);
  const envName = catalogPlanId ? STRIPE_PRICE_ENV_BY_PLAN[catalogPlanId] : null;
  const priceId = catalogPlanId ? resolveStripePriceId(catalogPlanId) : null;
  const mode = catalogPlanId ? STRIPE_MODE_BY_PLAN[catalogPlanId] : null;
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
    planType: catalogPlanId ? stripePlanTypeForPlanId(catalogPlanId) : null,
  });
}

/** Per-plan env var + checkout mode for membership UI debug (server → client props). */
export function checkoutDebugMetaByRole(role: MembershipRole): CheckoutPlanDebugMeta[] {
  return MEMBERSHIP_PLAN_CATALOG[role].map((plan) => ({
    planId: plan.id,
    envVar: STRIPE_PRICE_ENV_BY_PLAN[plan.id as CheckoutPlanId],
    mode: STRIPE_MODE_BY_PLAN[plan.id as CheckoutPlanId],
  }));
}

export function checkoutDebugMetaRecordForRole(
  role: MembershipRole,
): Record<string, CheckoutPlanDebugMeta> {
  return Object.fromEntries(
    checkoutDebugMetaByRole(role).map((row) => [row.planId, row]),
  );
}

export function computeMembershipEndDate(
  billingInterval: MembershipPlanDefinition["billing_interval"],
  start: Date,
): string | null {
  if (billingInterval === "one_time") {
    return computeOneTimeInitialEndDate(start);
  }
  const end = new Date(start);
  if (billingInterval === "3_months") {
    end.setMonth(end.getMonth() + 3);
  } else if (billingInterval === "12_months") {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end.toISOString();
}

export function billingIntervalFromPlanId(
  planId: string,
): MembershipPlanDefinition["billing_interval"] | null {
  const catalogPlanId = normalizeCatalogPlanId(planId);
  if (!catalogPlanId) return null;
  return PLAN_BILLING_INTERVAL[catalogPlanId] ?? null;
}

export function membershipPlansWithStripePrices<T extends { plan_id: string; future_stripe_price_id: string | null }>(
  plans: readonly T[],
): T[] {
  return plans.map((plan) => ({
    ...plan,
    future_stripe_price_id: resolveStripePriceId(plan.plan_id) ?? plan.future_stripe_price_id,
  }));
}
