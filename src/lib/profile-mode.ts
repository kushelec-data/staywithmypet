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

/** Dashboard sidebar control — mode switch (dual role) or enable-other-role CTA. */
export type SidebarModeControl =
  | { kind: "switch"; label: string; targetMode: ProfileActiveMode }
  | { kind: "enable"; label: string; href: string; targetMode: ProfileActiveMode };

export type ActiveModeSwitchErrorCode = "unsupported_mode" | "already_active";

export class ActiveModeSwitchError extends Error {
  readonly code: ActiveModeSwitchErrorCode;

  constructor(code: ActiveModeSwitchErrorCode, message: string) {
    super(message);
    this.name = "ActiveModeSwitchError";
    this.code = code;
  }
}

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
  const fallback = initialActiveModeForRole(role ?? "pet_friend");
  const mode = isProfileActiveMode(activeMode) ? activeMode : fallback;
  if (role === "pet_parent" && mode === "pet_friend") return "pet_parent";
  if (role === "pet_friend" && mode === "pet_parent") return "pet_friend";
  return mode;
}

/** Whether the profile role allows switching dashboard UI to the target mode. */
export function canSwitchActiveMode(role: ProfileRole, targetMode: ProfileActiveMode): boolean {
  if (role === "both") return true;
  return role === targetMode;
}

/** Single opposite-mode switch shown in the account sidebar (dual-role users only). */
export function sidebarModeActionForProfile(
  profile: ProfileRow | null,
  accountT?: Dictionary["account"],
): SidebarModeAction | null {
  const control = sidebarModeControlForProfile(profile, accountT);
  if (!control || control.kind !== "switch") return null;
  return {
    id: control.targetMode,
    label: control.label,
    targetMode: control.targetMode,
  };
}

export function profileSetupEnableHref(targetMode: ProfileActiveMode): string {
  return `/profile/setup?enable=${targetMode}`;
}

export function parseProfileSetupEnableParam(
  value: string | null | undefined,
): ProfileActiveMode | null {
  if (value === "pet_parent" || value === "pet_friend") return value;
  return null;
}

/** User opened setup to add their other role (single-role profile with role already chosen). */
export function isEnablingSecondRole(
  profile: ProfileRow | null,
  enableMode: ProfileActiveMode | null,
): boolean {
  if (!profile?.role_chosen_at || !enableMode) return false;
  if (profile.role === "both") return false;
  return profile.role !== enableMode;
}

export function mergedRoleForEnable(
  currentRole: ProfileRole,
  enableMode: ProfileActiveMode,
): ProfileRole {
  if (currentRole === "both") return "both";
  if (currentRole === enableMode) return currentRole;
  return "both";
}

/** Sidebar mode switch or explicit enable-other-role CTA. */
export function sidebarModeControlForProfile(
  profile: ProfileRow | null,
  accountT?: Dictionary["account"],
): SidebarModeControl | null {
  if (!profile) return null;

  const mode = resolveActiveMode(profile.role, profile.active_mode);

  if (profile.role === "both") {
    const targetMode: ProfileActiveMode = mode === "pet_parent" ? "pet_friend" : "pet_parent";
    return {
      kind: "switch",
      label:
        targetMode === "pet_friend"
          ? (accountT?.switchToPetFriend ?? "Switch to Pet Friend")
          : (accountT?.switchToPetParent ?? "Switch to Pet Parent"),
      targetMode,
    };
  }

  if (profile.role === "pet_parent") {
    return {
      kind: "enable",
      label: accountT?.createPetFriendProfile ?? "Create Pet Friend profile",
      href: profileSetupEnableHref("pet_friend"),
      targetMode: "pet_friend",
    };
  }

  if (profile.role === "pet_friend") {
    return {
      kind: "enable",
      label: accountT?.createPetParentProfile ?? "Create Pet Parent profile",
      href: profileSetupEnableHref("pet_parent"),
      targetMode: "pet_parent",
    };
  }

  return null;
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

/**
 * @deprecated Dashboard mode switches must not mutate profiles.role.
 * Role expansion belongs in explicit onboarding/profile setup only.
 */
export function roleAfterModeSwitch(
  currentRole: ProfileRole,
  _targetMode: ProfileActiveMode,
): ProfileRole {
  return currentRole;
}
