import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { formatNearbyLocation } from "@/lib/location-public";
import { resolveProfilePublicLocation } from "@/lib/profile-location";
import { publicMapPinFromAreaLabel } from "@/lib/estonia-city-coords";
import { fetchOwnerPetIntros, type PetIntroDisplay } from "@/lib/pet-intro";

export { formatNearbyLocation } from "@/lib/location-public";
export type { PetIntroDisplay as PublicPetSummary } from "@/lib/pet-intro";
import { formatSupabaseError, mapProfileRow, type ProfileDbRow } from "@/lib/profile-load";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/security/sanitize-public-profile";
import {
  PUBLIC_PROFILE_RELATIONS,
  fromProfileRelation,
  shouldFallbackProfileRelation,
} from "@/lib/profile-relations";
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

/** No raw phone numbers or coordinates on public fetch. */
const PUBLIC_PROFILE_SELECT_TIERS = [
  PUBLIC_PROFILE_COLUMNS,
  "id, display_name, avatar_url, bio, public_location, role, active_mode, role_chosen_at, languages, is_public, rating_avg, rating_count, created_at, details",
  "id, display_name, avatar_url, bio, location, role, active_mode, role_chosen_at, languages, is_public, rating_avg, rating_count, created_at, details",
] as const;

async function queryPublicProfileRow(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ProfileDbRow | null> {
  let lastError: PostgrestError | null = null;

  for (const relation of PUBLIC_PROFILE_RELATIONS) {
    for (const select of PUBLIC_PROFILE_SELECT_TIERS) {
      const result = await fromProfileRelation(supabase, relation)
        .select(select as string)
        .eq("id", profileId)
        .maybeSingle();

      if (!result.error) {
        if (process.env.NODE_ENV === "development") {
          console.info("[public-profile]", { relation, tier: select.slice(0, 48) });
        }
        return result.data as unknown as ProfileDbRow | null;
      }

      lastError = result.error;
      if (process.env.NODE_ENV === "development") {
        console.warn("[public-profile] query failed", relation, result.error.message);
      }

      if (shouldFallbackProfileRelation(result.error)) {
        break;
      }

      if (!/column/i.test(result.error.message)) {
        throw new Error(formatSupabaseError(result.error));
      }
    }
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

  const nearbyLocation =
    resolveProfilePublicLocation(row) ?? formatNearbyLocation(row.location);

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
    nearbyLocation,
    approximateMap: publicMapPinFromAreaLabel(nearbyLocation),
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
  const row = await queryPublicProfileRow(supabase, profileId);
  if (!row) return null;

  const pets = await fetchPublicPetsForOwner(supabase, profileId);
  const [completed, reviewsAsReviewee] = await Promise.all([
    countCompletedBookingsForUser(supabase, profileId),
    countReviewsAsReviewee(supabase, profileId),
  ]);
  return toPublicProfileView(row, {
    petsCount: pets.length,
    completedBookings: completed,
    reviewsAsRevieweeCount: reviewsAsReviewee,
  });
}

export async function fetchPublicPetsForOwner(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<PetIntroDisplay[]> {
  return fetchOwnerPetIntros(supabase, ownerId, {
    activeOnly: true,
    publicOnly: true,
    publicLocation: true,
  });
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

export function showPublicPetsSection(pets: PetIntroDisplay[]): boolean {
  return pets.length > 0;
}

export const PUBLIC_OWNER_PETS_SECTION_ID = "owner-pets";

/** Whether this member can receive care requests as a Pet Friend on their public profile. */
export function profileCanReceiveCareRequests(
  profile: Pick<PublicProfileView, "role" | "active_mode">,
): boolean {
  if (profile.role === "pet_friend" || profile.role === "both") return true;
  if (profile.role === "pet_parent") return false;
  return profile.active_mode === "pet_friend";
}

/** How this member presents on their public profile (both-role uses active_mode). */
export function isProfileShownAsPetFriend(
  profile: Pick<PublicProfileView, "role" | "active_mode">,
): boolean {
  return profileCanReceiveCareRequests(profile);
}

export function isProfileShownAsPetParent(
  profile: Pick<PublicProfileView, "role" | "active_mode">,
): boolean {
  if (profile.role === "pet_parent") return true;
  if (profile.role === "pet_friend") return false;
  return profile.active_mode === "pet_parent";
}
