import "server-only";

import { hasServerEnv, readServerEnv } from "@/lib/server-env";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secret = readServerEnv("STRIPE_SECRET_KEY");
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secret);
  }
  return stripeClient;
}

export function getSiteUrl(): string {
  const url = readServerEnv("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** Base checkout env (secret + site URL). Plan price ids checked per plan in stripe-plans.ts. */
export function isStripeConfigured(): boolean {
  return hasServerEnv("STRIPE_SECRET_KEY") && hasServerEnv("NEXT_PUBLIC_SITE_URL");
}
