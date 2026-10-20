import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn(async () => ({ messageId: "smtp-1" }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail }),
  },
}));

const mockCreateAdminClient = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/smtp-config", () => ({
  readSmtpConfig: () => ({
    host: "mail.example.test",
    port: 465,
    user: "smtp-user",
    password: "smtp-pass",
  }),
  transactionalEmailFrom: () => "StayWithMyPet <info@staywithmypet.ee>",
}));

vi.mock("@/lib/email-templates/locale", () => ({
  resolveEmailLocale: async () => "en",
}));

vi.mock("@/lib/email-scheduled-context", () => ({
  hydrateScheduledEmailContext: vi.fn(async () => ({
    recipientName: "Parent",
    recipientRole: "pet_parent",
    otherPartyName: "Friend",
    petName: "Denny",
    petType: "dog",
    dateFrom: "2026-10-25",
    dateTo: "2026-10-27",
    bookingId: "booking-future",
    conversationId: "conv-1",
  })),
}));

import { processDueScheduledEmails } from "@/lib/email-send";

type EventRow = {
  id: string;
  unique_key: string;
  user_id: string;
  event_type: string;
  related_request_id: string | null;
  related_booking_id: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
};

type BookingRow = {
  id: string;
  request_id: string;
  status: string;
  start_date: string;
  cancelled_at: string | null;
  pet_parent_id: string;
  pet_friend_id: string;
};

const PARENT_ID = "parent-1";
const FRIEND_ID = "friend-1";

function futureBooking(): BookingRow {
  return {
    id: "booking-future",
    request_id: "request-1",
    status: "upcoming",
    start_date: "2026-10-25",
    cancelled_at: null,
    pet_parent_id: PARENT_ID,
    pet_friend_id: FRIEND_ID,
  };
}

function parentEvent(overrides?: Partial<EventRow>): EventRow {
  return {
    id: "event-parent",
    unique_key: `booking_starts_tomorrow_parent_booking-future_${PARENT_ID}`,
    user_id: PARENT_ID,
    event_type: "booking_starts_tomorrow_parent",
    related_request_id: "request-1",
    related_booking_id: "booking-future",
    scheduled_for: "2026-10-24T09:00:00.000Z",
    sent_at: null,
    ...overrides,
  };
}

function friendEvent(): EventRow {
  return {
    id: "event-friend",
    unique_key: `booking_starts_tomorrow_friend_booking-future_${FRIEND_ID}`,
    user_id: FRIEND_ID,
    event_type: "booking_starts_tomorrow_friend",
    related_request_id: "request-1",
    related_booking_id: "booking-future",
    scheduled_for: "2026-10-24T09:00:00.000Z",
    sent_at: null,
  };
}

function makeAdmin(state: { events: EventRow[]; bookings: BookingRow[] }) {
  return {
    auth: {
      admin: {
        getUserById: async (userId: string) => ({
          data: {
            user: {
              email: userId === PARENT_ID ? "parent@example.test" : "friend@example.test",
            },
          },
          error: null,
        }),
      },
    },
    from(table: string) {
      const filters: Array<[string, string, unknown]> = [];
      let action: "select" | "update" | "insert" = "select";
      let payload: { sent_at?: string | null } | Record<string, unknown> | null = null;

      const filterEq = (col: string) => filters.find((f) => f[0] === "eq" && f[1] === col)?.[2];
      const requiresNullSentAt = () =>
        filters.some((f) => f[0] === "is" && f[1] === "sent_at" && f[2] === null);

      const applyUpdate = () => {
        const uniqueKey = filterEq("unique_key");
        const row = state.events.find((event) => event.unique_key === uniqueKey);
        if (!row) return { data: [] as Array<{ id: string }>, error: null };
        if (requiresNullSentAt() && row.sent_at !== null) {
          return { data: [] as Array<{ id: string }>, error: null };
        }
        row.sent_at = (payload as { sent_at?: string | null } | null)?.sent_at ?? null;
        return { data: [{ id: row.unique_key }], error: null };
      };

      const executeSelect = () => {
        if (table === "email_events") {
          const uniqueKey = filterEq("unique_key");
          if (uniqueKey) {
            const row = state.events.find((event) => event.unique_key === uniqueKey);
            return { data: row ?? null, error: null };
          }
          const due = state.events.filter(
            (event) =>
              event.sent_at === null &&
              event.scheduled_for &&
              event.scheduled_for <= new Date().toISOString(),
          );
          return { data: due, error: null };
        }
        if (table === "bookings") {
          const id = filterEq("id");
          const requestId = filterEq("request_id");
          const row = state.bookings.find(
            (booking) => booking.id === id || booking.request_id === requestId,
          );
          return { data: row ?? null, error: null };
        }
        return { data: null, error: null };
      };

      const execute = async () => {
        if (action === "update") return applyUpdate();
        if (action === "insert") return { data: null, error: null };
        return executeSelect();
      };

      const api = {
        select: () => api,
        eq: (col: string, val: unknown) => {
          filters.push(["eq", col, val]);
          return api;
        },
        is: (col: string, val: unknown) => {
          filters.push(["is", col, val]);
          return api;
        },
        not: (col: string, op: string, val: unknown) => {
          filters.push(["not", `${col}:${op}`, val]);
          return api;
        },
        lte: (col: string, val: unknown) => {
          filters.push(["lte", col, val]);
          return api;
        },
        limit: () => api,
        maybeSingle: async () => {
          const result = executeSelect();
          const data = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
          return { data, error: null };
        },
        update: (values: { sent_at?: string | null }) => {
          action = "update";
          payload = values;
          return api;
        },
        insert: (row: Record<string, unknown>) => {
          action = "insert";
          payload = row;
          return api;
        },
        then: (
          resolve: (value: { data: unknown; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => execute().then(resolve, reject),
      };
      return api;
    },
  };
}

describe("processDueScheduledEmails booking reminders", () => {
  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "smtp-1" });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends a future reminder to both participants once", async () => {
    const state = {
      events: [parentEvent(), friendEvent()],
      bookings: [futureBooking()],
    };
    mockCreateAdminClient.mockReturnValue(makeAdmin(state));

    const result = await processDueScheduledEmails();
    expect(result.sent).toBe(2);
    expect(result.skipped).toBe(0);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls.map((call) => call[0].to).sort()).toEqual([
      "friend@example.test",
      "parent@example.test",
    ]);
    expect(state.events.every((event) => event.sent_at)).toBe(true);
  });

  it("does not send an already sent reminder", async () => {
    const state = {
      events: [parentEvent({ sent_at: "2026-10-24T09:01:00.000Z" })],
      bookings: [futureBooking()],
    };
    mockCreateAdminClient.mockReturnValue(makeAdmin(state));

    const result = await processDueScheduledEmails();
    expect(result.processed).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("skips a cancelled booking and records it so it is not retried", async () => {
    const state = {
      events: [parentEvent()],
      bookings: [{ ...futureBooking(), status: "cancelled", cancelled_at: "2026-10-01T00:00:00.000Z" }],
    };
    mockCreateAdminClient.mockReturnValue(makeAdmin(state));

    const result = await processDueScheduledEmails();
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(sendMail).not.toHaveBeenCalled();
    expect(state.events[0]?.sent_at).toBeTruthy();
  });

  it("skips a booking that starts today", async () => {
    vi.setSystemTime(new Date("2026-10-25T07:00:00.000Z"));
    const state = {
      events: [parentEvent()],
      bookings: [{ ...futureBooking(), start_date: "2026-10-25" }],
    };
    mockCreateAdminClient.mockReturnValue(makeAdmin(state));

    const result = await processDueScheduledEmails();
    expect(result.skipped).toBe(1);
    expect(sendMail).not.toHaveBeenCalled();
    expect(state.events[0]?.sent_at).toBeTruthy();
  });

  it("skips an already started booking", async () => {
    vi.setSystemTime(new Date("2026-10-26T07:00:00.000Z"));
    const state = {
      events: [parentEvent()],
      bookings: [{ ...futureBooking(), start_date: "2026-10-25" }],
    };
    mockCreateAdminClient.mockReturnValue(makeAdmin(state));

    const result = await processDueScheduledEmails();
    expect(result.skipped).toBe(1);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("claims a row so a duplicate cron run does not send twice", async () => {
    const state = {
      events: [parentEvent()],
      bookings: [futureBooking()],
    };
    mockCreateAdminClient.mockReturnValue(makeAdmin(state));

    const [first, second] = await Promise.all([
      processDueScheduledEmails(),
      processDueScheduledEmails(),
    ]);

    expect(first.sent + second.sent).toBe(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("leaves the row unsent when SMTP fails so the next cron can retry", async () => {
    sendMail.mockRejectedValueOnce(new Error("smtp down"));
    const state = {
      events: [parentEvent()],
      bookings: [futureBooking()],
    };
    mockCreateAdminClient.mockReturnValue(makeAdmin(state));

    const result = await processDueScheduledEmails();
    expect(result.sent).toBe(0);
    expect(state.events[0]?.sent_at).toBeNull();

    sendMail.mockResolvedValueOnce({ messageId: "smtp-2" });
    const retry = await processDueScheduledEmails();
    expect(retry.sent).toBe(1);
    expect(state.events[0]?.sent_at).toBeTruthy();
  });
});
