import type { ProfileRow } from "@/lib/profile-utils";
import { needsRoleOnboarding } from "@/lib/profile-utils";

export const ROLE_ONBOARDING_PATH = "/onboarding/role";
export const DASHBOARD_PATH = "/dashboard";

export function resolvePostAuthPath(profile: ProfileRow | null): string {
  if (needsRoleOnboarding(profile)) {
    return ROLE_ONBOARDING_PATH;
  }
  return DASHBOARD_PATH;
}

/** Safe internal path from ?next= query (login redirect). */
export function resolveLoginReturnPath(nextParam: string | null): string | null {
  if (!nextParam) return null;
  const decoded = decodeURIComponent(nextParam).trim();
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  return decoded;
}

export function resolvePostLoginPath(
  profile: ProfileRow | null,
  nextParam: string | null,
): string {
  const returnPath = resolveLoginReturnPath(nextParam);
  if (returnPath && !needsRoleOnboarding(profile)) {
    return returnPath;
  }
  return resolvePostAuthPath(profile);
}
