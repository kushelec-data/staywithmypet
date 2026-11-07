import {
  isProfileIncomplete,
  needsRoleOnboarding,
  type ProfileRow,
} from "@/lib/profile-utils";

/** Fields the live onboarding gate actually reads. */
export type ReminderOnboardingProfile = Pick<
  ProfileRow,
  "display_name" | "bio" | "location" | "languages" | "role_chosen_at"
>;

function asProfileRow(
  profile: ReminderOnboardingProfile | null,
): ProfileRow | null {
  return profile as ProfileRow | null;
}

/** Same as production `needsRoleOnboarding` — no role_chosen_at means role emails must not send. */
export function reminderNeedsRoleOnboarding(
  profile: ReminderOnboardingProfile | null,
): boolean {
  return needsRoleOnboarding(asProfileRow(profile));
}

/** Same as production `isProfileIncomplete` (name / location / bio / languages). */
export function reminderIsProfileIncomplete(
  profile: ReminderOnboardingProfile,
  email?: string | null,
): boolean {
  return isProfileIncomplete(asProfileRow(profile) as ProfileRow, email);
}

/**
 * Finished production onboarding: role chosen and setup fields complete.
 * Dashboard extras (pet photos, listings, availability, service preferences) are ignored.
 */
export function isCanonicalProfileComplete(
  profile: ReminderOnboardingProfile | null,
  email?: string | null,
): boolean {
  if (reminderNeedsRoleOnboarding(profile)) return false;
  if (!profile) return false;
  return !reminderIsProfileIncomplete(profile, email);
}
