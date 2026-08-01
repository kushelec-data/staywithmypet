import { isInternalSecretAuthorized } from "@/lib/security/internal-secret-auth";
import { isMembershipConfirmWritable } from "@/lib/stripe-webhook-config";
import { membershipRoleFromMergedMetadata } from "@/lib/stripe-webhook-resolve";
import { getStripe } from "@/lib/stripe";
import { requireAuthUserId } from "@/lib/security/assert-owner";
import { safeLogError, safeLogInfo, safeLogWarn } from "@/lib/security/safe-log";
import { createClient } from "@/lib/supabase/server";
import { emptyMembershipsByRole, hasActiveMembershipForRole } from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmBody = {
  session_id?: string;
  sessionId?: string;
};

/**
 * Read-only status check after Checkout return.
 * Membership activation is webhook-only — this route never writes to the database.
 */
export async function POST(request: Request) {
  if (!isMembershipConfirmWritable()) {
    safeLogError("stripe confirm-membership server cannot verify memberships");
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
    safeLogError("stripe confirm-membership retrieve failed", { sessionId, message });
    return NextResponse.json({ error: "Checkout session not found." }, { status: 404 });
  }

  const metaUserId =
    session.metadata?.user_id?.trim() ||
    session.metadata?.userId?.trim() ||
    session.client_reference_id?.trim() ||
    null;

  if (!metaUserId || metaUserId !== authUserId) {
    safeLogWarn("stripe confirm-membership user mismatch", {
      sessionId,
      authUserId,
      metaUserId,
    });
    return NextResponse.json({ error: "Checkout session does not belong to this account." }, { status: 403 });
  }

  const role = membershipRoleFromMergedMetadata(session.metadata ?? {});
  const admin = createAdminClient();

  let activated = false;
  if (admin && role) {
    const { data: row } = await admin
      .from("user_memberships")
      .select("status, end_date, role, plan_id, stripe_checkout_session_id")
      .eq("user_id", authUserId)
      .eq("role", role)
      .maybeSingle();

    if (row) {
      const memberships = emptyMembershipsByRole();
      memberships[role] = row as never;
      activated = hasActiveMembershipForRole(memberships, role);
    }
  }

  safeLogInfo("stripe confirm-membership status", {
    sessionId,
    authUserId,
    paymentStatus: session.payment_status,
    role,
    activated,
  });

  return NextResponse.json({
    activated,
    pending: !activated,
    paymentStatus: session.payment_status,
    webhookOnly: true,
  });
}
