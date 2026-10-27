import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import {
  DEMO_MEMBERSHIP_LABEL,
  emptyMembershipsByRole,
} from "@/lib/membership";
import { NO_WELCOME_OFFER_ELIGIBLE, resolveMembershipSnapshot } from "@/lib/membership-load";
import { isAvatarUrlOwnedByUser } from "@/lib/profile-avatar-display";
import { parseProfileDetails } from "@/lib/profile-details";
import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import { resolveActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import { applyMembershipsToProfile, type ProfileRow } from "@/lib/profile-utils";
import { appDevSpan } from "@/lib/app-dev-perf";
import { AuthRequiredError, ForbiddenError } from "@/lib/security/assert-owner";
import { toFriendlyClientMessage } from "@/lib/security/errors";
import {
  probeOwnProfileSelect,
  selectOwnProfileMaybeSingle,
} from "@/lib/profile-relations";
import { isMissingColumnError, supabaseErrorDetail } from "@/lib/supabase-errors";

/** Columns present in committed Supabase migrations (safe default read list). */
export const PROFILE_SELECT =
  "id, display_name, avatar_url, bio, location, address, formatted_address, city, country, postal_code, google_place_id, public_location, latitude, longitude, role, active_mode, role_chosen_at, languages, phone, is_public, rating_avg, rating_count, membership_status, details, created_at";

/** Optional trust/phone columns (RUN_THIS_trust_phase1.sql only — not in all databases). */
const PROFILE_SELECT_TRUST =
  "phone_country_code, phone_number, phone_e164, phone_verified, emergency_contact_name, emergency_contact_phone_country_code, emergency_contact_phone_number, emergency_contact_phone_e164, trust_score, preferred_vet_clinic_name, preferred_vet_veterinarian_name, preferred_vet_phone, preferred_vet_emergency_phone, preferred_vet_email, preferred_vet_address, preferred_vet_city, preferred_vet_postal_code, preferred_vet_opening_hours, preferred_vet_notes, share_preferred_vet_during_booking";

export const PROFILE_SELECT_WITH_TRUST = `${PROFILE_SELECT}, ${PROFILE_SELECT_TRUST}`;

const PROFILE_SELECT_FALLBACKS = [
  "id, display_name, avatar_url, bio, location, address, latitude, longitude, role, active_mode, role_chosen_at, languages, phone, is_public, rating_avg, rating_count, membership_status, details, created_at",
  "id, display_name, avatar_url, bio, location, role, active_mode, role_chosen_at, languages, phone, is_public",
  "id, display_name, avatar_url, bio, location, role, active_mode, role_chosen_at, phone",
  "id, display_name, avatar_url, bio, location, role, role_chosen_at, phone",
  "id, display_name, avatar_url, bio, location, role, phone",
  "id, display_name, avatar_url, bio, location, phone",
] as const;

const PROFILE_WRITE_STRIP_KEYS = [
  "phone_country_code",
  "phone_number",
  "phone_e164",
  "phone_verified",
  "emergency_contact_name",
  "emergency_contact_phone_country_code",
  "emergency_contact_phone_number",
  "emergency_contact_phone_e164",
  "trust_score",
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
  "formatted_address",
  "city",
  "country",
  "postal_code",
  "google_place_id",
  "public_location",
  "address",
  "latitude",
  "longitude",
  "membership_status",
  "active_mode",
  "role_chosen_at",
  "languages",
  "details",
] as const;

/** Log reduced-column fallback at most once per select string per page load. */
const warnedSelects = new Set<string>();
let trustColumnsReadable: boolean | null = null;

async function profilesTrustColumnsReadable(supabase: SupabaseClient): Promise<boolean> {
  if (trustColumnsReadable !== null) return trustColumnsReadable;
  const { error } = await probeOwnProfileSelect(supabase, "phone_e164");
  trustColumnsReadable = !error;
  return trustColumnsReadable;
}

async function enrichProfileDbRowWithTrustColumns(
  supabase: SupabaseClient,
  userId: string,
  row: ProfileDbRow,
): Promise<ProfileDbRow> {
  if (!(await profilesTrustColumnsReadable(supabase))) return row;

  const { data, error } = await selectOwnProfileMaybeSingle(
    supabase,
    userId,
    PROFILE_SELECT_TRUST,
  );

  if (error || !data) return row;
  return { ...row, ...(data as Partial<ProfileDbRow>) };
}

export type ProfileDbRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  address?: string | null;
  formatted_address?: string | null;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  google_place_id?: string | null;
  public_location?: string | null;
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
    formatted_address: typeof data.formatted_address === "string" ? data.formatted_address : null,
    city: typeof data.city === "string" ? data.city : null,
    country: typeof data.country === "string" ? data.country : null,
    postal_code: typeof data.postal_code === "string" ? data.postal_code : null,
    google_place_id: typeof data.google_place_id === "string" ? data.google_place_id : null,
    public_location: typeof data.public_location === "string" ? data.public_location : null,
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
    welcome_offer_eligible_by_role: NO_WELCOME_OFFER_ELIGIBLE,
    details: parseProfileDetails(data.details),
  };
}

export async function attachMemberships(
  supabase: SupabaseClient,
  profile: ProfileRow,
): Promise<ProfileRow> {
  const snapshot = await resolveMembershipSnapshot(supabase, profile.id);
  return applyMembershipsToProfile(
    profile,
    snapshot.memberships,
    snapshot.welcomeOfferEligibleByRole,
  );
}

function stripProfileWriteColumns(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row };
  for (const key of PROFILE_WRITE_STRIP_KEYS) {
    delete next[key];
  }
  return next;
}

function withoutProfileId(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row };
  delete next.id;
  return next;
}

function isUniqueViolationError(error: PostgrestError): boolean {
  return error.code === "23505";
}

async function requireAuthUser(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new AuthRequiredError();
  }

  return user;
}

/**
 * Columns that remain SELECT-granted on public.profiles after column-privacy.
 * INSERT of these is safe; private-column UPSERT is not.
 */
export const PROFILE_PUBLIC_CREATE_COLUMNS = ["id", "display_name", "avatar_url"] as const;

function publicProfileCreateRow(user: User, row: Record<string, unknown>): Record<string, unknown> {
  const displayName =
    typeof row.display_name === "string" && row.display_name.trim()
      ? row.display_name.trim()
      : resolveProfileDisplayName(user, null);
  const avatarFromPayload =
    typeof row.avatar_url === "string" && row.avatar_url.trim() ? row.avatar_url.trim() : null;
  const avatarFromMeta =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  return {
    id: user.id,
    display_name: displayName,
    avatar_url: avatarFromPayload ?? avatarFromMeta,
  };
}

async function insertOwnPublicProfileRow(
  supabase: SupabaseClient,
  user: User,
  row: Record<string, unknown>,
): Promise<void> {
  const stub = publicProfileCreateRow(user, row);
  const { error } = await supabase.from("profiles").insert(stub);
  if (!error) return;
  if (isUniqueViolationError(error)) return;
  console.error("[profile] public profile create error", supabaseErrorDetail(error));
  throw new Error(formatSupabaseError(error));
}

async function updateOwnProfileRow(
  supabase: SupabaseClient,
  sessionUserId: string,
  payload: Record<string, unknown>,
): Promise<{ updated: boolean; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", sessionUserId)
    .select("id")
    .maybeSingle();

  if (error) return { updated: false, error };
  if (data?.id && data.id !== sessionUserId) {
    throw new Error("Profile session mismatch");
  }
  return { updated: Boolean(data?.id), error: null };
}

/**
 * Owner-scoped profile save. Uses UPDATE (not UPSERT) so private columns remain
 * writable after the column-privacy migration. Creates a missing row with
 * public columns only, then UPDATEs the rest.
 */
export async function saveOwnProfileRowAndReload(
  supabase: SupabaseClient,
  userId: string,
  row: Record<string, unknown>,
  logLabel: string,
): Promise<ProfileRow> {
  const user = await requireAuthUser(supabase);
  if (userId !== user.id) {
    throw new ForbiddenError();
  }

  let payload = withoutProfileId(row);
  let strippedOptional = false;
  let createdPublicRow = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { updated, error } = await updateOwnProfileRow(supabase, user.id, payload);

    if (!error && updated) {
      const reloaded = await fetchUserProfile(supabase, user.id);
      if (!reloaded) {
        throw new Error("Profile saved but could not be loaded.");
      }
      return reloaded;
    }

    if (error && isMissingColumnError(error) && !strippedOptional) {
      payload = stripProfileWriteColumns(payload);
      strippedOptional = true;
      continue;
    }

    if (error && isMissingColumnError(error)) {
      const next = { ...payload };
      const match = error.message.match(/'([^']+)'/);
      const missing = match?.[1];
      if (missing && missing in next) {
        delete next[missing];
        payload = next;
        continue;
      }
    }

    if (error) {
      console.error(`[profile] ${logLabel} error`, supabaseErrorDetail(error));
      throw new Error(formatSupabaseError(error));
    }

    if (!createdPublicRow) {
      await insertOwnPublicProfileRow(supabase, user, payload);
      createdPublicRow = true;
      continue;
    }

    throw new Error("Profile could not be saved.");
  }

  throw new Error("Profile could not be saved.");
}

/** @deprecated Use saveOwnProfileRowAndReload — kept for existing setup/edit callers. */
export const upsertProfileRowAndReload = saveOwnProfileRowAndReload;

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const selects = [PROFILE_SELECT, ...PROFILE_SELECT_FALLBACKS];

  for (let i = 0; i < selects.length; i += 1) {
    const select = selects[i];
    const { data, error } = await selectOwnProfileMaybeSingle(supabase, userId, select);

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
      const enriched = await appDevSpan(
        "profile-load.enrichment+memberships",
        2,
        async () => {
          const [enrichedRow, membershipSnapshot] = await Promise.all([
            enrichProfileDbRowWithTrustColumns(supabase, userId, row),
            resolveMembershipSnapshot(supabase, userId),
          ]);
          const mapped = mapProfileRow(enrichedRow);
          return applyMembershipsToProfile(
            mapped,
            membershipSnapshot.memberships,
            membershipSnapshot.welcomeOfferEligibleByRole,
          );
        },
        { parallel: true },
      );
      return enriched;
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
