"use server";

import { revalidatePath } from "next/cache";
import {
  activeModeToMembershipRole,
  isMembershipActive,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";
import { cancelUserMembershipAsAdmin } from "@/lib/membership-activate";
import { resolveUserMemberships } from "@/lib/membership-load";
import { createClient } from "@/lib/supabase/server";

/** Refreshes membership snapshot for ProfileContext consumers after mode switch. */
export async function refreshProfileMembershipsAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { fetchUserProfile } = await import("@/lib/profile-load");
  await fetchUserProfile(supabase, user.id);
  return { ok: true };
}

export async function getMembershipsForActiveModeAction(activeMode: "pet_parent" | "pet_friend") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const memberships = await resolveUserMemberships(supabase, user.id);
  const role = activeModeToMembershipRole(activeMode);
  const active = memberships[role];
  return { memberships, active: isMembershipActive(active) ? active : null };
}

/** Cancel one active membership row for the signed-in user and selected role only. */
export async function cancelMembershipAction(
  role: MembershipRole,
): Promise<{ ok: true; membership: UserMembership } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  if (role !== "pet_parent" && role !== "pet_friend") {
    return { ok: false, error: "Invalid membership role." };
  }

  const result = await cancelUserMembershipAsAdmin(user.id, role);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/membership");
  revalidatePath("/dashboard");

  return { ok: true, membership: result.membership };
}
