import { ProfileSetupPageContent } from "@/components/profile/ProfileSetupPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set up profile",
};

export default function ProfileSetupPage() {
  return <ProfileSetupPageContent />;
}
