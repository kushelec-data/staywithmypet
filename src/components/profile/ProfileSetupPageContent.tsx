"use client";

import { AccountLayout } from "@/components/account/AccountLayout";
import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProfileSetupPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const setup = t.account.profileSetup;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        {t.common.loading}
      </div>
    );
  }

  return (
    <AccountLayout title={setup.pageTitle} description={setup.pageDescription}>
      <ProfileSetupForm submitLabel={setup.submitLabel} hideRolePicker />
    </AccountLayout>
  );
}
