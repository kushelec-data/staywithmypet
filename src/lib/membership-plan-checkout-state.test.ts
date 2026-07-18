import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  STRIPE_PRICE_ENV_BY_PLAN,
  resolveStripePriceId,
  stripeCheckoutModeForPlanId,
  stripePriceEnvVarForPlanId,
} from "@/lib/stripe-plans";
import {
  checkoutRuntimeErrorForPlan,
  clearPlanCheckoutError,
  isPlanCheckoutLoading,
  planConfigErrorForPlan,
  setPlanCheckoutError,
} from "@/lib/membership-plan-checkout-state";

const PLANS = [
  "one-time-owner",
  "3-month-owner",
  "1-year-owner",
  "one-time-friend",
  "3-month-friend",
  "1-year-friend",
] as const;

describe("per-plan checkout error state", () => {
  it("shows One Time runtime error only on the One Time card", () => {
    const errors = setPlanCheckoutError({}, "one-time-owner", "One Time Stripe error");
    expect(checkoutRuntimeErrorForPlan(errors, "one-time-owner")).toBe("One Time Stripe error");
    expect(checkoutRuntimeErrorForPlan(errors, "3-month-owner")).toBeNull();
    expect(checkoutRuntimeErrorForPlan(errors, "1-year-owner")).toBeNull();
  });

  it("shows 3 Month runtime error only on the 3 Month card", () => {
    const errors = setPlanCheckoutError({}, "3-month-friend", "3 Month Stripe error");
    expect(checkoutRuntimeErrorForPlan(errors, "3-month-friend")).toBe("3 Month Stripe error");
    expect(checkoutRuntimeErrorForPlan(errors, "one-time-friend")).toBeNull();
    expect(checkoutRuntimeErrorForPlan(errors, "1-year-friend")).toBeNull();
  });

  it("shows 1 Year runtime error only on the 1 Year card", () => {
    const errors = setPlanCheckoutError({}, "1-year-owner", "1 Year Stripe error");
    expect(checkoutRuntimeErrorForPlan(errors, "1-year-owner")).toBe("1 Year Stripe error");
    expect(checkoutRuntimeErrorForPlan(errors, "one-time-owner")).toBeNull();
    expect(checkoutRuntimeErrorForPlan(errors, "3-month-owner")).toBeNull();
  });

  it("does not let a One Time failure affect other cards", () => {
    let errors = setPlanCheckoutError({}, "one-time-owner", "One Time failed");
    errors = setPlanCheckoutError(errors, "3-month-owner", "3 Month failed");
    expect(checkoutRuntimeErrorForPlan(errors, "one-time-owner")).toBe("One Time failed");
    expect(checkoutRuntimeErrorForPlan(errors, "3-month-owner")).toBe("3 Month failed");
    expect(checkoutRuntimeErrorForPlan(errors, "1-year-owner")).toBeNull();

    const cleared = clearPlanCheckoutError(errors, "one-time-owner");
    expect(checkoutRuntimeErrorForPlan(cleared, "one-time-owner")).toBeNull();
    expect(checkoutRuntimeErrorForPlan(cleared, "3-month-owner")).toBe("3 Month failed");
  });

  it("clears only the clicked plan error before retry", () => {
    const before = setPlanCheckoutError({}, "one-time-friend", "old error");
    const after = clearPlanCheckoutError(before, "one-time-friend");
    expect(after).toEqual({});
  });
});

describe("per-plan config error lookup", () => {
  it("maps config errors by plan id only", () => {
    const config = {
      "one-time-owner": "Missing one-time price",
      "3-month-owner": null,
      "1-year-owner": null,
    };
    expect(planConfigErrorForPlan(config, "one-time-owner")).toBe("Missing one-time price");
    expect(planConfigErrorForPlan(config, "3-month-owner")).toBeNull();
    expect(planConfigErrorForPlan(config, "1-year-owner")).toBeNull();
  });
});

describe("per-plan loading state", () => {
  it("shows loading only on the clicked plan", () => {
    expect(isPlanCheckoutLoading("3-month-owner", "3-month-owner")).toBe(true);
    expect(isPlanCheckoutLoading("3-month-owner", "one-time-owner")).toBe(false);
    expect(isPlanCheckoutLoading(null, "3-month-owner")).toBe(false);
  });
});

describe("Stripe plan/env mapping for checkout requests", () => {
  const env = {
    STRIPE_SECRET_KEY: "sk_test_x",
    NEXT_PUBLIC_SITE_URL: "https://example.com",
    STRIPE_PARENT_ONE_TIME_PRICE_ID: "price_parent_one_time",
    STRIPE_PARENT_PRICE_ID: "price_parent_3m",
    STRIPE_PARENT_ONE_YEAR_PRICE_ID: "price_parent_1y",
    STRIPE_FRIEND_ONE_TIME_PRICE_ID: "price_friend_one_time",
    STRIPE_FRIEND_PRICE_ID: "price_friend_3m",
    STRIPE_FRIEND_ONE_YEAR_PRICE_ID: "price_friend_1y",
  };

  beforeEach(() => {
    for (const [key, value] of Object.entries(env)) {
      process.env[key] = value;
    }
  });

  afterEach(() => {
    for (const key of Object.keys(env)) {
      delete process.env[key];
    }
  });

  for (const planId of PLANS) {
    it(`selects the dedicated env var for ${planId}`, () => {
      expect(stripePriceEnvVarForPlanId(planId)).toBe(STRIPE_PRICE_ENV_BY_PLAN[planId]);
      expect(resolveStripePriceId(planId)).toBe(process.env[STRIPE_PRICE_ENV_BY_PLAN[planId]]);
    });
  }

  it("keeps 3-month checkout on subscription mode", () => {
    expect(stripeCheckoutModeForPlanId("3-month-owner")).toBe("subscription");
    expect(stripeCheckoutModeForPlanId("3-month-friend")).toBe("subscription");
  });
});
