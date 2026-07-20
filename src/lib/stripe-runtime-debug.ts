import "server-only";

import type Stripe from "stripe";
import {
  KNOWN_CHECKOUT_PLAN_IDS,
  STRIPE_PRICE_ENV_BY_PLAN,
  type CheckoutPlanId,
} from "@/lib/stripe-plans";
import { readServerEnv } from "@/lib/server-env";

export const STRIPE_RUNTIME_PRICE_ENV_VARS = [
  "STRIPE_PARENT_ONE_TIME_PRICE_ID",
  "STRIPE_PARENT_PRICE_ID",
  "STRIPE_PARENT_ONE_YEAR_PRICE_ID",
  "STRIPE_FRIEND_ONE_TIME_PRICE_ID",
  "STRIPE_FRIEND_PRICE_ID",
  "STRIPE_FRIEND_ONE_YEAR_PRICE_ID",
] as const;

export type StripeRuntimePriceEnvVar = (typeof STRIPE_RUNTIME_PRICE_ENV_VARS)[number];

export type EnvStringFingerprint = {
  exists: boolean;
  first10: string | null;
  last6: string | null;
  length: number;
  hadOuterWhitespace: boolean;
  rawLength: number;
};

export type StripeSecretKeyFingerprint = {
  exists: boolean;
  prefix: "sk_test_" | "sk_live_" | "unknown" | null;
  last4: string | null;
  length: number;
};

export type StripePriceRetrieveReport = {
  success: boolean;
  stripeErrorCode: string | null;
  stripeErrorType: string | null;
  stripeErrorMessage: string | null;
  stripeAccountId: string | null;
  livemode: boolean | null;
  type: "one_time" | "recurring" | null;
  unit_amount: number | null;
  currency: string | null;
};

export function envStringFingerprint(name: string): EnvStringFingerprint {
  const raw = process.env[name];
  const rawLength = typeof raw === "string" ? raw.length : 0;
  const trimmed = readServerEnv(name);
  const value = trimmed ?? "";
  return {
    exists: Boolean(trimmed),
    first10: trimmed ? trimmed.slice(0, 10) : null,
    last6: trimmed && trimmed.length >= 6 ? trimmed.slice(-6) : trimmed || null,
    length: value.length,
    hadOuterWhitespace: typeof raw === "string" && raw !== raw.trim(),
    rawLength,
  };
}

export function stripeSecretKeyFingerprint(): StripeSecretKeyFingerprint {
  const raw = readServerEnv("STRIPE_SECRET_KEY");
  if (!raw) {
    return { exists: false, prefix: null, last4: null, length: 0 };
  }
  const prefix = raw.startsWith("sk_test_")
    ? "sk_test_"
    : raw.startsWith("sk_live_")
      ? "sk_live_"
      : "unknown";
  return {
    exists: true,
    prefix,
    last4: raw.length >= 4 ? raw.slice(-4) : raw,
    length: raw.length,
  };
}

export async function stripePriceRetrieveReport(
  stripe: Stripe,
  priceId: string,
  stripeAccountId: string | null,
): Promise<StripePriceRetrieveReport> {
  try {
    const price = await stripe.prices.retrieve(priceId.trim());
    return {
      success: true,
      stripeErrorCode: null,
      stripeErrorType: null,
      stripeErrorMessage: null,
      stripeAccountId,
      livemode: price.livemode,
      type: price.type === "recurring" ? "recurring" : "one_time",
      unit_amount: price.unit_amount,
      currency: price.currency,
    };
  } catch (err) {
    const stripeErr = err as { code?: string; type?: string; message?: string };
    return {
      success: false,
      stripeErrorCode: stripeErr.code ?? null,
      stripeErrorType: stripeErr.type ?? null,
      stripeErrorMessage: stripeErr.message ?? String(err),
      stripeAccountId,
      livemode: null,
      type: null,
      unit_amount: null,
      currency: null,
    };
  }
}

export function planIdForEnvVar(envVar: StripeRuntimePriceEnvVar): CheckoutPlanId | null {
  for (const planId of KNOWN_CHECKOUT_PLAN_IDS) {
    if (STRIPE_PRICE_ENV_BY_PLAN[planId] === envVar) return planId;
  }
  return null;
}

export function envVarForPlanId(planId: string): string | null {
  const normalized = planId.trim() as CheckoutPlanId;
  return STRIPE_PRICE_ENV_BY_PLAN[normalized] ?? null;
}

export async function retrieveStripeAccountId(stripe: Stripe): Promise<string | null> {
  try {
    const account = await (
      stripe.accounts as unknown as { retrieve(): Promise<{ id: string }> }
    ).retrieve();
    return account.id;
  } catch {
    return null;
  }
}

export function isStripeRuntimeDebugAllowed(): boolean {
  const vercelEnv = process.env.VERCEL_ENV ?? "local";
  if (process.env.NODE_ENV === "production" && vercelEnv !== "preview") {
    return false;
  }
  return true;
}
