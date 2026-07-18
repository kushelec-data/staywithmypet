import "server-only";

import { billingIntervalFromPlanId, normalizeCatalogPlanId } from "@/lib/stripe-plans";
import { MEMBERSHIP_PLAN_CATALOG, type MembershipRole } from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase-errors";
import {
  TEST_ACCESS_CODE,
  TEST_MEMBERSHIP_MONTHS,
  planIdForMembershipRole,
} from "@/lib/test-access-code";

export const PLATFORM_ACCESS_CODE_SOURCE = "platform_access_code";

export type PlatformAccessCodeValidation =
  | {
      ok: true;
      codeId: string | null;
      planKey: string;
      membershipMonths: number;
      codeNormalized: string;
    }
  | { ok: false; error: string; status: 401 | 403 | 409 | 500 };

type PlatformCodeRow = {
  id: string;
  code_normalized: string;
  membership_role: MembershipRole | null;
  plan_key: string;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  one_per_user: boolean;
  is_active: boolean;
};

function normalizeCodeInput(code: string): string {
  return code.trim().toUpperCase();
}

function planKeyMatches(planKey: string, planId: string): boolean {
  const normalized = normalizeCatalogPlanId(planId) ?? planId;
  if (planKey === normalized) return true;
  const interval = billingIntervalFromPlanId(normalized);
  if (interval && planKey === interval.replace("_", "-")) return true;
  if (planKey === "3-month" && interval === "3_months") return true;
  return planKey === "3_months" && interval === "3_months";
}

function fallbackHardcodedCode(
  codeNormalized: string,
  selectedRole: MembershipRole,
  planId: string,
): PlatformAccessCodeValidation {
  if (codeNormalized !== TEST_ACCESS_CODE) {
    return { ok: false, error: "Invalid access code.", status: 401 };
  }
  if (!planKeyMatches("3-month", planId)) {
    return { ok: false, error: "This access code does not apply to the selected plan.", status: 403 };
  }
  return {
    ok: true,
    codeId: null,
    planKey: "3-month",
    membershipMonths: TEST_MEMBERSHIP_MONTHS,
    codeNormalized,
  };
}

export async function validatePlatformAccessCode(input: {
  code: string;
  selectedRole: MembershipRole;
  planId: string;
  userId: string;
}): Promise<PlatformAccessCodeValidation> {
  const codeNormalized = normalizeCodeInput(input.code);
  if (!codeNormalized) {
    return { ok: false, error: "Access code is required.", status: 401 };
  }

  const admin = createAdminClient();
  if (!admin) {
    return fallbackHardcodedCode(codeNormalized, input.selectedRole, input.planId);
  }

  const { data, error } = await admin
    .from("platform_access_codes")
    .select(
      "id, code_normalized, membership_role, plan_key, max_redemptions, redemption_count, expires_at, one_per_user, is_active",
    )
    .eq("code_normalized", codeNormalized)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return fallbackHardcodedCode(codeNormalized, input.selectedRole, input.planId);
    }
    return { ok: false, error: "Could not validate access code.", status: 500 };
  }

  if (!data) {
    return fallbackHardcodedCode(codeNormalized, input.selectedRole, input.planId);
  }

  const row = data as PlatformCodeRow;

  if (!row.is_active) {
    return { ok: false, error: "This access code is no longer active.", status: 403 };
  }

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "This access code has expired.", status: 403 };
  }

  if (row.membership_role && row.membership_role !== input.selectedRole) {
    return {
      ok: false,
      error: "This access code does not apply to the selected membership role.",
      status: 403,
    };
  }

  if (!planKeyMatches(row.plan_key, input.planId)) {
    return {
      ok: false,
      error: "This access code does not apply to the selected plan.",
      status: 403,
    };
  }

  if (
    row.max_redemptions != null &&
    row.redemption_count >= row.max_redemptions
  ) {
    return { ok: false, error: "This access code has reached its usage limit.", status: 403 };
  }

  if (row.one_per_user) {
    const { count, error: redemptionError } = await admin
      .from("platform_access_code_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("code_id", row.id)
      .eq("user_id", input.userId);

    if (redemptionError && !isMissingRelationError(redemptionError)) {
      return { ok: false, error: "Could not validate access code.", status: 500 };
    }

    if ((count ?? 0) > 0) {
      return { ok: false, error: "You have already used this access code.", status: 409 };
    }
  }

  const months =
    row.plan_key === "3-month" || row.plan_key === "3_months" ? TEST_MEMBERSHIP_MONTHS : 3;

  return {
    ok: true,
    codeId: row.id,
    planKey: row.plan_key,
    membershipMonths: months,
    codeNormalized,
  };
}

export async function recordPlatformAccessCodeRedemption(input: {
  codeId: string;
  userId: string;
  role: MembershipRole;
  planId: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const rolePlanId = planIdForMembershipRole(input.planId, input.role);

  const { error: redemptionError } = await admin.from("platform_access_code_redemptions").insert({
    code_id: input.codeId,
    user_id: input.userId,
    membership_role: input.role,
    plan_id: rolePlanId,
  });

  if (redemptionError && redemptionError.code !== "23505") {
    console.error("[platform-access-code] redemption insert failed", redemptionError.message);
  }

  const { data: row } = await admin
    .from("platform_access_codes")
    .select("redemption_count")
    .eq("id", input.codeId)
    .maybeSingle();

  if (row) {
    await admin
      .from("platform_access_codes")
      .update({
        redemption_count: (row.redemption_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.codeId);
  }
}

export function resolvePlanIdForPlatformCode(
  planId: string,
  role: MembershipRole,
): string {
  const normalized = normalizeCatalogPlanId(planId) ?? planId;
  const exists = MEMBERSHIP_PLAN_CATALOG[role].some((p) => p.id === normalized);
  if (exists) return normalized;
  return planIdForMembershipRole(planId, role);
}
