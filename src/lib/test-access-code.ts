import { MEMBERSHIP_PLAN_CATALOG, type MembershipRole } from "@/lib/membership";
import { billingIntervalFromPlanId, normalizeCatalogPlanId } from "@/lib/stripe-plans";

/** Shared test code for Monday launch — server-validated only. */
export const TEST_ACCESS_CODE = "STAYTEST3M";

export const TEST_MEMBERSHIP_SOURCE = "test_code";

export const TEST_MEMBERSHIP_MONTHS = 3;

export function isValidTestAccessCode(code: string | null | undefined): boolean {
  return code?.trim().toUpperCase() === TEST_ACCESS_CODE;
}

export function addMonthsIso(from: Date, months: number): string {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
}

export function planIdForMembershipRole(
  selectedPlanId: string,
  targetRole: MembershipRole,
): string {
  const normalized = normalizeCatalogPlanId(selectedPlanId) ?? selectedPlanId.trim();
  const interval = billingIntervalFromPlanId(normalized) ?? "3_months";
  const match = MEMBERSHIP_PLAN_CATALOG[targetRole].find(
    (plan) => billingIntervalFromPlanId(plan.id) === interval,
  );
  if (match) return match.id;
  return targetRole === "pet_parent" ? "3-month-owner" : "3-month-friend";
}

/** Always activate the purchased/selected role only — never expand from profiles.role = both. */
export function membershipRolesToActivate(
  _profileRole: "pet_parent" | "pet_friend" | "both" | undefined,
  selectedRole: MembershipRole,
): MembershipRole[] {
  return [selectedRole];
}
