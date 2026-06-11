"use client";

import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_BODY_TEXT } from "@/lib/account-ui";
import { CopyPublicProfileLinkButton } from "@/components/profile/CopyPublicProfileLinkButton";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProfileEditPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const pe = t.profileEdit;
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || profileLoading || !user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        {t.account.loadingProfile}
      </div>
    );
  }

  return (
    <AccountLayout
      title={pe.pageTitle}
      description={pe.pageDescription}
      breadcrumbTitle={pe.pageTitle}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className={ACCOUNT_BODY_TEXT}>
          {pe.signedInAs}{" "}
          <span className="font-medium text-foreground">{user.email}</span>
        </p>
        {profile?.is_public ? (
          <CopyPublicProfileLinkButton profileId={profile.id} size="sm" />
        ) : null}
      </div>
      <ProfileEditForm />
    </AccountLayout>
  );
}
