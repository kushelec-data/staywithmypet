import { describe, expect, it } from "vitest";
import {
  claimReminderSend,
  markReminderFailedBeforeAcceptance,
  markReminderOutcomeUnknown,
  markReminderSent,
  RETRYABLE_REMINDER_EVENT_STATUS,
} from "./store";

type EventRow = {
  id: string;
  user_id: string;
  stage: string;
  unique_key: string;
  status: string;
  attempt_count: number;
};

function createMemoryAdmin() {
  const events = new Map<string, EventRow>();
  const sequences = new Map<string, Record<string, unknown>>();

  const from = (table: string) => {
    const applyEventUpdate = (patch: Record<string, unknown>, filters: Record<string, string>) => {
      const key = filters.unique_key;
      const row = key ? events.get(key) : undefined;
      if (!row) return { data: [] as Array<{ id: string }>, error: null };
      if (filters.status && row.status !== filters.status) {
        return { data: [] as Array<{ id: string }>, error: null };
      }
      Object.assign(row, patch);
      events.set(String(row.unique_key), row);
      return { data: [{ id: row.id }], error: null };
    };

    return {
      upsert: async (row: Record<string, unknown>) => {
        if (table === "profile_completion_reminder_sequences") {
          const id = String(row.user_id);
          if (!sequences.has(id)) sequences.set(id, { ...row });
        }
        return { error: null };
      },
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          maybeSingle: async () => {
            const key = String(row.unique_key);
            if (events.has(key)) {
              return { data: null, error: { code: "23505", message: "duplicate key" } };
            }
            const stored: EventRow = {
              id: key,
              user_id: String(row.user_id),
              stage: String(row.stage),
              unique_key: key,
              status: String(row.status),
              attempt_count: Number(row.attempt_count ?? 1),
            };
            events.set(key, stored);
            return { data: { id: key }, error: null };
          },
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        const filters: Record<string, string> = {};
        const chain = {
          eq(column: string, value: string) {
            filters[column] = value;
            return chain;
          },
          select: async () => {
            if (table === "profile_completion_reminder_events") {
              return applyEventUpdate(patch, filters);
            }
            if (table === "profile_completion_reminder_sequences") {
              const id = filters.user_id;
              const row = id ? sequences.get(id) : undefined;
              if (!row) return { data: [], error: null };
              Object.assign(row, patch);
              return { data: [{ user_id: id }], error: null };
            }
            return { data: [], error: null };
          },
        };
        return chain;
      },
      select: () => {
        const filters: Record<string, string> = {};
        const chain = {
          eq(column: string, value: string) {
            filters[column] = value;
            return chain;
          },
          in() {
            return chain;
          },
          maybeSingle: async () => {
            const row = events.get(filters.unique_key);
            return { data: row ?? null, error: null };
          },
        };
        return chain;
      },
    };
  };

  return { from, events, sequences };
}

const now = new Date("2026-11-07T09:15:00.000Z");

function claimInput(admin: ReturnType<typeof createMemoryAdmin>) {
  return {
    admin: admin as never,
    userId: "11111111-1111-1111-1111-111111111111",
    stage: "first" as const,
    cohort: "historical" as const,
    registeredAt: now,
    locale: "en" as const,
    emailRole: "pet_parent" as const,
    now,
  };
}

describe("profile reminder store claims", () => {
  it("deduplicates concurrent claims for the same unique key", async () => {
    const admin = createMemoryAdmin();
    const input = claimInput(admin);
    const [first, second] = await Promise.all([claimReminderSend(input), claimReminderSend(input)]);
    const outcomes = [first, second].sort();
    expect(outcomes).toEqual(["claimed", "duplicate"]);
    expect(admin.events.size).toBe(1);
  });

  it("retries only failed_before_acceptance rows", async () => {
    expect(RETRYABLE_REMINDER_EVENT_STATUS).toBe("failed_before_acceptance");
    const admin = createMemoryAdmin();
    const input = claimInput(admin);
    expect(await claimReminderSend(input)).toBe("claimed");
    await markReminderFailedBeforeAcceptance({
      admin: admin as never,
      userId: input.userId,
      stage: "first",
      error: "ECONNREFUSED",
      now,
    });
    expect(await claimReminderSend(input)).toBe("claimed");

    const unknownAdmin = createMemoryAdmin();
    const unknownInput = claimInput(unknownAdmin);
    expect(await claimReminderSend(unknownInput)).toBe("claimed");
    await markReminderOutcomeUnknown({
      admin: unknownAdmin as never,
      userId: unknownInput.userId,
      stage: "first",
      error: "timeout",
      now,
    });
    expect(await claimReminderSend(unknownInput)).toBe("duplicate");
  });

  it("does not record sent when the sending row cannot be updated", async () => {
    const admin = createMemoryAdmin();
    const input = claimInput(admin);
    expect(await claimReminderSend(input)).toBe("claimed");
    const row = [...admin.events.values()][0];
    if (row) row.status = "outcome_unknown";
    const result = await markReminderSent({
      admin: admin as never,
      userId: input.userId,
      stage: "first",
      now,
    });
    expect(result).toMatchObject({ ok: false, reason: "update_failed" });
    expect([...admin.events.values()][0]?.status).toBe("outcome_unknown");
  });
});
