import "server-only";

import { triggerMembershipConfirmationEmail } from "@/lib/membership-emails";
import {
  filterActiveMembershipsByRole,
  indexMemberships,
  membershipPlanLabel,
  membershipStatusForMode,
  resolvePlanName,
  type MembershipRole,
  type MembershipStatus,
  type UserMembership,
} from "@/lib/membership";
import { resolveActiveMode } from "@/lib/profile-mode";
import { fetchUserMembershipRows } from "@/lib/membership-load";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isInvalidEnumValueError,
  isMissingColumnError,
  supabaseErrorDetail,
  type SupabaseErrorDetail,
} from "@/lib/supabase-errors";
import { normalizeCatalogPlanId } from "@/lib/stripe-plans";
import { isOneTimePlanId } from "@/lib/one-time-membership";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export const MEMBERSHIP_TABLE = "user_memberships";

export const MEMBERSHIP_RETURN_COLUMNS =
  "id, user_id, role, plan_id, plan_name, status, start_date, end_date, auto_renew, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_checkout_session_id";

/** Production-safe select for cancel (no plan_name, source, stripe_checkout_session_id). */
export const MEMBERSHIP_CANCEL_SELECT_COLUMNS =
  "id, user_id, role, plan_id, status, start_date, end_date, auto_renew, created_at, updated_at";

/** Core columns always present after 20260602100000_user_memberships.sql */
const MEMBERSHIP_CORE_SELECT_COLUMNS =
  "id, user_id, role, plan_id, status, start_date, end_date, auto_renew";

function mapProductionMembershipRow(data: Record<string, unknown>): UserMembership {
  const startRaw = data.start_date ?? data.starts_at;
  const endRaw = data.end_date ?? data.ends_at;
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    role: data.role as UserMembership["role"],
    plan_id: String(data.plan_id ?? ""),
    plan_name: null,
    status: data.status as UserMembership["status"],
    start_date: startRaw ? String(startRaw) : new Date().toISOString(),
    end_date: endRaw == null ? null : String(endRaw),
    auto_renew: Boolean(data.auto_renew ?? false),
    linked_booking_id: null,
    consumed_at: null,
    cancellation_restart_used: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_checkout_session_id: null,
  };
}

async function loadStripeSubscriptionIdForCancel(
  admin: SupabaseClient,
  membershipId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from(MEMBERSHIP_TABLE)
    .select("stripe_subscription_id")
    .eq("id", membershipId)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error, "stripe_subscription_id")) {
      return null;
    }
    console.warn("[membership] stripe_subscription_id lookup skipped", {
      membershipId,
      message: error.message,
    });
    return null;
  }

  const value = data?.stripe_subscription_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

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
  /** Provenance: e.g. test_code, stripe_checkout. Optional column — stripped if migration not applied. */
  source?: string | null;
  linkedBookingId?: string | null;
  consumedAt?: string | null;
  cancellationRestartUsed?: boolean;
  /** When false, skip confirmation email (e.g. interim webhook updates). */
  sendConfirmationEmail?: boolean;
};

/** Safe subset of the row sent to PostgREST (no Stripe secrets). */
export type MembershipPayloadAttempted = {
  user_id: string;
  role: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
};

export type UpsertMembershipResult =
  | { ok: true; membership: UserMembership }
  | {
      ok: false;
      error: string;
      code?: string | null;
      supabaseError?: SupabaseErrorDetail | null;
      step?: string;
      payloadAttempted?: MembershipPayloadAttempted | null;
    };

/** Columns from supabase/migrations (base + extend + checkout). */
const MEMBERSHIP_CORE_COLUMNS = [
  "user_id",
  "role",
  "plan_id",
  "status",
  "start_date",
  "end_date",
  "auto_renew",
] as const;

const MEMBERSHIP_OPTIONAL_STRIP_COLUMNS = [
  "plan_name",
  "source",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
  "stripe_checkout_session_id",
  "linked_booking_id",
  "consumed_at",
  "cancellation_restart_used",
] as const;

/** DB enum public.membership_status (20260602100000 + 20260603100000). */
export type DbMembershipStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "inactive"
  | "trialing";

export function toDbMembershipStatus(status: MembershipStatus | undefined): DbMembershipStatus {
  switch (status) {
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "inactive":
      return "inactive";
    case "trialing":
      return "trialing";
    case "active":
    default:
      return "active";
  }
}

/** Base enum (pre-20260603100000) only had active | cancelled | expired. */
function membershipStatusFallback(dbStatus: DbMembershipStatus): DbMembershipStatus {
  if (dbStatus === "inactive" || dbStatus === "trialing") return "active";
  return dbStatus;
}

/** Never persist Stripe/UI aliases (parent, friend) — DB enum only. */
export function toDbMembershipRole(role: string): MembershipRole | null {
  if (role === "pet_parent" || role === "pet_friend") return role;
  return null;
}

export function safeMembershipPayloadAttempted(
  payload: Record<string, unknown>,
): MembershipPayloadAttempted {
  return {
    user_id: String(payload.user_id ?? ""),
    role: String(payload.role ?? ""),
    plan_id: String(payload.plan_id ?? ""),
    status: String(payload.status ?? ""),
    start_date: String(payload.start_date ?? ""),
    end_date:
      payload.end_date == null || payload.end_date === ""
        ? null
        : String(payload.end_date),
  };
}

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

function membershipFailure(
  error: PostgrestError,
  message = error.message,
  extra?: { step?: string; payloadAttempted?: MembershipPayloadAttempted | null },
): {
  ok: false;
  error: string;
  code: string | null;
  supabaseError: SupabaseErrorDetail;
  step?: string;
  payloadAttempted?: MembershipPayloadAttempted | null;
} {
  const detail = supabaseErrorDetail(error)!;
  return {
    ok: false,
    error: message,
    code: detail.code,
    supabaseError: detail,
    step: extra?.step,
    payloadAttempted: extra?.payloadAttempted ?? null,
  };
}

function buildMembershipUpsertPayload(input: UpsertMembershipInput): {
  catalogPlanId: string;
  payload: Record<string, unknown>;
  payloadAttempted: MembershipPayloadAttempted;
} {
  const catalogPlanId =
    normalizeCatalogPlanId(input.planId) ?? input.planId.trim();
  const startDate = normalizeMembershipTimestamp(input.startDate);
  const planName =
    input.planName?.trim() || resolvePlanName(input.role, catalogPlanId);
  const dbStatus = toDbMembershipStatus(input.status);

  const dbRole = toDbMembershipRole(input.role);
  if (!dbRole) {
    throw new Error(`Invalid membership role "${input.role}" (expected pet_parent or pet_friend).`);
  }

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    role: dbRole,
    plan_id: catalogPlanId,
    plan_name: planName,
    status: dbStatus,
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
  if (input.source !== undefined) {
    payload.source = input.source;
  }

  if (isOneTimePlanId(catalogPlanId)) {
    payload.linked_booking_id = input.linkedBookingId ?? null;
    payload.consumed_at = input.consumedAt ?? null;
    payload.cancellation_restart_used = input.cancellationRestartUsed ?? false;
  } else if (
    input.linkedBookingId !== undefined ||
    input.consumedAt !== undefined ||
    input.cancellationRestartUsed !== undefined
  ) {
    payload.linked_booking_id = input.linkedBookingId ?? null;
    payload.consumed_at = input.consumedAt ?? null;
    payload.cancellation_restart_used = input.cancellationRestartUsed ?? false;
  }

  return {
    catalogPlanId,
    payload,
    payloadAttempted: safeMembershipPayloadAttempted(payload),
  };
}

async function ensureProfileRow(
  userId: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: string;
      code?: string | null;
      supabaseError?: SupabaseErrorDetail | null;
      step?: string;
    }
> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Cannot ensure profile: SUPABASE_SERVICE_ROLE_KEY is not configured.",
      code: "missing_service_role",
      step: "ensure_profile",
    };
  }

  const { data: existing, error: selectError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[membership] profiles lookup failed", {
      userId,
      table: "profiles",
      step: "ensure_profile",
      ...supabaseErrorDetail(selectError),
    });
    return membershipFailure(selectError, selectError.message, { step: "ensure_profile" });
  }

  if (existing?.id) return { ok: true };

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    console.error("[membership] auth user missing for profile bootstrap", {
      userId,
      message: authError?.message ?? "user not found",
    });
    return {
      ok: false,
      error: `No auth user for user_id ${userId} (foreign key would fail on ${MEMBERSHIP_TABLE}).`,
      code: authError?.code ?? "user_not_found",
      step: "ensure_profile",
    };
  }

  const displayName =
    authData.user.user_metadata?.display_name?.trim() ||
    authData.user.email?.split("@")[0]?.trim() ||
    "Member";

  const { error: insertError } = await admin.from("profiles").insert({
    id: userId,
    display_name: displayName,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: true };
    }
    console.error("[membership] profiles bootstrap insert failed", {
      userId,
      table: "profiles",
      ...supabaseErrorDetail(insertError),
    });
    return membershipFailure(insertError, insertError.message, { step: "ensure_profile" });
  }

  console.log("[membership] profiles row bootstrapped for webhook", { userId });
  return { ok: true };
}

function stripOptionalColumns(
  payload: Record<string, unknown>,
  columns: string[],
): Record<string, unknown> {
  const next = { ...payload };
  for (const col of columns) {
    delete next[col];
  }
  return next;
}

function selectColumnsWithout(removed: string[]): string {
  let cols = MEMBERSHIP_RETURN_COLUMNS;
  for (const col of removed) {
    cols = cols.replace(`, ${col}`, "").replace(`${col}, `, "");
  }
  return cols;
}

export async function upsertUserMembership(
  supabase: SupabaseClient,
  input: UpsertMembershipInput,
): Promise<UpsertMembershipResult> {
  const dbRole = toDbMembershipRole(input.role);
  if (!dbRole) {
    return {
      ok: false,
      error: `Invalid membership role "${input.role}" (expected pet_parent or pet_friend; never parent/friend).`,
      code: "invalid_role",
      step: "validate_role",
    };
  }

  let catalogPlanId: string;
  let payload: Record<string, unknown>;
  let payloadAttempted: MembershipPayloadAttempted;
  try {
    ({ catalogPlanId, payload, payloadAttempted } = buildMembershipUpsertPayload({
      ...input,
      role: dbRole,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: message,
      code: "invalid_role",
      step: "validate_role",
    };
  }
  if (!catalogPlanId) {
    return {
      ok: false,
      error: "plan_id is required.",
      code: "invalid_plan_id",
      step: "validate_plan_id",
      payloadAttempted,
    };
  }

  const profileReady = await ensureProfileRow(input.userId);
  if (!profileReady.ok) {
    return { ...profileReady, payloadAttempted };
  }

  let dbStatus = toDbMembershipStatus(input.status);
  console.log("[membership] upsert user_memberships", {
    table: MEMBERSHIP_TABLE,
    userId: input.userId,
    role: input.role,
    planId: catalogPlanId,
    status: dbStatus,
    onConflict: "user_id,role",
    payloadKeys: Object.keys(payload),
    payloadAttempted,
  });

  const upsertPayload = { ...payload };
  const strippedOptional: string[] = [];

  function buildCoreRow(status: DbMembershipStatus): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    for (const col of MEMBERSHIP_CORE_COLUMNS) {
      row[col] = col === "status" ? status : upsertPayload[col];
    }
    return row;
  }

  async function runCoreUpsert(status: DbMembershipStatus) {
    return supabase
      .from(MEMBERSHIP_TABLE)
      .upsert(buildCoreRow(status), { onConflict: "user_id,role" })
      .select(MEMBERSHIP_CORE_SELECT_COLUMNS)
      .single();
  }

  let { data, error } = await runCoreUpsert(dbStatus);

  if (error && isInvalidEnumValueError(error)) {
    const fallbackStatus = membershipStatusFallback(dbStatus);
    if (fallbackStatus !== dbStatus) {
      console.warn("[membership] retrying upsert with status fallback", {
        from: dbStatus,
        to: fallbackStatus,
        userId: input.userId,
      });
      dbStatus = fallbackStatus;
      ({ data, error } = await runCoreUpsert(dbStatus));
    }
  }

  if (error) {
    const detail = supabaseErrorDetail(error);
    console.error("[membership] upsert error", {
      table: MEMBERSHIP_TABLE,
      userId: input.userId,
      role: input.role,
      planId: catalogPlanId,
      strippedOptional,
      step: "upsert_user_memberships",
      payloadAttempted,
      supabaseErrorCode: detail?.code ?? null,
      supabaseErrorMessage: detail?.message ?? null,
      supabaseErrorDetails: detail?.details ?? null,
      supabaseErrorHint: detail?.hint ?? null,
    });
    return {
      ok: false,
      error: error.message,
      code: error.code ?? null,
      supabaseError: detail,
      step: "upsert_user_memberships",
      payloadAttempted,
    };
  }

  let membership = data as unknown as UserMembership;

  const optionalPatch: Record<string, unknown> = {};
  for (const col of MEMBERSHIP_OPTIONAL_STRIP_COLUMNS) {
    if (col in upsertPayload) optionalPatch[col] = upsertPayload[col];
  }

  if (Object.keys(optionalPatch).length > 0) {
    let patchPayload = { ...optionalPatch };
    let patchSelect = MEMBERSHIP_RETURN_COLUMNS;

    async function runOptionalPatch() {
      return supabase
        .from(MEMBERSHIP_TABLE)
        .update(patchPayload)
        .eq("id", membership.id)
        .select(patchSelect)
        .single();
    }

    let patchResult = await runOptionalPatch();

    for (const col of MEMBERSHIP_OPTIONAL_STRIP_COLUMNS) {
      if (!patchResult.error) break;
      if (!(col in patchPayload) && !patchSelect.includes(col)) break;
      if (!isMissingColumnError(patchResult.error, col)) break;
      console.warn(`[membership] skipping optional column ${col} (run migrations)`);
      strippedOptional.push(col);
      patchPayload = stripOptionalColumns(patchPayload, [col]);
      if (patchSelect.includes(col)) {
        patchSelect = selectColumnsWithout([...strippedOptional]);
      }
      patchResult = await runOptionalPatch();
    }

    if (patchResult.error) {
      const detail = supabaseErrorDetail(patchResult.error);
      console.error("[membership] optional column patch failed (core row saved)", {
        membershipId: membership.id,
        strippedOptional,
        ...detail,
      });
    } else if (patchResult.data) {
      membership = patchResult.data as unknown as UserMembership;
    }
  }

  console.log("[membership] upsert success", {
    table: MEMBERSHIP_TABLE,
    userId: input.userId,
    role: dbRole,
    planId: membership.plan_id,
    status: membership.status,
    membershipId: membership.id,
  });

  try {
    const planLabel = membershipPlanLabel(membership) ?? membership.plan_id;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ membership_status: planLabel })
      .eq("id", input.userId);

    if (profileError) {
      console.error("[membership] profiles.membership_status update failed", {
        userId: input.userId,
        table: "profiles",
        ...supabaseErrorDetail(profileError),
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
  } catch (err) {
    console.warn("[membership] post-upsert side effects failed (membership row saved)", {
      userId: input.userId,
      role: dbRole,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return { ok: true, membership };
}

/** Webhook and other server-only callers without a user session. */
export async function upsertUserMembershipAsAdmin(
  input: UpsertMembershipInput,
): Promise<UpsertMembershipResult> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[membership] admin client unavailable: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing");
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      code: "missing_service_role",
      step: "create_admin_client",
    };
  }
  return upsertUserMembership(admin, input);
}

export type CancelMembershipResult =
  | { ok: true; membership: UserMembership }
  | {
      ok: false;
      error: string;
      code?: string | null;
      step?: string;
      supabaseError?: SupabaseErrorDetail | null;
    };

async function syncProfileMembershipStatusAfterChange(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, active_mode")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) return;

  let rows: UserMembership[];
  try {
    rows = await fetchUserMembershipRows(admin, userId);
  } catch (err) {
    console.warn("[membership] profile status sync skipped", {
      userId,
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  const memberships = filterActiveMembershipsByRole(indexMemberships(rows));
  const mode = resolveActiveMode(
    (profile.role as "pet_parent" | "pet_friend" | "both") ?? "pet_friend",
    profile.active_mode as string | null,
  );
  const label = membershipStatusForMode(memberships, mode);

  const { error: updateError } = await admin
    .from("profiles")
    .update({ membership_status: label })
    .eq("id", userId);

  if (updateError) {
    console.warn("[membership] profiles.membership_status sync failed", {
      userId,
      ...supabaseErrorDetail(updateError),
    });
  }
}

/** Cancel one role's membership (status → cancelled). Requires service role. */
export async function cancelUserMembershipAsAdmin(
  userId: string,
  role: MembershipRole,
): Promise<CancelMembershipResult> {
  const dbRole = toDbMembershipRole(role);
  if (!dbRole) {
    return {
      ok: false,
      error: `Invalid membership role "${role}".`,
      code: "invalid_role",
      step: "validate_role",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      code: "missing_service_role",
      step: "create_admin_client",
    };
  }

  const { data: row, error: fetchError } = await admin
    .from(MEMBERSHIP_TABLE)
    .select(MEMBERSHIP_CANCEL_SELECT_COLUMNS)
    .eq("user_id", userId)
    .eq("role", dbRole)
    .eq("status", "active")
    .maybeSingle();

  if (fetchError) {
    const detail = supabaseErrorDetail(fetchError);
    return {
      ok: false,
      error: fetchError.message,
      code: fetchError.code ?? null,
      step: "load_membership",
      supabaseError: detail,
    };
  }

  if (!row) {
    return {
      ok: false,
      error: "Membership not found for this role.",
      code: "not_found",
      step: "load_membership",
    };
  }

  const membership = mapProductionMembershipRow(row as unknown as Record<string, unknown>);

  const subscriptionId = await loadStripeSubscriptionIdForCancel(admin, membership.id);
  if (subscriptionId) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      await getStripe().subscriptions.cancel(subscriptionId);
      console.log("[membership] stripe subscription cancelled", {
        userId,
        role: dbRole,
        subscriptionId,
      });
    } catch (err) {
      console.warn("[membership] stripe subscription cancel failed (continuing DB cancel)", {
        userId,
        role: dbRole,
        subscriptionId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const cancelledAt = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from(MEMBERSHIP_TABLE)
    .update({ status: "cancelled", updated_at: cancelledAt })
    .eq("user_id", userId)
    .eq("role", dbRole)
    .eq("status", "active")
    .select(MEMBERSHIP_CANCEL_SELECT_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    const detail = updateError ? supabaseErrorDetail(updateError) : null;
    return {
      ok: false,
      error: updateError?.message ?? "Could not cancel membership.",
      code: updateError?.code ?? null,
      step: "cancel_membership",
      supabaseError: detail,
    };
  }

  const cancelled = mapProductionMembershipRow(updated as unknown as Record<string, unknown>);
  console.log("[membership] membership cancelled", {
    userId,
    role: dbRole,
    membershipId: cancelled.id,
  });

  await syncProfileMembershipStatusAfterChange(admin, userId);

  revalidatePath("/membership");
  revalidatePath("/dashboard");

  return { ok: true, membership: cancelled };
}
