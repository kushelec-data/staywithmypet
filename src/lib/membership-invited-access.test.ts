import { describe, expect, it } from "vitest";
import {
  invitedTestAccessCodeHref,
  MEMBERSHIP_AUTO_STRIPE_CHECKOUT_ON_LOAD,
  resolveMembershipPlanCheckoutProps,
} from "@/lib/membership-invited-access";

describe("resolveMembershipPlanCheckoutProps", () => {
  it("enables Stripe checkout and invited section when Stripe is on and user has no active membership", () => {
    const result = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: true,
      isActive: false,
    });

    expect(result.enableStripeCheckout).toBe(true);
    expect(result.useTestAccessFlowOnCards).toBe(false);
    expect(result.showInvitedAccessSection).toBe(true);
  });

  it("shows invited access section even when Stripe checkout is blocked by config", () => {
    const result = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: false,
      isActive: false,
    });

    expect(result.enableStripeCheckout).toBe(false);
    expect(result.showInvitedAccessSection).toBe(true);
  });

  it("does not tie invited access section to Stripe being disabled", () => {
    const stripeOff = resolveMembershipPlanCheckoutProps({
      stripeEnabled: false,
      stripePayEnabled: false,
      isActive: false,
    });
    const stripeOn = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: true,
      isActive: false,
    });

    expect(stripeOff.showInvitedAccessSection).toBe(true);
    expect(stripeOn.showInvitedAccessSection).toBe(true);
    expect(stripeOff.useTestAccessFlowOnCards).toBe(true);
    expect(stripeOn.useTestAccessFlowOnCards).toBe(false);
  });

  it("hides both checkout paths when membership is already active", () => {
    const result = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: true,
      isActive: true,
    });

    expect(result.enableStripeCheckout).toBe(false);
    expect(result.useTestAccessFlowOnCards).toBe(false);
    expect(result.showInvitedAccessSection).toBe(false);
  });
});

describe("invitedTestAccessCodeHref", () => {
  it("links Pet Friend to the 3-month friend test-access-code page", () => {
    expect(invitedTestAccessCodeHref("pet_friend")).toBe(
      "/test-access-code?planId=3-month-friend&role=friend",
    );
  });

  it("links Pet Parent to the 3-month owner test-access-code page", () => {
    expect(invitedTestAccessCodeHref("pet_parent")).toBe(
      "/test-access-code?planId=3-month-owner&role=parent",
    );
  });
});

describe("membership Stripe auto-checkout", () => {
  it("does not auto-start Stripe when the membership page loads", () => {
    expect(MEMBERSHIP_AUTO_STRIPE_CHECKOUT_ON_LOAD).toBe(false);
  });
});

describe("dual membership controls when Stripe is enabled", () => {
  it("exposes both Stripe plan checkout and invited access entry for inactive users", () => {
    const ui = resolveMembershipPlanCheckoutProps({
      stripeEnabled: true,
      stripePayEnabled: true,
      isActive: false,
    });

    expect(ui.enableStripeCheckout).toBe(true);
    expect(ui.showInvitedAccessSection).toBe(true);
  });
});
