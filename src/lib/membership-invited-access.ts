import type { MembershipRole } from "@/lib/membership";

/** Plan cards + Stripe checkout props for the account membership page. */
export function resolveMembershipPlanCheckoutProps(input: {
  stripeEnabled: boolean;
  stripePayEnabled: boolean;
  isActive: boolean;
}): {
  enableStripeCheckout: boolean;
  useTestAccessFlowOnCards: boolean;
  showInvitedAccessSection: boolean;
} {
  const showInvitedAccessSection = !input.isActive;

  if (!input.stripeEnabled) {
    return {
      enableStripeCheckout: false,
      useTestAccessFlowOnCards: !input.isActive,
      showInvitedAccessSection,
    };
  }

  return {
    enableStripeCheckout: !input.isActive && input.stripePayEnabled,
    useTestAccessFlowOnCards: false,
    showInvitedAccessSection,
  };
}

/** Invited test-user entry — independent of NEXT_PUBLIC_ENABLE_STRIPE. */
export function invitedTestAccessCodeHref(role: MembershipRole): string {
  const planId = role === "pet_parent" ? "3-month-owner" : "3-month-friend";
  const roleQuery = role === "pet_parent" ? "parent" : "friend";
  return `/test-access-code?planId=${encodeURIComponent(planId)}&role=${roleQuery}`;
}

/** Membership page never auto-starts Stripe; checkout is user-initiated only. */
export const MEMBERSHIP_AUTO_STRIPE_CHECKOUT_ON_LOAD = false;
