import { RoleOnboardingContent } from "@/components/onboarding/RoleOnboardingContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose your role",
};

export default function RoleOnboardingPage() {
  return <RoleOnboardingContent />;
}
