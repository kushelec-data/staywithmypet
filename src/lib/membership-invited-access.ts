/** Plan cards + Stripe checkout props for the account membership page. */
export function resolveMembershipPlanCheckoutProps(input: {
  stripeEnabled: boolean;
  stripePayEnabled: boolean;
  isActive: boolean;
}): {
  enableStripeCheckout: boolean;
} {
  if (!input.stripeEnabled) {
    return { enableStripeCheckout: false };
  }

  return {
    enableStripeCheckout: !input.isActive && input.stripePayEnabled,
  };
}

/** Membership page never auto-starts Stripe; checkout is user-initiated only. */
export const MEMBERSHIP_AUTO_STRIPE_CHECKOUT_ON_LOAD = false;
