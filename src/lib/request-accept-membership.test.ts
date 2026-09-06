import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEMBERSHIP_REQUIRED_MESSAGE } from "@/lib/membership-access";

const membershipState = vi.hoisted(() => ({
  active: true,
}));

vi.mock("@/lib/messaging", () => ({
  ensureConversationForRequest: vi.fn(async () => "conversation-1"),
  seedRequestMessageIfAbsent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/membership-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/membership-access")>(
    "@/lib/membership-access",
  );
  return {
    ...actual,
    assertActiveMembershipForRole: vi.fn(async () => {
      if (!membershipState.active) {
        throw new Error(MEMBERSHIP_REQUIRED_MESSAGE);
      }
    }),
  };
});

vi.mock("@/lib/one-time-membership-assert", () => ({
  assertOneTimeCanStartArrangementForBookingParticipants: vi.fn(async () => undefined),
}));

vi.mock("@/app/actions/one-time-membership", () => ({
  linkOneTimeMembershipsForRequestAction: vi.fn(async () => undefined),
}));

import { respondToRequest } from "@/lib/requests";

type MockState = {
  status: string;
  rpcCalled: boolean;
  updateCalled: boolean;
};

function createSupabaseMock() {
  const state: MockState = {
    status: "pending",
    rpcCalled: false,
    updateCalled: false,
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === "user_activity_events") {
        return { insert: vi.fn(async () => ({ error: null })) };
      }
      if (table !== "requests") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  status: state.status,
                  date_from: "2026-12-01",
                  date_to: "2026-12-03",
                  requested_dates: ["2026-12-01", "2026-12-02", "2026-12-03"],
                  pet_parent_id: "parent-1",
                  pet_friend_id: "friend-1",
                },
                error: null,
              })),
            })),
          })),
        })),
        update: vi.fn((payload: { status?: string }) => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => {
                state.updateCalled = true;
                if (payload.status) {
                  state.status = payload.status;
                }
                return { error: null };
              }),
            })),
          })),
        })),
      };
    }),
    rpc: vi.fn(async (fn: string) => {
      if (fn !== "accept_care_request") {
        throw new Error(`Unexpected rpc ${fn}`);
      }
      state.rpcCalled = true;
      state.status = "accepted";
      return { data: "conversation-1", error: null };
    }),
  };

  return { client, state };
}

describe("respondToRequest membership ordering", () => {
  beforeEach(() => {
    membershipState.active = true;
    vi.clearAllMocks();
  });

  it("checks membership before calling accept_care_request RPC", async () => {
    const { client, state } = createSupabaseMock();
    const { assertActiveMembershipForRole } = await import("@/lib/membership-access");

    await respondToRequest(client as never, "friend-1", "req-1", "accepted");

    expect(assertActiveMembershipForRole).toHaveBeenCalled();
    expect(state.rpcCalled).toBe(true);
    expect(state.status).toBe("accepted");
  });

  it("rejects accept without membership and does not call RPC", async () => {
    membershipState.active = false;
    const { client, state } = createSupabaseMock();

    await expect(
      respondToRequest(client as never, "friend-1", "req-1", "accepted"),
    ).rejects.toThrow(MEMBERSHIP_REQUIRED_MESSAGE);

    expect(state.rpcCalled).toBe(false);
    expect(state.status).toBe("pending");
  });

  it("allows decline without membership", async () => {
    membershipState.active = false;
    const { client, state } = createSupabaseMock();

    const result = await respondToRequest(client as never, "friend-1", "req-1", "declined");

    expect(result.conversationId).toBeNull();
    expect(state.updateCalled).toBe(true);
    expect(state.status).toBe("declined");
    expect(state.rpcCalled).toBe(false);
  });
});

describe("database enforcement migration", () => {
  it("accepts only via RPC and enforces sender/receiver membership in RLS", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260721120000_marketplace_membership_actions.sql"),
      "utf8",
    );
    expect(sql).toMatch(/create or replace function public\.accept_care_request/);
    expect(sql).toMatch(/has_active_membership_for_role\(v_uid, v_role\)/);
    expect(sql).toMatch(/and status = 'declined'/);
    expect(sql).not.toMatch(/and status in \('accepted', 'declined'\)/);
    expect(sql).toMatch(/has_active_pet_parent_membership\(\(select auth\.uid\(\)\)\)/);
    expect(sql).toMatch(/sender_has_active_membership_for_conversation/);
  });

  it("respondToRequest uses accept_care_request RPC after membership assert", () => {
    const file = readFileSync(join(process.cwd(), "src/lib/requests.ts"), "utf8");
    expect(file).toMatch(/rpc\("accept_care_request"/);
    expect(file).toMatch(/await assertActiveMembershipForRole/);
    const assertIndex = file.indexOf("await assertActiveMembershipForRole");
    const rpcIndex = file.indexOf('rpc("accept_care_request"');
    expect(assertIndex).toBeGreaterThan(-1);
    expect(rpcIndex).toBeGreaterThan(assertIndex);
  });
});
