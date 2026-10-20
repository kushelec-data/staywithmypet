import { describe, expect, it } from "vitest";
import {
  MEMBERSHIP_AUTO_STRIPE_CHECKOUT_ON_LOAD,
  resolveMembershipPlanCheckoutProps,
} from "@/lib/membership-invited-access";

describe("resolveMembershipPlanCheckoutProps", () => {
  it("enables Stripe checkout when Stripe is on and user has no active membership", () => {
    const result = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: true,
      isActive: false,
    });

    expect(result.enableStripeCheckout).toBe(true);
  });

  it("disables Stripe checkout when Stripe config is incomplete", () => {
    const result = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: false,
      isActive: false,
    });

    expect(result.enableStripeCheckout).toBe(false);
  });

  it("does not offer a test-access-code checkout path when Stripe is disabled", () => {
    const stripeOff = resolveMembershipPlanCheckoutProps({
      stripeEnabled: false,
      stripePayEnabled: false,
      isActive: false,
    });

    expect(stripeOff.enableStripeCheckout).toBe(false);
    expect(stripeOff).not.toHaveProperty("useTestAccessFlowOnCards");
    expect(stripeOff).not.toHaveProperty("showInvitedAccessSection");
  });

  it("disables checkout when membership is already active", () => {
    const result = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: true,
      isActive: true,
    });

    expect(result.enableStripeCheckout).toBe(false);
  });
});

describe("membership Stripe auto-checkout", () => {
  it("does not auto-start Stripe when the membership page loads", () => {
    expect(MEMBERSHIP_AUTO_STRIPE_CHECKOUT_ON_LOAD).toBe(false);
  });
});
