import { canUseMembershipFeaturesForMode } from "@/lib/membership";
import type { ProfileRow } from "@/lib/profile-utils";
import { isProfileIncomplete, needsRoleOnboarding } from "@/lib/profile-utils";

export const ROLE_ONBOARDING_PATH = "/onboarding/role";
export const DASHBOARD_PATH = "/dashboard";
export const MEMBERSHIP_PATH = "/membership";
export const PROFILE_SETUP_PATH = "/profile/setup";

/** Where an existing session should land from signup, pricing, or login guards. */
export function resolveAuthenticatedSessionPath(profile: ProfileRow | null): string {
  if (needsRoleOnboarding(profile)) {
    return ROLE_ONBOARDING_PATH;
  }
  if (!profile || !canUseMembershipFeaturesForMode(profile.memberships, profile.active_mode)) {
    return MEMBERSHIP_PATH;
  }
  return DASHBOARD_PATH;
}

export function resolvePostAuthPath(profile: ProfileRow | null): string {
  if (needsRoleOnboarding(profile)) {
    return ROLE_ONBOARDING_PATH;
  }
  if (profile && isProfileIncomplete(profile)) {
    return PROFILE_SETUP_PATH;
  }
  return DASHBOARD_PATH;
}

/** Safe internal path from ?next= query (login redirect). */
export function resolveLoginReturnPath(nextParam: string | null): string | null {
  if (!nextParam) return null;
  const decoded = decodeURIComponent(nextParam).trim();
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded === "/") return null;
  return decoded;
}

export function resolvePostLoginPath(
  profile: ProfileRow | null,
  nextParam: string | null,
): string {
  if (needsRoleOnboarding(profile)) {
    return ROLE_ONBOARDING_PATH;
  }
  if (profile && isProfileIncomplete(profile)) {
    return PROFILE_SETUP_PATH;
  }
  const returnPath = resolveLoginReturnPath(nextParam);
  if (returnPath) {
    return returnPath;
  }
  return DASHBOARD_PATH;
}
