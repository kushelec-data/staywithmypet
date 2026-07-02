import { CommonLoadingFallback } from "@/components/i18n/SuspenseFallbacks";
import { MembershipPageContent } from "@/components/membership/MembershipPageContent";
import { logStripeEnvPresence } from "@/lib/debug-stripe-env";
import {
  stripeCheckoutErrorsForRole,
  stripeCheckoutReadyForRole,
} from "@/lib/stripe-plans";
import { isMembershipWebhookWritable } from "@/lib/stripe-webhook-config";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Membership & Pricing",
};

/** Read Stripe/Supabase env at request time (not static build) for post-checkout banners. */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function MembershipPage() {
  await connection();
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
    <>
      <div
        style={{
          background: "red",
          color: "white",
          padding: 30,
          fontSize: 40,
          fontWeight: "bold",
        }}
      >
        THIS IS MEMBERSHIP PAGE FROM COMMIT fe6d54d
      </div>
      <Suspense fallback={<CommonLoadingFallback />}>
        <MembershipPageContent
          stripeCheckoutByRole={stripeCheckoutByRole}
          stripePlanErrorsByRole={stripePlanErrorsByRole}
          membershipWebhookWritable={isMembershipWebhookWritable()}
        />
      </Suspense>
    </>
  );
}
