import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { DEMO_MEMBERSHIP_LABEL, emptyMembershipsByRole } from "@/lib/membership";
import { resolveUserMemberships, type MembershipLegacySource } from "@/lib/membership-load";
import { isAvatarUrlOwnedByUser } from "@/lib/profile-avatar-display";
import { parseProfileDetails } from "@/lib/profile-details";
import { resolveActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import { applyMembershipsToProfile, type ProfileRow } from "@/lib/profile-utils";
import { toFriendlyClientMessage } from "@/lib/security/errors";

export const PROFILE_SELECT =
  "id, display_name, avatar_url, bio, location, address, latitude, longitude, role, active_mode, role_chosen_at, languages, phone, phone_country_code, phone_number, phone_e164, phone_verified, emergency_contact_name, emergency_contact_phone_country_code, emergency_contact_phone_number, emergency_contact_phone_e164, trust_score, is_public, rating_avg, rating_count, membership_status, details, created_at";

const PROFILE_SELECT_FALLBACKS = [
  "id, display_name, avatar_url, bio, location, address, latitude, longitude, role, active_mode, role_chosen_at, languages, phone, is_public, rating_avg, rating_count, membership_status, details, created_at",
  "id, display_name, avatar_url, bio, location, role, active_mode, role_chosen_at, languages, phone, is_public",
  "id, display_name, avatar_url, bio, location, role, active_mode, role_chosen_at, phone",
  "id, display_name, avatar_url, bio, location, role, role_chosen_at, phone",
  "id, display_name, avatar_url, bio, location, role, phone",
  "id, display_name, avatar_url, bio, location, phone",
] as const;

/** Log reduced-column fallback at most once per select string per page load. */
const warnedSelects = new Set<string>();

export type ProfileDbRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  address?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  role?: ProfileRole;
  active_mode?: string | null;
  role_chosen_at?: string | null;
  languages?: string[] | null;
  phone?: string | null;
  phone_country_code?: string | null;
  phone_number?: string | null;
  phone_e164?: string | null;
  phone_verified?: boolean | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone_country_code?: string | null;
  emergency_contact_phone_number?: string | null;
  emergency_contact_phone_e164?: string | null;
  trust_score?: number | null;
  is_public?: boolean | null;
  rating_avg?: number | string | null;
  rating_count?: number | null;
  membership_status?: string | null;
  details?: unknown;
  created_at?: string | null;
};

export function formatSupabaseError(error: PostgrestError | Error): string {
  if (!("code" in error)) return error.message;
  if (process.env.NODE_ENV === "development") {
    const parts = [error.message];
    if (error.details) parts.push(error.details);
    if (error.hint) parts.push(error.hint);
    if (error.code) parts.push(`Code: ${error.code}`);
    return parts.join(" — ");
  }
  return toFriendlyClientMessage(error);
}

function parseCoord(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function trustPhoneVerifiedFromDetails(details: unknown): boolean {
  if (!details || typeof details !== "object" || Array.isArray(details)) return false;
  return (details as Record<string, unknown>).phone_verified === true;
}

function resolvePhoneVerifiedFromRow(data: ProfileDbRow): boolean {
  if (data.phone_verified === true) return true;
  if (data.phone_verified === false) return false;
  return trustPhoneVerifiedFromDetails(data.details);
}

export function mapProfileRow(data: ProfileDbRow): ProfileRow {
  const role = data.role ?? "pet_friend";
  return {
    id: data.id,
    display_name: data.display_name,
    avatar_url: isAvatarUrlOwnedByUser(data.id, data.avatar_url) ? data.avatar_url : null,
    bio: data.bio,
    location: data.location,
    address: typeof data.address === "string" ? data.address : null,
    latitude: parseCoord(data.latitude),
    longitude: parseCoord(data.longitude),
    role,
    active_mode: resolveActiveMode(role, data.active_mode),
    role_chosen_at: data.role_chosen_at ?? null,
    languages: Array.isArray(data.languages) ? data.languages : [],
    phone: data.phone_e164?.trim() || data.phone?.trim() || null,
    phone_country_code: data.phone_country_code?.trim() || null,
    phone_number: data.phone_number?.trim() || null,
    phone_e164: data.phone_e164?.trim() || null,
    phone_verified: resolvePhoneVerifiedFromRow(data),
    emergency_contact_name: data.emergency_contact_name?.trim() || null,
    emergency_contact_phone_country_code: data.emergency_contact_phone_country_code?.trim() || null,
    emergency_contact_phone_number: data.emergency_contact_phone_number?.trim() || null,
    emergency_contact_phone_e164: data.emergency_contact_phone_e164?.trim() || null,
    trust_score: Math.min(100, Math.max(0, Number(data.trust_score ?? 0))),
    is_public: data.is_public ?? true,
    rating_avg: Number(data.rating_avg ?? 0),
    rating_count: data.rating_count ?? 0,
    membership_status: DEMO_MEMBERSHIP_LABEL,
    memberships: emptyMembershipsByRole(),
    details: parseProfileDetails(data.details),
  };
}

export async function attachMemberships(
  supabase: SupabaseClient,
  profile: ProfileRow,
  source: ProfileDbRow,
): Promise<ProfileRow> {
  const memberships = await resolveUserMemberships(
    supabase,
    profile.id,
    source as MembershipLegacySource,
  );
  return applyMembershipsToProfile(profile, memberships);
}

function isMissingColumnError(error: PostgrestError): boolean {
  return /column/i.test(error.message);
}

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const selects = [PROFILE_SELECT, ...PROFILE_SELECT_FALLBACKS];

  for (let i = 0; i < selects.length; i += 1) {
    const select = selects[i];
    const { data, error } = await supabase
      .from("profiles")
      .select(select)
      .eq("id", userId)
      .maybeSingle();

    if (!error) {
      if (!data) return null;
      const row = data as unknown as ProfileDbRow;
      if (row.id !== userId) {
        console.error("[profile] session mismatch: loaded profile id does not match auth user", {
          expected: userId,
          received: row.id,
        });
        throw new Error("Profile session mismatch");
      }
      if (i > 0 && !warnedSelects.has(select)) {
        warnedSelects.add(select);
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[profile] Using reduced profile columns. Run supabase migrations for the full schema.",
          );
        }
      }
      const mapped = mapProfileRow(row);
      return attachMemberships(supabase, mapped, row);
    }

    if (!isMissingColumnError(error)) {
      console.error("[profile] load error", error);
      throw new Error(formatSupabaseError(error));
    }

    if (i === selects.length - 1) {
      console.error("[profile] load error (no fallback left)", error);
      throw new Error(formatSupabaseError(error));
    }
  }

  return null;
}
