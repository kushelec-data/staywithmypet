import { NextResponse } from "next/server";
import { upsertUserMembershipAsAdmin } from "@/lib/membership-activate";
import {
  isMembershipPlanPurchasable,
  qualifiesAsActivePetFriendMembership,
  type MembershipRole,
} from "@/lib/membership";
import { parseMembershipRoleInput } from "@/lib/stripe-webhook-resolve";
import {
  PLATFORM_ACCESS_CODE_SOURCE,
  recordPlatformAccessCodeRedemption,
  resolvePlanIdForPlatformCode,
  validatePlatformAccessCode,
} from "@/lib/platform-access-code";
import { addMonthsIso, membershipRolesToActivate } from "@/lib/test-access-code";
import { requireAuthUserId } from "@/lib/security/assert-owner";
import { createClient } from "@/lib/supabase/server";
import { normalizeCatalogPlanId } from "@/lib/stripe-plans";
import {
  CURRENT_TERMS_VERSION,
  hasAcceptedTermsVersion,
  recordTermsAcceptance,
} from "@/lib/terms-acceptance";

type ActivateBody = {
  code?: string;
  role?: string;
  planId?: string;
  plan_id?: string;
  termsAccepted?: boolean;
};

export async function POST(request: Request) {
  let body: ActivateBody;
  try {
    body = (await request.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim() ?? "";
  const selectedRole = parseMembershipRoleInput(body.role);
  const rawPlanId = (body.planId ?? body.plan_id)?.trim();
  if (!selectedRole || !rawPlanId) {
    return NextResponse.json(
      { error: "role (parent|friend) and planId are required." },
      { status: 400 },
    );
  }

  const planId = normalizeCatalogPlanId(rawPlanId);
  if (!planId) {
    return NextResponse.json({ error: `Unknown plan: ${rawPlanId}` }, { status: 400 });
  }

  if (!isMembershipPlanPurchasable(planId)) {
    return NextResponse.json({ error: "This plan is not available yet." }, { status: 403 });
  }

  const supabase = await createClient();
  let userId: string;
  try {
    userId = await requireAuthUserId(supabase);
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!body.termsAccepted) {
    return NextResponse.json(
      { error: "Terms of Use acceptance is required before activating membership." },
      { status: 400 },
    );
  }

  const validation = await validatePlatformAccessCode({
    code,
    selectedRole,
    planId,
    userId,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { data: existingMembership } = await supabase
    .from("user_memberships")
    .select("status, end_date")
    .eq("user_id", userId)
    .eq("role", selectedRole)
    .maybeSingle();

  if (qualifiesAsActivePetFriendMembership(existingMembership)) {
    return NextResponse.json(
      { error: "You already have an active membership for this role." },
      { status: 409 },
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  const termsRecorded = await recordTermsAcceptance(supabase, userId, {
    context: "membership_coupon_activation",
    termsVersion: CURRENT_TERMS_VERSION,
    membershipRole: selectedRole,
    planId,
    couponCode: validation.codeNormalized,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  if (!termsRecorded.ok) {
    return NextResponse.json(
      { error: "Could not record Terms of Use acceptance." },
      { status: 500 },
    );
  }

  const hasCurrentTerms = await hasAcceptedTermsVersion(supabase, userId);
  if (!hasCurrentTerms) {
    return NextResponse.json(
      { error: "Terms of Use acceptance was not stored." },
      { status: 500 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }

  const profileRole = profile?.role as "pet_parent" | "pet_friend" | "both" | undefined;
  const roles = membershipRolesToActivate(profileRole, selectedRole);

  const startDate = new Date();
  const endDate = addMonthsIso(startDate, validation.membershipMonths);
  const activated: MembershipRole[] = [];
  const errors: string[] = [];

  for (const role of roles) {
    const rolePlanId = resolvePlanIdForPlatformCode(planId, role);
    const result = await upsertUserMembershipAsAdmin({
      userId,
      role,
      planId: rolePlanId,
      status: "active",
      startDate: startDate.toISOString(),
      endDate,
      autoRenew: false,
      source: PLATFORM_ACCESS_CODE_SOURCE,
      sendConfirmationEmail: role === roles[0],
    });

    if (result.ok) {
      activated.push(role);
    } else {
      errors.push(result.error);
    }
  }

  if (activated.length === 0) {
    return NextResponse.json(
      { error: errors[0] ?? "Could not activate membership." },
      { status: 500 },
    );
  }

  if (validation.codeId) {
    await recordPlatformAccessCodeRedemption({
      codeId: validation.codeId,
      userId,
      role: selectedRole,
      planId,
    });
  }

  return NextResponse.json({
    ok: true,
    activated,
    dual: activated.length > 1,
  });
}
