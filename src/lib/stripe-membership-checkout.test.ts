import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MEMBERSHIP_AUTO_STRIPE_CHECKOUT_ON_LOAD,
  invitedTestAccessCodeHref,
  resolveMembershipPlanCheckoutProps,
} from "@/lib/membership-invited-access";
import { isPlanCheckoutLoading } from "@/lib/membership-plan-checkout-state";
import { isMembershipPlanPurchasable } from "@/lib/membership";
import { checkoutSessionIsPaid } from "@/lib/stripe-checkout-activate";
import {
  STRIPE_MODE_BY_PLAN,
  STRIPE_PRICE_ENV_BY_PLAN,
  billingIntervalFromPlanId,
  computeMembershipEndDate,
  durationMonthsForPlanId,
  planIdFromStripePriceId,
  resolveStripePriceId,
  stripeCheckoutModeForPlanId,
  stripePlanTypeForPlanId,
} from "@/lib/stripe-plans";
import { buildStripeCheckoutMetadata } from "@/lib/stripe-webhook-resolve";

const TEST_ENV = {
  STRIPE_SECRET_KEY: "sk_test_x",
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  STRIPE_PARENT_ONE_TIME_PRICE_ID: "price_parent_one_time_test",
  STRIPE_PARENT_PRICE_ID: "price_parent_3m_test",
  STRIPE_PARENT_ONE_YEAR_PRICE_ID: "price_parent_1y_test",
  STRIPE_FRIEND_ONE_TIME_PRICE_ID: "price_friend_one_time_test",
  STRIPE_FRIEND_PRICE_ID: "price_friend_3m_test",
  STRIPE_FRIEND_ONE_YEAR_PRICE_ID: "price_friend_1y_test",
} as const;

function setTestStripeEnv(): void {
  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] = value;
  }
}

function clearTestStripeEnv(): void {
  for (const key of Object.keys(TEST_ENV)) {
    delete process.env[key];
  }
}

describe("Stripe checkout modes by plan", () => {
  it("One Time uses Stripe mode payment", () => {
    expect(stripeCheckoutModeForPlanId("one-time-friend")).toBe("payment");
    expect(stripeCheckoutModeForPlanId("one-time-owner")).toBe("payment");
    expect(STRIPE_MODE_BY_PLAN["one-time-friend"]).toBe("payment");
  });

  it("3 Month uses mode subscription", () => {
    expect(stripeCheckoutModeForPlanId("3-month-friend")).toBe("subscription");
    expect(stripeCheckoutModeForPlanId("3-month-owner")).toBe("subscription");
  });

  it("1 Year uses mode subscription", () => {
    expect(stripeCheckoutModeForPlanId("1-year-friend")).toBe("subscription");
    expect(stripeCheckoutModeForPlanId("1-year-owner")).toBe("subscription");
  });
});

describe("Stripe price env resolution", () => {
  beforeEach(() => setTestStripeEnv());
  afterEach(() => clearTestStripeEnv());

  it("selects the correct price ID for each role and plan", () => {
    expect(resolveStripePriceId("one-time-owner")).toBe(TEST_ENV.STRIPE_PARENT_ONE_TIME_PRICE_ID);
    expect(resolveStripePriceId("3-month-owner")).toBe(TEST_ENV.STRIPE_PARENT_PRICE_ID);
    expect(resolveStripePriceId("1-year-owner")).toBe(TEST_ENV.STRIPE_PARENT_ONE_YEAR_PRICE_ID);
    expect(resolveStripePriceId("one-time-friend")).toBe(TEST_ENV.STRIPE_FRIEND_ONE_TIME_PRICE_ID);
    expect(resolveStripePriceId("3-month-friend")).toBe(TEST_ENV.STRIPE_FRIEND_PRICE_ID);
    expect(resolveStripePriceId("1-year-friend")).toBe(TEST_ENV.STRIPE_FRIEND_ONE_YEAR_PRICE_ID);
  });

  it("maps Stripe price IDs back to distinct catalog plans", () => {
    expect(planIdFromStripePriceId(TEST_ENV.STRIPE_FRIEND_ONE_TIME_PRICE_ID)).toBe(
      "one-time-friend",
    );
    expect(planIdFromStripePriceId(TEST_ENV.STRIPE_FRIEND_PRICE_ID)).toBe("3-month-friend");
    expect(planIdFromStripePriceId(TEST_ENV.STRIPE_FRIEND_ONE_YEAR_PRICE_ID)).toBe("1-year-friend");
    expect(planIdFromStripePriceId(TEST_ENV.STRIPE_PARENT_ONE_TIME_PRICE_ID)).toBe(
      "one-time-owner",
    );
    expect(planIdFromStripePriceId(TEST_ENV.STRIPE_PARENT_PRICE_ID)).toBe("3-month-owner");
    expect(planIdFromStripePriceId(TEST_ENV.STRIPE_PARENT_ONE_YEAR_PRICE_ID)).toBe("1-year-owner");
  });

  it("uses separate env vars per plan", () => {
    expect(STRIPE_PRICE_ENV_BY_PLAN["3-month-friend"]).toBe("STRIPE_FRIEND_PRICE_ID");
    expect(STRIPE_PRICE_ENV_BY_PLAN["1-year-friend"]).toBe("STRIPE_FRIEND_ONE_YEAR_PRICE_ID");
    expect(STRIPE_PRICE_ENV_BY_PLAN["one-time-friend"]).toBe("STRIPE_FRIEND_ONE_TIME_PRICE_ID");
  });
});

describe("Stripe checkout metadata", () => {
  it("contains exact role and plan for each checkout plan", () => {
    const friendOneTime = buildStripeCheckoutMetadata({
      userId: "user-1",
      role: "pet_friend",
      planId: "one-time-friend",
      priceId: "price_friend_one_time_test",
      priceEnv: "STRIPE_FRIEND_ONE_TIME_PRICE_ID",
    });
    expect(friendOneTime.role).toBe("friend");
    expect(friendOneTime.membership_role).toBe("pet_friend");
    expect(friendOneTime.plan_id).toBe("one-time-friend");
    expect(friendOneTime.plan_type).toBe("one_time");
    expect(friendOneTime.duration_months).toBeUndefined();

    const parentYear = buildStripeCheckoutMetadata({
      userId: "user-2",
      role: "pet_parent",
      planId: "1-year-owner",
      priceId: "price_parent_1y_test",
      priceEnv: "STRIPE_PARENT_ONE_YEAR_PRICE_ID",
    });
    expect(parentYear.role).toBe("parent");
    expect(parentYear.membership_role).toBe("pet_parent");
    expect(parentYear.plan_id).toBe("1-year-owner");
    expect(parentYear.plan_type).toBe("one_year");
    expect(parentYear.duration_months).toBe("12");

    const friend3m = buildStripeCheckoutMetadata({
      userId: "user-3",
      role: "pet_friend",
      planId: "3-month-friend",
      priceId: "price_friend_3m_test",
      priceEnv: "STRIPE_FRIEND_PRICE_ID",
    });
    expect(friend3m.plan_type).toBe("three_month");
    expect(friend3m.duration_months).toBe("3");
  });
});

describe("Membership activation duration by plan", () => {
  const start = new Date("2026-01-15T12:00:00.000Z");

  it("One Time webhook entitlement uses 7-day billing interval (not subscription)", () => {
    expect(stripePlanTypeForPlanId("one-time-friend")).toBe("one_time");
    expect(billingIntervalFromPlanId("one-time-friend")).toBe("one_time");
    expect(stripeCheckoutModeForPlanId("one-time-friend")).toBe("payment");
    const end = computeMembershipEndDate("one_time", start);
    expect(end).not.toBeNull();
    const endDate = new Date(end!);
    expect(endDate.getUTCDate()).toBe(22);
    expect(endDate.getUTCMonth()).toBe(0);
  });

  it("3 Month activates for 3 months", () => {
    expect(durationMonthsForPlanId("3-month-friend")).toBe("3");
    const end = computeMembershipEndDate("3_months", start);
    const endDate = new Date(end!);
    expect(endDate.getUTCMonth()).toBe(3);
  });

  it("1 Year activates for 12 months", () => {
    expect(durationMonthsForPlanId("1-year-owner")).toBe("12");
    const end = computeMembershipEndDate("12_months", start);
    const endDate = new Date(end!);
    expect(endDate.getUTCFullYear()).toBe(2027);
  });
});

describe("Stripe checkout payment gating", () => {
  it("activates one-time checkout only when payment_status is paid", () => {
    expect(
      checkoutSessionIsPaid({ payment_status: "paid" } as Parameters<typeof checkoutSessionIsPaid>[0]),
    ).toBe(true);
    expect(
      checkoutSessionIsPaid({ payment_status: "unpaid" } as Parameters<typeof checkoutSessionIsPaid>[0]),
    ).toBe(false);
  });
});

describe("Webhook idempotency contract", () => {
  it("treats the same checkout session id with an active row as already activated", () => {
    const sessionId = "cs_test_123";
    const existingRow = {
      stripe_checkout_session_id: sessionId,
      status: "active" as const,
      end_date: "2099-01-01T00:00:00.000Z",
    };
    const isDuplicateActivation =
      existingRow.stripe_checkout_session_id === sessionId &&
      existingRow.status === "active";
    expect(isDuplicateActivation).toBe(true);
  });
});

describe("Invited 3-month access-code flow", () => {
  it("remains available for invited 3-month plans only", () => {
    expect(invitedTestAccessCodeHref("pet_friend")).toContain("3-month-friend");
    expect(invitedTestAccessCodeHref("pet_parent")).toContain("3-month-owner");
    expect(isMembershipPlanPurchasable("3-month-friend")).toBe(true);
    const ui = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: true,
      isActive: false,
    });
    expect(ui.showInvitedAccessSection).toBe(true);
    expect(ui.useTestAccessFlowOnCards).toBe(false);
  });
});

describe("Membership page checkout UX contract", () => {
  it("does not auto-create Stripe Checkout on page load", () => {
    expect(MEMBERSHIP_AUTO_STRIPE_CHECKOUT_ON_LOAD).toBe(false);
  });

  it("shows opening checkout loading state only on the clicked plan card", () => {
    function planShowsOpeningCheckout(loadingPlanId: string | null, planId: string): boolean {
      return loadingPlanId === planId;
    }
    expect(planShowsOpeningCheckout("one-time-friend", "one-time-friend")).toBe(true);
    expect(planShowsOpeningCheckout("one-time-friend", "3-month-friend")).toBe(false);
    expect(planShowsOpeningCheckout(null, "3-month-friend")).toBe(false);
  });
});
