import { getStripe } from "@/lib/stripe";
import {
  envStringFingerprint,
  isStripeRuntimeDebugAllowed,
  planIdForEnvVar,
  retrieveStripeAccountId,
  STRIPE_RUNTIME_PRICE_ENV_VARS,
  stripePriceRetrieveReport,
  stripeSecretKeyFingerprint,
  type StripeRuntimePriceEnvVar,
} from "@/lib/stripe-runtime-debug";
import { STRIPE_PRICE_ENV_BY_PLAN } from "@/lib/stripe-plans";
import { readServerEnv } from "@/lib/server-env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Temporary Preview/local debug — reports runtime env fingerprints + live Stripe price lookups. */
export async function GET(request: Request) {
  if (!isStripeRuntimeDebugAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const clickedPlanId = url.searchParams.get("planId")?.trim() ?? null;

  const deployment = {
    vercelEnv: process.env.VERCEL_ENV ?? "local",
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
  };

  const stripeSecretKey = stripeSecretKeyFingerprint();

  let stripeAccountId: string | null = null;
  let stripeAccountError: string | null = null;

  const environmentVariables = Object.fromEntries(
    STRIPE_RUNTIME_PRICE_ENV_VARS.map((name) => [name, envStringFingerprint(name)]),
  ) as Record<StripeRuntimePriceEnvVar, ReturnType<typeof envStringFingerprint>>;

  const planEnvMapping: Array<{
    planId: string;
    envVar: string;
    envFingerprint: ReturnType<typeof envStringFingerprint>;
    retrieve: Awaited<ReturnType<typeof stripePriceRetrieveReport>>;
  }> = [];

  if (stripeSecretKey.exists) {
    try {
      const stripe = getStripe();
      stripeAccountId = await retrieveStripeAccountId(stripe);

      for (const envVar of STRIPE_RUNTIME_PRICE_ENV_VARS) {
        const fingerprint = environmentVariables[envVar];
        const planId = planIdForEnvVar(envVar) ?? envVar;
        const priceId = readServerEnv(envVar);
        const retrieve = priceId
          ? await stripePriceRetrieveReport(stripe, priceId, stripeAccountId)
          : {
              success: false,
              stripeErrorCode: "env_missing",
              stripeErrorType: null,
              stripeErrorMessage: "Environment variable not set or empty after trim",
              stripeAccountId,
              livemode: null,
              type: null,
              unit_amount: null,
              currency: null,
            };

        planEnvMapping.push({
          planId,
          envVar,
          envFingerprint: fingerprint,
          retrieve,
        });
      }
    } catch (err) {
      stripeAccountError = err instanceof Error ? err.message : String(err);
    }
  }

  const clickedPlan = clickedPlanId
    ? (() => {
        if (!(clickedPlanId in STRIPE_PRICE_ENV_BY_PLAN)) {
          return { planId: clickedPlanId, error: "Unknown plan id" };
        }
        const envVar =
          STRIPE_PRICE_ENV_BY_PLAN[clickedPlanId as keyof typeof STRIPE_PRICE_ENV_BY_PLAN];
        return {
          planId: clickedPlanId,
          envVar,
          envFingerprint: envStringFingerprint(envVar),
        };
      })()
    : null;

  return NextResponse.json({
    deployment,
    stripeSecretKey,
    stripeAccountId,
    stripeAccountError,
    environmentVariables,
    planEnvMapping,
    clickedPlan,
    note: "Values are read from process.env at request time on this deployment only.",
  });
}
