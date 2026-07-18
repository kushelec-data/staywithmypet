import "server-only";

import type { MembershipRole } from "@/lib/membership";
import { hasServerEnv } from "@/lib/server-env";
import { isStripeCheckoutEnabled } from "@/lib/stripe-feature";
import type { StripeCheckoutReadiness } from "@/lib/stripe-plans";

export type MembershipDeployDiagnostics = {
  showBanner: boolean;
  bannerTitle: string;
  lines: string[];
};

const STRIPE_ENV_FLAGS = [
  "NEXT_PUBLIC_ENABLE_STRIPE",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PARENT_PRICE_ID",
  "STRIPE_FRIEND_PRICE_ID",
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/** Safe, non-secret deployment + Stripe readiness info for Preview/local UI. */
export function buildMembershipDeployDiagnostics(
  stripeCheckoutByRole: Record<MembershipRole, StripeCheckoutReadiness>,
): MembershipDeployDiagnostics {
  const vercelEnv = process.env.VERCEL_ENV ?? "local";
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const ref = process.env.VERCEL_GIT_COMMIT_REF ?? "unknown";
  const showBanner = vercelEnv === "preview" || process.env.NODE_ENV === "development";

  const stripeEnabled = isStripeCheckoutEnabled();
  const missingEnv = STRIPE_ENV_FLAGS.filter((name) => !hasServerEnv(name));

  const lines = [
    `deployment=${vercelEnv}`,
    `branch=${ref}`,
    `commit=${sha}`,
    `stripe_feature_flag=${stripeEnabled ? "on" : "off"}`,
    `pet_parent_checkout=${stripeCheckoutByRole.pet_parent.ready ? "ready" : "blocked"}`,
    ...(stripeCheckoutByRole.pet_parent.message
      ? [`pet_parent_reason=${stripeCheckoutByRole.pet_parent.message}`]
      : []),
    `pet_friend_checkout=${stripeCheckoutByRole.pet_friend.ready ? "ready" : "blocked"}`,
    ...(stripeCheckoutByRole.pet_friend.message
      ? [`pet_friend_reason=${stripeCheckoutByRole.pet_friend.message}`]
      : []),
    ...(missingEnv.length > 0 ? [`missing_env=${missingEnv.join(", ")}`] : []),
  ];

  return {
    showBanner,
    bannerTitle: `Stripe Preview Build ${sha}`,
    lines,
  };
}
