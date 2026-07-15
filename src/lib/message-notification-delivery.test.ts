import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreateAdminClient = vi.fn();
const mockSendTransactionalEmail = vi.fn();
const mockResolveEmailLocale = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/email-send", () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSendTransactionalEmail(...args),
}));

vi.mock("@/lib/email-templates/locale", () => ({
  resolveEmailLocale: (...args: unknown[]) => mockResolveEmailLocale(...args),
}));

import { deliverNewMessageNotification } from "@/lib/message-notification-delivery";

const CONV_ID = "conv-1";
const MSG_ID = "msg-1";
const SENDER_ID = "sender-1";
const RECIPIENT_ID = "recipient-1";

function makeAdmin(messagesRecentRead = false) {
  return {
    from(table: string) {
      const state: Record<string, string> = {};
      const api = {
        select: () => api,
        eq: (col: string, val: string) => {
          state[col] = val;
          return api;
        },
        neq: () => api,
        order: () => api,
        limit: () => api,
        maybeSingle: async () => {
          if (table === "messages") {
            if (state.id) {
              return {
                data: {
                  id: MSG_ID,
                  conversation_id: CONV_ID,
                  sender_id: SENDER_ID,
                  body: "Hello from Andreas",
                },
                error: null,
              };
            }
            if (state.conversation_id && state.sender_id) {
              return {
                data: messagesRecentRead
                  ? { read_at: new Date().toISOString(), created_at: new Date().toISOString() }
                  : { read_at: null, created_at: new Date().toISOString() },
                error: null,
              };
            }
          }
          if (table === "conversations") {
            return {
              data: {
                id: CONV_ID,
                pet_parent_id: RECIPIENT_ID,
                pet_friend_id: SENDER_ID,
                request_id: "req-1",
              },
              error: null,
            };
          }
          if (table === "profiles") {
            return { data: { display_name: "Member" }, error: null };
          }
          if (table === "bookings") {
            return {
              data: {
                id: "booking-1",
                status: "active",
                start_date: "2026-07-01",
                end_date: "2026-07-05",
              },
              error: null,
            };
          }
          if (table === "requests") {
            return {
              data: {
                pet_id: "pet-1",
                requested_dates: ["2026-07-01"],
                date_from: "2026-07-01",
                date_to: "2026-07-05",
              },
              error: null,
            };
          }
          if (table === "pets") {
            return { data: { name: "Denny" }, error: null };
          }
          return { data: null, error: null };
        },
      };
      return api;
    },
  };
}

describe("deliverNewMessageNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAdminClient.mockReturnValue(makeAdmin(false));
    mockResolveEmailLocale.mockResolvedValue("en");
    mockSendTransactionalEmail.mockResolvedValue({ sent: true, skipped: false });
  });

  it("sends email to the other participant", async () => {
    const result = await deliverNewMessageNotification({
      conversationId: CONV_ID,
      messageId: MSG_ID,
      senderUserId: SENDER_ID,
      recipientUserId: RECIPIENT_ID,
    });

    expect(result.sent).toBe(true);
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "new_message",
        userId: RECIPIENT_ID,
        context: expect.objectContaining({
          conversationId: CONV_ID,
          senderName: "Member",
        }),
      }),
    );
  });

  it("does not email the sender", async () => {
    const result = await deliverNewMessageNotification({
      conversationId: CONV_ID,
      messageId: MSG_ID,
      senderUserId: SENDER_ID,
      recipientUserId: SENDER_ID,
    });

    expect(result.skipped).toBe(true);
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("skips when recipient recently viewed the conversation", async () => {
    mockCreateAdminClient.mockReturnValue(makeAdmin(true));

    const result = await deliverNewMessageNotification({
      conversationId: CONV_ID,
      messageId: MSG_ID,
      senderUserId: SENDER_ID,
      recipientUserId: RECIPIENT_ID,
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("recipient_recently_active");
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("treats duplicate cooldown as skipped without throwing", async () => {
    mockSendTransactionalEmail.mockResolvedValue({
      sent: false,
      skipped: true,
      reason: "duplicate",
    });

    const result = await deliverNewMessageNotification({
      conversationId: CONV_ID,
      messageId: MSG_ID,
      senderUserId: SENDER_ID,
      recipientUserId: RECIPIENT_ID,
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("cooldown_duplicate");
  });

  it("leaves SMTP failures retryable by not recording sent", async () => {
    mockSendTransactionalEmail.mockResolvedValue({
      sent: false,
      skipped: false,
      reason: "send_failed",
    });

    const result = await deliverNewMessageNotification({
      conversationId: CONV_ID,
      messageId: MSG_ID,
      senderUserId: SENDER_ID,
      recipientUserId: RECIPIENT_ID,
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toBe("send_failed");
  });
});
