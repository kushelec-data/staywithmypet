import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  emptyMembershipsByRole,
  indexMemberships,
  inferMembershipRoleFromLegacyLabel,
  inferPlanIdFromLegacyLabel,
  type MembershipRole,
  type UserMembership,
  type UserMembershipsByRole,
} from "@/lib/membership";
import { resolveActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import {
  isMissingColumnError,
  isMissingRelationError,
  isPostgrestError,
  logSupabaseError,
} from "@/lib/supabase-errors";

/** Profile fields used for legacy membership_status fallback. */
export type MembershipLegacySource = {
  id: string;
  role?: ProfileRole;
  active_mode?: string | null;
  membership_status?: string | null;
  details?: unknown;
  created_at?: string | null;
};

const MEMBERSHIP_CORE_SELECT =
  "id, user_id, role, plan_id, status, start_date, end_date, auto_renew";

/** Optional columns from 20260603100000 + 20260605120000 — omitted when migrations are behind. */
const MEMBERSHIP_OPTIONAL_SELECT = [
  "plan_name",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
  "stripe_checkout_session_id",
] as const;

const MEMBERSHIP_SELECT = [MEMBERSHIP_CORE_SELECT, ...MEMBERSHIP_OPTIONAL_SELECT].join(", ");

function selectWithoutColumns(removed: readonly string[]): string {
  let select = MEMBERSHIP_SELECT;
  for (const col of removed) {
    select = select.replace(`, ${col}`, "");
  }
  return select;
}

function mapMembershipRow(data: Record<string, unknown>): UserMembership {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    role: data.role as UserMembership["role"],
    plan_id: String(data.plan_id),
    plan_name: data.plan_name == null ? null : String(data.plan_name),
    status: data.status as UserMembership["status"],
    start_date: String(data.start_date),
    end_date: data.end_date == null ? null : String(data.end_date),
    auto_renew: Boolean(data.auto_renew),
    stripe_customer_id:
      data.stripe_customer_id == null ? null : String(data.stripe_customer_id),
    stripe_subscription_id:
      data.stripe_subscription_id == null ? null : String(data.stripe_subscription_id),
    stripe_price_id: data.stripe_price_id == null ? null : String(data.stripe_price_id),
    stripe_checkout_session_id:
      data.stripe_checkout_session_id == null || data.stripe_checkout_session_id === undefined
        ? null
        : String(data.stripe_checkout_session_id),
  };
}

export async function fetchUserMembershipRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembership[]> {
  const stripped: string[] = [];
  let select = MEMBERSHIP_SELECT;
  let { data, error } = await supabase
    .from("user_memberships")
    .select(select)
    .eq("user_id", userId);

  while (error && isMissingColumnError(error)) {
    const missing =
      MEMBERSHIP_OPTIONAL_SELECT.find(
        (col) =>
          !stripped.includes(col) && select.includes(col) && isMissingColumnError(error!, col),
      ) ??
      MEMBERSHIP_OPTIONAL_SELECT.find((col) => !stripped.includes(col) && select.includes(col));
    if (!missing) break;
    stripped.push(missing);
    console.warn(`[membership] retrying load without column ${missing}`);
    select = selectWithoutColumns(stripped);
    ({ data, error } = await supabase
      .from("user_memberships")
      .select(select)
      .eq("user_id", userId));
  }

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    logSupabaseError("fetchUserMembershipRows", error);
    throw error;
  }

  return (data ?? []).map((row) =>
    mapMembershipRow(row as unknown as Record<string, unknown>),
  );
}

export async function fetchUserMemberships(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMembershipsByRole> {
  return indexMemberships(await fetchUserMembershipRows(supabase, userId));
}

export function formatMembershipLoadError(error: PostgrestError | Error): string {
  if (!("code" in error)) return error.message;
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join(" — ");
}

function resolveLegacyMembershipLabel(source: MembershipLegacySource): string {
  const fromColumn = source.membership_status?.trim();
  if (fromColumn) return fromColumn;

  const details = source.details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const membership = (details as Record<string, unknown>).membership;
    if (typeof membership === "string" && membership.trim()) return membership.trim();
  }

  return "";
}

function legacyMembershipForRole(
  source: MembershipLegacySource,
  role: MembershipRole,
  label: string,
): UserMembership | null {
  const planId = inferPlanIdFromLegacyLabel(role, label);
  if (!planId) return null;

  return {
    id: `legacy-${role}`,
    user_id: source.id,
    role,
    plan_id: planId,
    plan_name: label,
    status: "active",
    start_date: source.created_at ?? new Date().toISOString(),
    end_date: null,
    auto_renew: true,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_checkout_session_id: null,
  };
}

function legacyMembershipRoleForSource(
  source: MembershipLegacySource,
  label: string,
): MembershipRole {
  const profileRole = source.role ?? "pet_friend";
  if (profileRole === "pet_parent" || profileRole === "pet_friend") {
    return profileRole;
  }

  const fromLabel = inferMembershipRoleFromLegacyLabel(label);
  if (fromLabel) return fromLabel;

  return resolveActiveMode("both", source.active_mode) === "pet_friend"
    ? "pet_friend"
    : "pet_parent";
}

function legacyMembershipsFromProfileSource(
  source: MembershipLegacySource,
): UserMembershipsByRole {
  const label = resolveLegacyMembershipLabel(source);
  const result = emptyMembershipsByRole();
  if (!label) return result;

  const role = legacyMembershipRoleForSource(source, label);
  const row = legacyMembershipForRole(source, role, label);
  if (row) result[role] = row;
  return result;
}

/**
 * Load memberships from user_memberships. Legacy profile.membership_status is used only
 * when the user has zero rows in user_memberships (never when cancelled/inactive rows exist).
 */
export async function resolveUserMemberships(
  supabase: SupabaseClient,
  userId: string,
  legacySource?: MembershipLegacySource | null,
): Promise<UserMembershipsByRole> {
  try {
    const rows = await fetchUserMembershipRows(supabase, userId);
    if (rows.length > 0) {
      return indexMemberships(rows);
    }
  } catch (err) {
    if (isPostgrestError(err)) {
      logSupabaseError("resolveUserMemberships", err);
    } else {
      console.error("[membership] resolveUserMemberships", err);
    }
    // Do not synthesize legacy memberships when DB read failed — rows may exist.
    return emptyMembershipsByRole();
  }

  if (legacySource) {
    return legacyMembershipsFromProfileSource(legacySource);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, active_mode, membership_status, details, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isPostgrestError(error)) {
      logSupabaseError("resolveUserMemberships.profile", error);
    }
    return emptyMembershipsByRole();
  }

  if (!data) return emptyMembershipsByRole();
  return legacyMembershipsFromProfileSource(data as MembershipLegacySource);
}
