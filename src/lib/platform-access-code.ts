import "server-only";

import { billingIntervalFromPlanId, normalizeCatalogPlanId } from "@/lib/stripe-plans";
import { type MembershipRole } from "@/lib/membership";
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

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function planKeyFromPlanId(planId: string): string {
  const interval = billingIntervalFromPlanId(planId);
  switch (interval) {
    case "3_months":
      return "3-month";
    case "12_months":
      return "12-month";
    case "one_time":
      return "one-time";
    default:
      return planId;
  }
}

function planKeyMatches(codePlanKey: string, selectedPlanId: string): boolean {
  const normalized = normalizeCatalogPlanId(selectedPlanId) ?? selectedPlanId.trim();
  const selectedKey = planKeyFromPlanId(normalized);
  const codeKey = codePlanKey.trim().toLowerCase();
  return (
    codeKey === selectedKey.toLowerCase() ||
    codeKey === normalized.toLowerCase() ||
    selectedKey.toLowerCase().includes(codeKey) ||
    codeKey.includes(selectedKey.toLowerCase())
  );
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
    return {
      ok: false,
      error: "This access code does not apply to the selected plan.",
      status: 403,
    };
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
  const codeNormalized = normalizeCode(input.code);
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
    const { data: prior, error: redemptionError } = await admin
      .from("platform_access_code_redemptions")
      .select("id")
      .eq("code_id", row.id)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (redemptionError && !isMissingRelationError(redemptionError)) {
      return { ok: false, error: "Could not validate access code.", status: 500 };
    }

    if (prior) {
      return { ok: false, error: "You have already used this access code.", status: 409 };
    }
  }

  const interval = billingIntervalFromPlanId(input.planId);
  const membershipMonths =
    interval === "12_months" ? 12 : interval === "one_time" ? 1 : TEST_MEMBERSHIP_MONTHS;

  return {
    ok: true,
    codeId: row.id,
    planKey: row.plan_key,
    membershipMonths,
    codeNormalized,
  };
}

export function resolvePlanIdForPlatformCode(
  selectedPlanId: string,
  targetRole: MembershipRole,
): string {
  return planIdForMembershipRole(selectedPlanId, targetRole);
}

export async function recordPlatformAccessCodeRedemption(input: {
  codeId: string;
  userId: string;
  role: MembershipRole;
  planId: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { error: insertError } = await admin.from("platform_access_code_redemptions").insert({
    code_id: input.codeId,
    user_id: input.userId,
    membership_role: input.role,
    plan_id: input.planId,
  });

  if (insertError && !isMissingRelationError(insertError)) {
    console.error("[platform-access-code] redemption insert failed", insertError.message);
    return;
  }

  const { data: row } = await admin
    .from("platform_access_codes")
    .select("redemption_count")
    .eq("id", input.codeId)
    .maybeSingle();

  if (row) {
    await admin
      .from("platform_access_codes")
      .update({ redemption_count: (row.redemption_count ?? 0) + 1 })
      .eq("id", input.codeId);
  }
}
