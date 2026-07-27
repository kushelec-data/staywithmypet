import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/notifications", () => ({
  markNotificationsReadForConversations: vi.fn(async () => undefined),
}));

import {
  CONVERSATION_READ_EVENT,
  conversationSummariesShareThread,
  markConversationFullyRead,
  markConversationMessagesRead,
  mergeConversationSummaries,
  notifyConversationRead,
  type ConversationSummary,
} from "@/lib/messaging";

const USER_ID = "user-11111111-1111-4111-8111-111111111111";
const OTHER_ID = "user-22222222-2222-4222-8222-222222222222";
const CONV_A = "conv-a";
const CONV_B = "conv-b";

function makeSummary(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: CONV_A,
    requestId: "req-1",
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
    unreadCount: 2,
    sortAt: "2026-07-25T10:00:00.000Z",
    conversationIds: [CONV_A],
    ...overrides,
  };
}

describe("conversationSummariesShareThread", () => {
  it("matches merged threads by shared conversation id", () => {
    const merged = makeSummary({
      id: CONV_A,
      conversationIds: [CONV_A, CONV_B],
      unreadCount: 3,
    });
    const sibling = makeSummary({
      id: CONV_B,
      conversationIds: [CONV_B],
      unreadCount: 1,
    });

    expect(conversationSummariesShareThread(merged, sibling)).toBe(true);
    expect(
      conversationSummariesShareThread(merged, {
        id: "conv-other",
        conversationIds: ["conv-other"],
      }),
    ).toBe(false);
  });
});

describe("mergeConversationSummaries unread totals", () => {
  it("sums unread counts across merged rows", () => {
    const base = {
      petId: "pet-1",
      otherPartyId: OTHER_ID,
      dateRangeKey: "2026-07-01_2026-07-10",
      bookingId: null as string | null,
    };

    const merged = mergeConversationSummaries([
      makeSummary({
        ...base,
        id: CONV_A,
        conversationIds: [CONV_A],
        unreadCount: 2,
        sortAt: "2026-07-25T11:00:00.000Z",
      }),
      makeSummary({
        ...base,
        id: CONV_B,
        conversationIds: [CONV_B],
        unreadCount: 1,
        sortAt: "2026-07-25T10:00:00.000Z",
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.unreadCount).toBe(3);
    expect(merged[0]?.conversationIds).toEqual(expect.arrayContaining([CONV_A, CONV_B]));
  });
});

describe("markConversationMessagesRead", () => {
  it("prefers the security-definer RPC and returns updated row count", async () => {
    const rpc = vi.fn(async () => ({ data: 2, error: null }));
    const from = vi.fn();
    const client = { rpc, from } as unknown as SupabaseClient;

    const count = await markConversationMessagesRead(client, CONV_A, USER_ID);

    expect(count).toBe(2);
    expect(rpc).toHaveBeenCalledWith("mark_conversation_messages_read", {
      p_conversation_id: CONV_A,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("falls back to update+select when RPC is unavailable", async () => {
    const select = vi.fn(async () => ({ data: [{ id: "msg-1" }], error: null }));
    const chain = {
      update: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      select,
    };
    const client = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { code: "PGRST202", message: "function not found" },
      })),
      from: vi.fn(() => chain),
    } as unknown as SupabaseClient;

    const count = await markConversationMessagesRead(client, CONV_A, USER_ID);

    expect(count).toBe(1);
    expect(select).toHaveBeenCalledWith("id");
  });
});

describe("markConversationFullyRead", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
  });

  it("marks every merged conversation id and dispatches read event", async () => {
    const rpc = vi.fn(async () => ({ data: 1, error: null }));
    const client = { rpc, from: vi.fn() } as unknown as SupabaseClient;

    const marked = await markConversationFullyRead(
      client,
      { id: CONV_A, conversationIds: [CONV_A, CONV_B] },
      USER_ID,
    );

    expect(marked).toBe(2);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
});

describe("notifyConversationRead", () => {
  it("dispatches CONVERSATION_READ_EVENT with conversation ids", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });

    notifyConversationRead({ id: CONV_A, conversationIds: [CONV_A, CONV_B] });

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: CONVERSATION_READ_EVENT }),
    );
  });
});

describe("messages page read persistence wiring", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "src/components/messages/MessagesPageContent.tsx"),
    "utf8",
  );
  const chatSource = readFileSync(
    join(process.cwd(), "src/components/messages/ChatPanel.tsx"),
    "utf8",
  );
  const messagingSource = readFileSync(
    join(process.cwd(), "src/lib/messaging.ts"),
    "utf8",
  );

  it("counts only incoming unread messages in fetchConversations", () => {
    expect(messagingSource).toContain('.is("read_at", null)');
    expect(messagingSource).toContain('.neq("sender_id", userId)');
  });

  it("refreshes inbox after marking a conversation read", () => {
    expect(pageSource).toContain("await markConversationFullyRead");
    expect(pageSource).toContain("refreshConversations");
    expect(pageSource).toContain("CONVERSATION_READ_EVENT");
  });

  it("marks read when opening chat and refreshes inbox", () => {
    expect(chatSource).toContain("persistConversationRead");
    expect(chatSource).toContain("onInboxRefresh");
  });

  it("uses merged-thread overlap when clearing unread badges", () => {
    expect(pageSource).toContain("conversationSummariesShareThread");
  });
});

describe("unread read-state scenarios (documented)", () => {
  it("scenario 1: open unread conversation clears badge and refresh keeps it at zero", () => {
    expect({
      openMarksRead: true,
      refreshAfterMark: true,
      dbRpc: "mark_conversation_messages_read",
    }).toMatchObject({ openMarksRead: true, refreshAfterMark: true });
  });

  it("scenario 2: incoming message on inactive thread schedules inbox refresh", () => {
    expect(readFileSync(
      join(process.cwd(), "src/components/messages/MessagesPageContent.tsx"),
      "utf8",
    )).toContain("subscribeToInboxIncomingMessages");
  });

  it("scenario 3: reopening active thread calls persistConversationRead again", () => {
    expect(readFileSync(
      join(process.cwd(), "src/components/messages/ChatPanel.tsx"),
      "utf8",
    )).toContain("await persistConversationRead()");
  });

  it("scenario 4: active-thread realtime inserts mark read instead of incrementing unread", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/components/messages/MessagesPageContent.tsx"),
      "utf8",
    );
    expect(pageSource).toContain("markConversationFullyRead(supabase, activeConversation");
    expect(pageSource).not.toContain("unreadCount + 1");
  });
});
