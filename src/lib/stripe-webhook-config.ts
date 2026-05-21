import "server-only";

/** True when Stripe can verify webhook signatures. */
export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

/** True when checkout webhooks can write user_memberships (service role bypasses RLS). */
export function isMembershipWebhookWritable(): boolean {
  return getMembershipWebhookHealth().membershipWebhookWritable;
}

/** Production-safe booleans only — no secret values. */
export function getMembershipWebhookHealth(): {
  webhookSecretConfigured: boolean;
  serviceRoleConfigured: boolean;
  supabaseUrlConfigured: boolean;
  membershipWebhookWritable: boolean;
} {
  const webhookSecretConfigured = isStripeWebhookConfigured();
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const supabaseUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  return {
    webhookSecretConfigured,
    serviceRoleConfigured,
    supabaseUrlConfigured,
    membershipWebhookWritable:
      webhookSecretConfigured && serviceRoleConfigured && supabaseUrlConfigured,
  };
}
