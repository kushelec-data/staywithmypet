import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activeModeToMembershipRole,
  canUseMembershipFeaturesForMode,
  hasActiveMembershipForRole,
  type MembershipRole,
  type UserMembershipsByRole,
} from "@/lib/membership";
import { resolveUserMemberships } from "@/lib/membership-load";
import type { ProfileActiveMode } from "@/lib/profile-mode";

export const MEMBERSHIP_REQUIRED_MESSAGE =
  "An active membership is required for messaging and bookings in your current mode. Upgrade on the Membership page.";

export function isMembershipRequiredError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(MEMBERSHIP_REQUIRED_MESSAGE);
}

export async function loadMembershipsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembershipsByRole> {
  return resolveUserMemberships(supabase, userId);
}

/**
 * True when status is active|trialing AND (end_date null OR end_date > now()).
 */
export async function hasActiveMembership(
  supabase: SupabaseClient,
  userId: string,
  role: MembershipRole,
): Promise<boolean> {
  const memberships = await loadMembershipsForUser(supabase, userId);
  return hasActiveMembershipForRole(memberships, role);
}

export function assertMembershipForMode(
  memberships: UserMembershipsByRole,
  mode: ProfileActiveMode,
): void {
  if (!canUseMembershipFeaturesForMode(memberships, mode)) {
    throw new Error(MEMBERSHIP_REQUIRED_MESSAGE);
  }
}

export function assertMembershipForRole(
  memberships: UserMembershipsByRole,
  role: MembershipRole,
): void {
  if (!hasActiveMembershipForRole(memberships, role)) {
    throw new Error(MEMBERSHIP_REQUIRED_MESSAGE);
  }
}

export async function assertActiveMembership(
  supabase: SupabaseClient,
  userId: string,
  mode: ProfileActiveMode,
): Promise<void> {
  const memberships = await loadMembershipsForUser(supabase, userId);
  assertMembershipForMode(memberships, mode);
}

export async function assertActiveMembershipForRole(
  supabase: SupabaseClient,
  userId: string,
  role: MembershipRole,
): Promise<void> {
  const memberships = await loadMembershipsForUser(supabase, userId);
  assertMembershipForRole(memberships, role);
}

export function membershipRoleForSender(
  senderId: string,
  petParentId: string,
  petFriendId: string,
): MembershipRole {
  return senderId === petParentId ? "pet_parent" : "pet_friend";
}
