import { ChangePasswordPageContent } from "@/components/account/ChangePasswordPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Change password",
};

export default function ChangePasswordPage() {
  return <ChangePasswordPageContent />;
}
