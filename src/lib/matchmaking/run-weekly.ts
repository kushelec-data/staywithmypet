import "server-only";

import { loadActiveMembershipUserIds } from "@/lib/marketplace-membership-server";
import { pickCareTypesFromRow } from "@/lib/pet-care-type";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import {
  parseProfileDetails,
  profileCalendarSelectedDates,
  resolvedPetCarePreferences,
} from "@/lib/profile-details";
import { sendTransactionalEmail } from "@/lib/email-send";
import { absoluteUrl } from "@/lib/emails/layout";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isEligibleMatchFriend,
  isEligibleMatchPet,
} from "@/lib/matchmaking/eligibility";
import { coordsFromRow, locationAreaKey } from "@/lib/matchmaking/location";
import {
  MATCH_COOLDOWN_DAYS,
  MATCH_EXPIRY_DAYS,
  MATCH_MAX_PER_USER,
} from "@/lib/matchmaking/types";
import {
  addUtcDays,
  matchmakingRunDateIso,
  pairKey,
  scoreMatch,
  utcIsoWeekKey,
} from "@/lib/matchmaking/score";
import {
  collectBlockedRelationships,
  LIVE_BOOKING_BLOCK_STATUSES,
  LIVE_REQUEST_BLOCK_STATUSES,
  matchesForRecipient,
  selectWeeklyMatches,
  shouldSkipCooldown,
  shouldSkipRelationship,
  type RankedPair,
} from "@/lib/matchmaking/select";
import type { ProfileRole } from "@/lib/profile-setup";
import type { EmailTemplateContext } from "@/lib/emails/types";

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  public_location: string | null;
  city: string | null;
  country: string | null;
  google_place_id: string | null;
  latitude: unknown;
  longitude: unknown;
  is_public: boolean | null;
  role: ProfileRole;
  details: unknown;
};

type PetRow = {
  id: string;
  owner_id: string;
  name: string | null;
  species: string | null;
  size_label: string | null;
  location: string | null;
  latitude: unknown;
  longitude: unknown;
  availability_dates: unknown;
  care_type: unknown;
  details: unknown;
  is_public: boolean | null;
  is_active: boolean | null;
  pet_photos?: { public_url: string | null; is_primary: boolean | null; sort_order: number | null }[] | null;
};

export type WeeklyMatchmakingResult = {
  ok: boolean;
  batchId: string;
  expired: number;
  candidatesScored: number;
  inserted: number;
  emailsSent: number;
  notificationsCreated: number;
  skippedEmpty: boolean;
};

function primaryPetPhoto(pet: PetRow): string | null {
  const photos = [...(pet.pet_photos ?? [])].sort((a, b) => {
    if (Boolean(a.is_primary) !== Boolean(b.is_primary)) return a.is_primary ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const url = photos.find((p) => p.public_url?.trim())?.public_url?.trim();
  return url || null;
}

async function expireStaleSuggestions(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("match_suggestions")
    .update({ status: "expired" })
    .in("status", ["active", "viewed"])
    .lt("expires_at", now)
    .select("id");
  if (error) {
    console.error("[matchmaking] expire failed", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

async function loadBlockedRelationships(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<Set<string>> {
  const [requests, bookings] = await Promise.all([
    admin
      .from("requests")
      .select("pet_parent_id, pet_friend_id, status")
      .in("status", [...LIVE_REQUEST_BLOCK_STATUSES]),
    admin
      .from("bookings")
      .select("pet_parent_id, pet_friend_id, status")
      .in("status", [...LIVE_BOOKING_BLOCK_STATUSES]),
  ]);

  return collectBlockedRelationships({
    requests: requests.data ?? [],
    bookings: bookings.data ?? [],
  });
}

async function loadRecentPairKeys(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  now: Date,
): Promise<Set<string>> {
  const since = addUtcDays(now, -MATCH_COOLDOWN_DAYS).toISOString();
  const { data, error } = await admin
    .from("match_suggestions")
    .select("pet_parent_id, pet_friend_id, pet_id")
    .gte("created_at", since);
  if (error) {
    console.error("[matchmaking] cooldown load failed", error.message);
    return new Set();
  }
  const keys = new Set<string>();
  for (const row of data ?? []) {
    keys.add(pairKey(String(row.pet_parent_id), String(row.pet_friend_id), String(row.pet_id)));
  }
  return keys;
}

export async function runWeeklyMatchmaking(now = new Date()): Promise<WeeklyMatchmakingResult> {
  const admin = createAdminClient();
  const batchId = crypto.randomUUID();
  const empty: WeeklyMatchmakingResult = {
    ok: false,
    batchId,
    expired: 0,
    candidatesScored: 0,
    inserted: 0,
    emailsSent: 0,
    notificationsCreated: 0,
    skippedEmpty: true,
  };
  if (!admin) {
    console.error("[matchmaking] admin client unavailable");
    return empty;
  }

  const expired = await expireStaleSuggestions(admin);
  const [parentMembershipIds, friendMembershipIds] = await Promise.all([
    loadActiveMembershipUserIds("pet_parent"),
    loadActiveMembershipUserIds("pet_friend"),
  ]);

  const [{ data: profileRows, error: profileError }, { data: petRows, error: petError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, display_name, avatar_url, bio, location, public_location, city, country, google_place_id, latitude, longitude, is_public, role, details",
        )
        .eq("is_public", true),
      admin
        .from("pets")
        .select(
          "id, owner_id, name, species, size_label, location, latitude, longitude, availability_dates, care_type, details, is_public, is_active, pet_photos ( public_url, is_primary, sort_order )",
        )
        .eq("is_public", true)
        .eq("is_active", true),
    ]);

  if (profileError) console.error("[matchmaking] profiles load failed", profileError.message);
  if (petError) console.error("[matchmaking] pets load failed", petError.message);

  const profiles = new Map((profileRows ?? []).map((row) => [String(row.id), row as ProfileRow]));
  const friends = [...profiles.values()].filter((profile) =>
    isEligibleMatchFriend(
      {
        id: profile.id,
        display_name: profile.display_name,
        location: profile.location,
        public_location: profile.public_location,
        city: profile.city,
        country: profile.country,
        google_place_id: profile.google_place_id,
        latitude: coordsFromRow(profile)?.lat ?? null,
        longitude: coordsFromRow(profile)?.lng ?? null,
        is_public: profile.is_public,
        role: profile.role,
        details: parseProfileDetails(profile.details),
      },
      friendMembershipIds,
    ),
  );

  const pets = ((petRows ?? []) as PetRow[]).filter((pet) => {
    const owner = profiles.get(pet.owner_id) ?? null;
    return isEligibleMatchPet(
      {
        id: pet.id,
        ownerId: pet.owner_id,
        name: pet.name,
        species: pet.species,
        is_public: pet.is_public,
        is_active: pet.is_active,
      },
      owner
        ? {
            id: owner.id,
            display_name: owner.display_name,
            bio: owner.bio,
            location: owner.location,
            public_location: owner.public_location,
            city: owner.city,
            country: owner.country,
            google_place_id: owner.google_place_id,
            latitude: coordsFromRow(owner)?.lat ?? null,
            longitude: coordsFromRow(owner)?.lng ?? null,
            is_public: owner.is_public,
            role: owner.role,
          }
        : null,
      parentMembershipIds,
    );
  });

  const blocked = await loadBlockedRelationships(admin);
  const recentPairs = await loadRecentPairKeys(admin, now);
  const runDateIso = matchmakingRunDateIso(now);

  const ranked: RankedPair[] = [];
  for (const pet of pets) {
    const owner = profiles.get(pet.owner_id);
    if (!owner) continue;
    const petDetails =
      pet.details && typeof pet.details === "object" && !Array.isArray(pet.details)
        ? (pet.details as Record<string, unknown>)
        : {};
    for (const friend of friends) {
      if (friend.id === owner.id) continue;
      if (shouldSkipRelationship(owner.id, friend.id, blocked)) continue;
      if (shouldSkipCooldown(owner.id, friend.id, pet.id, recentPairs)) continue;
      const friendDetails = parseProfileDetails(friend.details);
      const care = resolvedPetCarePreferences(friendDetails);
      const scored = scoreMatch({
        parentAreaKey: locationAreaKey({
          city: owner.city,
          public_location: owner.public_location,
          location: pet.location || owner.location,
        }),
        friendAreaKey: locationAreaKey({
          city: friend.city,
          public_location: friend.public_location,
          location: friend.location,
        }),
        parentCoords: coordsFromRow(pet) ?? coordsFromRow(owner),
        friendCoords: coordsFromRow(friend),
        petAvailabilityDates: normalizeAvailabilityDates(pet.availability_dates),
        friendAvailabilityDates: profileCalendarSelectedDates(friendDetails),
        runDateIso,
        petSpecies: pet.species,
        friendPetTypes: care.pet_types_willing_to_care_for ?? [],
        petSizeKey: pet.size_label,
        friendPreferredSizes: care.preferred_pet_sizes ?? [],
        petCareTypes: pickCareTypesFromRow(pet as unknown as Record<string, unknown>, petDetails),
        friendCareTypes: care.available_care_types ?? [],
        friendCompletenessPercent: 100,
      });
      if (scored.availabilityConflict) continue;
      ranked.push({
        petParentId: owner.id,
        petFriendId: friend.id,
        petId: pet.id,
        score: scored.total,
        reasons: scored.reasons,
      });
    }
  }

  const selected = selectWeeklyMatches(ranked);
  if (selected.length === 0) {
    return {
      ok: true,
      batchId,
      expired,
      candidatesScored: ranked.length,
      inserted: 0,
      emailsSent: 0,
      notificationsCreated: 0,
      skippedEmpty: true,
    };
  }

  const expiresAt = addUtcDays(now, MATCH_EXPIRY_DAYS).toISOString();
  const insertRows = selected.map((pair) => ({
    batch_id: batchId,
    pet_parent_id: pair.petParentId,
    pet_friend_id: pair.petFriendId,
    pet_id: pair.petId,
    score: pair.score,
    reasons: pair.reasons,
    status: "active" as const,
    expires_at: expiresAt,
  }));

  const { error: insertError } = await admin.from("match_suggestions").insert(insertRows);
  if (insertError) {
    console.error("[matchmaking] insert failed", insertError.message);
    return {
      ok: false,
      batchId,
      expired,
      candidatesScored: ranked.length,
      inserted: 0,
      emailsSent: 0,
      notificationsCreated: 0,
      skippedEmpty: false,
    };
  }

  const recipientIds = new Set<string>();
  for (const pair of selected) {
    recipientIds.add(pair.petParentId);
    recipientIds.add(pair.petFriendId);
  }

  const weekKey = utcIsoWeekKey(now);
  let emailsSent = 0;
  let notificationsCreated = 0;

  for (const userId of recipientIds) {
    const userMatches = matchesForRecipient(selected, userId);
    if (userMatches.length === 0) continue;
    const profile = profiles.get(userId);
    const asParent = userMatches.filter((m) => m.petParentId === userId);
    const digestKind = asParent.length >= userMatches.length / 2 && asParent.length > 0 ? "parent" : "friend";
    const firstPet = asParent[0] ? pets.find((p) => p.id === asParent[0].petId) : null;

    const title =
      digestKind === "parent" && firstPet?.name
        ? `${userMatches.length} new matches for ${firstPet.name}`
        : `${userMatches.length} new matches for you`;
    const body =
      digestKind === "parent"
        ? "We found Pet Friends who may be a good fit. Open Matches to review them."
        : "We found pets you may enjoy caring for. Open Matches to review them.";

    const { error: notifyError } = await admin.from("notifications").insert({
      user_id: userId,
      type: "match_digest",
      title,
      body,
      read_at: null,
    });
    if (!notifyError) notificationsCreated += 1;
    else console.error("[matchmaking] notification insert failed", notifyError.message);

    const items = userMatches.slice(0, MATCH_MAX_PER_USER).map((match) => {
      if (match.petParentId === userId) {
        const friend = profiles.get(match.petFriendId);
        return {
          name: friend?.display_name ?? "Pet Friend",
          location:
            locationAreaKey({
              city: friend?.city,
              public_location: friend?.public_location,
              location: friend?.location,
            }) ?? null,
          reason: match.reasons[0] ?? null,
          photoUrl: friend?.avatar_url ?? null,
          href: absoluteUrl(`/users/${match.petFriendId}`),
        };
      }
      const pet = pets.find((p) => p.id === match.petId);
      const owner = pet ? profiles.get(pet.owner_id) : null;
      return {
        name: pet?.name ?? "Pet",
        location:
          locationAreaKey({
            city: owner?.city,
            public_location: owner?.public_location,
            location: pet?.location || owner?.location,
          }) ?? null,
        reason: match.reasons[0] ?? null,
        photoUrl: pet ? primaryPetPhoto(pet) : null,
        href: absoluteUrl(`/pet/${match.petId}`),
      };
    });

    const context: EmailTemplateContext = {
      recipientName: profile?.display_name ?? undefined,
      recipientRole: digestKind === "parent" ? "pet_parent" : "pet_friend",
      petName: firstPet?.name ?? undefined,
      matchDigestKind: digestKind,
      matchDigestItems: items,
    };

    const result = await sendTransactionalEmail({
      eventType: "match_digest",
      userId,
      uniqueKey: `match_digest_${userId}_${weekKey}`,
      context,
    });
    if (result.sent) {
      emailsSent += 1;
      const ids = userMatches.map((m) =>
        selected.find(
          (s) =>
            s.petParentId === m.petParentId &&
            s.petFriendId === m.petFriendId &&
            s.petId === m.petId,
        ),
      );
      void ids;
      await admin
        .from("match_suggestions")
        .update({ emailed_at: new Date().toISOString() })
        .eq("batch_id", batchId)
        .or(`pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`);
    }
  }

  return {
    ok: true,
    batchId,
    expired,
    candidatesScored: ranked.length,
    inserted: selected.length,
    emailsSent,
    notificationsCreated,
    skippedEmpty: false,
  };
}
