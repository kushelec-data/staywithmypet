import { describe, expect, it } from "vitest";
import type { UserMembership } from "@/lib/membership";
import {
  canCancelMembership,
  emptyMembershipsByRole,
  hasActiveMembershipForRole,
  hasDualActiveMemberships,
  isMembershipActive,
  isMembershipCancellationScheduled,
  membershipStatusLabelForRow,
} from "@/lib/membership";

function membershipRow(
  overrides: Partial<UserMembership> & Pick<UserMembership, "role" | "status">,
): UserMembership {
  return {
    id: "m1",
    user_id: "u1",
    role: overrides.role,
    plan_id: overrides.plan_id ?? "3-month-owner",
    plan_name: "3 Month",
    status: overrides.status,
    start_date: "2026-07-27",
    end_date: overrides.end_date ?? "2026-10-27",
    auto_renew: overrides.auto_renew ?? true,
    linked_booking_id: null,
    consumed_at: null,
    cancellation_restart_used: false,
    stripe_customer_id: null,
    stripe_subscription_id: overrides.stripe_subscription_id ?? "sub_1",
    stripe_price_id: null,
    stripe_checkout_session_id: null,
    ...overrides,
  };
}

const nowBeforeExpiry = new Date("2026-08-05T12:00:00.000Z");
const nowAfterExpiry = new Date("2026-10-28T12:00:00.000Z");

describe("membership cancellation lifecycle", () => {
  it("active 3-month membership cancelled before expiry remains usable until expiry", () => {
    const row = membershipRow({
      role: "pet_parent",
      status: "cancelled",
      auto_renew: false,
      end_date: "2026-10-27",
    });

    expect(isMembershipActive(row, nowBeforeExpiry)).toBe(true);
    expect(isMembershipCancellationScheduled(row, nowBeforeExpiry)).toBe(true);
    expect(canCancelMembership(row, nowBeforeExpiry)).toBe(false);
  });

  it("cancelled membership after expiry no longer unlocks access", () => {
    const row = membershipRow({
      role: "pet_parent",
      status: "cancelled",
      auto_renew: false,
      end_date: "2026-10-27",
    });

    expect(isMembershipActive(row, nowAfterExpiry)).toBe(false);
    expect(isMembershipCancellationScheduled(row, nowAfterExpiry)).toBe(false);
  });

  it("one-time membership manually cancelled remains usable until current expiry", () => {
    const row = membershipRow({
      role: "pet_parent",
      status: "cancelled",
      plan_id: "one-time-owner",
      auto_renew: false,
      end_date: "2026-08-03T12:00:00.000Z",
      stripe_subscription_id: null,
    });

    expect(isMembershipActive(row, new Date("2026-08-02T12:00:00.000Z"))).toBe(true);
    expect(isMembershipActive(row, new Date("2026-08-04T12:00:00.000Z"))).toBe(false);
    expect(row.end_date).toBe("2026-08-03T12:00:00.000Z");
  });

  it("cancelled Pet Parent membership does not affect Pet Friend membership", () => {
    const memberships = {
      pet_parent: membershipRow({
        role: "pet_parent",
        status: "cancelled",
        auto_renew: false,
      }),
      pet_friend: membershipRow({
        role: "pet_friend",
        status: "active",
        plan_id: "3-month-friend",
      }),
    };

    expect(hasActiveMembershipForRole(memberships, "pet_parent", nowBeforeExpiry)).toBe(true);
    expect(hasActiveMembershipForRole(memberships, "pet_friend", nowBeforeExpiry)).toBe(true);
  });

  it("cancelled Pet Friend membership does not affect Pet Parent membership", () => {
    const memberships = {
      pet_parent: membershipRow({
        role: "pet_parent",
        status: "active",
      }),
      pet_friend: membershipRow({
        role: "pet_friend",
        status: "cancelled",
        auto_renew: false,
        plan_id: "3-month-friend",
      }),
    };

    expect(hasActiveMembershipForRole(memberships, "pet_parent", nowBeforeExpiry)).toBe(true);
    expect(hasActiveMembershipForRole(memberships, "pet_friend", nowBeforeExpiry)).toBe(true);
  });

  it("dual-role calculation counts cancelled-but-still-valid membership as usable", () => {
    const memberships = {
      pet_parent: membershipRow({
        role: "pet_parent",
        status: "cancelled",
        auto_renew: false,
      }),
      pet_friend: membershipRow({
        role: "pet_friend",
        status: "active",
        plan_id: "3-month-friend",
      }),
    };

    expect(hasDualActiveMemberships(memberships, nowBeforeExpiry)).toBe(true);
    expect(hasDualActiveMemberships(memberships, nowAfterExpiry)).toBe(false);
  });

  it("shows cancelled active-until label while access remains", () => {
    const row = membershipRow({
      role: "pet_parent",
      status: "cancelled",
      auto_renew: false,
      end_date: "2026-10-27",
    });

    const label = membershipStatusLabelForRow(
      row,
      {
        activePlanSuffix: "{plan} plan",
        cancelledActiveUntil: "Cancelled — active until {date}",
        demo: "Demo",
      },
      nowBeforeExpiry,
    );
    expect(label).toContain("Cancelled — active until");
    expect(label).toMatch(/2026/);
  });

  it("filter snapshot keeps cancelled-but-valid rows", () => {
    const memberships = emptyMembershipsByRole();
    memberships.pet_parent = membershipRow({
      role: "pet_parent",
      status: "cancelled",
      auto_renew: false,
    });

    expect(hasActiveMembershipForRole(memberships, "pet_parent", nowBeforeExpiry)).toBe(true);
  });
});

describe("cancelUserMembershipAsAdmin Stripe behaviour", () => {
  it("uses cancel_at_period_end instead of immediate subscription delete", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(
      join(process.cwd(), "src/lib/membership-activate.ts"),
      "utf8",
    );
    const cancelFn = source.slice(source.indexOf("export async function cancelUserMembershipAsAdmin"));
    expect(cancelFn).toContain("cancel_at_period_end: true");
    expect(cancelFn).not.toMatch(/subscriptions\.cancel\(/);
    expect(cancelFn).toContain('status: "cancelled"');
    expect(cancelFn).toContain("auto_renew: false");
  });
});
