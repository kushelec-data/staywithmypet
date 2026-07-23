"use client";

import type { ReadonlyURLSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AccountSidebarNavLink } from "@/components/account/AccountSidebarNavLink";
import type { AccountSidebarSection } from "@/lib/account-nav";
import type { Dictionary } from "@/i18n/translations";
import type { ProfileRow } from "@/lib/profile-utils";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { resolveAvatarPosition } from "@/lib/photo-position";
import { profileUsername } from "@/lib/profile-utils";
import {
  ACCOUNT_CARD_CLASS,
  ACCOUNT_COLORS,
  ACCOUNT_NAV_INACTIVE_CLASS,
} from "@/lib/account-ui";
import type { SidebarModeControl } from "@/lib/profile-mode";
import {
  ACCOUNT_SIDEBAR_ICON_CLASS,
  ACCOUNT_SIDEBAR_MODE_SWITCH_ICON,
} from "@/lib/account-sidebar-icons";

type AccountSidebarProps = {
  userId: string | null;
  profile: ProfileRow | null;
  displayName: string;
  email: string | null;
  authLoading: boolean;
  profileLoading: boolean;
  sidebarSections: AccountSidebarSection[];
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
  t: Dictionary;
  modeControl: SidebarModeControl | null;
  switchingMode: string | null;
  modeError: string | null;
  loggingOut: boolean;
  onModeSwitch: (targetMode: "pet_parent" | "pet_friend") => void;
  onLogout: () => void;
};

function sectionTitle(id: AccountSidebarSection["id"], navbarT: Dictionary["navbar"]): string {
  return id === "marketplace" ? navbarT.marketplaceSection : navbarT.accountSection;
}

export function AccountSidebar({
  userId,
  profile,
  displayName,
  email,
  authLoading,
  profileLoading,
  sidebarSections,
  pathname,
  searchParams,
  t,
  modeControl,
  switchingMode,
  modeError,
  loggingOut,
  onModeSwitch,
  onLogout,
}: AccountSidebarProps) {
  const accountT = t.account;
  const navbarT = t.navbar;
  const username = profileUsername(profile, email);

  return (
    <aside
      className={`${ACCOUNT_CARD_CLASS} relative z-10 hidden h-fit shrink-0 p-4 lg:sticky lg:top-24 lg:block`}
    >
      <div className="flex flex-col items-center text-center">
        {userId ? (
          <ProfileAvatar
            userId={userId}
            displayName={displayName}
            email={email}
            avatarUrl={profile?.avatar_url}
            avatarPosition={resolveAvatarPosition(profile?.avatar_url, profile?.details)}
            size="lg"
            shape="circle"
            loading={authLoading || profileLoading}
            imageClassName="object-cover"
            className="ring-2 ring-[#E5E2D8]"
          />
        ) : null}
        <p className="mt-3 font-heading font-semibold text-foreground">
          {authLoading || profileLoading ? accountT.loading : displayName}
        </p>
        <p className="text-xs text-muted">@{username}</p>
        {email ? <p className="mt-1 text-xs text-muted/80">{email}</p> : null}
      </div>

      <nav className="mt-6 space-y-3" aria-label={accountT.accountNavAriaLabel}>
        {sidebarSections.map((section) => {
          if (section.items.length === 0) return null;

          return (
            <div
              key={section.id}
              className={section.id === "marketplace" ? "border-t border-[#E5E2D8] pt-3" : undefined}
            >
              <p className="px-3 pb-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#5f6f63]">
                {sectionTitle(section.id, navbarT)}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <AccountSidebarNavLink
                      item={item}
                      pathname={pathname}
                      searchParams={searchParams}
                      navbarT={navbarT}
                      t={t}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-[#E5E2D8] pt-3">
        {modeControl ? (
          <>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted">
              {accountT.switchMode}
            </p>
            {modeControl.kind === "switch" ? (
              <button
                type="button"
                disabled={switchingMode !== null}
                onClick={() => onModeSwitch(modeControl.targetMode)}
                className={`${ACCOUNT_NAV_INACTIVE_CLASS} mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <ACCOUNT_SIDEBAR_MODE_SWITCH_ICON
                  className={`h-4 w-4 shrink-0 ${ACCOUNT_SIDEBAR_ICON_CLASS.inactive}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                {switchingMode === modeControl.targetMode ? accountT.switching : modeControl.label}
              </button>
            ) : (
              <Link
                href={modeControl.href}
                className={`${ACCOUNT_NAV_INACTIVE_CLASS} mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium`}
              >
                <ACCOUNT_SIDEBAR_MODE_SWITCH_ICON
                  className={`h-4 w-4 shrink-0 ${ACCOUNT_SIDEBAR_ICON_CLASS.inactive}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                {modeControl.label}
              </Link>
            )}
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
          className={`w-full ${modeControl ? "mt-2" : ""}`}
          disabled={loggingOut}
          onClick={onLogout}
        >
          {loggingOut ? accountT.loggingOut : accountT.logOut}
        </Button>
      </div>
    </aside>
  );
}
