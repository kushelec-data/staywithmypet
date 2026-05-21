import { AuthForm } from "@/components/auth/AuthForm";
import { redirectIfAuthenticated } from "@/lib/auth-session-redirect";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default async function SignupPage() {
  await redirectIfAuthenticated();

  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
