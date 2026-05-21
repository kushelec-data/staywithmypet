import { MembershipPageContent } from "@/components/membership/MembershipPageContent";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Membership & Pricing",
};

export default function MembershipPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
          Loading…
        </div>
      }
    >
      <MembershipPageContent />
    </Suspense>
  );
}
