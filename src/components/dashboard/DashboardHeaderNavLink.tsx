"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { isMarketplaceNavHref, isSidebarLinkActive } from "@/lib/account-nav";
import { accountSidebarLabel } from "@/lib/nav-i18n";
import type { AccountNavItem } from "@/lib/legacy/nav";
import { DASHBOARD_NAV_ACTIVE_CLASS, DASHBOARD_NAV_INACTIVE_CLASS } from "@/lib/dashboard-theme";

type DashboardHeaderNavLinkProps = {
  item: AccountNavItem;
};

function navIcon(href: string) {
  if (href.startsWith("/requests")) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    );
  }

  if (href.startsWith("/find-care") || href.startsWith("/find-pets")) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
        />
      </svg>
    );
  }

  if (href.startsWith("/saved")) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    );
  }

  return null;
}

export function DashboardHeaderNavLink({ item }: DashboardHeaderNavLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const external = isMarketplaceNavHref(item.href);
  const active = !external && isSidebarLinkActive(pathname, item.href, searchParams);
  const label = accountSidebarLabel(item.href, item.label, t);
  const tooltip = external ? t.navbar.marketplaceSearchTooltip : label;

  return (
    <Link
      href={item.href}
      title={tooltip}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
        active
          ? `${DASHBOARD_NAV_ACTIVE_CLASS} border-[#E5E2D8]`
          : `border-[#E5E2D8] bg-[#F8F6F1] text-foreground ${DASHBOARD_NAV_INACTIVE_CLASS}`
      } ${external ? "text-[#2E6B3F]" : ""}`}
    >
      {navIcon(item.href)}
      {external ? (
        <ArrowUpRight
          className="absolute right-1 top-1 h-2.5 w-2.5 opacity-90"
          strokeWidth={2.5}
          aria-hidden
        />
      ) : null}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
