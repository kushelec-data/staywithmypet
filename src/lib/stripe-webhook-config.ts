import "server-only";

import { hasServerEnv } from "@/lib/server-env";

/** True when Stripe can verify webhook signatures. */
export function isStripeWebhookConfigured(): boolean {
  return hasServerEnv("STRIPE_WEBHOOK_SECRET");
}

/** True when checkout webhooks can write user_memberships (service role bypasses RLS). */
export function isMembershipWebhookWritable(): boolean {
  return getMembershipWebhookHealth().membershipWebhookWritable;
}

/** True when POST /api/stripe/confirm-membership can activate (Stripe API + service role). */
export function isMembershipConfirmWritable(): boolean {
  return getMembershipWebhookHealth().membershipConfirmWritable;
}

/** Production-safe booleans only — no secret values. */
export function getMembershipWebhookHealth(): {
  webhookSecretConfigured: boolean;
  stripeSecretConfigured: boolean;
  serviceRoleConfigured: boolean;
  supabaseUrlConfigured: boolean;
  membershipWebhookWritable: boolean;
  membershipConfirmWritable: boolean;
} {
  const webhookSecretConfigured = isStripeWebhookConfigured();
  const stripeSecretConfigured = hasServerEnv("STRIPE_SECRET_KEY");
  const serviceRoleConfigured = hasServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrlConfigured = hasServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const canWriteDb = serviceRoleConfigured && supabaseUrlConfigured;
  return {
    webhookSecretConfigured,
    stripeSecretConfigured,
    serviceRoleConfigured,
    supabaseUrlConfigured,
    membershipWebhookWritable: webhookSecretConfigured && canWriteDb,
    membershipConfirmWritable: stripeSecretConfigured && canWriteDb,
  };
}
