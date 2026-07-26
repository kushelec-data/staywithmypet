import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_MEMBERSHIP_LABEL,
  membershipStatusForMode,
  type UserMembershipsByRole,
} from "@/lib/membership";
import { appDevLogPerf } from "@/lib/app-dev-perf";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import { fetchOwnerPetIntros, type PetIntroDisplay } from "@/lib/pet-intro";
import {
  countActiveCareRequests,
  countIncomingPendingReply,
  countIncomingRequests,
} from "@/lib/requests";
import { fetchFirstBookingNeedingReview } from "@/lib/booking-review-prompt";
import { countCompletedBookingsForUser } from "@/lib/bookings-stats";
import type { Booking } from "@/lib/bookings";

export type DashboardSnapshot = {
  petsOwned: number;
  favoritesCount: number;
  careRequestsActive: number;
  careRequestsIncoming: number;
  careRequestsAwaitingReply: number;
  completedBookingsCount: number;
  petIntros: PetIntroDisplay[];
  /** Completed booking awaiting the current user's review, if any. */
  pendingReviewBooking: Booking | null;
};

export type DashboardStats = DashboardSnapshot;

/** Planned Supabase-backed dashboard queries (for perf measurement/tests). */
export function dashboardSnapshotPlannedQueries(activeMode: ProfileActiveMode): string[] {
  const shared = ["awaiting reply", "completed bookings", "pending review booking"];
  if (activeMode === "pet_parent") {
    return [...shared, "pets count", "active care requests", "pet intros"];
  }
  if (activeMode === "pet_friend") {
    return [...shared, "favorites count", "incoming care requests"];
  }
  return shared;
}

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

export function membershipLabelFromProfile(
  memberships: UserMembershipsByRole | undefined,
  activeMode: ProfileActiveMode,
  legacyFallback?: string,
): string {
  if (memberships && (memberships.pet_parent || memberships.pet_friend)) {
    return membershipStatusForMode(memberships, activeMode);
  }
  const trimmed = legacyFallback?.trim();
  return trimmed && trimmed.toLowerCase() !== "demo" ? trimmed : DEMO_MEMBERSHIP_LABEL;
}

export async function fetchDashboardSnapshot(
  supabase: SupabaseClient,
  userId: string,
  activeMode: ProfileActiveMode = "pet_parent",
): Promise<DashboardSnapshot> {
  const loggedThisFetch = new Set<string>();
  const q = <T,>(label: string, fallback: T, fn: () => Promise<T>) =>
    safeQuery(label, fallback, fn, loggedThisFetch);

  const plannedQueries = dashboardSnapshotPlannedQueries(activeMode);
  const startedAt = typeof performance !== "undefined" ? performance.now() : 0;

  const careRequestsAwaitingReply = q("awaiting reply", 0, () =>
    countIncomingPendingReply(supabase, userId),
  );
  const completedBookingsCount = q("completed bookings", 0, () =>
    countCompletedBookingsForUser(supabase, userId),
  );
  const pendingReviewBooking = q("pending review booking", null as Booking | null, () =>
    fetchFirstBookingNeedingReview(supabase, userId),
  );

  if (activeMode === "pet_parent") {
    const [
      awaitingReply,
      completedBookings,
      pendingReview,
      careRequestsActive,
      petsOwned,
      petIntros,
    ] = await Promise.all([
      careRequestsAwaitingReply,
      completedBookingsCount,
      pendingReviewBooking,
      q("active care requests", 0, () => countActiveCareRequests(supabase, userId)),
      q("pets count", 0, () => countPetsOwned(supabase, userId)),
      q("pet intros", [] as PetIntroDisplay[], () => fetchOwnerPetIntros(supabase, userId)),
    ]);

    appDevLogPerf(
      "dashboard.fetchSnapshot",
      typeof performance !== "undefined" ? performance.now() - startedAt : 0,
      plannedQueries.length,
      { activeMode, plannedQueries: plannedQueries.join(", ") },
    );

    return {
      petsOwned,
      favoritesCount: 0,
      careRequestsActive,
      careRequestsIncoming: 0,
      careRequestsAwaitingReply: awaitingReply,
      completedBookingsCount: completedBookings,
      petIntros,
      pendingReviewBooking: pendingReview,
    };
  }

  if (activeMode === "pet_friend") {
    const [awaitingReply, completedBookings, pendingReview, favoritesCount, careRequestsIncoming] =
      await Promise.all([
        careRequestsAwaitingReply,
        completedBookingsCount,
        pendingReviewBooking,
        q("favorites count", 0, () => countFavorites(supabase, userId)),
        q("incoming care requests", 0, () => countIncomingRequests(supabase, userId)),
      ]);

    appDevLogPerf(
      "dashboard.fetchSnapshot",
      typeof performance !== "undefined" ? performance.now() - startedAt : 0,
      plannedQueries.length,
      { activeMode, plannedQueries: plannedQueries.join(", ") },
    );

    return {
      petsOwned: 0,
      favoritesCount,
      careRequestsActive: 0,
      careRequestsIncoming,
      careRequestsAwaitingReply: awaitingReply,
      completedBookingsCount: completedBookings,
      petIntros: [],
      pendingReviewBooking: pendingReview,
    };
  }

  const [awaitingReply, completedBookings, pendingReview] = await Promise.all([
    careRequestsAwaitingReply,
    completedBookingsCount,
    pendingReviewBooking,
  ]);

  appDevLogPerf(
    "dashboard.fetchSnapshot",
    typeof performance !== "undefined" ? performance.now() - startedAt : 0,
    plannedQueries.length,
    { activeMode, plannedQueries: plannedQueries.join(", ") },
  );

  return {
    petsOwned: 0,
    favoritesCount: 0,
    careRequestsActive: 0,
    careRequestsIncoming: 0,
    careRequestsAwaitingReply: awaitingReply,
    completedBookingsCount: completedBookings,
    petIntros: [],
    pendingReviewBooking: pendingReview,
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
