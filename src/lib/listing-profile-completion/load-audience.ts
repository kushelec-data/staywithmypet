import { mapRowToPetIntro, PET_INTRO_SELECT, type PetIntroRow } from "@/lib/pet-intro";
import { knownEmailRole, reminderLocaleFromMetadata } from "@/lib/profile-completion-reminders/locale";
import { needsRoleOnboarding, type ProfileRow } from "@/lib/profile-utils";
import {
  arePetFriendListingFieldsComplete,
  isSinglePetMarketplaceReady,
} from "@/lib/profile-required-fields";
import type { ProfileRole } from "@/lib/profile-setup";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingCampaignUser } from "./types";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export const LISTING_PROFILE_SELECT =
  "id, display_name, avatar_url, bio, location, public_location, city, country, google_place_id, latitude, longitude, languages, role, active_mode, role_chosen_at, created_at, details, is_public";

const PET_SELECT = `owner_id, ${PET_INTRO_SELECT}`;
const PET_SELECT_CORE =
  "id, owner_id, name, species, breed, other_breed, age_label, date_of_birth, size_label, location, temperament, energy_level, positive_traits, challenging_traits, additional_notes, care_type, availability, availability_dates, is_active, details, pet_photos ( public_url, is_primary, sort_order )";
const PET_SELECT_MIN =
  "id, owner_id, name, species, breed, age_label, size_label, temperament, care_type, availability, availability_dates, is_active, details";

async function paginateSelect(
  admin: AdminClient,
  table: string,
  select: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const row = error as { message?: unknown };
    return String(row.message ?? error);
  }
  return String(error);
}

async function loadPets(admin: AdminClient): Promise<Record<string, unknown>[]> {
  for (const select of [PET_SELECT, PET_SELECT_CORE, PET_SELECT_MIN]) {
    try {
      return await paginateSelect(admin, "pets", select);
    } catch (error) {
      const message = errorText(error);
      if (!/column|schema cache|could not find|PGRST/i.test(message)) throw error;
    }
  }
  throw new Error("pets_select_failed");
}

async function listAuthUsers(admin: AdminClient) {
  const users: Array<{
    id: string;
    email: string | null;
    createdAt: string | null;
    banned: boolean;
    metadata: Record<string, unknown>;
  }> = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data.users ?? [];
    for (const user of batch) {
      const bannedUntil = (user as { banned_until?: string | null }).banned_until;
      users.push({
        id: user.id,
        email: user.email?.trim() || null,
        createdAt: user.created_at ?? null,
        banned: Boolean(bannedUntil && Date.parse(bannedUntil) > Date.now()),
        metadata: (user.user_metadata ?? {}) as Record<string, unknown>,
      });
    }
    if (batch.length < 1000) break;
    page += 1;
  }
  return users;
}

function stringMeta(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isParentRole(role: ProfileRole | null): boolean {
  return role === "pet_parent" || role === "both";
}

function isFriendRole(role: ProfileRole | null): boolean {
  return role === "pet_friend" || role === "both";
}

export function buildListingCampaignUser(input: {
  userId: string;
  email: string | null;
  createdAt: string | null;
  banned: boolean;
  metadata: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  pets: ReturnType<typeof mapRowToPetIntro>[];
}): ListingCampaignUser {
  const profile = (input.profile as ProfileRow | null) ?? null;
  const rolePending = needsRoleOnboarding(profile);
  const roleRaw = profile?.role;
  const role =
    roleRaw === "pet_parent" || roleRaw === "pet_friend" || roleRaw === "both" ? roleRaw : null;
  const activeMode =
    profile?.active_mode === "pet_parent" || profile?.active_mode === "pet_friend"
      ? profile.active_mode
      : null;
  const petMarketplaceReady = input.pets.some(isSinglePetMarketplaceReady);
  const friendListingComplete = profile ? arePetFriendListingFieldsComplete(profile) : false;
  const needsParentListing = !rolePending && isParentRole(role) && !petMarketplaceReady;
  const needsFriendListing = !rolePending && isFriendRole(role) && !friendListingComplete;
  const emailRole: ListingCampaignUser["emailRole"] = rolePending
    ? null
    : needsParentListing
      ? "pet_parent"
      : needsFriendListing
        ? "pet_friend"
        : knownEmailRole(role, activeMode);
  const registeredAt = new Date(
    input.createdAt || (typeof input.profile?.created_at === "string" ? input.profile.created_at : 0),
  );

  return {
    userId: input.userId,
    email: input.email,
    registeredAt: Number.isNaN(registeredAt.getTime()) ? new Date(0) : registeredAt,
    role,
    activeMode,
    displayName: profile ? String(profile.display_name ?? "").trim() || null : null,
    givenName: stringMeta(input.metadata, "given_name") ?? stringMeta(input.metadata, "first_name"),
    fullName: stringMeta(input.metadata, "full_name"),
    metadataName: stringMeta(input.metadata, "name"),
    locale: reminderLocaleFromMetadata(input.metadata),
    banned: input.banned,
    hasAccount: true,
    hasProfile: Boolean(profile),
    rolePending,
    petCount: input.pets.length,
    petMarketplaceReady,
    friendListingComplete,
    needsParentListing,
    needsFriendListing,
    emailRole: needsParentListing || needsFriendListing ? emailRole : knownEmailRole(role, activeMode),
  };
}

export async function recheckListingComplete(
  admin: AdminClient,
  user: ListingCampaignUser,
): Promise<boolean> {
  const { data, error } = await admin
    .from("profiles")
    .select(LISTING_PROFILE_SELECT)
    .eq("id", user.userId)
    .maybeSingle();
  if (error) throw error;

  let petRows: Record<string, unknown>[] = [];
  for (const select of [PET_SELECT, PET_SELECT_CORE, PET_SELECT_MIN]) {
    try {
      const pets = await admin.from("pets").select(select).eq("owner_id", user.userId);
      if (pets.error) throw pets.error;
      petRows = (pets.data ?? []) as unknown as Record<string, unknown>[];
      break;
    } catch (petError) {
      const message = errorText(petError);
      if (!/column|schema cache|could not find|PGRST/i.test(message)) throw petError;
    }
  }

  const refreshed = buildListingCampaignUser({
    userId: user.userId,
    email: user.email,
    createdAt: user.registeredAt.toISOString(),
    banned: user.banned,
    metadata: {},
    profile: (data as Record<string, unknown> | null) ?? null,
    pets: petRows.map((row) => mapRowToPetIntro(row as PetIntroRow)),
  });
  return !refreshed.needsParentListing && !refreshed.needsFriendListing;
}

export async function loadListingCampaignAudience(): Promise<ListingCampaignUser[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const [authUsers, profileRows, petRows] = await Promise.all([
    listAuthUsers(admin),
    paginateSelect(admin, "profiles", LISTING_PROFILE_SELECT),
    loadPets(admin),
  ]);

  const profiles = new Map(profileRows.map((row) => [String(row.id), row]));
  const petsByOwner = new Map<string, ReturnType<typeof mapRowToPetIntro>[]>();
  for (const row of petRows) {
    const ownerId = String(row.owner_id ?? "");
    if (!ownerId) continue;
    const list = petsByOwner.get(ownerId) ?? [];
    list.push(mapRowToPetIntro(row as PetIntroRow));
    petsByOwner.set(ownerId, list);
  }

  return authUsers.map((user) =>
    buildListingCampaignUser({
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt,
      banned: user.banned,
      metadata: user.metadata,
      profile: profiles.get(user.id) ?? null,
      pets: petsByOwner.get(user.id) ?? [],
    }),
  );
}
