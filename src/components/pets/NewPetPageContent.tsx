"use client";

import { AccountLayout } from "@/components/account/AccountLayout";
import { NewPetForm } from "@/components/pets/NewPetForm";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import { dashboardCapabilitiesForActiveMode } from "@/lib/account-nav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function NewPetPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { t } = useLanguage();
  const pets = t.account.petsPage;
  const caps = dashboardCapabilitiesForActiveMode(profile?.active_mode);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profileLoading || !user) return;
    if (!caps.showAddPet) {
      router.replace(DASHBOARD_PATH);
    }
  }, [profileLoading, user, caps.showAddPet, router]);

  if (authLoading || profileLoading || !user || !caps.showAddPet) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        {t.common.loading}
      </div>
    );
  }

  return (
    <AccountLayout
      title={pets.createTitle}
      description={pets.createDescription}
      hideCompleteProfileBanner
    >
      <NewPetForm />
    </AccountLayout>
  );
}
