import "server-only";

import { revalidatePath } from "next/cache";
import { triggerMembershipConfirmationEmail } from "@/lib/membership-emails";
import { parseMembershipRoleInput } from "@/lib/stripe-webhook-resolve";
import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";
import {
  isMembershipPromotionErrorCode,
  MEMBERSHIP_PROMOTION_HTTP_STATUS,
  MEMBERSHIP_PROMOTION_SOURCE,
  normalizePromotionCode,
  type MembershipPromotionErrorCode,
} from "@/lib/membership-promotion-rules";
import type { MembershipRole, UserMembership } from "@/lib/membership";
import type { SupabaseClient } from "@supabase/supabase-js";

export {
  MEMBERSHIP_PROMOTION_EXPIRES_AT,
  MEMBERSHIP_PROMOTION_HTTP_STATUS,
  MEMBERSHIP_PROMOTION_MONTHS,
  MEMBERSHIP_PROMOTION_PLAN_BY_ROLE,
  MEMBERSHIP_PROMOTION_SOURCE,
  addMembershipMonths,
  canGrantPromotionOverExistingMembership,
  hasPreviousPromotionRedemption,
  isPromotionCurrentlyRedeemable,
  isRegisteredAfterPromotionActivation,
  normalizePromotionCode,
  promotionPlanIdForRole,
} from "@/lib/membership-promotion-rules";

export const REDEEM_MEMBERSHIP_PROMOTION_RPC = "redeem_membership_promotion";

const PUBLIC_ERROR_MESSAGE: Record<MembershipPromotionErrorCode, string> = {
  NOT_SIGNED_IN: "Not signed in.",
  INVALID_CODE: "Invalid promotional code.",
  INVALID_ROLE: "Choose Pet Parent or Pet Friend.",
  PROFILE_REQUIRED: "Finish creating your profile before redeeming a code.",
  INACTIVE: "This promotional code is not active.",
  EXPIRED: "This promotional code has expired.",
  NOT_NEW_USER: "This code is only for newly registered accounts.",
  ALREADY_REDEEMED: "You have already used this promotional code.",
  PREVIOUSLY_REDEEMED: "You have already used this promotional code.",
  ACTIVE_MEMBERSHIP: "You already have an active membership for this role.",
  CAP_REACHED: "This promotional code is no longer available.",
};

type RedeemRpcOk = {
  ok: true;
  membership_id: string;
  role: MembershipRole;
  plan_id: string;
  start_date: string;
  end_date: string;
  source: string;
};

type RedeemRpcErr = {
  ok: false;
  code: string;
};

export type RedeemMembershipPromotionResult =
  | {
      ok: true;
      membership: {
        id: string;
        role: MembershipRole;
        planId: string;
        startDate: string;
        endDate: string;
        source: string;
      };
    }
  | { ok: false; error: string; status: number; code?: MembershipPromotionErrorCode };

export function promotionErrorMessage(code: MembershipPromotionErrorCode): string {
  return PUBLIC_ERROR_MESSAGE[code];
}

export function parseRedeemMembershipPromotionPayload(body: unknown):
  | { ok: true; code: string; role: MembershipRole; termsAccepted: boolean }
  | { ok: false; error: string; status: number } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON", status: 400 };
  }
  const record = body as Record<string, unknown>;
  const code = normalizePromotionCode(typeof record.code === "string" ? record.code : "");
  if (!code) {
    return { ok: false, error: "Promotional code is required.", status: 400 };
  }
  const role = parseMembershipRoleInput(record.role);
  if (!role) {
    return { ok: false, error: "role (parent|friend) is required.", status: 400 };
  }
  return {
    ok: true,
    code,
    role,
    termsAccepted: record.termsAccepted === true,
  };
}

function asRpcResult(data: unknown): RedeemRpcOk | RedeemRpcErr | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (row.ok === true && typeof row.membership_id === "string" && typeof row.plan_id === "string") {
    const role = parseMembershipRoleInput(row.role);
    if (!role) return null;
    return {
      ok: true,
      membership_id: row.membership_id,
      role,
      plan_id: row.plan_id,
      start_date: String(row.start_date ?? ""),
      end_date: String(row.end_date ?? ""),
      source: String(row.source ?? MEMBERSHIP_PROMOTION_SOURCE),
    };
  }
  if (row.ok === false && typeof row.code === "string") {
    return { ok: false, code: row.code };
  }
  return null;
}

export async function redeemMembershipPromotion(input: {
  supabase: SupabaseClient;
  userId: string;
  code: string;
  role: MembershipRole;
  recipientName?: string | null;
}): Promise<RedeemMembershipPromotionResult> {
  const { data, error } = await input.supabase.rpc(REDEEM_MEMBERSHIP_PROMOTION_RPC, {
    p_code: input.code,
    p_role: input.role,
  });

  if (error) {
    if (isPostgrestError(error) && isMissingRelationError(error)) {
      return {
        ok: false,
        error: "This promotional code is not available yet.",
        status: 503,
      };
    }
    const rpcMissing =
      isPostgrestError(error) &&
      (error.code === "PGRST202" || error.code === "42883" || /redeem_membership_promotion/i.test(error.message));
    if (rpcMissing) {
      return {
        ok: false,
        error: "This promotional code is not available yet.",
        status: 503,
      };
    }
    return {
      ok: false,
      error: "Could not redeem promotional code.",
      status: 500,
    };
  }

  const parsed = asRpcResult(data);
  if (!parsed) {
    return { ok: false, error: "Could not redeem promotional code.", status: 500 };
  }
  if (!parsed.ok) {
    if (!isMembershipPromotionErrorCode(parsed.code)) {
      return { ok: false, error: "Could not redeem promotional code.", status: 500 };
    }
    return {
      ok: false,
      error: promotionErrorMessage(parsed.code),
      status: MEMBERSHIP_PROMOTION_HTTP_STATUS[parsed.code],
      code: parsed.code,
    };
  }

  const membership = {
    id: parsed.membership_id,
    role: parsed.role,
    planId: parsed.plan_id,
    startDate: parsed.start_date,
    endDate: parsed.end_date,
    source: parsed.source,
  };

  triggerMembershipConfirmationEmail(
    input.userId,
    {
      id: membership.id,
      user_id: input.userId,
      role: membership.role,
      plan_id: membership.planId,
      plan_name: "2 Month",
      status: "active",
      start_date: membership.startDate,
      end_date: membership.endDate,
      auto_renew: false,
      linked_booking_id: null,
      consumed_at: null,
      cancellation_restart_used: false,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      stripe_checkout_session_id: null,
    } satisfies UserMembership,
    input.recipientName ?? undefined,
  );

  revalidatePath("/membership");
  revalidatePath("/dashboard");

  return { ok: true, membership };
}
