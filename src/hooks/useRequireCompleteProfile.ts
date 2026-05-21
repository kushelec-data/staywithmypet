"use client";

import { DASHBOARD_PATH, ROLE_ONBOARDING_PATH } from "@/lib/auth-routing";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const SETUP_PATH = "/profile/setup";
const EDIT_PATH = "/profile/edit";

/** Pet parent flows must not redirect to user profile setup. */
function isPetsAreaPath(pathname: string): boolean {
  return pathname === "/pets" || pathname.startsWith("/pets/");
}

/** Public marketing pages — always reachable without a complete profile. */
function isPublicMarketingPath(pathname: string): boolean {
  return (
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/faq" ||
    pathname === "/how-it-works" ||
    pathname === "/articles" ||
    pathname.startsWith("/articles/") ||
    pathname === "/care" ||
    pathname.startsWith("/care/")
  );
}

/** Account utility pages reachable before profile is fully complete. */
function isAllowedIncompletePath(pathname: string): boolean {
  return (
    isPublicMarketingPath(pathname) ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/requests" ||
    pathname === "/membership" ||
    pathname.startsWith("/membership/") ||
    pathname === "/pricing" ||
    pathname.startsWith("/pricing/") ||
    pathname === "/change-password" ||
    pathname.startsWith("/change-password/") ||
    pathname === "/saved" ||
    pathname === "/preferences" ||
    pathname === "/gallery" ||
    pathname === "/find-pets" ||
    pathname.startsWith("/find-pets/") ||
    pathname === "/find-care" ||
    pathname.startsWith("/find-care/") ||
    pathname === "/pet" ||
    pathname.startsWith("/pet/")
  );
}

export function useRequireCompleteProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { profile, isIncomplete, loading: profileLoading, needsRoleOnboarding: rolePending } = useProfile();

  const onRoleOnboardingPage =
    pathname === ROLE_ONBOARDING_PATH || pathname.startsWith(`${ROLE_ONBOARDING_PATH}/`);

  const onProfileFormPage =
    pathname === SETUP_PATH ||
    pathname.startsWith(`${SETUP_PATH}/`) ||
    pathname === EDIT_PATH ||
    pathname.startsWith(`${EDIT_PATH}/`);

  const onDashboard = pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);
  const onPetsArea = isPetsAreaPath(pathname);
  const onAllowedIncomplete = isAllowedIncompletePath(pathname);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) return;

    if (rolePending && !onRoleOnboardingPage) {
      router.replace(ROLE_ONBOARDING_PATH);
      return;
    }

    if (!rolePending && onRoleOnboardingPage) {
      router.replace(DASHBOARD_PATH);
      return;
    }

    if (
      isIncomplete &&
      !onProfileFormPage &&
      !onDashboard &&
      !onPetsArea &&
      !onAllowedIncomplete
    ) {
      router.replace(SETUP_PATH);
      return;
    }

    if (!isIncomplete && pathname === SETUP_PATH) {
      router.replace(DASHBOARD_PATH);
    }
  }, [
    authLoading,
    profileLoading,
    user,
    rolePending,
    isIncomplete,
    onRoleOnboardingPage,
    onProfileFormPage,
    onDashboard,
    onPetsArea,
    onAllowedIncomplete,
    pathname,
    router,
  ]);

  const redirectToRole = rolePending && !onRoleOnboardingPage;
  const redirectFromRole = !rolePending && onRoleOnboardingPage;
  const redirectToSetup =
    !rolePending &&
    isIncomplete &&
    !onProfileFormPage &&
    !onDashboard &&
    !onPetsArea &&
    !onAllowedIncomplete;
  const redirectFromSetup = !rolePending && !isIncomplete && pathname === SETUP_PATH;

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
