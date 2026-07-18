import { hasServerEnv } from "@/lib/server-env";
import { logStripeEnvPresence } from "@/lib/debug-stripe-env";
import { NextResponse } from "next/server";

/** Temporary debug route — remove after env setup is verified. */
const ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "STRIPE_PARENT_ONE_TIME_PRICE_ID",
  "STRIPE_PARENT_PRICE_ID",
  "STRIPE_PARENT_ONE_YEAR_PRICE_ID",
  "STRIPE_FRIEND_ONE_TIME_PRICE_ID",
  "STRIPE_FRIEND_PRICE_ID",
  "STRIPE_FRIEND_ONE_YEAR_PRICE_ID",
] as const;

function isSet(name: (typeof ENV_VARS)[number]): boolean {
  return hasServerEnv(name);
}

export async function GET() {
  const vercelEnv = process.env.VERCEL_ENV ?? "local";
  if (process.env.NODE_ENV === "production" && vercelEnv !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  logStripeEnvPresence("env-check");

  const status = Object.fromEntries(
    ENV_VARS.map((name) => [name, isSet(name)])
  ) as Record<(typeof ENV_VARS)[number], boolean>;

  return NextResponse.json(status);
}
