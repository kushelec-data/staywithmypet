"use client";

import { AccountLayout } from "@/components/account/AccountLayout";
import { NewPetForm } from "@/components/pets/NewPetForm";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import { dashboardCapabilitiesForActiveMode } from "@/lib/account-nav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type EditPetPageContentProps = {
  petId: string;
};

export function EditPetPageContent({ petId }: EditPetPageContentProps) {
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
    if (profileLoading || !user) return;
    if (!caps.showMyPets) {
      router.replace(DASHBOARD_PATH);
    }
  }, [profileLoading, user, caps.showMyPets, router]);

  if (authLoading || profileLoading || !user || !caps.showMyPets) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        Loading…
      </div>
    );
  }

  return (
    <AccountLayout
      title="Edit pet profile"
      description="Update your pet's details, care needs, and photos."
      hideCompleteProfileBanner
    >
      <NewPetForm petId={petId} />
    </AccountLayout>
  );
}
