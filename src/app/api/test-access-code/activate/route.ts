import { NextResponse } from "next/server";
import { upsertUserMembershipAsAdmin } from "@/lib/membership-activate";
import { isMembershipPlanPurchasable, type MembershipRole } from "@/lib/membership";
import { isStripeCheckoutEnabled } from "@/lib/stripe-feature";
import { parseMembershipRoleInput } from "@/lib/stripe-webhook-resolve";
import {
  TEST_MEMBERSHIP_MONTHS,
  TEST_MEMBERSHIP_SOURCE,
  addMonthsIso,
  isValidTestAccessCode,
  membershipRolesToActivate,
  planIdForMembershipRole,
} from "@/lib/test-access-code";
import { requireAuthUserId } from "@/lib/security/assert-owner";
import { createClient } from "@/lib/supabase/server";
import { normalizeCatalogPlanId } from "@/lib/stripe-plans";

type ActivateBody = {
  code?: string;
  role?: string;
  planId?: string;
  plan_id?: string;
};

export async function POST(request: Request) {
  if (isStripeCheckoutEnabled()) {
    return NextResponse.json(
      { error: "Test access codes are disabled while Stripe checkout is enabled." },
      { status: 403 },
    );
  }

  let body: ActivateBody;
  try {
    body = (await request.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim() ?? "";
  if (!isValidTestAccessCode(code)) {
    return NextResponse.json({ error: "Invalid test access code." }, { status: 401 });
  }

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
  const endDate = addMonthsIso(startDate, TEST_MEMBERSHIP_MONTHS);
  const activated: MembershipRole[] = [];
  const errors: string[] = [];

  for (const role of roles) {
    const rolePlanId = planIdForMembershipRole(planId, role);
    const result = await upsertUserMembershipAsAdmin({
      userId,
      role,
      planId: rolePlanId,
      status: "active",
      startDate: startDate.toISOString(),
      endDate,
      autoRenew: false,
      source: TEST_MEMBERSHIP_SOURCE,
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

  return NextResponse.json({
    ok: true,
    activated,
    dual: activated.length > 1,
  });
}
