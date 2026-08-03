import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchMessages,
  MESSAGE_PAGE_SIZE,
} from "@/lib/messaging";

const USER_ID = "user-11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "conv-1";

function makeMessageRow(index: number) {
  return {
    id: `msg-${index}`,
    conversation_id: CONVERSATION_ID,
    sender_id: USER_ID,
    body: `Message ${index}`,
    read_at: null,
    created_at: new Date(Date.UTC(2026, 6, 1, 0, index, 0)).toISOString(),
    storage_path: null,
    media_type: null,
    file_name: null,
    file_size: null,
    mime_type: null,
  };
}

function createPaginatedSupabase(rows: ReturnType<typeof makeMessageRow>[]) {
  let lastLimit = 0;
  let lastAscending: boolean | null = null;
  let lastBefore: string | null = null;

  const chain = () => {
    const api = {
      select: () => api,
      eq: () => api,
      order: (_col: string, opts?: { ascending?: boolean }) => {
        lastAscending = opts?.ascending ?? null;
        return api;
      },
      limit: (n: number) => {
        lastLimit = n;
        return api;
      },
      lt: (_col: string, value: string) => {
        lastBefore = value;
        return api;
      },
      then: (
        onFulfilled: (value: { data: unknown; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => {
        let filtered = rows;
        if (lastBefore) {
          filtered = rows.filter((row) => row.created_at < lastBefore!);
        }
        const sorted = [...filtered].sort((a, b) =>
          lastAscending
            ? a.created_at.localeCompare(b.created_at)
            : b.created_at.localeCompare(a.created_at),
        );
        const slice = sorted.slice(0, lastLimit);
        return Promise.resolve({ data: slice, error: null }).then(onFulfilled, onRejected);
      },
    };
    return api;
  };

  const client = {
    from: () => chain(),
  } as unknown as SupabaseClient;

  return {
    client,
    getQueryMeta: () => ({ lastLimit, lastAscending, lastBefore }),
  };
}

describe("fetchMessages pagination", () => {
  it("loads newest page in descending SQL order and returns chronological messages", async () => {
    const rows = Array.from({ length: 55 }, (_, index) => makeMessageRow(index));
    const { client, getQueryMeta } = createPaginatedSupabase(rows);

    const page = await fetchMessages(client, CONVERSATION_ID, USER_ID);

    expect(getQueryMeta().lastAscending).toBe(false);
    expect(getQueryMeta().lastLimit).toBe(MESSAGE_PAGE_SIZE + 1);
    expect(page.messages).toHaveLength(MESSAGE_PAGE_SIZE);
    expect(page.hasOlder).toBe(true);
    expect(page.messages[0]?.body).toBe("Message 5");
    expect(page.messages.at(-1)?.body).toBe("Message 54");
  });

  it("supports before cursor for older pages", async () => {
    const rows = Array.from({ length: 60 }, (_, index) => makeMessageRow(index));
    const { client, getQueryMeta } = createPaginatedSupabase(rows);
    const cursor = rows[49]!.created_at;

    const page = await fetchMessages(client, CONVERSATION_ID, USER_ID, {
      before: cursor,
    });

    expect(getQueryMeta().lastBefore).toBe(cursor);
    expect(page.messages.every((m) => m.createdAt < cursor)).toBe(true);
  });
});
