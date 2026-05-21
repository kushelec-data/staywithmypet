import { HowItWorksPageClient } from "./HowItWorksPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "How it works | StayWithMyPet" },
};

export default function HowItWorksPage() {
  return <HowItWorksPageClient />;
}
