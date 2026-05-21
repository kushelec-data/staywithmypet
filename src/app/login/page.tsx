import { AuthForm } from "@/components/auth/AuthForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Log In",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
