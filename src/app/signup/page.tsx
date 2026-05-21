import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
