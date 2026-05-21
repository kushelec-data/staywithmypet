import { PricingSection } from "@/sections/PricingSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return <PricingSection />;
}
