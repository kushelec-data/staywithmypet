import { NextResponse } from "next/server";
import {
  parseRedeemMembershipPromotionPayload,
  promotionPlanIdForRole,
  redeemMembershipPromotion,
} from "@/lib/membership-promotion";
import { requireAuthUserId } from "@/lib/security/assert-owner";
import {
  clientIpFromRequest,
  firstExceededRateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  CURRENT_TERMS_VERSION,
  recordTermsAcceptance,
} from "@/lib/terms-acceptance";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseRedeemMembershipPromotionPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const supabase = await createClient();
  let userId: string;
  try {
    userId = await requireAuthUserId(supabase);
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const ipAddress = clientIpFromRequest(request);
  const limited = await firstExceededRateLimit([
    { action: "access_code_activate", identity: userId },
    { action: "access_code_activate_ip", identity: ipAddress },
  ]);
  if (!limited.ok) {
    return NextResponse.json(
      { error: rateLimitMessage(limited.retryAfterSec) },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  if (!parsed.termsAccepted) {
    return NextResponse.json(
      { error: "Terms of Use acceptance is required before activating membership." },
      { status: 400 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userAgent = request.headers.get("user-agent");
  const termsRecorded = await recordTermsAcceptance(supabase, userId, {
    context: "membership_coupon_activation",
    termsVersion: CURRENT_TERMS_VERSION,
    membershipRole: parsed.role,
    planId: promotionPlanIdForRole(parsed.role),
    couponCode: parsed.code,
    ipAddress,
    userAgent,
  });
  if (!termsRecorded.ok) {
    return NextResponse.json(
      { error: "Could not record Terms of Use acceptance." },
      { status: 500 },
    );
  }

  const result = await redeemMembershipPromotion({
    supabase,
    userId,
    code: parsed.code,
    role: parsed.role,
    recipientName:
      typeof user?.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : user?.email?.split("@")[0] ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    activated: [result.membership.role],
    planId: result.membership.planId,
    endDate: result.membership.endDate,
  });
}
