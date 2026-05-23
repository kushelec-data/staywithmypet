import { MembershipPageContent } from "@/components/membership/MembershipPageContent";
import { logStripeEnvPresence } from "@/lib/debug-stripe-env";
import { loadMembershipActivationDebug } from "@/lib/membership-page-debug";
import {
  checkoutDebugMetaByRole,
  stripeCheckoutErrorsForRole,
  stripeCheckoutReadyForRole,
} from "@/lib/stripe-plans";
import type { MembershipRole } from "@/lib/membership";
import { isMembershipWebhookWritable } from "@/lib/stripe-webhook-config";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Membership & Pricing",
};

/** Read Stripe/Supabase env at request time (not static build) for post-checkout banners. */
export const dynamic = "force-dynamic";

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
  const debugCheckoutMetaByRole = {
    pet_parent: checkoutDebugMetaByRole("pet_parent"),
    pet_friend: checkoutDebugMetaByRole("pet_friend"),
  } satisfies Record<MembershipRole, ReturnType<typeof checkoutDebugMetaByRole>>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const activationDebug = user ? await loadMembershipActivationDebug(user.id) : null;

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
        debugCheckoutMetaByRole={debugCheckoutMetaByRole}
        membershipWebhookWritable={isMembershipWebhookWritable()}
        activationDebug={activationDebug}
      />
    </Suspense>
  );
}
