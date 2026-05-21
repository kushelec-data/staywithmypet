import "server-only";

/** True when Stripe can verify webhook signatures. */
export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

/** True when checkout webhooks can write user_memberships (service role bypasses RLS). */
export function isMembershipWebhookWritable(): boolean {
  return (
    isStripeWebhookConfigured() &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
  );
}
