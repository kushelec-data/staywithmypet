"use server";

import { upsertUserMembership } from "@/lib/membership-activate";
import {
  activeModeToMembershipRole,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";
import { fetchUserMemberships } from "@/lib/membership-load";
import { createClient } from "@/lib/supabase/server";

export type ActivateMembershipInput = {
  role: MembershipRole;
  planId: string;
  planName?: string;
  endDate?: string | null;
  autoRenew?: boolean;
  status?: "active" | "trialing";
};

/**
 * Manual / demo activation. Paid checkout is fulfilled by Stripe webhooks
 * (`/api/stripe/webhook`) via `upsertUserMembershipAsAdmin`.
 */
export async function activateMembershipAction(
  input: ActivateMembershipInput,
): Promise<{ ok: true; membership: UserMembership } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  return upsertUserMembership(supabase, {
    userId: user.id,
    role: input.role,
    planId: input.planId,
    planName: input.planName,
    status: input.status ?? "active",
    endDate: input.endDate,
    autoRenew: input.autoRenew,
  });
}

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

  const memberships = await fetchUserMemberships(supabase, user.id);
  const role = activeModeToMembershipRole(activeMode);
  return { memberships, active: memberships[role] };
}
