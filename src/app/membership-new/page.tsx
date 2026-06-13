import { TestPetParentCheckoutButton } from "@/components/membership-new/TestPetParentCheckoutButton";
import { MEMBERSHIP_PLAN_CATALOG } from "@/lib/membership";
import { hasServerEnv } from "@/lib/server-env";
import { isStripeCheckoutEnabled } from "@/lib/stripe-feature";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TEST_PET_PARENT_PLAN_ID = MEMBERSHIP_PLAN_CATALOG.pet_parent[0]!.id;

function envPresentLabel(name: string): string {
  return hasServerEnv(name) ? "yes" : "no";
}

export default async function MembershipNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const stripeEnabled = isStripeCheckoutEnabled();

  return (
    <main style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Membership (test)</h1>
      <p>NEXT_PUBLIC_ENABLE_STRIPE: {stripeEnabled ? "enabled" : "disabled (test access code)"}</p>
      {!stripeEnabled ? (
        <p>
          Stripe checkout is off. Use{" "}
          <Link href="/membership">/membership</Link> or{" "}
          <Link href="/test-access-code">/test-access-code</Link>.
        </p>
      ) : null}
      <p>STRIPE_SECRET_KEY present: {envPresentLabel("STRIPE_SECRET_KEY")}</p>
      <p>STRIPE_PARENT_PRICE_ID present: {envPresentLabel("STRIPE_PARENT_PRICE_ID")}</p>
      <p>STRIPE_FRIEND_PRICE_ID present: {envPresentLabel("STRIPE_FRIEND_PRICE_ID")}</p>
      <p>Test plan: {TEST_PET_PARENT_PLAN_ID}</p>
      {user ? (
        <TestPetParentCheckoutButton userId={user.id} planId={TEST_PET_PARENT_PLAN_ID} />
      ) : (
        <p>Sign in to test checkout.</p>
      )}
    </main>
  );
}
