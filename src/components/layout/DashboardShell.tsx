"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { sidebarSectionsForActiveMode } from "@/lib/account-nav";
import { resolveActiveMode, sidebarModeControlForProfile } from "@/lib/profile-mode";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { DashboardAccountNavStrip } from "@/components/dashboard/DashboardAccountNavStrip";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { Button } from "@/components/ui/Button";
import { isProfileOwnedByUser } from "@/lib/profile-session-guard";
import { useActiveModeSwitch } from "@/hooks/useActiveModeSwitch";
import {
  dashboardBreadcrumbFromPath,
  type DashboardBreadcrumbParent,
} from "@/lib/dashboard-breadcrumb";
import { useLanguage } from "@/context/LanguageContext";
import {
  ACCOUNT_CALLOUT_CLASS,
  ACCOUNT_CONTENT_STACK,
  ACCOUNT_LAYOUT_GRID,
  ACCOUNT_LAYOUT_GRID_WITH_ASIDE,
  ACCOUNT_LAYOUT_PADDING,
  ACCOUNT_LAYOUT_SHELL,
  ACCOUNT_PAGE_DESCRIPTION,
  ACCOUNT_PAGE_HEADER_EYEBROW,
  ACCOUNT_PAGE_TITLE,
} from "@/lib/account-ui";
import { installClickBlockerDiagnostic } from "@/lib/dev/click-blocker-diagnostic";

type DashboardShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  /** Sticky right column on dashboard (profile metrics, contact). */
  rightAside?: React.ReactNode;
  /** Hide "Complete your profile" banner (e.g. on My pets / Add pet). */
  hideCompleteProfileBanner?: boolean;
  /** Override auto-detected breadcrumb current segment label. */
  breadcrumbTitle?: string;
  /** Optional middle segment between Dashboard and current page. */
  breadcrumbParent?: DashboardBreadcrumbParent;
  /** Fallback when browser history is empty (default `/dashboard`). */
  backHref?: string;
  /** Force-hide breadcrumb even on subpages. */
  hideBreadcrumb?: boolean;
  /** Skip default page title block in main column (e.g. full-bleed messages). */
  hideMainPageHeader?: boolean;
};

export function DashboardShell({
  children,
  title,
  description,
  rightAside,
  hideCompleteProfileBanner = false,
  breadcrumbTitle,
  breadcrumbParent,
  backHref,
  hideBreadcrumb = false,
  hideMainPageHeader = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    profile,
    loading: profileLoading,
    displayName,
    isIncomplete,
    needsRoleOnboarding: rolePending,
  } = useProfile();
  const resolvedActiveMode = profile
    ? resolveActiveMode(profile.role, profile.active_mode)
    : null;
  const sidebarSections = sidebarSectionsForActiveMode(resolvedActiveMode);
  const modeControl = sidebarModeControlForProfile(profile, t.account);
  const { switchingMode, modeError, handleModeSwitch } = useActiveModeSwitch();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => installClickBlockerDiagnostic(), []);

  useEffect(() => {
    if (authLoading || profileLoading || !user || !profile) return;
    if (!isProfileOwnedByUser(profile.id, user.id)) {
      void signOut().then(() => {
        window.location.replace("/login?error=profile_session");
      });
    }
  }, [authLoading, profileLoading, user, profile, signOut]);

  const email = user?.email ?? null;
  const onProfileFormPage =
    pathname.startsWith("/profile/setup") || pathname.startsWith("/profile/edit");
  const showCompleteProfile =
    !hideCompleteProfileBanner &&
    Boolean(user) &&
    !authLoading &&
    !profileLoading &&
    !rolePending &&
    isIncomplete &&
    !onProfileFormPage;

  const autoBreadcrumb = dashboardBreadcrumbFromPath(t.account.breadcrumb, pathname, searchParams);
  const isDashboardHome = pathname === DASHBOARD_PATH;
  const showBreadcrumb = !hideBreadcrumb && !isDashboardHome;
  const crumbTitle = breadcrumbTitle ?? autoBreadcrumb?.title ?? title;
  const crumbParent = breadcrumbParent ?? autoBreadcrumb?.parent;
  const showDashboardRightAside = isDashboardHome && Boolean(rightAside);
  const showMainPageHeader = !hideMainPageHeader;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={`${ACCOUNT_LAYOUT_SHELL} ${ACCOUNT_LAYOUT_PADDING}`}>
      <div className="mb-6">
        <p className={ACCOUNT_PAGE_HEADER_EYEBROW}>{t.account.eyebrow}</p>
      </div>

      {showCompleteProfile ? (
        <div className={`${ACCOUNT_CALLOUT_CLASS} mb-6 p-4`}>
          <p className="font-heading text-sm font-semibold text-foreground">{t.account.completeProfileTitle}</p>
          <p className="mt-1 text-sm text-muted">{t.account.completeProfileBody}</p>
          <Button href="/profile/setup" size="sm" className="mt-3">
            {t.account.completeProfileCta}
          </Button>
        </div>
      ) : null}

      <div
        className={
          showDashboardRightAside ? ACCOUNT_LAYOUT_GRID_WITH_ASIDE : ACCOUNT_LAYOUT_GRID
        }
      >
        <AccountSidebar
          userId={user?.id ?? null}
          profile={profile}
          displayName={displayName}
          email={email}
          authLoading={authLoading}
          profileLoading={profileLoading}
          sidebarSections={sidebarSections}
          pathname={pathname}
          searchParams={searchParams}
          t={t}
          modeControl={modeControl}
          switchingMode={switchingMode}
          modeError={modeError}
          loggingOut={loggingOut}
          onModeSwitch={handleModeSwitch}
          onLogout={handleLogout}
        />

        <div className="min-w-0">
          <DashboardAccountNavStrip activeMode={resolvedActiveMode} />
          {showBreadcrumb ? (
            <DashboardBreadcrumb
              title={crumbTitle}
              parent={crumbParent}
              backHref={backHref}
              dashboardLabel={t.navbar.dashboard}
              goBackLabel={t.account.goBack}
              breadcrumbAriaLabel={t.account.breadcrumbAriaLabel}
            />
          ) : null}
          {showMainPageHeader ? (
            <header className={showBreadcrumb ? "mt-1" : undefined}>
              <h1 className={ACCOUNT_PAGE_TITLE}>{title}</h1>
              {description ? <p className={ACCOUNT_PAGE_DESCRIPTION}>{description}</p> : null}
            </header>
          ) : null}
          <div className={showMainPageHeader ? ACCOUNT_CONTENT_STACK : undefined}>{children}</div>
        </div>

        {showDashboardRightAside ? (
          <aside
            aria-label={t.account.accountInsightsAriaLabel}
            className="min-w-0 space-y-4 sm:space-y-5 lg:sticky lg:top-24 lg:self-start"
          >
            {rightAside}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
