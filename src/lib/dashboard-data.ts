import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_MEMBERSHIP_LABEL,
  membershipStatusForMode,
  type UserMembershipsByRole,
} from "@/lib/membership";
import { fetchUserMemberships } from "@/lib/membership-load";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import { formatPetAvailabilitySummary, normalizeAvailabilityDates } from "@/lib/pet-availability";
import type { PetSpecies } from "@/lib/pet-data";
import { fetchOwnerPetIntros, type PetIntroDisplay } from "@/lib/pet-intro";
import { pickPrimaryPhotoUrl } from "@/lib/pet-photos";
import {
  countActiveCareRequests,
  countIncomingPendingReply,
  countIncomingRequests,
} from "@/lib/requests";
import { fetchFirstBookingNeedingReview } from "@/lib/booking-review-prompt";
import { countCompletedBookingsForUser } from "@/lib/bookings-stats";
import type { Booking } from "@/lib/bookings";

export type DashboardPetPreview = {
  id: string;
  name: string;
  species: PetSpecies;
  primaryPhotoUrl: string | null;
  location: string | null;
  availabilityDates: string[];
  availabilityNotes: string | null;
  availabilitySummary: string | null;
};

export type DashboardSnapshot = {
  petsOwned: number;
  petPhotosCount: number;
  favoritesCount: number;
  careRequestsActive: number;
  careRequestsIncoming: number;
  careRequestsAwaitingReply: number;
  reviewsCount: number;
  reviewsAvg: number;
  completedBookingsCount: number;
  membership: string;
  latestPets: DashboardPetPreview[];
  petIntros: PetIntroDisplay[];
  /** Completed booking awaiting the current user's review, if any. */
  pendingReviewBooking: Booking | null;
};

export type DashboardStats = DashboardSnapshot;

const DEFAULT_MEMBERSHIP = DEMO_MEMBERSHIP_LABEL;

type PetPhotoJoin = {
  public_url: string | null;
  is_primary: boolean;
  sort_order: number;
};

function formatDashboardErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) {
      const e = err as Record<string, unknown>;
      const details = typeof e.details === "string" && e.details.trim() ? e.details.trim() : "";
      const hint = typeof e.hint === "string" && e.hint.trim() ? e.hint.trim() : "";
      const code = typeof e.code === "string" && e.code.trim() ? e.code.trim() : "";
      return [m, details, hint, code ? `Code: ${code}` : ""].filter(Boolean).join(" — ");
    }
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function logQueryFailure(label: string, err: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[dashboard] ${label} failed:`, formatDashboardErr(err));
  }
}

async function safeQuery<T>(
  label: string,
  fallback: T,
  fn: () => Promise<T>,
  loggedThisFetch: Set<string>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!loggedThisFetch.has(label)) {
      loggedThisFetch.add(label);
      logQueryFailure(label, err);
    }
    return fallback;
  }
}

async function countPetsOwned(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("pets")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (error) throw error;
  return count ?? 0;
}

async function countFavorites(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("favorites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

async function countPetPhotosForOwner(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<number> {
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id")
    .eq("owner_id", ownerId);

  if (petsError) throw petsError;
  if (!pets?.length) return 0;

  const petIds = pets.map((p) => p.id);
  const { count, error } = await supabase
    .from("pet_photos")
    .select("id", { count: "exact", head: true })
    .in("pet_id", petIds);

  if (error) throw error;
  return count ?? 0;
}

async function fetchReviewsSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ count: number; avg: number }> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", userId);

  if (error) throw error;
  if (!data?.length) return { count: 0, avg: 0 };

  const ratings = data.map((r) => Number(r.rating)).filter((n) => !Number.isNaN(n));
  if (!ratings.length) return { count: 0, avg: 0 };

  const sum = ratings.reduce((acc, n) => acc + n, 0);
  return { count: ratings.length, avg: sum / ratings.length };
}

async function fetchMembershipLabel(
  supabase: SupabaseClient,
  userId: string,
  activeMode: ProfileActiveMode,
): Promise<string> {
  try {
    const memberships = await fetchUserMemberships(supabase, userId);
    if (memberships.pet_parent || memberships.pet_friend) {
      return membershipStatusForMode(memberships, activeMode);
    }
  } catch {
    // fall through to legacy profile column
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("membership_status, details")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    const fallback = await supabase.from("profiles").select("details").eq("id", userId).maybeSingle();
    if (fallback.error) throw fallback.error;
    const details = fallback.data?.details;
    if (details && typeof details === "object" && !Array.isArray(details)) {
      const membership = (details as Record<string, unknown>).membership;
      if (typeof membership === "string" && membership.trim()) return membership.trim();
    }
    return DEFAULT_MEMBERSHIP;
  }

  const fromColumn = data?.membership_status;
  if (typeof fromColumn === "string" && fromColumn.trim()) {
    return fromColumn.trim();
  }

  const details = data?.details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const membership = (details as Record<string, unknown>).membership;
    if (typeof membership === "string" && membership.trim()) {
      return membership.trim();
    }
  }

  return DEFAULT_MEMBERSHIP;
}

export function membershipLabelFromProfile(
  memberships: UserMembershipsByRole | undefined,
  activeMode: ProfileActiveMode,
  legacyFallback?: string,
): string {
  if (memberships && (memberships.pet_parent || memberships.pet_friend)) {
    return membershipStatusForMode(memberships, activeMode);
  }
  const trimmed = legacyFallback?.trim();
  return trimmed && trimmed.toLowerCase() !== "demo" ? trimmed : DEFAULT_MEMBERSHIP;
}

/** Loads latest pets directly from Supabase (avoids client bundle issues with pet-data helpers). */
async function fetchLatestOwnedPetPreviews(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardPetPreview[]> {
  const extendedSelect =
    "id, name, species, location, availability, availability_dates, is_active, pet_photos ( public_url, is_primary, sort_order )";
  const baseSelect =
    "id, name, species, location, is_active, pet_photos ( public_url, is_primary, sort_order )";

  const extended = await supabase
    .from("pets")
    .select(extendedSelect)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const result =
    extended.error && /column/i.test(extended.error.message)
      ? await supabase
          .from("pets")
          .select(baseSelect)
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
      : extended;

  if (result.error) {
    throw result.error;
  }

  const rows = result.data ?? [];
  return rows.slice(0, 4).map((row) => {
    const r = row as {
      id: string;
      name: string;
      species: string;
      location: string | null;
      availability?: string | null;
      availability_dates?: unknown;
      pet_photos?: PetPhotoJoin[] | null;
    };
    const dates = normalizeAvailabilityDates(
      "availability_dates" in r ? r.availability_dates : undefined,
    );
    const avail = "availability" in r ? r.availability ?? null : null;
    const photos = "pet_photos" in r ? r.pet_photos ?? [] : [];
    const speciesRaw = r.species;
    const species: PetSpecies =
      speciesRaw === "dog" ||
      speciesRaw === "cat" ||
      speciesRaw === "rabbit" ||
      speciesRaw === "bird" ||
      speciesRaw === "other"
        ? speciesRaw
        : "other";
    return {
      id: r.id,
      name: r.name,
      species,
      primaryPhotoUrl: pickPrimaryPhotoUrl(photos),
      location: r.location,
      availabilityDates: dates,
      availabilityNotes: avail,
      availabilitySummary: formatPetAvailabilitySummary(dates, avail),
    };
  });
}

export async function fetchDashboardSnapshot(
  supabase: SupabaseClient,
  userId: string,
  profileRatings?: { rating_avg?: number; rating_count?: number },
  activeMode: ProfileActiveMode = "pet_parent",
): Promise<DashboardSnapshot> {
  const loggedThisFetch = new Set<string>();
  const q = <T,>(label: string, fallback: T, fn: () => Promise<T>) =>
    safeQuery(label, fallback, fn, loggedThisFetch);

  const [
    petsOwned,
    petPhotosCount,
    favoritesCount,
    careRequestsActive,
    careRequestsIncoming,
    careRequestsAwaitingReply,
    reviewsFromTable,
    completedBookingsFromTable,
    membership,
    latestPets,
    petIntros,
    pendingReviewBooking,
  ] = await Promise.all([
    q("pets count", 0, () => countPetsOwned(supabase, userId)),
    q("pet_photos count", 0, () => countPetPhotosForOwner(supabase, userId)),
    q("favorites count", 0, () => countFavorites(supabase, userId)),
    q("active care requests", 0, () => countActiveCareRequests(supabase, userId)),
    q("incoming care requests", 0, () => countIncomingRequests(supabase, userId)),
    q("awaiting reply", 0, () => countIncomingPendingReply(supabase, userId)),
    q("reviews summary", { count: 0, avg: 0 }, () => fetchReviewsSummary(supabase, userId)),
    q("completed bookings", 0, () => countCompletedBookingsForUser(supabase, userId)),
    q("membership", DEFAULT_MEMBERSHIP, () => fetchMembershipLabel(supabase, userId, activeMode)),
    q("latest pets", [] as DashboardPetPreview[], () => fetchLatestOwnedPetPreviews(supabase, userId)),
    q("pet intros", [] as PetIntroDisplay[], () => fetchOwnerPetIntros(supabase, userId)),
    q("pending review booking", null as Booking | null, () =>
      fetchFirstBookingNeedingReview(supabase, userId),
    ),
  ]);

  const reviewsCount = reviewsFromTable.count || profileRatings?.rating_count || 0;
  const reviewsAvg =
    reviewsFromTable.count > 0
      ? reviewsFromTable.avg
      : Number(profileRatings?.rating_avg ?? 0);

  return {
    petsOwned,
    petPhotosCount,
    favoritesCount,
    careRequestsActive,
    careRequestsIncoming,
    careRequestsAwaitingReply,
    reviewsCount,
    reviewsAvg,
    completedBookingsCount: completedBookingsFromTable,
    membership,
    latestPets,
    petIntros,
    pendingReviewBooking,
  };
}

/** @deprecated use fetchDashboardSnapshot */
export async function fetchDashboardStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardStats> {
  return fetchDashboardSnapshot(supabase, userId);
}

export { fetchUserProfile } from "@/lib/profile-load";
