import {
  isMembershipActive,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";

/** Provenance written to user_memberships.source by the promotion RPC. */
export const MEMBERSHIP_PROMOTION_SOURCE = "membership_promotion";

export const MEMBERSHIP_PROMOTION_MONTHS = 2;

/** End of 20 November 2026 in Estonia (EET, UTC+2). SQL is the source of truth. */
export const MEMBERSHIP_PROMOTION_EXPIRES_AT = "2026-11-20T21:59:59.999Z";

export const MEMBERSHIP_PROMOTION_PLAN_BY_ROLE: Record<MembershipRole, string> = {
  pet_parent: "promo-2-month-owner",
  pet_friend: "promo-2-month-friend",
};

const PRIOR_PROMOTION_SOURCES = new Set([
  "platform_access_code",
  "test_code",
  "membership_promotion",
]);

export type MembershipPromotionErrorCode =
  | "NOT_SIGNED_IN"
  | "INVALID_CODE"
  | "INVALID_ROLE"
  | "PROFILE_REQUIRED"
  | "INACTIVE"
  | "EXPIRED"
  | "NOT_NEW_USER"
  | "ALREADY_REDEEMED"
  | "PREVIOUSLY_REDEEMED"
  | "ACTIVE_MEMBERSHIP"
  | "CAP_REACHED";

export const MEMBERSHIP_PROMOTION_HTTP_STATUS: Record<MembershipPromotionErrorCode, number> = {
  NOT_SIGNED_IN: 401,
  INVALID_CODE: 401,
  INVALID_ROLE: 400,
  PROFILE_REQUIRED: 400,
  INACTIVE: 403,
  EXPIRED: 403,
  NOT_NEW_USER: 403,
  ALREADY_REDEEMED: 409,
  PREVIOUSLY_REDEEMED: 409,
  ACTIVE_MEMBERSHIP: 409,
  CAP_REACHED: 403,
};

export function normalizePromotionCode(code: string | null | undefined): string {
  return code?.trim().toUpperCase() ?? "";
}

export function promotionPlanIdForRole(role: MembershipRole): string {
  return MEMBERSHIP_PROMOTION_PLAN_BY_ROLE[role];
}

/** auth.users.created_at must be strictly later than promotions.activated_at. */
export function isRegisteredAfterPromotionActivation(
  userCreatedAt: string | Date | null | undefined,
  activatedAt: string | Date | null | undefined,
): boolean {
  const created = toTime(userCreatedAt);
  const activated = toTime(activatedAt);
  if (created == null || activated == null) return false;
  return created > activated;
}

export function isPromotionCurrentlyRedeemable(input: {
  isActive: boolean;
  now: string | Date;
  activatedAt: string | Date;
  expiresAt: string | Date;
}): boolean {
  if (!input.isActive) return false;
  const now = toTime(input.now);
  const activated = toTime(input.activatedAt);
  const expires = toTime(input.expiresAt);
  if (now == null || activated == null || expires == null) return false;
  return now >= activated && now <= expires;
}

export function hasPreviousPromotionRedemption(
  sources: Array<string | null | undefined>,
): boolean {
  return sources.some((source) => PRIOR_PROMOTION_SOURCES.has((source ?? "").trim().toLowerCase()));
}

/** Paid/complimentary access that is still valid must not be replaced or extended. */
export function canGrantPromotionOverExistingMembership(
  existing: Pick<UserMembership, "status" | "end_date" | "plan_id"> | null | undefined,
  now = new Date(),
): boolean {
  if (!existing) return true;
  return !isMembershipActive(existing as UserMembership, now);
}

export function addMembershipMonths(from: Date, months: number): Date {
  const end = new Date(from.getTime());
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

export function isMembershipPromotionErrorCode(
  value: string | null | undefined,
): value is MembershipPromotionErrorCode {
  return Boolean(value && value in MEMBERSHIP_PROMOTION_HTTP_STATUS);
}

function toTime(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}
