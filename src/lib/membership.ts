import type { ProfileActiveMode } from "@/lib/profile-mode";

export type MembershipRole = "pet_parent" | "pet_friend";

/** Matches public.membership_status after 20260603100000_memberships_extend.sql */
export type MembershipStatus =
  | "active"
  | "inactive"
  | "cancelled"
  | "expired"
  | "trialing";

export type UserMembership = {
  id: string;
  user_id: string;
  role: MembershipRole;
  plan_id: string;
  plan_name: string | null;
  status: MembershipStatus;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_checkout_session_id: string | null;
};

export type UserMembershipsByRole = {
  pet_parent: UserMembership | null;
  pet_friend: UserMembership | null;
};

/** Stripe-ready plan row for membership UI (checkout wiring later). */
export type MembershipPlanDefinition = {
  role: MembershipRole;
  plan_id: string;
  plan_name: string;
  price: string;
  billing_interval: "one_time" | "3_months" | "12_months";
  future_stripe_price_id: string | null;
  features: readonly string[];
  popular?: boolean;
};

/** Client-safe checkout debug row (env var name + mode only — no Stripe price ids). */
export type CheckoutPlanDebugMeta = {
  planId: string;
  envVar: string;
  mode: "payment" | "subscription";
};

export const DEMO_MEMBERSHIP_LABEL = "Demo";

export const MEMBERSHIP_PLAN_CATALOG: Record<
  MembershipRole,
  readonly { id: string; name: string; billingPeriod: string }[]
> = {
  pet_parent: [
    { id: "one-time-owner", name: "One Time", billingPeriod: "one time" },
    { id: "3-month-owner", name: "3 Month", billingPeriod: "3 months" },
    { id: "1-year-owner", name: "1 Year", billingPeriod: "12 months" },
  ],
  pet_friend: [
    { id: "one-time-friend", name: "One Time", billingPeriod: "one time" },
    { id: "3-month-friend", name: "3 Month", billingPeriod: "3 months" },
    { id: "1-year-friend", name: "1 Year", billingPeriod: "12 months" },
  ],
};

const PLAN_PRICES: Record<string, string> = {
  "one-time-owner": "€18",
  "3-month-owner": "€79",
  "1-year-owner": "€249",
  "one-time-friend": "€12",
  "3-month-friend": "€49",
  "1-year-friend": "€119",
};

/** Catalog plan_id → billing interval (used by stripe-plans checkout). */
export const PLAN_BILLING_INTERVAL: Record<string, MembershipPlanDefinition["billing_interval"]> = {
  "one-time-owner": "one_time",
  "3-month-owner": "3_months",
  "1-year-owner": "12_months",
  "one-time-friend": "one_time",
  "3-month-friend": "3_months",
  "1-year-friend": "12_months",
};

/**
 * Client-safe placeholder; server resolves ids via `resolveStripePriceId` in stripe-plans.ts
 * (STRIPE_PARENT_PRICE_ID / STRIPE_FRIEND_PRICE_ID by role).
 */
const FUTURE_STRIPE_PRICE_IDS: Record<string, string | null> = {
  "one-time-owner": null,
  "3-month-owner": null,
  "1-year-owner": null,
  "one-time-friend": null,
  "3-month-friend": null,
  "1-year-friend": null,
};

export function activeModeToMembershipRole(mode: ProfileActiveMode): MembershipRole {
  return mode === "pet_friend" ? "pet_friend" : "pet_parent";
}

export function membershipRoleTitle(role: MembershipRole): string {
  return role === "pet_parent" ? "Pet Parent" : "Pet Friend";
}

export function emptyMembershipsByRole(): UserMembershipsByRole {
  return { pet_parent: null, pet_friend: null };
}

export function indexMemberships(rows: UserMembership[]): UserMembershipsByRole {
  const out = emptyMembershipsByRole();
  for (const row of rows) {
    out[row.role] = row;
  }
  return out;
}

function parseMembershipEnd(membership: UserMembership): Date | null {
  if (!membership.end_date) return null;
  const end = new Date(membership.end_date);
  return Number.isNaN(end.getTime()) ? null : end;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** True when membership end_date is on or after the calendar day of `now`. */
function membershipEndOnOrAfterToday(end: Date, now = new Date()): boolean {
  return startOfLocalDay(end).getTime() >= startOfLocalDay(now).getTime();
}

/**
 * Active only when status is active|trialing AND (end_date null OR end_date >= today).
 * Cancelled, inactive, and expired never qualify.
 */
export function isMembershipActive(
  membership: UserMembership | null | undefined,
  now = new Date(),
): boolean {
  if (!membership) return false;
  if (membership.status !== "active" && membership.status !== "trialing") return false;
  const end = parseMembershipEnd(membership);
  if (!end) return true;
  return membershipEndOnOrAfterToday(end, now);
}

/** Profile/UI snapshot: only slots with an effectively active membership (non-active rows omitted). */
export function filterActiveMembershipsByRole(
  memberships: UserMembershipsByRole,
  now = new Date(),
): UserMembershipsByRole {
  const petParent = memberships.pet_parent;
  const petFriend = memberships.pet_friend;
  return {
    pet_parent: isMembershipActive(petParent, now) ? petParent : null,
    pet_friend: isMembershipActive(petFriend, now) ? petFriend : null,
  };
}

export function hasActiveMembershipForRole(
  memberships: UserMembershipsByRole,
  role: MembershipRole,
  now = new Date(),
): boolean {
  return isMembershipActive(memberships[role], now);
}

/** True when the row can be cancelled (production: status must be exactly active). */
export function canCancelMembership(
  membership: UserMembership | null | undefined,
): boolean {
  return membership?.status === "active";
}

export function hasActiveMembershipForMode(
  memberships: UserMembershipsByRole,
  mode: ProfileActiveMode,
  now = new Date(),
): boolean {
  return hasActiveMembershipForRole(memberships, activeModeToMembershipRole(mode), now);
}

export function hasDualActiveMemberships(
  memberships: UserMembershipsByRole,
  now = new Date(),
): boolean {
  return (
    hasActiveMembershipForRole(memberships, "pet_parent", now) &&
    hasActiveMembershipForRole(memberships, "pet_friend", now)
  );
}

export function resolvePlanName(role: MembershipRole, planId: string): string {
  const catalog = MEMBERSHIP_PLAN_CATALOG[role];
  const match = catalog.find((p) => p.id === planId);
  if (match) return match.name;
  const normalized = planId.replace(/-/g, " ").trim();
  if (!normalized) return planId;
  return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function membershipPlanLabel(
  membership: UserMembership | null | undefined,
): string | null {
  if (!membership) return null;
  const fromRow = membership.plan_name?.trim();
  if (fromRow) return fromRow;
  return resolvePlanName(membership.role, membership.plan_id);
}

export function membershipStatusForMode(
  memberships: UserMembershipsByRole,
  mode: ProfileActiveMode,
): string {
  const role = activeModeToMembershipRole(mode);
  const row = memberships[role];
  if (isMembershipActive(row)) {
    return membershipPlanLabel(row) ?? "Active";
  }
  return DEMO_MEMBERSHIP_LABEL;
}

/** Pet Parent paid actions (requests as parent, bookings, messaging as parent). */
export function canUsePetParentMembershipFeatures(
  memberships: UserMembershipsByRole,
): boolean {
  return hasActiveMembershipForRole(memberships, "pet_parent");
}

/** Pet Friend paid actions (requests as friend, bookings, messaging as friend). */
export function canUsePetFriendMembershipFeatures(
  memberships: UserMembershipsByRole,
): boolean {
  return hasActiveMembershipForRole(memberships, "pet_friend");
}

/** Paid features for the given UI mode require an active membership for that role. */
export function canUseMembershipFeaturesForMode(
  memberships: UserMembershipsByRole,
  mode: ProfileActiveMode,
): boolean {
  return hasActiveMembershipForMode(memberships, mode);
}

export function membershipPageTitle(mode: ProfileActiveMode): string {
  return mode === "pet_parent" ? "Pet Parent membership" : "Pet Friend membership";
}

export function membershipPageSubtitle(mode: ProfileActiveMode): string {
  return mode === "pet_parent"
    ? "Plans for Pet Parents — send requests, book care, and message when you are ready."
    : "Plans for Pet Friends — accept care, coordinate bookings, and message when you are ready.";
}

export function membershipActiveHeadline(mode: ProfileActiveMode, planName: string): string {
  const role = membershipRoleTitle(activeModeToMembershipRole(mode));
  return `Your ${role} membership is active`;
}

export function membershipInactiveHeadline(mode: ProfileActiveMode): string {
  const role = membershipRoleTitle(activeModeToMembershipRole(mode));
  return `No active ${role} membership`;
}

export function formatMembershipDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function membershipPlansForRole(
  role: MembershipRole,
  featuresByPlanId: Record<string, readonly string[]>,
): MembershipPlanDefinition[] {
  return MEMBERSHIP_PLAN_CATALOG[role].map((plan) => ({
    role,
    plan_id: plan.id,
    plan_name: plan.name,
    price: PLAN_PRICES[plan.id] ?? "—",
    billing_interval: PLAN_BILLING_INTERVAL[plan.id] ?? "one_time",
    future_stripe_price_id: FUTURE_STRIPE_PRICE_IDS[plan.id] ?? null,
    features: featuresByPlanId[plan.id] ?? [],
    popular: plan.id.includes("3-month"),
  }));
}

/** Infer role from a legacy plan slug/label (-owner / -friend). Returns null when ambiguous (e.g. "3 Month"). */
export function inferMembershipRoleFromLegacyLabel(label: string): MembershipRole | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;

  const slug = normalized.replace(/\s+/g, "-");
  if (slug.endsWith("-owner") || slug.includes("pet-parent") || slug === "parent") {
    return "pet_parent";
  }
  if (slug.endsWith("-friend") || slug.includes("pet-friend") || slug === "friend") {
    return "pet_friend";
  }
  return null;
}

export function inferPlanIdFromLegacyLabel(
  role: MembershipRole,
  label: string,
): string | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized || normalized === "demo" || normalized === "free") return null;

  const catalog = MEMBERSHIP_PLAN_CATALOG[role];
  const byName = catalog.find((p) => p.name.toLowerCase() === normalized);
  if (byName) return byName.id;

  const slug = normalized.replace(/\s+/g, "-");
  const byId = catalog.find((p) => p.id === slug);
  if (byId) return byId.id;

  return slug;
}
