"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { MyPetsList } from "@/components/pets/MyPetsList";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import { dashboardCapabilitiesForActiveMode } from "@/lib/account-nav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function MyPetsPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const caps = dashboardCapabilitiesForActiveMode(profile?.active_mode);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!profileLoading && user && !caps.showMyPets) {
      router.replace(DASHBOARD_PATH);
    }
  }, [profileLoading, user, caps.showMyPets, router]);

  if (authLoading || profileLoading || !user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        Loading…
      </div>
    );
  }

  return (
    <DashboardShell
      title="My pets"
      description="Manage your pet profiles and care listings."
      hideCompleteProfileBanner
    >
      <div className="card-elevated rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">My pets</h2>
          <Button href="/pets/new" size="sm">
            Add pet
          </Button>
        </div>
        <MyPetsList userId={user.id} />
      </div>
    </DashboardShell>
  );
}
