import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { formatNearbyLocation } from "@/lib/location-public";
import { resolveProfilePublicLocation } from "@/lib/profile-location";
import { fetchOwnerPetIntros, type PetIntroDisplay } from "@/lib/pet-intro";

export { formatNearbyLocation } from "@/lib/location-public";
export type { PetIntroDisplay as PublicPetSummary } from "@/lib/pet-intro";
import { formatSupabaseError, mapProfileRow, type ProfileDbRow } from "@/lib/profile-load";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/security/sanitize-public-profile";
import type { ProfileDetails } from "@/lib/profile-details";
import { parseProfileDetails } from "@/lib/profile-details";
import { countCompletedBookingsForUser } from "@/lib/bookings-stats";
import type { ProfileRole } from "@/lib/profile-setup";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import {
  isProfileVerified,
  parseTrustFlagsFromDetails,
} from "@/lib/trust-safety";
import { isBioCompleteForProfile } from "@/lib/profile-completeness";
import { calculateTrustScore } from "@/lib/trust-score";
import { countReviewsAsReviewee } from "@/lib/bookings-stats";

/** No raw phone numbers on public fetch. */
const PUBLIC_PROFILE_SELECT_TIERS = [
  PUBLIC_PROFILE_COLUMNS,
  "id, display_name, avatar_url, bio, location, role, active_mode, role_chosen_at, languages, is_public, rating_avg, rating_count, created_at, details, latitude, longitude, trust_score, phone_verified",
  "id, display_name, avatar_url, bio, location, role, active_mode, role_chosen_at, languages, is_public, rating_avg, rating_count, created_at, details, latitude, longitude",
] as const;

async function queryPublicProfileRow(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ProfileDbRow | null> {
  let lastError: PostgrestError | null = null;

  for (const select of PUBLIC_PROFILE_SELECT_TIERS) {
    const result = await supabase
      .from("profiles")
      .select(select as string)
      .eq("id", profileId)
      .maybeSingle();

    if (!result.error) {
      if (process.env.NODE_ENV === "development") {
        console.info("[public-profile] profiles", { tier: select.slice(0, 48) });
      }
      return result.data as unknown as ProfileDbRow | null;
    }

    if (process.env.NODE_ENV === "development") {
      console.warn("[public-profile] profiles query failed", result.error.message);
    }

    if (!/column/i.test(result.error.message)) {
      throw new Error(formatSupabaseError(result.error));
    }

    lastError = result.error;
  }

  if (lastError) {
    throw new Error(formatSupabaseError(lastError));
  }
  throw new Error("Could not load profile.");
}

export type PublicProfileView = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: ProfileRole;
  active_mode: ProfileActiveMode;
  languages: string[];
  is_public: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string | null;
  details: ProfileDetails;
  profilePhotos: string[];
  nearbyLocation: string | null;
  approximateMap: { lat: number; lng: number } | null;
  email_verified: boolean;
  phone_verified: boolean;
  is_verified: boolean;
  completenessPercent: number;
  /** 0–100, same formula as dashboard (may fall back to live computation). */
  trust_score_percent: number;
  completed_bookings_count: number;
  /** Derived for trust display only. */
  trust_badges: PublicTrustBadgeId[];
};

/** Email + profile-complete badges for hero/header (subset of full trust badges). */
export function heroTrustBadgesFromProfileRow(row: ProfileDbRow): PublicTrustBadgeId[] {
  const mapped = mapProfileRow(row);
  const activeMode = resolveActiveMode(row.role ?? "pet_friend", row.active_mode);
  const completeness = computeProfileCompleteness(mapped, { activeMode });
  const trustFlags = parseTrustFlagsFromDetails(row.details);
  const badges: PublicTrustBadgeId[] = [];
  if (trustFlags.emailVerified) badges.push("email_verified");
  if (
    completeness.percent >= 70 ||
    (Boolean(row.avatar_url?.trim()) && isBioCompleteForProfile(row.bio))
  ) {
    badges.push("profile_complete");
  }
  return badges;
}

export type PublicTrustBadgeId =
  | "email_verified"
  | "phone_verified"
  | "profile_complete"
  | "reviewed"
  | "completed_bookings"
  | "emergency_contact";

function hashUnit(id: string, salt: string): number {
  let h = 0;
  const s = `${id}:${salt}`;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 1000) / 1000;
}

/** Round and slightly offset coordinates so the map shows an approximate area only. */
export function approximateMapCoordinates(
  lat: number,
  lng: number,
  profileId: string,
): { lat: number; lng: number } {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  const latOff = (hashUnit(profileId, "lat") - 0.5) * 0.06;
  const lngOff = (hashUnit(profileId, "lng") - 0.5) * 0.06;
  return {
    lat: Math.round((roundedLat + latOff) * 100) / 100,
    lng: Math.round((roundedLng + lngOff) * 100) / 100,
  };
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

export function toPublicProfileView(
  row: ProfileDbRow,
  options: {
    petsCount?: number;
    completedBookings?: number;
    reviewsAsRevieweeCount?: number;
  } = {},
): PublicProfileView {
  const role = row.role ?? "pet_friend";
  const details = parseProfileDetails(row.details);
  const lat = parseCoord(row.latitude);
  const lng = parseCoord(row.longitude);
  const approximateMap =
    lat != null && lng != null ? approximateMapCoordinates(lat, lng, row.id) : null;

  const mapped = mapProfileRow(row);
  const activeMode = resolveActiveMode(role, row.active_mode);
  const completeness = computeProfileCompleteness(mapped, {
    petsCount: options.petsCount,
    activeMode,
  });
  const trustFlags = parseTrustFlagsFromDetails(row.details);
  const completedBookings = options.completedBookings ?? 0;
  const reviewsAsReviewee =
    options.reviewsAsRevieweeCount ?? row.rating_count ?? 0;

  const phoneVerifiedPublic =
    row.phone_verified === true ||
    (row.phone_verified == null && trustFlags.phoneVerified);

  const emailVerified = trustFlags.emailVerified;

  const trustBreakdown = calculateTrustScore(
    {
      avatar_url: row.avatar_url ?? null,
      bio: row.bio,
      phone_verified: phoneVerifiedPublic,
      phone: typeof row.phone === "string" ? row.phone : null,
      phone_e164: typeof row.phone_e164 === "string" ? row.phone_e164 : null,
      emergency_contact_name:
        typeof row.emergency_contact_name === "string" ? row.emergency_contact_name : null,
      emergency_contact_phone_e164:
        typeof row.emergency_contact_phone_e164 === "string"
          ? row.emergency_contact_phone_e164
          : null,
      details: row.details,
    },
    {
      emailVerified,
      completedBookingsCount: completedBookings,
      reviewsAsRevieweeCount: reviewsAsReviewee,
      phoneVerified: phoneVerifiedPublic,
    },
  );
  const trustPercent = trustBreakdown.percent;

  const trust_badges: PublicTrustBadgeId[] = [];
  if (emailVerified) trust_badges.push("email_verified");
  if (phoneVerifiedPublic) trust_badges.push("phone_verified");
  if (
    completeness.percent >= 70 ||
    (Boolean(row.avatar_url?.trim()) && isBioCompleteForProfile(row.bio))
  ) {
    trust_badges.push("profile_complete");
  }
  if (reviewsAsReviewee > 0) trust_badges.push("reviewed");
  if (completedBookings > 0) trust_badges.push("completed_bookings");
  if (trustBreakdown.hasEmergencyContact) trust_badges.push("emergency_contact");

  const flagsForVerified = { emailVerified, phoneVerified: phoneVerifiedPublic };

  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url ?? null,
    bio: row.bio,
    role,
    active_mode: activeMode,
    languages: Array.isArray(row.languages) ? row.languages : [],
    is_public: row.is_public ?? true,
    rating_avg: Number(row.rating_avg ?? 0),
    rating_count: row.rating_count ?? 0,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    details,
    profilePhotos: (details.profile_photos ?? []).slice(0, 6),
    nearbyLocation:
      resolveProfilePublicLocation(row) ?? formatNearbyLocation(row.location),
    approximateMap,
    email_verified: emailVerified,
    phone_verified: phoneVerifiedPublic,
    is_verified: isProfileVerified(flagsForVerified),
    completenessPercent: completeness.percent,
    trust_score_percent: trustPercent,
    completed_bookings_count: completedBookings,
    trust_badges,
  };
}

export async function fetchPublicProfile(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PublicProfileView | null> {
  const data = await queryPublicProfileRow(supabase, profileId);
  if (!data) return null;

  const pets = await fetchPublicPetsForOwner(supabase, profileId);
  const [completed, reviewsAsReviewee] = await Promise.all([
    countCompletedBookingsForUser(supabase, profileId),
    countReviewsAsReviewee(supabase, profileId),
  ]);
  return toPublicProfileView(data, {
    petsCount: pets.length,
    completedBookings: completed,
    reviewsAsRevieweeCount: reviewsAsReviewee,
  });
}

export async function fetchPublicPetsForOwner(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<PetIntroDisplay[]> {
  return fetchOwnerPetIntros(supabase, ownerId, { activeOnly: true, publicLocation: true });
}

export function formatMemberSince(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function showPublicCareSection(profile: PublicProfileView): boolean {
  return profile.role === "pet_friend" || profile.role === "both";
}

export function showPublicPetsSection(profile: PublicProfileView): boolean {
  return profile.role === "pet_parent" || profile.role === "both";
}

export const PUBLIC_OWNER_PETS_SECTION_ID = "owner-pets";

/** How this member presents on their public profile (both-role uses active_mode). */
export function isProfileShownAsPetFriend(
  profile: Pick<PublicProfileView, "role" | "active_mode">,
): boolean {
  if (profile.role === "pet_friend") return true;
  if (profile.role === "pet_parent") return false;
  return profile.active_mode === "pet_friend";
}

export function isProfileShownAsPetParent(
  profile: Pick<PublicProfileView, "role" | "active_mode">,
): boolean {
  if (profile.role === "pet_parent") return true;
  if (profile.role === "pet_friend") return false;
  return profile.active_mode === "pet_parent";
}
