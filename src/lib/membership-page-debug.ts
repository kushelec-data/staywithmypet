import "server-only";

import {
  isMembershipActive,
  type MembershipRole,
} from "@/lib/membership";
import { fetchUserMemberships } from "@/lib/membership-load";
import { getMembershipWebhookHealth, isMembershipConfirmWritable } from "@/lib/stripe-webhook-config";
import { createClient } from "@/lib/supabase/server";

export type RoleMembershipDebug = {
  rowFound: boolean;
  isActive: boolean;
  status: string | null;
  planId: string | null;
  endDate: string | null;
};

export type MembershipActivationDebug = {
  userId: string;
  webhookWritable: boolean;
  confirmWritable: boolean;
  webhookHealth: ReturnType<typeof getMembershipWebhookHealth>;
  pet_parent: RoleMembershipDebug;
  pet_friend: RoleMembershipDebug;
};

function roleDebug(
  memberships: Awaited<ReturnType<typeof fetchUserMemberships>>,
  role: MembershipRole,
): RoleMembershipDebug {
  const row = memberships[role];
  return {
    rowFound: Boolean(row),
    isActive: isMembershipActive(row),
    status: row?.status ?? null,
    planId: row?.plan_id ?? null,
    endDate: row?.end_date ?? null,
  };
}

/** Server-only snapshot for temporary /membership activation debug UI. */
export async function loadMembershipActivationDebug(
  userId: string,
): Promise<MembershipActivationDebug> {
  const supabase = await createClient();
  const memberships = await fetchUserMemberships(supabase, userId);
  const health = getMembershipWebhookHealth();

  return {
    userId,
    webhookWritable: health.membershipWebhookWritable,
    confirmWritable: isMembershipConfirmWritable(),
    webhookHealth: health,
    pet_parent: roleDebug(memberships, "pet_parent"),
    pet_friend: roleDebug(memberships, "pet_friend"),
  };
}
