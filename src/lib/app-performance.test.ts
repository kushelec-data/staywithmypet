import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyMembershipsByRole } from "@/lib/membership";
import { PROFILE_SELECT, fetchUserProfile } from "@/lib/profile-load";

const resolveUserMembershipsMock = vi.fn(async () => emptyMembershipsByRole());

vi.mock("@/lib/membership-load", async () => {
  const actual = await vi.importActual<typeof import("@/lib/membership-load")>(
    "@/lib/membership-load",
  );
  return {
    ...actual,
    resolveUserMemberships: (...args: unknown[]) => resolveUserMembershipsMock(...args),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("app performance fixes", () => {
  it("profile-load runs trust enrichment and membership loading in parallel", async () => {
    resolveUserMembershipsMock.mockClear();

    const trustProbe = deferred<{ data: unknown[]; error: null }>();
    const trustSelect = deferred<{ data: Record<string, unknown>; error: null }>();
    const membershipLoad = deferred<ReturnType<typeof emptyMembershipsByRole>>();

    resolveUserMembershipsMock.mockImplementationOnce(async () => {
      await membershipLoad.promise;
      return emptyMembershipsByRole();
    });

    const profileRow = {
      id: "user-1",
      display_name: "Member",
      avatar_url: null,
      bio: null,
      location: null,
      role: "pet_parent",
      phone: null,
      is_public: true,
      rating_avg: 0,
      rating_count: 0,
      membership_status: null,
      details: null,
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const client = {
      from: vi.fn((table: string) => {
        if (table !== "profiles") {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          select: vi.fn((columns: string) => {
            if (columns === "phone_e164") {
              return {
                limit: vi.fn(() => trustProbe.promise),
              };
            }
            if (columns === PROFILE_SELECT) {
              return {
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: profileRow, error: null })),
                })),
              };
            }
            return {
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => trustSelect.promise),
              })),
            };
          }),
        };
      }),
    } as unknown as SupabaseClient;

    const loadPromise = fetchUserProfile(client, "user-1");

    await new Promise((r) => setTimeout(r, 0));
    expect(resolveUserMembershipsMock).toHaveBeenCalledTimes(1);

    trustProbe.resolve({ data: [], error: null });
    membershipLoad.resolve(emptyMembershipsByRole());
    trustSelect.resolve({
      data: { phone_e164: "+10000000000", trust_score: 10 },
      error: null,
    });

    const profile = await loadPromise;
    expect(profile?.phone).toBe("+10000000000");
    expect(profile?.memberships).toEqual(emptyMembershipsByRole());
  });

  it("documents sequential vs parallel profile enrichment timing", () => {
    const trustMs = 80;
    const membershipMs = 60;
    const sequentialMs = trustMs + membershipMs;
    const parallelMs = Math.max(trustMs, membershipMs);

    expect(parallelMs).toBeLessThan(sequentialMs);
    expect(sequentialMs - parallelMs).toBe(60);
  });
});

describe("fetchUnreadNotificationCount", () => {
  it("relies on client-side dedupe keys that SQL count cannot reproduce", async () => {
    const { dedupeNotifications, notificationDedupeKey } = await import("@/lib/notifications");

    const duplicateUnread = [
      {
        id: "n-1",
        userId: "user-1",
        type: "new_message" as const,
        title: "Older",
        body: "Hi",
        relatedRequestId: null,
        relatedConversationId: "conv-1",
        relatedBookingId: null,
        readAt: null,
        createdAt: "2026-07-25T10:00:00.000Z",
      },
      {
        id: "n-2",
        userId: "user-1",
        type: "new_message" as const,
        title: "Newer",
        body: "Hi again",
        relatedRequestId: null,
        relatedConversationId: "conv-1",
        relatedBookingId: null,
        readAt: null,
        createdAt: "2026-07-25T11:00:00.000Z",
      },
    ];

    expect(notificationDedupeKey(duplicateUnread[0])).toBe(
      notificationDedupeKey(duplicateUnread[1]),
    );
    expect(dedupeNotifications(duplicateUnread)).toHaveLength(1);

    const rawSqlCount = duplicateUnread.length;
    const dedupedCount = dedupeNotifications(duplicateUnread).length;
    expect(rawSqlCount).toBe(2);
    expect(dedupedCount).toBe(1);
  });
});
