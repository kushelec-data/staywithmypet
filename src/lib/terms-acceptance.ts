import type { MembershipRole } from "@/lib/membership";
import { PLAN_BILLING_INTERVAL } from "@/lib/membership";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Bump when Terms of Use content changes materially. */
export const CURRENT_TERMS_VERSION = "v1.0";

export const TERMS_PATH = "/terms";
export const PRIVACY_PATH = "/privacy";
export const SAFETY_PATH = "/safety";

export const SIGNUP_TERMS_COOKIE = "swmp_signup_terms";

export type TermsAcceptanceContext =
  | "signup"
  | "membership_coupon_activation"
  | "membership_checkout"
  | "booking_pet_parent"
  | "booking_pet_friend"
  | "first_listing";

export type TermsAcceptanceRow = {
  id: string;
  user_id: string;
  terms_version: string;
  accepted_at: string;
  acceptance_context: TermsAcceptanceContext;
  membership_role: MembershipRole | null;
  booking_id: string | null;
  request_id: string | null;
  plan_id: string | null;
  coupon_code: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type RecordTermsAcceptanceInput = {
  context: TermsAcceptanceContext;
  termsVersion?: string;
  membershipRole?: MembershipRole | null;
  bookingId?: string | null;
  requestId?: string | null;
  planId?: string | null;
  couponCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type MembershipPlanTermsKind = "one_time" | "3_months" | "12_months";

export function membershipPlanTermsKind(planId: string): MembershipPlanTermsKind {
  const interval = PLAN_BILLING_INTERVAL[planId.trim().toLowerCase()];
  if (interval === "3_months") return "3_months";
  if (interval === "12_months") return "12_months";
  return "one_time";
}

export function bookingTermsContextForRole(role: MembershipRole): TermsAcceptanceContext {
  return role === "pet_parent" ? "booking_pet_parent" : "booking_pet_friend";
}

export async function hasAcceptedTermsVersion(
  supabase: SupabaseClient,
  userId: string,
  version = CURRENT_TERMS_VERSION,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("terms_acceptance")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("terms_version", version);

  if (error) {
    console.error("[terms] version check failed", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function hasBookingTermsForRequest(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  context: TermsAcceptanceContext,
  version = CURRENT_TERMS_VERSION,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("terms_acceptance")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .eq("acceptance_context", context)
    .eq("terms_version", version);

  if (error) {
    console.error("[terms] booking request check failed", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export function isTermsSchemaMissingError(error: {
  code?: string | null;
  message?: string;
}): boolean {
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /relation.*terms_acceptance.*does not exist/i.test(message) ||
    /schema cache.*terms_acceptance/i.test(message) ||
    /Could not find the table.*terms_acceptance/i.test(message)
  );
}

export type TermsInsertErrorKind =
  | "schema_missing"
  | "rls_auth"
  | "foreign_key"
  | "check_constraint"
  | "generic";

export function classifyTermsInsertError(error: {
  code?: string | null;
  message?: string;
}): TermsInsertErrorKind {
  if (isTermsSchemaMissingError(error)) return "schema_missing";
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (code === "42501" || /permission denied/i.test(message)) return "rls_auth";
  if (
    code === "PGRST301" ||
    /JWT|session|not authenticated|auth\.uid/i.test(message)
  ) {
    return "rls_auth";
  }
  if (code === "23503") return "foreign_key";
  if (code === "23514") return "check_constraint";
  return "generic";
}

export function friendlyTermsInsertMessage(kind: TermsInsertErrorKind): string {
  switch (kind) {
    case "schema_missing":
      return "Terms acceptance is not set up yet. Please contact support.";
    case "rls_auth":
      return "We could not verify your session. Please sign in again.";
    default:
      return "Could not save your acceptance. Please try again.";
  }
}

export function logTermsInsertFailure(
  logContext: string,
  userId: string,
  input: RecordTermsAcceptanceInput,
  error: {
    code?: string | null;
    message?: string;
    details?: string | null;
    hint?: string | null;
  },
): void {
  console.error(`[terms] ${logContext} insert failed`, {
    userId,
    termsVersion: input.termsVersion ?? CURRENT_TERMS_VERSION,
    acceptanceContext: input.context,
    bookingId: input.bookingId ?? null,
    requestId: input.requestId ?? null,
    membershipRole: input.membershipRole ?? null,
    planId: input.planId ?? null,
    couponCode: input.couponCode ?? null,
    code: error.code ?? null,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

function buildTermsInsertRow(userId: string, input: RecordTermsAcceptanceInput) {
  const row: Record<string, unknown> = {
    user_id: userId,
    terms_version: input.termsVersion ?? CURRENT_TERMS_VERSION,
    acceptance_context: input.context,
  };

  if (input.membershipRole != null) row.membership_role = input.membershipRole;
  if (input.bookingId != null) row.booking_id = input.bookingId;
  if (input.requestId != null) row.request_id = input.requestId;
  if (input.planId != null) row.plan_id = input.planId;
  if (input.couponCode != null) row.coupon_code = input.couponCode;
  if (input.ipAddress != null) row.ip_address = input.ipAddress;
  if (input.userAgent != null) row.user_agent = input.userAgent;

  return row;
}

export async function recordTermsAcceptance(
  supabase: SupabaseClient,
  userId: string,
  input: RecordTermsAcceptanceInput,
): Promise<
  | { ok: true; id: string }
  | { ok: false; error: string; code?: string | null; details?: string | null; hint?: string | null; kind: TermsInsertErrorKind }
> {
  const { data, error } = await supabase
    .from("terms_acceptance")
    .insert(buildTermsInsertRow(userId, input))
    .select("id")
    .single();

  if (error) {
    logTermsInsertFailure("record", userId, input, error);
    return {
      ok: false,
      error: error.message,
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
      kind: classifyTermsInsertError(error),
    };
  }
  if (!data?.id) {
    return {
      ok: false,
      error: "Insert succeeded but no row id returned.",
      kind: "generic",
    };
  }
  return { ok: true, id: String(data.id) };
}

/** Link a stored acceptance row to a request after the request row exists. */
export async function attachRequestIdToTermsAcceptance(
  supabase: SupabaseClient,
  userId: string,
  acceptanceId: string,
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string; code?: string | null }> {
  const { error } = await supabase
    .from("terms_acceptance")
    .update({ request_id: requestId })
    .eq("id", acceptanceId)
    .eq("user_id", userId);

  if (error) {
    console.error("[terms] attach request_id failed", {
      userId,
      acceptanceId,
      requestId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, error: error.message, code: error.code ?? null };
  }
  return { ok: true };
}

export async function attachBookingIdToRequestAcceptance(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  bookingId: string,
  context: TermsAcceptanceContext,
): Promise<void> {
  const { error } = await supabase
    .from("terms_acceptance")
    .update({ booking_id: bookingId })
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .eq("acceptance_context", context)
    .is("booking_id", null);

  if (error) {
    console.error("[terms] attach booking_id failed", error.message);
  }
}

export async function findBookingIdForRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}
