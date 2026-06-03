import { PricingSection } from "@/sections/PricingSection";
import { redirectIfAuthenticated } from "@/lib/auth-session-redirect";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
};

export default async function PricingPage() {
  await redirectIfAuthenticated();

  return (
    <PricingSection />
  );
}
