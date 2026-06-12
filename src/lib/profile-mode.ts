import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileRow } from "@/lib/profile-utils";
import type { Dictionary } from "@/i18n/translations";

/** UI-only dashboard mode. Stored as profiles.active_mode (user spec: current_mode). */
export type ProfileActiveMode = "pet_parent" | "pet_friend";

export type SidebarModeAction = {
  id: string;
  label: string;
  targetMode: ProfileActiveMode;
};

export function isProfileActiveMode(value: string | null | undefined): value is ProfileActiveMode {
  return value === "pet_parent" || value === "pet_friend";
}

export function initialActiveModeForRole(role: ProfileRole): ProfileActiveMode {
  return role === "pet_friend" ? "pet_friend" : "pet_parent";
}

export function resolveActiveMode(
  role: ProfileRole | undefined,
  activeMode: string | null | undefined,
): ProfileActiveMode {
  if (isProfileActiveMode(activeMode)) return activeMode;
  return initialActiveModeForRole(role ?? "pet_friend");
}

/** Single opposite-mode switch shown in the account sidebar. */
export function sidebarModeActionForProfile(
  profile: ProfileRow | null,
  accountT?: Dictionary["account"],
): SidebarModeAction | null {
  if (!profile) return null;

  const mode = resolveActiveMode(profile.role, profile.active_mode);

  if (mode === "pet_parent") {
    return {
      id: "pet_friend",
      label: accountT?.switchToPetFriend ?? "Switch to Pet Friend",
      targetMode: "pet_friend",
    };
  }

  return {
    id: "pet_parent",
    label: accountT?.switchToPetParent ?? "Switch to Pet Parent",
    targetMode: "pet_parent",
  };
}

/** @deprecated use sidebarModeActionForProfile */
export function sidebarModeActionsForProfile(profile: ProfileRow | null): SidebarModeAction[] {
  const action = sidebarModeActionForProfile(profile);
  return action ? [action] : [];
}

export function formatActiveMode(
  mode: ProfileActiveMode,
  roles?: Dictionary["roles"],
): string {
  if (roles) {
    return mode === "pet_parent" ? roles.petParent.label : roles.petFriend.label;
  }
  return mode === "pet_parent" ? "Pet Parent" : "Pet Friend";
}

export function formatProfileRoleLabel(role: ProfileRole, roles?: Dictionary["roles"]): string {
  if (roles) {
    switch (role) {
      case "pet_parent":
        return roles.petParent.label;
      case "pet_friend":
        return roles.petFriend.label;
      case "both":
        return roles.both.label;
      default:
        return role;
    }
  }
  switch (role) {
    case "pet_parent":
      return "Pet Parent";
    case "pet_friend":
      return "Pet Friend";
    case "both":
      return "Pet Parent & Pet Friend";
    default:
      return role;
  }
}

/** Short badge label for public profile hero. */
export function formatProfileRoleBadge(role: ProfileRole, roles?: Dictionary["roles"]): string {
  if (roles) {
    switch (role) {
      case "pet_parent":
        return roles.petParent.label;
      case "pet_friend":
        return roles.petFriend.label;
      case "both":
        return roles.both.badge;
      default:
        return role;
    }
  }
  switch (role) {
    case "pet_parent":
      return "Pet Parent";
    case "pet_friend":
      return "Pet Friend";
    case "both":
      return "Both";
    default:
      return role;
  }
}

export function roleAfterModeSwitch(
  currentRole: ProfileRole,
  targetMode: ProfileActiveMode,
): ProfileRole {
  if (currentRole === "both") return "both";
  if (targetMode === "pet_friend" && currentRole === "pet_parent") return "both";
  if (targetMode === "pet_parent" && currentRole === "pet_friend") return "both";
  return currentRole;
}
