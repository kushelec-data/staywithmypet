import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveProfilePublicLocation } from "@/lib/profile-location";
import { profileDisplayNameOrFallback } from "@/lib/profile-display";
import { publicProfileHref } from "@/lib/profile-completeness";
import { REQUEST_SENDER_PROFILE_SELECT } from "@/types/database";

export { REQUEST_SENDER_PROFILE_SELECT };

/** Public-safe sender fields shown on incoming care requests. */
export type RequestSenderPreview = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  cityLocation: string | null;
  ratingAvg: number;
  ratingCount: number;
  completedBookingsCount: number;
  profileHref: string;
};

export type RequestSenderProfileRow = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  public_location?: string | null;
  city?: string | null;
  country?: string | null;
  google_place_id?: string | null;
  rating_avg?: number | string | null;
  rating_count?: number | null;
  stay_count?: number | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

/** City/area label only — never street address or private location fields. */
export function resolveRequestSenderPublicLocation(
  row: Pick<
    RequestSenderProfileRow,
    "public_location" | "city" | "country" | "google_place_id"
  >,
): string | null {
  return resolveProfilePublicLocation({
    ...row,
    location: null,
    latitude: null,
    longitude: null,
  });
}

export function mapProfileRowToRequestSenderPreview(
  row: RequestSenderProfileRow | null | undefined,
): RequestSenderPreview | null {
  if (!row?.id) return null;

  return {
    id: row.id,
    displayName: profileDisplayNameOrFallback(row),
    avatarUrl: trimOrNull(row.avatar_url),
    bio: trimOrNull(row.bio),
    cityLocation: resolveRequestSenderPublicLocation(row),
    ratingAvg: Number(row.rating_avg) || 0,
    ratingCount: row.rating_count ?? 0,
    completedBookingsCount: row.stay_count ?? 0,
    profileHref: publicProfileHref(row.id),
  };
}

export function formatIncomingSenderHeadline(
  templates: { withPet: string; generic: string },
  senderName: string,
  petName: string | null | undefined,
): string {
  const name = senderName.trim() || "…";
  const pet = petName?.trim();
  if (pet) {
    return templates.withPet.replaceAll("{senderName}", name).replaceAll("{petName}", pet);
  }
  return templates.generic.replaceAll("{senderName}", name);
}

export async function loadRequestSenderProfilesById(
  supabase: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, RequestSenderPreview>> {
  const map = new Map<string, RequestSenderPreview>();
  if (!profileIds.length) return map;

  const { data, error } = await supabase
    .from("profiles")
    .select(REQUEST_SENDER_PROFILE_SELECT)
    .in("id", profileIds);

  if (error) throw error;

  for (const row of data ?? []) {
    const preview = mapProfileRowToRequestSenderPreview(row as RequestSenderProfileRow);
    if (preview) map.set(preview.id, preview);
  }

  return map;
}
