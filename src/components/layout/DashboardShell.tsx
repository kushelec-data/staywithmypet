"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { headerNavForActiveMode, isSidebarLinkActive, sidebarNavForActiveMode } from "@/lib/account-nav";
import { resolveActiveMode, sidebarModeActionForProfile } from "@/lib/profile-mode";
import { searchHrefForActiveMode } from "@/lib/role-mode-search";
import { performActiveModeSwitch } from "@/lib/switch-active-mode";
import { profileInitials, profileUsername } from "@/lib/profile-utils";
import { createClient } from "@/lib/supabase";
import { DashboardAccountNavStrip } from "@/components/dashboard/DashboardAccountNavStrip";
import { DashboardHeaderNavLink } from "@/components/dashboard/DashboardHeaderNavLink";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { Button } from "@/components/ui/Button";
import { DASHBOARD_PATH } from "@/lib/auth-routing";
import {
  dashboardBreadcrumbFromPath,
  type DashboardBreadcrumbParent,
} from "@/lib/dashboard-breadcrumb";
import { useLanguage } from "@/context/LanguageContext";
import { accountSidebarLabel } from "@/lib/nav-i18n";

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
  const sidebarNav = sidebarNavForActiveMode(resolvedActiveMode);
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

  const email = user?.email ?? null;
  const initials = profileInitials(displayName, email);
  const username = profileUsername(profile, email);
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
  const showBreadcrumb = !hideBreadcrumb && pathname !== DASHBOARD_PATH;
  const crumbTitle = breadcrumbTitle ?? autoBreadcrumb?.title ?? title;
  const crumbParent = breadcrumbParent ?? autoBreadcrumb?.parent;
  const showDashboardRightAside = pathname === DASHBOARD_PATH && Boolean(rightAside);

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
    <div
      className={`mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8 ${
        pathname === DASHBOARD_PATH ? "py-4 sm:py-5" : "py-6 sm:py-8"
      }`}
    >
      <div
        className={`flex flex-wrap items-start justify-between gap-3 sm:items-center ${
          pathname === DASHBOARD_PATH ? "mb-3" : "mb-6"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-teal">Your account</p>
          {pathname === DASHBOARD_PATH ? (
            <>
              <h1 className="font-heading mt-0.5 text-xl font-semibold text-foreground sm:text-2xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <NotificationsBell />
          {headerNav.map((item) => (
            <DashboardHeaderNavLink key={item.href} item={item} />
          ))}
        </div>
      </div>

      {showCompleteProfile ? (
        <div className="mb-4 card-elevated rounded-2xl border border-brand-teal/20 bg-mint/30 p-4">
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
        className={`grid grid-cols-1 ${
          showDashboardRightAside
            ? "lg:grid-cols-[220px_minmax(0,1fr)_280px]"
            : "lg:grid-cols-[220px_1fr]"
        } ${pathname === DASHBOARD_PATH ? "gap-4 lg:gap-5" : "gap-6 lg:gap-8"}`}
      >
        <aside className="card-elevated relative z-10 hidden h-fit shrink-0 rounded-2xl p-4 lg:sticky lg:top-24 lg:block">
          <div className="flex flex-col items-center text-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-2 ring-mint/50"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-lavender/60 text-2xl font-semibold text-brand-teal">
                {authLoading || profileLoading ? "…" : initials}
              </div>
            )}
            <p className="mt-3 font-heading font-semibold text-foreground">
              {authLoading || profileLoading ? "Loading…" : displayName}
            </p>
            <p className="text-xs text-muted">@{username}</p>
            {email ? <p className="mt-1 text-xs text-muted/80">{email}</p> : null}
          </div>

          <nav className="mt-6" aria-label="Account">
            <ul className="space-y-1">
              {sidebarNav.map((item) => {
                const active = isSidebarLinkActive(pathname, item.href, searchParams);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-brand-pink text-white shadow-sm"
                          : "text-muted hover:bg-mint/40 hover:text-foreground"
                      }`}
                    >
                      {accountSidebarLabel(item.href, item.label, t.navbar)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-4 border-t border-border pt-3">
            {modeAction ? (
              <>
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  Switch mode
                </p>
                <button
                  type="button"
                  disabled={switchingMode !== null}
                  onClick={() => handleModeSwitch(modeAction.targetMode)}
                  className="mt-1 block w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-mint/40 hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {switchingMode === modeAction.targetMode ? "Switching…" : modeAction.label}
                </button>
                {modeError ? (
                  <p className="mt-1.5 px-3 text-xs text-brand-pink" role="alert">
                    {modeError}
                  </p>
                ) : null}
              </>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`w-full ${modeAction ? "mt-2" : ""}`}
              disabled={loggingOut}
              onClick={handleLogout}
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          <DashboardAccountNavStrip activeMode={resolvedActiveMode} />
          {showBreadcrumb ? (
            <DashboardBreadcrumb
              title={crumbTitle}
              parent={crumbParent}
              backHref={backHref}
            />
          ) : null}
          {pathname !== DASHBOARD_PATH ? (
            <header className={showBreadcrumb ? "mt-1" : undefined}>
              <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
              {description ? <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{description}</p> : null}
            </header>
          ) : null}
          <div className={pathname !== DASHBOARD_PATH ? "mt-6" : undefined}>{children}</div>
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
