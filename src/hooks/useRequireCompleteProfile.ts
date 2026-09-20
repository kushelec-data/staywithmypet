"use client";

import { DASHBOARD_PATH, ROLE_ONBOARDING_PATH } from "@/lib/auth-routing";
import { isEnablingSecondRole, parseProfileSetupEnableParam } from "@/lib/profile-mode";
import { isProfileFormPath, shouldRedirectIncompleteProfileToSetup } from "@/lib/profile-route-guard";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const SETUP_PATH = "/profile/setup";

export function useRequireCompleteProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const {
    profile,
    isIncomplete,
    loading: profileLoading,
    profileResolved,
    needsRoleOnboarding: rolePending,
    sessionError,
  } = useProfile();

  const onRoleOnboardingPage =
    pathname === ROLE_ONBOARDING_PATH || pathname.startsWith(`${ROLE_ONBOARDING_PATH}/`);

  const onProfileFormPage = isProfileFormPath(pathname);
  const redirectIncompleteToSetup = shouldRedirectIncompleteProfileToSetup(pathname);
  const enableMode = parseProfileSetupEnableParam(searchParams.get("enable"));
  const enablingSecondRole = isEnablingSecondRole(profile, enableMode);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) return;
    if (sessionError) return;

    if (profileResolved && !profile && !rolePending && !onProfileFormPage && !onRoleOnboardingPage) {
      router.replace(SETUP_PATH);
      return;
    }

    if (rolePending && !onRoleOnboardingPage) {
      router.replace(ROLE_ONBOARDING_PATH);
      return;
    }

    if (!rolePending && onRoleOnboardingPage) {
      router.replace(DASHBOARD_PATH);
      return;
    }

    if (isIncomplete && redirectIncompleteToSetup) {
      router.replace(SETUP_PATH);
      return;
    }

    if (!isIncomplete && pathname === SETUP_PATH && !enablingSecondRole) {
      router.replace(DASHBOARD_PATH);
    }
  }, [
    authLoading,
    profileLoading,
    profileResolved,
    profile,
    sessionError,
    user,
    rolePending,
    isIncomplete,
    onRoleOnboardingPage,
    onProfileFormPage,
    redirectIncompleteToSetup,
    pathname,
    router,
    enablingSecondRole,
  ]);

  const redirectToRole = rolePending && !onRoleOnboardingPage;
  const redirectFromRole = !rolePending && onRoleOnboardingPage;
  const redirectToSetup = !rolePending && isIncomplete && redirectIncompleteToSetup;
  const redirectFromSetup =
    !rolePending && !isIncomplete && pathname === SETUP_PATH && !enablingSecondRole;

  const pendingRedirect =
    Boolean(user) &&
    !authLoading &&
    !profileLoading &&
    (redirectToRole || redirectFromRole || redirectToSetup || redirectFromSetup);

  return {
    ready: !authLoading && !profileLoading && !pendingRedirect,
    isIncomplete,
    onSetupPage: pathname === SETUP_PATH || pathname.startsWith(`${SETUP_PATH}/`),
  };
}
