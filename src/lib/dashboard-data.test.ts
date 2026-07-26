import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dashboardSnapshotPlannedQueries,
  fetchDashboardSnapshot,
} from "@/lib/dashboard-data";
import type { PetIntroDisplay } from "@/lib/pet-intro";
import type { Booking } from "@/lib/bookings";

vi.mock("@/lib/pet-intro", () => ({
  fetchOwnerPetIntros: vi.fn(async () => [{ id: "pet-1" }, { id: "pet-2" }] as PetIntroDisplay[]),
}));

vi.mock("@/lib/requests", () => ({
  countActiveCareRequests: vi.fn(async () => 3),
  countIncomingRequests: vi.fn(async () => 5),
  countIncomingPendingReply: vi.fn(async () => 2),
}));

vi.mock("@/lib/bookings-stats", () => ({
  countCompletedBookingsForUser: vi.fn(async () => 4),
}));

vi.mock("@/lib/booking-review-prompt", () => ({
  fetchFirstBookingNeedingReview: vi.fn(async () => null as Booking | null),
}));

describe("dashboard snapshot loading", () => {
  const supabase = {} as SupabaseClient;

  it("plans fewer queries after optimization", () => {
    const beforeParent = 12;
    const afterParent = dashboardSnapshotPlannedQueries("pet_parent").length;
    const beforeFriend = 12;
    const afterFriend = dashboardSnapshotPlannedQueries("pet_friend").length;

    expect(afterParent).toBe(6);
    expect(afterFriend).toBe(5);
    expect(afterParent).toBeLessThan(beforeParent);
    expect(afterFriend).toBeLessThan(beforeFriend);
  });

  it("loads pet_parent stats from head count and pet intros in parallel", async () => {
    const { countActiveCareRequests, countIncomingRequests } = await import("@/lib/requests");
    const { fetchOwnerPetIntros } = await import("@/lib/pet-intro");

    const parentSupabase = {
      from: vi.fn((table: string) => {
        if (table !== "pets") {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          select: vi.fn((_columns: string, opts?: { count?: string; head?: boolean }) => {
            expect(opts).toEqual({ count: "exact", head: true });
            return {
              eq: vi.fn(async () => ({ count: 3, error: null })),
            };
          }),
        };
      }),
    } as unknown as SupabaseClient;

    const snapshot = await fetchDashboardSnapshot(parentSupabase, "user-1", "pet_parent");

    expect(fetchOwnerPetIntros).toHaveBeenCalled();
    expect(countActiveCareRequests).toHaveBeenCalled();
    expect(countIncomingRequests).not.toHaveBeenCalled();
    expect(snapshot.petsOwned).toBe(3);
    expect(snapshot.petIntros).toHaveLength(2);
    expect(snapshot.careRequestsActive).toBe(3);
    expect(snapshot.careRequestsIncoming).toBe(0);
    expect(snapshot.favoritesCount).toBe(0);
  });

  it("loads pet_friend stats without pet intros", async () => {
    const { countActiveCareRequests, countIncomingRequests } = await import("@/lib/requests");
    const { fetchOwnerPetIntros } = await import("@/lib/pet-intro");

    vi.mocked(fetchOwnerPetIntros).mockClear();
    vi.mocked(countActiveCareRequests).mockClear();
    vi.mocked(countIncomingRequests).mockClear();

    const friendSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ count: 7, error: null })),
        })),
      })),
    } as unknown as SupabaseClient;

    const snapshot = await fetchDashboardSnapshot(friendSupabase, "user-1", "pet_friend");

    expect(fetchOwnerPetIntros).not.toHaveBeenCalled();
    expect(countIncomingRequests).toHaveBeenCalled();
    expect(countActiveCareRequests).not.toHaveBeenCalled();
    expect(snapshot.petIntros).toEqual([]);
    expect(snapshot.petsOwned).toBe(0);
    expect(snapshot.careRequestsIncoming).toBe(5);
    expect(snapshot.favoritesCount).toBe(7);
  });
});
