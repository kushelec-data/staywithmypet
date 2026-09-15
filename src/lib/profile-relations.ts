import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  isMissingRelationError,
  isPermissionDeniedError,
} from "@/lib/supabase-errors";

/** Base table — authenticated may SELECT only allowlisted public columns after privacy migration. */
export const PROFILES_TABLE = "profiles";

/** Owner-only view of every profile column (`id = auth.uid()`). */
export const MY_PROFILE_VIEW = "my_profile";

/** Allowlisted marketplace/public profile interface (approx coords, scrubbed details). */
export const PUBLIC_PROFILES_VIEW = "public_profiles";

export const OWNER_PROFILE_RELATIONS = [MY_PROFILE_VIEW, PROFILES_TABLE] as const;
export const PUBLIC_PROFILE_RELATIONS = [PUBLIC_PROFILES_VIEW, PROFILES_TABLE] as const;

/** Must never be granted to anon/authenticated on public.profiles. */
export const PRIVATE_PROFILE_COLUMNS = [
  "phone",
  "phone_country_code",
  "phone_number",
  "phone_e164",
  "phone_verified",
  "address",
  "formatted_address",
  "city",
  "country",
  "postal_code",
  "google_place_id",
  "location",
  "latitude",
  "longitude",
  "emergency_contact_name",
  "emergency_contact_phone_country_code",
  "emergency_contact_phone_number",
  "emergency_contact_phone_e164",
  "preferred_vet_clinic_name",
  "preferred_vet_veterinarian_name",
  "preferred_vet_phone",
  "preferred_vet_emergency_phone",
  "preferred_vet_email",
  "preferred_vet_address",
  "preferred_vet_city",
  "preferred_vet_postal_code",
  "preferred_vet_opening_hours",
  "preferred_vet_notes",
  "share_preferred_vet_during_booking",
  "details",
  "membership_status",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_price_id",
] as const;

export function shouldFallbackProfileRelation(error: PostgrestError): boolean {
  return isMissingRelationError(error) || isPermissionDeniedError(error);
}

type MaybeSingleResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

export async function selectOwnProfileMaybeSingle<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  select: string,
): Promise<MaybeSingleResult<T>> {
  let lastError: PostgrestError | null = null;

  for (const relation of OWNER_PROFILE_RELATIONS) {
    const result = await fromProfileRelation(supabase, relation)
      .select(select)
      .eq("id", userId)
      .maybeSingle();
    if (!result.error) {
      return { data: result.data as T | null, error: null };
    }
    lastError = result.error;
    if (shouldFallbackProfileRelation(result.error)) continue;
    return { data: null, error: result.error };
  }

  return { data: null, error: lastError };
}

export async function probeOwnProfileSelect(
  supabase: SupabaseClient,
  select: string,
): Promise<{ error: PostgrestError | null }> {
  let lastError: PostgrestError | null = null;

  for (const relation of OWNER_PROFILE_RELATIONS) {
    const result = await fromProfileRelation(supabase, relation).select(select).limit(1);
    if (!result.error) return { error: null };
    lastError = result.error;
    if (shouldFallbackProfileRelation(result.error)) continue;
    return { error: result.error };
  }

  return { error: lastError };
}

export async function selectPublicProfileMaybeSingle<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  profileId: string,
  select: string,
): Promise<MaybeSingleResult<T>> {
  let lastError: PostgrestError | null = null;

  for (const relation of PUBLIC_PROFILE_RELATIONS) {
    const result = await fromProfileRelation(supabase, relation)
      .select(select)
      .eq("id", profileId)
      .maybeSingle();
    if (!result.error) {
      return { data: result.data as T | null, error: null };
    }
    lastError = result.error;
    if (shouldFallbackProfileRelation(result.error)) continue;
    return { data: null, error: result.error };
  }

  return { data: null, error: lastError };
}

export function fromProfileRelation(supabase: SupabaseClient, relation: string) {
  return supabase.from(relation as "profiles");
}
