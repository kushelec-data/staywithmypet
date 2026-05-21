"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProfileSetupPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        Loading…
      </div>
    );
  }

  return (
    <DashboardShell
      title="Set up your profile"
      description="Tell the community who you are so Pet Parents and Pet Friends can connect with you."
    >
      <ProfileSetupForm submitLabel="Save and go to dashboard" hideRolePicker />
    </DashboardShell>
  );
}
