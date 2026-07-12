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

export async function recordTermsAcceptance(
  supabase: SupabaseClient,
  userId: string,
  input: RecordTermsAcceptanceInput,
): Promise<
  | { ok: true }
  | { ok: false; error: string; code?: string | null; details?: string | null; hint?: string | null }
> {
  const { error } = await supabase.from("terms_acceptance").insert({
    user_id: userId,
    terms_version: input.termsVersion ?? CURRENT_TERMS_VERSION,
    acceptance_context: input.context,
    membership_role: input.membershipRole ?? null,
    booking_id: input.bookingId ?? null,
    request_id: input.requestId ?? null,
    plan_id: input.planId ?? null,
    coupon_code: input.couponCode ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    console.error("[terms] record failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      ok: false,
      error: error.message,
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    };
  }
  return { ok: true };
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
    /schema cache.*terms_acceptance/i.test(message)
  );
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
