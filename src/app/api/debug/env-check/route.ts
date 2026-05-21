import { logStripeEnvPresence } from "@/lib/debug-stripe-env";
import { NextResponse } from "next/server";

/** Temporary debug route — remove after env setup is verified. */
const ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "STRIPE_PRICE_PARENT_1M",
  "STRIPE_PRICE_PARENT_3M",
  "STRIPE_PRICE_PARENT_12M",
  "STRIPE_PRICE_FRIEND_1M",
  "STRIPE_PRICE_FRIEND_3M",
  "STRIPE_PRICE_FRIEND_12M",
] as const;

function isSet(name: (typeof ENV_VARS)[number]): boolean {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  logStripeEnvPresence("env-check");

  const status = Object.fromEntries(
    ENV_VARS.map((name) => [name, isSet(name)])
  ) as Record<(typeof ENV_VARS)[number], boolean>;

  return NextResponse.json(status);
}
