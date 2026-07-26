import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MEMBERSHIP_CORE_SELECT,
  fetchUserMembershipRows,
} from "@/lib/membership-load";

describe("fetchUserMembershipRows", () => {
  it("queries production-safe core columns once without stripe retries", async () => {
    let queryCount = 0;
    let selectedColumns = "";

    const client = {
      from: (table: string) => {
        expect(table).toBe("user_memberships");
        return {
          select: (columns: string) => {
            selectedColumns = columns;
            queryCount += 1;
            return {
              eq: () => ({
                then: (
                  onFulfilled: (value: { data: unknown[]; error: null }) => unknown,
                ) =>
                  Promise.resolve({
                    data: [
                      {
                        id: "m-1",
                        user_id: "user-1",
                        role: "pet_parent",
                        plan_id: "parent_3_month",
                        status: "active",
                        start_date: "2026-01-01T00:00:00.000Z",
                        end_date: null,
                        auto_renew: false,
                      },
                    ],
                    error: null,
                  }).then(onFulfilled),
              }),
            };
          },
        };
      },
    } as unknown as SupabaseClient;

    const rows = await fetchUserMembershipRows(client, "user-1");

    expect(queryCount).toBe(1);
    expect(selectedColumns).toBe(MEMBERSHIP_CORE_SELECT);
    expect(selectedColumns).not.toContain("stripe_customer_id");
    expect(selectedColumns).not.toContain("stripe_subscription_id");
    expect(selectedColumns).not.toContain("stripe_price_id");
    expect(rows[0]?.stripe_customer_id).toBeNull();
  });

  it("does not retry when optional stripe columns are absent from the schema", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let queryCount = 0;

    const client = {
      from: () => ({
        select: () => {
          queryCount += 1;
          return {
            eq: () => ({
              then: (
                onFulfilled: (value: { data: unknown[]; error: null }) => unknown,
              ) =>
                Promise.resolve({
                  data: [
                    {
                      id: "m-1",
                      user_id: "user-1",
                      role: "pet_friend",
                      plan_id: "friend_3_month",
                      status: "active",
                      start_date: "2026-01-01T00:00:00.000Z",
                      end_date: "2027-01-01T00:00:00.000Z",
                      auto_renew: true,
                    },
                  ],
                  error: null,
                }).then(onFulfilled),
            }),
          };
        },
      }),
    } as unknown as SupabaseClient;

    await fetchUserMembershipRows(client, "user-1");

    expect(queryCount).toBe(1);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining("[membership] retrying load without column"),
      expect.anything(),
    );
    warn.mockRestore();
  });
});
