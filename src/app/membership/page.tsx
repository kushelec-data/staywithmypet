import { MembershipPageContent } from "@/components/membership/MembershipPageContent";
import {
  stripeCheckoutErrorsForRole,
  stripeCheckoutReadyForRole,
} from "@/lib/stripe-plans";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Membership & Pricing",
};

export default function MembershipPage() {
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
      />
    </Suspense>
  );
}
