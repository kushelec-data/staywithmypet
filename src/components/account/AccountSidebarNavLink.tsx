"use client";

import Link from "next/link";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { isMarketplaceNavHref, isSidebarLinkActive } from "@/lib/account-nav";
import { accountSidebarLabel } from "@/lib/nav-i18n";
import type { AccountNavItem } from "@/lib/legacy/nav";
import type { Dictionary } from "@/i18n/translations";
import {
  ACCOUNT_NAV_ACTIVE_CLASS,
  ACCOUNT_NAV_INACTIVE_CLASS,
} from "@/lib/account-ui";
import {
  ACCOUNT_SIDEBAR_ICON_CLASS,
  accountSidebarIconForHref,
} from "@/lib/account-sidebar-icons";
import { DASHBOARD_NAV_ACTIVE_CLASS, DASHBOARD_NAV_INACTIVE_CLASS } from "@/lib/dashboard-theme";

type AccountSidebarNavLinkProps = {
  item: AccountNavItem;
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
  navbarT: Dictionary["navbar"];
  t: Dictionary;
  variant?: "sidebar" | "strip";
};

export function AccountSidebarNavLink({
  item,
  pathname,
  searchParams,
  navbarT,
  t,
  variant = "sidebar",
}: AccountSidebarNavLinkProps) {
  const external = isMarketplaceNavHref(item.href);
  const active = !external && isSidebarLinkActive(pathname, item.href, searchParams);
  const Icon = accountSidebarIconForHref(item.href);
  const label = accountSidebarLabel(item.href, item.label, t);
  const tooltip = external ? navbarT.marketplaceSearchTooltip : undefined;

  if (variant === "strip") {
    return (
      <Link
        href={item.href}
        title={tooltip}
        className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
          active
            ? DASHBOARD_NAV_ACTIVE_CLASS
            : `border border-[#E5E2D8] bg-[#F8F6F1] text-muted ${DASHBOARD_NAV_INACTIVE_CLASS}`
        } ${external ? "text-[#2E6B3F]" : ""}`}
      >
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            active ? ACCOUNT_SIDEBAR_ICON_CLASS.active : ACCOUNT_SIDEBAR_ICON_CLASS.inactive
          }`}
          strokeWidth={1.75}
          aria-hidden
        />
        {label}
        {external ? (
          <ArrowUpRight className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      title={tooltip}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? ACCOUNT_NAV_ACTIVE_CLASS : ACCOUNT_NAV_INACTIVE_CLASS
      } ${external ? "text-[#2E6B3F]" : ""}`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active ? ACCOUNT_SIDEBAR_ICON_CLASS.active : ACCOUNT_SIDEBAR_ICON_CLASS.inactive
        }`}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {external ? (
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
      ) : null}
    </Link>
  );
}
