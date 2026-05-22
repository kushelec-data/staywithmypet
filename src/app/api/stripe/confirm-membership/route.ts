import { activateMembershipFromCheckoutSession } from "@/lib/stripe-checkout-activate";
import { isMembershipConfirmWritable } from "@/lib/stripe-webhook-config";
import { getStripe } from "@/lib/stripe";
import { requireAuthUserId } from "@/lib/security/assert-owner";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmBody = {
  session_id?: string;
  sessionId?: string;
};

/** Client fallback when webhook is delayed or misconfigured — verifies session via Stripe API. */
export async function POST(request: Request) {
  if (!isMembershipConfirmWritable()) {
    console.error("[stripe] confirm-membership: server cannot write memberships");
    return NextResponse.json(
      { error: "Membership activation is not configured on the server." },
      { status: 503 },
    );
  }

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = (body.session_id ?? body.sessionId)?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "session_id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  let authUserId: string;
  try {
    authUserId = await requireAuthUserId(supabase);
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session not found";
    console.error("[stripe] confirm-membership retrieve failed", { sessionId, message });
    return NextResponse.json({ error: "Checkout session not found." }, { status: 404 });
  }

  const metaUserId =
    session.metadata?.user_id?.trim() ||
    session.metadata?.userId?.trim() ||
    session.client_reference_id?.trim() ||
    null;

  if (!metaUserId || metaUserId !== authUserId) {
    console.warn("[stripe] confirm-membership user mismatch", {
      sessionId,
      authUserId,
      metaUserId,
    });
    return NextResponse.json({ error: "Checkout session does not belong to this account." }, { status: 403 });
  }

  console.log("[stripe] confirm-membership", {
    sessionId,
    authUserId,
    paymentStatus: session.payment_status,
  });

  const result = await activateMembershipFromCheckoutSession(session);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code ?? null, activated: false },
      { status: 500 },
    );
  }

  if (!result.activated) {
    return NextResponse.json({
      activated: false,
      pending: true,
      paymentStatus: session.payment_status,
    });
  }

  revalidatePath("/membership");
  revalidatePath("/dashboard");

  return NextResponse.json({
    activated: true,
    role: result.role,
    planId: result.planId,
  });
}
