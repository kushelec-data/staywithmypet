"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { CopyPublicProfileLinkButton } from "@/components/profile/CopyPublicProfileLinkButton";
import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProfileEditPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || profileLoading || !user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        Loading profile…
      </div>
    );
  }

  return (
    <DashboardShell
      title="My profile"
      description="Tell us about yourself, your lifestyle, and why you want to spend time with pets."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </p>
        {profile?.is_public ? (
          <CopyPublicProfileLinkButton profileId={profile.id} size="sm" />
        ) : null}
      </div>
      <ProfileSetupForm submitLabel="Save changes" hideRolePicker />
    </DashboardShell>
  );
}
