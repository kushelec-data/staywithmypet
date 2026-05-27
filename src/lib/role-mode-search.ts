import { hasDualActiveMemberships } from "@/lib/membership";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRow } from "@/lib/profile-utils";

export type RoleModeSearchPage = "pets" | "care";

/** Primary search destination after switching to or browsing in a mode. */
export function searchHrefForActiveMode(mode: ProfileActiveMode): string {
  return mode === "pet_friend" ? "/find-pets" : "/find-care";
}

export function requiredActiveModeForSearchPage(page: RoleModeSearchPage): ProfileActiveMode {
  return page === "pets" ? "pet_friend" : "pet_parent";
}

/** User can switch UI mode (dual membership or profile role both). */
export function userCanSwitchRoleMode(profile: ProfileRow): boolean {
  return profile.role === "both" || hasDualActiveMemberships(profile.memberships);
}

export function isSearchBlockedForProfile(
  profile: ProfileRow,
  page: RoleModeSearchPage,
): boolean {
  if (!userCanSwitchRoleMode(profile)) return false;
  const active = resolveActiveMode(profile.role, profile.active_mode);
  return active !== requiredActiveModeForSearchPage(page);
}

export function oppositeActiveMode(mode: ProfileActiveMode): ProfileActiveMode {
  return mode === "pet_parent" ? "pet_friend" : "pet_parent";
}
