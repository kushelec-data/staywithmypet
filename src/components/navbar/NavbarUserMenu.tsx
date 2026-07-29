"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { resolveAvatarPosition } from "@/lib/photo-position";
import { getUserMenuLinks, accountSidebarLabel } from "@/lib/nav-i18n";
import { mobileAccountMenuSecondaryItemsForActiveMode } from "@/lib/account-nav";
import { resolveActiveMode } from "@/lib/profile-mode";
import type { SidebarModeControl } from "@/lib/profile-mode";
import {
  accountSidebarIconForHref,
  ACCOUNT_SIDEBAR_ICON_CLASS,
  ACCOUNT_SIDEBAR_MODE_SWITCH_ICON,
} from "@/lib/account-sidebar-icons";
import { mobileNavRowClass } from "@/components/navbar/mobile-nav-styles";

type NavbarUserMenuProps = {
  onLogout: () => void | Promise<void>;
  loggingOut: boolean;
  /** Wider trigger + stacked links for mobile drawer */
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
  modeControl?: SidebarModeControl | null;
  switchingMode?: string | null;
  modeError?: string | null;
  onModeSwitch?: (targetMode: "pet_parent" | "pet_friend") => void;
};

function isNavLinkActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0].split("#")[0];
  if (path === "/dashboard") return pathname === "/dashboard";
  if (path === "/dashboard/bookings") {
    return pathname === "/dashboard/bookings" || pathname.startsWith("/dashboard/bookings/");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function NavbarUserMenu({
  onLogout,
  loggingOut,
  variant = "desktop",
  onNavigate,
  modeControl = null,
  switchingMode = null,
  modeError = null,
  onModeSwitch,
}: NavbarUserMenuProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { profile, displayName, loading: profileLoading } = useProfile();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? null;
  const menuLinks = getUserMenuLinks(t.navbar, profile);
  const activeMode = profile ? resolveActiveMode(profile.role, profile.active_mode) : null;
  const secondaryMenuLinks = mobileAccountMenuSecondaryItemsForActiveMode(activeMode);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  if (variant === "mobile") {
    const rowClass = (href: string) =>
      mobileNavRowClass(isNavLinkActive(pathname, href));

    return (
      <ul className="min-w-0 max-w-full space-y-0.5">
        {menuLinks.map((link) => {
          const Icon = accountSidebarIconForHref(link.href);
          const active = isNavLinkActive(pathname, link.href);
          return (
            <li key={link.href} className="min-w-0 max-w-full">
              <Link
                href={link.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={rowClass(link.href)}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${active ? ACCOUNT_SIDEBAR_ICON_CLASS.active : ACCOUNT_SIDEBAR_ICON_CLASS.inactive}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
        {secondaryMenuLinks.length > 0 ? (
          <>
            <li className="mt-2 border-t border-border pt-2">
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {t.navbar.accountSection}
              </p>
            </li>
            {secondaryMenuLinks.map((item) => {
              const Icon = accountSidebarIconForHref(item.href);
              const active = isNavLinkActive(pathname, item.href);
              return (
                <li key={item.href} className="min-w-0 max-w-full">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={rowClass(item.href)}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${active ? ACCOUNT_SIDEBAR_ICON_CLASS.active : ACCOUNT_SIDEBAR_ICON_CLASS.inactive}`}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {accountSidebarLabel(item.href, item.label, t)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </>
        ) : null}
        {modeControl ? (
          <>
            <li className="mt-2 border-t border-border pt-2">
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {t.account.switchMode}
              </p>
            </li>
            <li className="min-w-0 max-w-full">
              {modeControl.kind === "switch" ? (
                <button
                  type="button"
                  disabled={switchingMode !== null}
                  onClick={() => onModeSwitch?.(modeControl.targetMode)}
                  className="flex min-h-[48px] w-full min-w-0 max-w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-base font-medium leading-snug text-muted active:bg-mint/40 hover:bg-mint/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ACCOUNT_SIDEBAR_MODE_SWITCH_ICON
                    className={`h-5 w-5 shrink-0 ${ACCOUNT_SIDEBAR_ICON_CLASS.inactive}`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {switchingMode === modeControl.targetMode ? t.account.switching : modeControl.label}
                  </span>
                </button>
              ) : (
                <Link
                  href={modeControl.href}
                  onClick={onNavigate}
                  className="flex min-h-[48px] w-full min-w-0 max-w-full items-center gap-3 rounded-xl px-4 py-2.5 text-base font-medium leading-snug text-muted active:bg-mint/40 hover:bg-mint/30"
                >
                  <ACCOUNT_SIDEBAR_MODE_SWITCH_ICON
                    className={`h-5 w-5 shrink-0 ${ACCOUNT_SIDEBAR_ICON_CLASS.inactive}`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{modeControl.label}</span>
                </Link>
              )}
            </li>
            {modeError ? (
              <li>
                <p className="px-4 pt-1 text-xs text-brand-pink" role="alert">
                  {modeError}
                </p>
              </li>
            ) : null}
          </>
        ) : null}
        <li className="min-w-0 max-w-full">
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void onLogout()}
            className="flex min-h-[48px] w-full min-w-0 max-w-full items-center rounded-xl px-4 py-2.5 text-left text-base font-medium leading-snug text-muted active:bg-mint/40 hover:bg-mint/30"
          >
            {t.navbar.logout}
          </button>
        </li>
      </ul>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[11rem] items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-mint/20"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t.navbar.accountMenu}
      >
        {user?.id ? (
          <ProfileAvatar
            userId={user.id}
            displayName={displayName}
            email={email}
            avatarUrl={profile?.avatar_url}
            avatarPosition={resolveAvatarPosition(profile?.avatar_url, profile?.details)}
            size="sm"
            shape="circle"
            loading={profileLoading}
            imageClassName="object-cover ring-1 ring-border"
            className="ring-1 ring-border"
          />
        ) : null}
        <span className="truncate">{profileLoading ? "…" : displayName}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[12rem] overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          role="menu"
        >
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={close}
              className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                isNavLinkActive(pathname, link.href)
                  ? "bg-brand-pink-muted text-brand-pink"
                  : "text-foreground/90 hover:bg-mint/40"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            disabled={loggingOut}
            onClick={() => {
              close();
              void onLogout();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-muted transition-colors hover:bg-mint/40 disabled:opacity-60"
          >
            {t.navbar.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}
