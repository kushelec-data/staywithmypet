import "server-only";

import { triggerMembershipConfirmationEmail } from "@/lib/membership-emails";
import {
  membershipPlanLabel,
  resolvePlanName,
  type MembershipRole,
  type MembershipStatus,
  type UserMembership,
} from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCatalogPlanId } from "@/lib/stripe-plans";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export const MEMBERSHIP_RETURN_COLUMNS =
  "id, user_id, role, plan_id, plan_name, status, start_date, end_date, auto_renew, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_checkout_session_id";

export type UpsertMembershipInput = {
  userId: string;
  role: MembershipRole;
  planId: string;
  planName?: string;
  status?: MembershipStatus;
  startDate?: string;
  endDate?: string | null;
  autoRenew?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCheckoutSessionId?: string | null;
  /** When false, skip confirmation email (e.g. interim webhook updates). */
  sendConfirmationEmail?: boolean;
};

function normalizeMembershipTimestamp(value: string | undefined): string {
  if (!value?.trim()) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeMembershipEndDate(value: string | null | undefined): string | null {
  if (value == null || !String(value).trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function upsertUserMembership(
  supabase: SupabaseClient,
  input: UpsertMembershipInput,
): Promise<
  | { ok: true; membership: UserMembership }
  | { ok: false; error: string; code?: string | null }
> {
  const catalogPlanId =
    normalizeCatalogPlanId(input.planId) ?? input.planId.trim();
  const startDate = normalizeMembershipTimestamp(input.startDate);
  const planName =
    input.planName?.trim() || resolvePlanName(input.role, catalogPlanId);

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    role: input.role,
    plan_id: catalogPlanId,
    plan_name: planName,
    status: input.status ?? "active",
    start_date: startDate,
    end_date: normalizeMembershipEndDate(input.endDate),
    auto_renew: input.autoRenew ?? true,
  };

  if (input.stripeCustomerId !== undefined) {
    payload.stripe_customer_id = input.stripeCustomerId;
  }
  if (input.stripeSubscriptionId !== undefined) {
    payload.stripe_subscription_id = input.stripeSubscriptionId;
  }
  if (input.stripePriceId !== undefined) {
    payload.stripe_price_id = input.stripePriceId;
  }
  if (input.stripeCheckoutSessionId !== undefined) {
    payload.stripe_checkout_session_id = input.stripeCheckoutSessionId;
  }

  const returnColumns = MEMBERSHIP_RETURN_COLUMNS;
  let upsertPayload = payload;
  let selectColumns = returnColumns;

  let { data, error } = await supabase
    .from("user_memberships")
    .upsert(upsertPayload, { onConflict: "user_id,role" })
    .select(selectColumns)
    .single();

  if (
    error &&
    "stripe_checkout_session_id" in upsertPayload &&
    /stripe_checkout_session_id/i.test(error.message)
  ) {
    console.warn("[membership] retrying upsert without stripe_checkout_session_id (run migrations)");
    const { stripe_checkout_session_id: _removed, ...withoutCheckout } = upsertPayload;
    upsertPayload = withoutCheckout;
    selectColumns = returnColumns.replace(", stripe_checkout_session_id", "");
    ({ data, error } = await supabase
      .from("user_memberships")
      .upsert(upsertPayload, { onConflict: "user_id,role" })
      .select(selectColumns)
      .single());
  }

  if (error) {
    console.error("[membership] user_memberships upsert failed", {
      userId: input.userId,
      role: input.role,
      planId: input.planId,
      message: error.message,
      code: error.code,
    });
    return { ok: false, error: error.message, code: error.code ?? null };
  }

  const membership = data as unknown as UserMembership;

  console.log("[membership] database updated", {
    table: "user_memberships",
    userId: input.userId,
    role: input.role,
    planId: membership.plan_id,
    status: membership.status,
    endDate: membership.end_date,
  });

  const planLabel = membershipPlanLabel(membership) ?? membership.plan_id;
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ membership_status: planLabel })
    .eq("id", input.userId);

  if (profileError) {
    console.error("[membership] profiles.membership_status update failed", {
      userId: input.userId,
      message: profileError.message,
      code: profileError.code,
    });
  } else {
    console.log("[membership] database updated", {
      table: "profiles",
      userId: input.userId,
      membership_status: planLabel,
    });
  }

  if (input.sendConfirmationEmail !== false) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", input.userId)
      .maybeSingle();

    triggerMembershipConfirmationEmail(
      input.userId,
      membership,
      (profileRow?.display_name as string | undefined)?.trim(),
    );
  }

  revalidatePath("/membership");
  revalidatePath("/dashboard");

  return { ok: true, membership };
}

/** Webhook and other server-only callers without a user session. */
export async function upsertUserMembershipAsAdmin(
  input: UpsertMembershipInput,
): Promise<
  | { ok: true; membership: UserMembership }
  | { ok: false; error: string; code?: string | null }
> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[membership] admin client unavailable: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing");
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      code: "missing_service_role",
    };
  }
  return upsertUserMembership(admin, input);
}
