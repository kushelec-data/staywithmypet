import type { ProfileDetails } from "@/lib/profile-details";
import type { ProfileContentLanguage } from "@/lib/profile-content-language";
import {
  DEMO_MEMBERSHIP_LABEL,
  emptyMembershipsByRole,
  membershipStatusForMode,
  type UserMembershipsByRole,
} from "@/lib/membership";
import type { ProfileRole } from "@/lib/profile-setup";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  /** Legacy short label; prefer public_location for public display when set. */
  location: string | null;
  address: string | null;
  formatted_address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  google_place_id: string | null;
  public_location: string | null;
  latitude: number | null;
  longitude: number | null;
  role: ProfileRole;
  active_mode: ProfileActiveMode;
  role_chosen_at: string | null;
  languages: string[];
  profile_language: ProfileContentLanguage | null;
  phone: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  phone_e164: string | null;
  phone_verified: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone_country_code: string | null;
  emergency_contact_phone_number: string | null;
  emergency_contact_phone_e164: string | null;
  trust_score: number;
  is_public: boolean;
  rating_avg: number;
  rating_count: number;
  /** Plan label for the current active_mode only (not the other role). */
  membership_status: string;
  memberships: UserMembershipsByRole;
  details: ProfileDetails;
};

export function applyMembershipsToProfile(
  profile: ProfileRow,
  memberships: UserMembershipsByRole,
): ProfileRow {
  return {
    ...profile,
    memberships,
    membership_status: membershipStatusForMode(memberships, profile.active_mode),
  };
}

export function membershipStatusForProfile(
  profile: ProfileRow | null,
  mode?: ProfileActiveMode,
): string {
  if (!profile) return DEMO_MEMBERSHIP_LABEL;
  const activeMode = mode ?? profile.active_mode;
  return membershipStatusForMode(profile.memberships ?? emptyMembershipsByRole(), activeMode);
}

export function needsRoleOnboarding(profile: ProfileRow | null): boolean {
  if (!profile) return true;
  return !profile.role_chosen_at;
}

export function formatProfileRole(role: ProfileRole): string {
  return role.replace(/_/g, " ");
}

export function profileInitials(displayName: string, email?: string | null): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "?";
}

export function profileUsername(profile: ProfileRow | null, email?: string | null): string {
  const fromProfile = profile?.display_name?.trim() ?? "";
  const slug = fromProfile
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (slug.length > 0) return slug;
  return email?.split("@")[0] ?? "user";
}

export function isProfileIncomplete(profile: ProfileRow, email?: string | null): boolean {
  const name = profile.display_name?.trim() ?? "";
  const emailPrefix = email?.split("@")[0]?.toLowerCase() ?? "";
  const nameLooksDefault =
    !name || name === "User" || (emailPrefix && name.toLowerCase() === emailPrefix);
  const missingLocation = !profile.location?.trim();
  const missingBio = !profile.bio?.trim();
  const missingLanguages = !profile.languages?.length;
  return nameLooksDefault || missingLocation || missingBio || missingLanguages;
}

export function profileDisplayLabel(
  profile: ProfileRow | null,
  email?: string | null,
): string {
  const name = profile?.display_name?.trim();
  if (name) return name;
  if (!profile && email) return email.split("@")[0] ?? email;
  return "Account";
}
