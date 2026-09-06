import type { SupabaseClient } from "@supabase/supabase-js";
import { isStoredMatchStillVisible } from "@/lib/matchmaking/eligibility";

export type MatchSuggestionStatus = "active" | "viewed" | "dismissed" | "expired";

export type MatchSuggestionRow = {
  id: string;
  batch_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  pet_id: string;
  score: number;
  reasons: string[];
  status: MatchSuggestionStatus;
  created_at: string;
  expires_at: string;
  viewed_at: string | null;
  emailed_at: string | null;
  clicked_at: string | null;
  pet?: {
    id: string;
    name: string | null;
    species: string | null;
    size_label: string | null;
    location: string | null;
    is_public: boolean | null;
    is_active: boolean | null;
    pet_photos?: { public_url: string | null; is_primary: boolean | null }[] | null;
  } | null;
  parent?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    location: string | null;
    public_location: string | null;
    city: string | null;
    is_public: boolean | null;
  } | null;
  friend?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    location: string | null;
    public_location: string | null;
    city: string | null;
    is_public: boolean | null;
  } | null;
};

const SELECT =
  "id, batch_id, pet_parent_id, pet_friend_id, pet_id, score, reasons, status, created_at, expires_at, viewed_at, emailed_at, clicked_at, pet:pets!match_suggestions_pet_id_fkey ( id, name, species, size_label, location, is_public, is_active, pet_photos ( public_url, is_primary ) ), parent:profiles!match_suggestions_pet_parent_id_fkey ( id, display_name, avatar_url, location, public_location, city, is_public ), friend:profiles!match_suggestions_pet_friend_id_fkey ( id, display_name, avatar_url, location, public_location, city, is_public )";

function parseReasons(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string");
  return [];
}

function mapRow(row: Record<string, unknown>): MatchSuggestionRow {
  return {
    id: String(row.id),
    batch_id: String(row.batch_id),
    pet_parent_id: String(row.pet_parent_id),
    pet_friend_id: String(row.pet_friend_id),
    pet_id: String(row.pet_id),
    score: Number(row.score ?? 0),
    reasons: parseReasons(row.reasons),
    status: row.status as MatchSuggestionStatus,
    created_at: String(row.created_at),
    expires_at: String(row.expires_at),
    viewed_at: (row.viewed_at as string | null) ?? null,
    emailed_at: (row.emailed_at as string | null) ?? null,
    clicked_at: (row.clicked_at as string | null) ?? null,
    pet: (row.pet as MatchSuggestionRow["pet"]) ?? null,
    parent: (row.parent as MatchSuggestionRow["parent"]) ?? null,
    friend: (row.friend as MatchSuggestionRow["friend"]) ?? null,
  };
}

export function isMatchSuggestionVisibleToUser(
  row: MatchSuggestionRow,
  userId: string,
): boolean {
  return row.pet_parent_id === userId || row.pet_friend_id === userId;
}

export function filterVisibleMatchSuggestions(
  rows: MatchSuggestionRow[],
): MatchSuggestionRow[] {
  return rows.filter((row) => {
    if (row.status === "dismissed" || row.status === "expired") return false;
    return isStoredMatchStillVisible({
      friendIsPublic: row.friend?.is_public,
      ownerIsPublic: row.parent?.is_public,
      petIsPublic: row.pet?.is_public,
      petIsActive: row.pet?.is_active,
    });
  });
}

export async function fetchOwnMatchSuggestions(
  supabase: SupabaseClient,
  userId: string,
): Promise<MatchSuggestionRow[]> {
  const { data, error } = await supabase
    .from("match_suggestions")
    .select(SELECT)
    .or(`pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`)
    .in("status", ["active", "viewed"])
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  const mapped = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  return filterVisibleMatchSuggestions(
    mapped.filter((row) => isMatchSuggestionVisibleToUser(row, userId)),
  );
}

export async function countUnviewedMatchSuggestions(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const rows = await fetchOwnMatchSuggestions(supabase, userId);
  return rows.filter((row) => !row.viewed_at).length;
}

export async function markMatchSuggestionsViewed(
  supabase: SupabaseClient,
  userId: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase
    .from("match_suggestions")
    .update({ status: "viewed", viewed_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "active")
    .or(`pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`);
  if (error) throw error;
}

export async function dismissMatchSuggestion(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("match_suggestions")
    .update({ status: "dismissed" })
    .eq("id", id)
    .or(`pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`);
  if (error) throw error;
}

export async function markMatchSuggestionClicked(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("match_suggestions")
    .update({ clicked_at: new Date().toISOString() })
    .eq("id", id)
    .or(`pet_parent_id.eq.${userId},pet_friend_id.eq.${userId}`)
    .is("clicked_at", null);
  if (error) throw error;
}

export function matchSuggestionPhoto(row: MatchSuggestionRow, viewerId: string): string | null {
  if (row.pet_parent_id === viewerId) {
    return row.friend?.avatar_url?.trim() || null;
  }
  const photos = row.pet?.pet_photos ?? [];
  const primary = photos.find((p) => p.is_primary && p.public_url?.trim()) ?? photos.find((p) => p.public_url?.trim());
  return primary?.public_url?.trim() || null;
}
