"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import { MyPetsList } from "@/components/pets/MyPetsList";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import { dashboardCapabilitiesForActiveMode } from "@/lib/account-nav";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function MyPetsPageContent() {
  const { t } = useLanguage();
  const mp = t.account.myPets;
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
        {t.account.loading}
      </div>
    );
  }

  return (
    <AccountLayout
      title={mp.pageTitle}
      description={mp.pageDescription}
      hideCompleteProfileBanner
    >
      <AccountCard className="p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">{mp.heading}</h2>
          <Button href="/pets/new" size="sm">
            {t.account.nav.addPet}
          </Button>
        </div>
        <MyPetsList userId={user.id} />
      </AccountCard>
    </AccountLayout>
  );
}
