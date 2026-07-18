import "server-only";

import { hasServerEnv } from "@/lib/server-env";

/** Temporary production debugging — remove after env is verified on Vercel. */
export function logStripeEnvPresence(context: string): void {
  console.log(`[stripe-env:${context}] STRIPE_SECRET_KEY exists:`, hasServerEnv("STRIPE_SECRET_KEY"));
  console.log(`[stripe-env:${context}] STRIPE_WEBHOOK_SECRET exists:`, hasServerEnv("STRIPE_WEBHOOK_SECRET"));
  console.log(`[stripe-env:${context}] SUPABASE_SERVICE_ROLE_KEY exists:`, hasServerEnv("SUPABASE_SERVICE_ROLE_KEY"));
  console.log(`[stripe-env:${context}] NEXT_PUBLIC_SUPABASE_URL exists:`, hasServerEnv("NEXT_PUBLIC_SUPABASE_URL"));
  console.log(`[stripe-env:${context}] VERCEL_PROJECT_PRODUCTION_URL:`, process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "(unset)");
  console.log(`[stripe-env:${context}] NEXT_PUBLIC_SITE_URL exists:`, hasServerEnv("NEXT_PUBLIC_SITE_URL"));
  const priceEnvVars = [
    "STRIPE_PARENT_ONE_TIME_PRICE_ID",
    "STRIPE_PARENT_PRICE_ID",
    "STRIPE_PARENT_ONE_YEAR_PRICE_ID",
    "STRIPE_FRIEND_ONE_TIME_PRICE_ID",
    "STRIPE_FRIEND_PRICE_ID",
    "STRIPE_FRIEND_ONE_YEAR_PRICE_ID",
  ] as const;
  for (const name of priceEnvVars) {
    console.log(`[stripe-env:${context}] ${name} exists:`, hasServerEnv(name));
  }
  console.log(`[stripe-env:${context}] NODE_ENV:`, process.env.NODE_ENV);
  console.log(`[stripe-env:${context}] VERCEL_ENV:`, process.env.VERCEL_ENV ?? "(unset)");
}
