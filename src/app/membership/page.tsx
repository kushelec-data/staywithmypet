import { MembershipPageContent } from "@/components/membership/MembershipPageContent";
import { logStripeEnvPresence } from "@/lib/debug-stripe-env";
import {
  stripeCheckoutErrorsForRole,
  stripeCheckoutReadyForRole,
} from "@/lib/stripe-plans";
import { isMembershipWebhookWritable } from "@/lib/stripe-webhook-config";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Membership & Pricing",
};

/** Read Stripe/Supabase env at request time (not static build) for post-checkout banners. */
export const dynamic = "force-dynamic";

export default function MembershipPage() {
  logStripeEnvPresence("membership-page");

  const stripeCheckoutByRole = {
    pet_parent: stripeCheckoutReadyForRole("pet_parent"),
    pet_friend: stripeCheckoutReadyForRole("pet_friend"),
  };
  const stripePlanErrorsByRole = {
    pet_parent: stripeCheckoutErrorsForRole("pet_parent"),
    pet_friend: stripeCheckoutErrorsForRole("pet_friend"),
  };

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
          Loading…
        </div>
      }
    >
      <MembershipPageContent
        stripeCheckoutByRole={stripeCheckoutByRole}
        stripePlanErrorsByRole={stripePlanErrorsByRole}
        membershipWebhookWritable={isMembershipWebhookWritable()}
      />
    </Suspense>
  );
}
