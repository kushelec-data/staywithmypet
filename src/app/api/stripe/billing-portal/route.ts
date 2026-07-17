import { getStripe } from "@/lib/stripe";
import { buildMembershipPagePath, sanitizeReturnTo } from "@/lib/membership-return";
import { parseMembershipRoleInput } from "@/lib/stripe-webhook-resolve";
import type { MembershipRole } from "@/lib/membership";
import { checkRateLimitShared, rateLimitMessage } from "@/lib/security/rate-limit";
import { requireAuthUserId } from "@/lib/security/assert-owner";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const CANCEL_UNAVAILABLE =
  "Plan cancellation is not available yet. Please contact support.";

function requestOrigin(request: Request): string {
  const fromHeader = request.headers.get("origin")?.trim();
  if (fromHeader) return fromHeader.replace(/\/$/, "");
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  let body: { role?: MembershipRole | string; returnTo?: string };
  try {
    body = (await request.json()) as { role?: MembershipRole | string; returnTo?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = parseMembershipRoleInput(body.role);
  if (!role) {
    return NextResponse.json({ error: "role is required." }, { status: 400 });
  }

  const supabase = await createClient();
  let userId: string;
  try {
    userId = await requireAuthUserId(supabase);
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const limit = await checkRateLimitShared("api_default", userId);
  if (!limit.ok) {
    return NextResponse.json(
      { error: rateLimitMessage(limit.retryAfterSec) },
      { status: 429 },
    );
  }

  const { data: membership } = await supabase
    .from("user_memberships")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();

  const customerId = membership?.stripe_customer_id?.trim();
  if (!customerId) {
    return NextResponse.json({ error: CANCEL_UNAVAILABLE }, { status: 400 });
  }

  const origin = requestOrigin(request);
  const returnPath = buildMembershipPagePath({
    role,
    returnTo: sanitizeReturnTo(body.returnTo ?? null),
  });

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${returnPath}`,
    });
    if (!session.url) {
      return NextResponse.json({ error: CANCEL_UNAVAILABLE }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe] billing portal failed", {
      role,
      hasSubscription: Boolean(membership?.stripe_subscription_id),
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: CANCEL_UNAVAILABLE }, { status: 503 });
  }
}
