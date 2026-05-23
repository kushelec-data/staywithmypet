import "server-only";

/** Temporary production debugging — remove after env is verified on Vercel. */
export function logStripeEnvPresence(context: string): void {
  console.log(`[stripe-env:${context}] STRIPE_SECRET_KEY exists:`, Boolean(process.env.STRIPE_SECRET_KEY?.trim()));
  console.log(`[stripe-env:${context}] STRIPE_WEBHOOK_SECRET exists:`, Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()));
  console.log(`[stripe-env:${context}] SUPABASE_SERVICE_ROLE_KEY exists:`, Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()));
  console.log(`[stripe-env:${context}] NEXT_PUBLIC_SUPABASE_URL exists:`, Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()));
  console.log(`[stripe-env:${context}] VERCEL_PROJECT_PRODUCTION_URL:`, process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "(unset)");
  console.log(`[stripe-env:${context}] NEXT_PUBLIC_SITE_URL exists:`, Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()));
  const priceEnvVars = [
    "STRIPE_PARENT_PRICE_ID",
    "STRIPE_FRIEND_PRICE_ID",
    "STRIPE_PRICE_PARENT_1M",
    "STRIPE_PRICE_PARENT_3M",
    "STRIPE_PRICE_PARENT_12M",
    "STRIPE_PRICE_FRIEND_1M",
    "STRIPE_PRICE_FRIEND_3M",
    "STRIPE_PRICE_FRIEND_12M",
  ] as const;
  for (const name of priceEnvVars) {
    console.log(`[stripe-env:${context}] ${name} exists:`, Boolean(process.env[name]?.trim()));
  }
  console.log(`[stripe-env:${context}] NODE_ENV:`, process.env.NODE_ENV);
  console.log(`[stripe-env:${context}] VERCEL_ENV:`, process.env.VERCEL_ENV ?? "(unset)");
}
