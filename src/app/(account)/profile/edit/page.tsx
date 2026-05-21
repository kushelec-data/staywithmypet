import { ProfileEditPageContent } from "@/components/profile/ProfileEditPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit profile",
};

export default function ProfileEditPage() {
  return <ProfileEditPageContent />;
}
