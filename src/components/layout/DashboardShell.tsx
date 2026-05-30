"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { headerNavForActiveMode, sidebarSectionsForActiveMode } from "@/lib/account-nav";
import { resolveActiveMode, sidebarModeActionForProfile } from "@/lib/profile-mode";
import { searchHrefForActiveMode } from "@/lib/role-mode-search";
import { performActiveModeSwitch } from "@/lib/switch-active-mode";
import { createClient } from "@/lib/supabase";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { DashboardAccountNavStrip } from "@/components/dashboard/DashboardAccountNavStrip";
import { DashboardHeaderNavLink } from "@/components/dashboard/DashboardHeaderNavLink";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { Button } from "@/components/ui/Button";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import { isProfileOwnedByUser } from "@/lib/profile-session-guard";
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
    refreshProfile,
    setProfileRow,
  } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const resolvedActiveMode = profile
    ? resolveActiveMode(profile.role, profile.active_mode)
    : null;
  const sidebarSections = sidebarSectionsForActiveMode(resolvedActiveMode);
  const headerNav = headerNavForActiveMode(resolvedActiveMode);
  const modeAction = sidebarModeActionForProfile(profile);
  const [loggingOut, setLoggingOut] = useState(false);
  const [switchingMode, setSwitchingMode] = useState<string | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

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

  const autoBreadcrumb = dashboardBreadcrumbFromPath(pathname, searchParams);
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

  const isMembershipRoute =
    pathname === "/membership" || pathname.startsWith("/membership/");

  async function handleModeSwitch(targetMode: "pet_parent" | "pet_friend") {
    if (!user || switchingMode) return;
    if (!profile) {
      setModeError("Profile is still loading. Please try again.");
      return;
    }
    if (resolveActiveMode(profile.role, profile.active_mode) === targetMode) return;

    setSwitchingMode(targetMode);
    setModeError(null);
    try {
      await performActiveModeSwitch({
        supabase,
        user,
        profile,
        targetMode,
        setProfileRow,
        refreshProfile,
      });
      if (isMembershipRoute) {
        router.refresh();
      } else {
        router.push(searchHrefForActiveMode(targetMode));
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not switch mode.";
      setModeError(message);
    } finally {
      setSwitchingMode(null);
    }
  }

  return (
    <div className={`${ACCOUNT_LAYOUT_SHELL} ${ACCOUNT_LAYOUT_PADDING}`}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <p className={ACCOUNT_PAGE_HEADER_EYEBROW}>Your account</p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {headerNav.map((item) => (
            <DashboardHeaderNavLink key={item.href} item={item} />
          ))}
        </div>
      </div>

      {showCompleteProfile ? (
        <div className={`${ACCOUNT_CALLOUT_CLASS} mb-6 p-4`}>
          <p className="font-heading text-sm font-semibold text-foreground">Complete your profile</p>
          <p className="mt-1 text-sm text-muted">
            Add your details so Pet Parents and Pet Friends can trust and connect with you.
          </p>
          <Button href="/profile/setup" size="sm" className="mt-3">
            Complete profile
          </Button>
        </div>
      ) : null}

      <div
        className={
          showDashboardRightAside ? ACCOUNT_LAYOUT_GRID_WITH_ASIDE : ACCOUNT_LAYOUT_GRID
        }
      >
        <AccountSidebar
          profile={profile}
          displayName={displayName}
          email={email}
          authLoading={authLoading}
          profileLoading={profileLoading}
          sidebarSections={sidebarSections}
          pathname={pathname}
          searchParams={searchParams}
          navbarT={t.navbar}
          modeAction={modeAction}
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
            aria-label="Account insights"
            className="min-w-0 space-y-4 sm:space-y-5 lg:sticky lg:top-24 lg:self-start"
          >
            {rightAside}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
