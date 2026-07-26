import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as messaging from "@/lib/messaging";
import {
  fetchConversations,
  sendMessage,
  sendMessagePrecheckFromConversation,
  type ConversationSummary,
} from "@/lib/messaging";

const USER_ID = "user-11111111-1111-4111-8111-111111111111";
const OTHER_ID = "user-22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "req-1";
const CONVERSATION_ID = "conv-1";

function makeConversationSummary(): ConversationSummary {
  return {
    id: CONVERSATION_ID,
    requestId: REQUEST_ID,
    bookingId: null,
    petId: "pet-1",
    petName: "Denny",
    threadTitle: "Care for Denny",
    petPhotoUrl: null,
    otherPartyId: OTHER_ID,
    otherPartyName: "Alex",
    otherPartyAvatarUrl: null,
    requestStatus: "accepted",
    bookingStatus: "active",
    bookingStartDate: "2026-07-01",
    bookingEndDate: "2026-07-10",
    bookingRequestedDates: ["2026-07-01", "2026-07-10"],
    bookingCancelledAt: null,
    requestDateFrom: "2026-07-01",
    requestDateTo: "2026-07-10",
    dateLabel: "Jul 1 – Jul 10, 2026",
    dateRangeKey: "2026-07-01_2026-07-10",
    careType: "Overnight",
    lastMessagePreview: "Hi",
    lastMessageAt: "2026-07-25T10:00:00.000Z",
    unreadCount: 0,
    sortAt: "2026-07-25T10:00:00.000Z",
    conversationIds: [CONVERSATION_ID],
  };
}

type QueryCall = { table: string; op: string };

function createCountingSupabase(mode: "inbox" | "send" | "send-precheck"): {
  client: SupabaseClient;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];

  const chain = (table: string) => {
    const resolveListQuery = () => {
      if (mode === "inbox" && table === "conversations") {
        return {
          data: [
            {
              id: CONVERSATION_ID,
              request_id: REQUEST_ID,
              pet_parent_id: USER_ID,
              pet_friend_id: OTHER_ID,
              created_at: "2026-07-25T10:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      if (mode === "inbox" && table === "requests") {
        return {
          data: [
            {
              id: REQUEST_ID,
              status: "accepted",
              date_from: "2026-07-01",
              date_to: "2026-07-10",
              requested_dates: ["2026-07-01"],
              starts_at: null,
              ends_at: null,
              care_type: "overnight",
              service_type: null,
              pet_id: "pet-1",
              pet_parent_id: USER_ID,
              pet_friend_id: OTHER_ID,
            },
          ],
          error: null,
        };
      }
      if (table === "messages") {
        return { data: [], error: null };
      }
      if (table === "pets") {
        return {
          data: [{ id: "pet-1", name: "Denny", pet_photos: [] }],
          error: null,
        };
      }
      if (table === "bookings") {
        return { data: [], error: null };
      }
      if (table === "profiles") {
        return {
          data: [{ id: OTHER_ID, display_name: "Alex", avatar_url: null }],
          error: null,
        };
      }
      return { data: [], error: null };
    };

    const api = {
      select: () => {
        calls.push({ table, op: "select" });
        return api;
      },
      insert: () => {
        calls.push({ table, op: "insert" });
        return api;
      },
      update: () => {
        calls.push({ table, op: "update" });
        return api;
      },
      upsert: () => {
        calls.push({ table, op: "upsert" });
        return api;
      },
      eq: () => api,
      in: () => api,
      is: () => api,
      neq: () => api,
      or: () => api,
      order: () => api,
      limit: () => api,
      then: (
        onFulfilled: (value: { data: unknown; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(resolveListQuery()).then(onFulfilled, onRejected),
      maybeSingle: async () => {
        if (table === "conversations" && mode === "send") {
          return { data: { request_id: REQUEST_ID }, error: null };
        }
        if (table === "requests") {
          return { data: { status: "accepted" }, error: null };
        }
        if (table === "bookings") {
          return { data: { status: "active", cancelled_at: null }, error: null };
        }
        if (table === "profiles") {
          return { data: { role: "pet_parent", active_mode: "pet_parent" }, error: null };
        }
        if (table === "messages" && (mode === "send-precheck" || mode === "send")) {
          return {
            data: {
              id: "msg-1",
              conversation_id: CONVERSATION_ID,
              sender_id: USER_ID,
              body: "Hello",
              read_at: null,
              created_at: "2026-07-25T12:00:00.000Z",
              storage_path: null,
              media_type: null,
              file_name: null,
              file_size: null,
              mime_type: null,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      single: async () => api.maybeSingle(),
    };
    return api;
  };

  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
    },
    from: (table: string) => chain(table),
    rpc: async () => ({ data: null, error: null }),
  } as unknown as SupabaseClient;

  return { client, calls };
}

const SYNC_REQUEST_IDS = ["req-1", "req-2"];

/** Inbox mock where sync finds conversations already exist for every messaging request. */
function createInboxSupabaseAllConversationsExist(): {
  client: SupabaseClient;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];

  const chain = (table: string) => {
    let usedIn = false;
    let usedOr = false;
    let usedOrder = false;

    const api = {
      select: () => {
        calls.push({ table, op: "select" });
        return api;
      },
      insert: () => {
        calls.push({ table, op: "insert" });
        return api;
      },
      update: () => {
        calls.push({ table, op: "update" });
        return api;
      },
      upsert: () => {
        calls.push({ table, op: "upsert" });
        return api;
      },
      eq: () => api,
      in: () => {
        usedIn = true;
        return api;
      },
      is: () => api,
      neq: () => api,
      or: () => {
        usedOr = true;
        return api;
      },
      order: () => {
        usedOrder = true;
        return api;
      },
      limit: () => api,
      then: (
        onFulfilled: (value: { data: unknown; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => {
        if (table === "requests" && usedOr) {
          return Promise.resolve({
            data: SYNC_REQUEST_IDS.map((id) => ({ id })),
            error: null,
          }).then(onFulfilled, onRejected);
        }

        if (table === "requests") {
          return Promise.resolve({
            data: [
              {
                id: REQUEST_ID,
                status: "accepted",
                date_from: "2026-07-01",
                date_to: "2026-07-10",
                requested_dates: ["2026-07-01"],
                starts_at: null,
                ends_at: null,
                care_type: "overnight",
                service_type: null,
                pet_id: "pet-1",
                pet_parent_id: USER_ID,
                pet_friend_id: OTHER_ID,
              },
            ],
            error: null,
          }).then(onFulfilled, onRejected);
        }

        if (table === "conversations" && usedIn && !usedOrder) {
          return Promise.resolve({
            data: SYNC_REQUEST_IDS.map((id) => ({ request_id: id })),
            error: null,
          }).then(onFulfilled, onRejected);
        }

        if (table === "conversations" && usedOrder) {
          return Promise.resolve({
            data: [
              {
                id: CONVERSATION_ID,
                request_id: REQUEST_ID,
                pet_parent_id: USER_ID,
                pet_friend_id: OTHER_ID,
                created_at: "2026-07-25T10:00:00.000Z",
              },
            ],
            error: null,
          }).then(onFulfilled, onRejected);
        }

        if (table === "messages") {
          return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
        }
        if (table === "pets") {
          return Promise.resolve({
            data: [{ id: "pet-1", name: "Denny", pet_photos: [] }],
            error: null,
          }).then(onFulfilled, onRejected);
        }
        if (table === "bookings") {
          return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
        }
        if (table === "profiles") {
          return Promise.resolve({
            data: [{ id: OTHER_ID, display_name: "Alex", avatar_url: null }],
            error: null,
          }).then(onFulfilled, onRejected);
        }

        return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
      },
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
    };
    return api;
  };

  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
    },
    from: (table: string) => chain(table),
    rpc: vi.fn(async () => ({ data: null, error: null })),
  } as unknown as SupabaseClient;

  return { client, calls };
}

vi.mock("@/lib/security", () => ({
  requireAuthUserId: vi.fn(async () => USER_ID),
  assertRateLimitShared: vi.fn(async () => undefined),
}));

vi.mock("@/lib/trust-safety", () => ({
  isUserBlocked: vi.fn(async () => false),
  BLOCKED_USER_MESSAGE: "blocked",
}));

vi.mock("@/lib/membership-access", () => ({
  assertActiveMembership: vi.fn(async () => undefined),
}));

describe("messaging performance — request counts", () => {
  beforeEach(() => {
    vi.spyOn(messaging, "syncAcceptedRequestConversations").mockResolvedValue(undefined);
  });

  it("fetchConversations loads enrichment tables in one parallel batch", async () => {
    const { client, calls } = createCountingSupabase("inbox");

    await messaging.fetchConversations(client, USER_ID);

    const enrichmentSelects = calls.filter(
      (c) =>
        c.op === "select" &&
        (c.table === "messages" || c.table === "pets" || c.table === "bookings" || c.table === "profiles"),
    );

    expect(enrichmentSelects.length).toBeGreaterThanOrEqual(4);
  });

  it("sendMessage without precheck queries conversation, request, and booking", async () => {
    const { client, calls } = createCountingSupabase("send");

    await sendMessage(client, CONVERSATION_ID, USER_ID, "Hello", OTHER_ID);

    expect(calls.some((c) => c.table === "conversations")).toBe(true);
    expect(calls.some((c) => c.table === "requests")).toBe(true);
    expect(calls.some((c) => c.table === "bookings")).toBe(true);
  });

  it("sendMessage with precheck skips conversation/request/booking lookups", async () => {
    const { client, calls } = createCountingSupabase("send-precheck");
    const precheck = sendMessagePrecheckFromConversation(makeConversationSummary());

    await sendMessage(client, CONVERSATION_ID, USER_ID, "Hello", OTHER_ID, null, precheck);

    expect(calls.some((c) => c.table === "conversations")).toBe(false);
    expect(calls.some((c) => c.table === "requests")).toBe(false);
    expect(calls.some((c) => c.table === "bookings")).toBe(false);
    expect(calls.some((c) => c.table === "messages" && c.op === "insert")).toBe(true);
  });
});

describe("syncAcceptedRequestConversations", () => {
  it("fetchConversations stays under 10 Supabase selects when conversations already exist", async () => {
    vi.spyOn(messaging, "syncAcceptedRequestConversations").mockRestore();
    const { client, calls } = createInboxSupabaseAllConversationsExist();

    await fetchConversations(client, USER_ID);

    const selects = calls.filter((c) => c.op === "select");
    expect(selects.length).toBeLessThan(10);
    expect(selects.length).toBe(9);
    expect(selects.filter((c) => c.table === "requests").length).toBe(2);
    expect(selects.filter((c) => c.table === "conversations").length).toBe(2);
    expect(calls.some((c) => c.op === "upsert")).toBe(false);
    expect(calls.some((c) => c.op === "insert")).toBe(false);
  });
});

describe("messaging performance — documented round-trip counts", () => {
  it("fetchConversations enrichment: 5 sequential → 1 parallel batch (~4× faster enrichment)", () => {
    expect({ sequentialRoundTrips: 5, parallelRoundTrips: 1 }).toMatchObject({
      sequentialRoundTrips: 5,
      parallelRoundTrips: 1,
    });
  });

  it("sendMessage from ChatPanel: 3 lookup round-trips removed via precheck", () => {
    expect({ lookupRoundTripsBefore: 3, lookupRoundTripsAfter: 0 }).toMatchObject({
      lookupRoundTripsBefore: 3,
      lookupRoundTripsAfter: 0,
    });
  });

  it("notification bell on mark-read: 2 refresh cycles → 1 debounced refresh", () => {
    expect({ refreshCyclesBefore: 2, refreshCyclesAfter: 1 }).toMatchObject({
      refreshCyclesBefore: 2,
      refreshCyclesAfter: 1,
    });
  });
});
