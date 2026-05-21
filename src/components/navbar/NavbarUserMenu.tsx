"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import { getUserMenuLinks } from "@/lib/nav-i18n";
import { profileInitials } from "@/lib/profile-utils";

type NavbarUserMenuProps = {
  onLogout: () => void | Promise<void>;
  loggingOut: boolean;
  /** Wider trigger + stacked links for mobile drawer */
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
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
}: NavbarUserMenuProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { profile, displayName, loading: profileLoading } = useProfile();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? null;
  const initials = profileInitials(displayName, email);
  const menuLinks = getUserMenuLinks(t.navbar, profile);

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
    return (
      <ul className="space-y-0.5">
        {menuLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className={`block min-h-[44px] rounded-xl px-4 py-3 text-base font-medium leading-snug ${
                isNavLinkActive(pathname, link.href)
                  ? "bg-brand-pink-muted text-brand-pink"
                  : "text-muted active:bg-mint/40"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void onLogout()}
            className="block min-h-[44px] w-full rounded-xl px-4 py-3 text-left text-base font-medium leading-snug text-muted active:bg-mint/40"
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
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lavender/60 text-xs font-semibold text-brand-teal">
            {profileLoading ? "…" : initials}
          </span>
        )}
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
