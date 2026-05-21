import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secret);
  }
  return stripeClient;
}

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
