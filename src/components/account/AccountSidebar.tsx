"use client";

import Link from "next/link";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { isSidebarLinkActive } from "@/lib/account-nav";
import { accountSidebarLabel } from "@/lib/nav-i18n";
import type { AccountNavItem } from "@/lib/legacy/nav";
import type { Dictionary } from "@/i18n/translations";
import type { ProfileRow } from "@/lib/profile-utils";
import { profileInitials, profileUsername } from "@/lib/profile-utils";
import {
  ACCOUNT_CARD_CLASS,
  ACCOUNT_COLORS,
  ACCOUNT_NAV_ACTIVE_CLASS,
  ACCOUNT_NAV_INACTIVE_CLASS,
} from "@/lib/account-ui";
import {
  ACCOUNT_SIDEBAR_ICON_CLASS,
  ACCOUNT_SIDEBAR_MODE_SWITCH_ICON,
  accountSidebarIconForHref,
} from "@/lib/account-sidebar-icons";
type AccountSidebarProps = {
  profile: ProfileRow | null;
  displayName: string;
  email: string | null;
  authLoading: boolean;
  profileLoading: boolean;
  sidebarNav: AccountNavItem[];
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
  navbarT: Dictionary["navbar"];
  modeAction: { label: string; targetMode: "pet_parent" | "pet_friend" } | null;
  switchingMode: string | null;
  modeError: string | null;
  loggingOut: boolean;
  onModeSwitch: (targetMode: "pet_parent" | "pet_friend") => void;
  onLogout: () => void;
};

export function AccountSidebar({
  profile,
  displayName,
  email,
  authLoading,
  profileLoading,
  sidebarNav,
  pathname,
  searchParams,
  navbarT,
  modeAction,
  switchingMode,
  modeError,
  loggingOut,
  onModeSwitch,
  onLogout,
}: AccountSidebarProps) {
  const initials = profileInitials(displayName, email);
  const username = profileUsername(profile, email);

  return (
    <aside
      className={`${ACCOUNT_CARD_CLASS} relative z-10 hidden h-fit shrink-0 p-4 lg:sticky lg:top-24 lg:block`}
    >
      <div className="flex flex-col items-center text-center">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-2 ring-[#E5E2D8]"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold"
            style={{ backgroundColor: ACCOUNT_COLORS.light, color: ACCOUNT_COLORS.primary }}
          >
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
            const Icon = accountSidebarIconForHref(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? ACCOUNT_NAV_ACTIVE_CLASS : ACCOUNT_NAV_INACTIVE_CLASS
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? ACCOUNT_SIDEBAR_ICON_CLASS.active : ACCOUNT_SIDEBAR_ICON_CLASS.inactive
                    }`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {accountSidebarLabel(item.href, item.label, navbarT)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4 border-t border-[#E5E2D8] pt-3">
        {modeAction ? (
          <>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Switch mode
            </p>
            <button
              type="button"
              disabled={switchingMode !== null}
              onClick={() => onModeSwitch(modeAction.targetMode)}
              className={`${ACCOUNT_NAV_INACTIVE_CLASS} mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <ACCOUNT_SIDEBAR_MODE_SWITCH_ICON
                className={`h-4 w-4 shrink-0 ${ACCOUNT_SIDEBAR_ICON_CLASS.inactive}`}
                strokeWidth={1.75}
                aria-hidden
              />
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
          onClick={onLogout}
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </Button>
      </div>
    </aside>
  );
}
