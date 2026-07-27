import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserMembership } from "@/lib/membership";
import {
  MEMBERSHIP_CORE_SELECT,
  fetchUserMembershipRows,
  membershipRolesEverHeldFromRows,
  welcomeOfferEligibleFromRows,
} from "@/lib/membership-load";

function membershipRow(
  overrides: Partial<UserMembership> & Pick<UserMembership, "role" | "status">,
): UserMembership {
  return {
    id: overrides.id ?? "m1",
    user_id: "u1",
    role: overrides.role,
    plan_id: "3-month-owner",
    plan_name: "3 Month",
    status: overrides.status,
    start_date: "2026-01-01",
    end_date: "2027-04-01",
    auto_renew: false,
    linked_booking_id: null,
    consumed_at: null,
    cancellation_restart_used: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_checkout_session_id: null,
    ...overrides,
  };
}

describe("welcomeOfferEligibleFromRows", () => {
  it("marks role eligible when user has no membership history", () => {
    expect(welcomeOfferEligibleFromRows([])).toEqual({
      pet_parent: true,
      pet_friend: true,
    });
  });

  it("marks role ineligible with active membership history", () => {
    expect(
      welcomeOfferEligibleFromRows([
        membershipRow({ role: "pet_parent", status: "active" }),
      ]),
    ).toEqual({
      pet_parent: false,
      pet_friend: true,
    });
  });

  it("marks role ineligible with cancelled membership history", () => {
    expect(
      welcomeOfferEligibleFromRows([
        membershipRow({ role: "pet_parent", status: "cancelled" }),
      ]),
    ).toEqual({
      pet_parent: false,
      pet_friend: true,
    });
  });

  it("marks role ineligible with expired membership history", () => {
    expect(
      welcomeOfferEligibleFromRows([
        membershipRow({ role: "pet_friend", status: "expired", id: "m2" }),
      ]),
    ).toEqual({
      pet_parent: true,
      pet_friend: false,
    });
  });

  it("keeps pet friend eligibility when only pet parent history exists", () => {
    expect(
      welcomeOfferEligibleFromRows([
        membershipRow({ role: "pet_parent", status: "cancelled" }),
      ]),
    ).toEqual({
      pet_parent: false,
      pet_friend: true,
    });
  });
});

describe("membershipRolesEverHeldFromRows", () => {
  it("detects any historical row per role regardless of status", () => {
    expect(
      membershipRolesEverHeldFromRows([
        membershipRow({ role: "pet_parent", status: "expired" }),
      ]),
    ).toEqual({
      pet_parent: true,
      pet_friend: false,
    });
  });
});

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
