import { ROLE_ONBOARDING_PATH, DASHBOARD_PATH } from "@/lib/auth-routing";
import { needsRoleOnboarding, type ProfileRow } from "@/lib/profile-utils";

/** Roles offered during first-time onboarding (existing `both` profiles are unchanged). */
export type OnboardingRole = "pet_parent" | "pet_friend";

export function isOnboardingRole(value: string | null | undefined): value is OnboardingRole {
  return value === "pet_parent" || value === "pet_friend";
}

/** Brand-new accounts start with no UI selection, even if the DB defaulted `role`. */
export function initialOnboardingRoleSelection(): OnboardingRole | null {
  return null;
}

/**
 * A role is chosen only after explicit user action (`role_chosen_at`).
 * Database defaults and `active_mode` must not count as a selection.
 */
export function onboardingSelectionFromProfile(
  profile: Pick<ProfileRow, "role" | "role_chosen_at" | "active_mode"> | null,
): OnboardingRole | null {
  if (!profile?.role_chosen_at) return null;
  return isOnboardingRole(profile.role) ? profile.role : null;
}

export function canSaveOnboardingRole(
  selected: OnboardingRole | null,
): selected is OnboardingRole {
  return isOnboardingRole(selected);
}

export function accountPathForRoleState(profile: ProfileRow | null): string {
  return needsRoleOnboarding(profile) ? ROLE_ONBOARDING_PATH : DASHBOARD_PATH;
}

export function shouldHideAccountNavDuringRoleOnboarding(rolePending: boolean): boolean {
  return rolePending;
}
