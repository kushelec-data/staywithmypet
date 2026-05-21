"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { isSidebarLinkActive, sidebarNavForActiveMode } from "@/lib/account-nav";
import { accountSidebarLabel } from "@/lib/nav-i18n";
import type { ProfileActiveMode } from "@/lib/profile-mode";

type DashboardAccountNavStripProps = {
  activeMode: ProfileActiveMode | null | undefined;
};

/** Horizontal account nav for mobile (replaces tall sidebar block). */
export function DashboardAccountNavStrip({ activeMode }: DashboardAccountNavStripProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const items = sidebarNavForActiveMode(activeMode);

  return (
    <nav
      className="-mx-1 mb-4 overflow-x-auto overscroll-x-contain pb-1 lg:hidden [-webkit-overflow-scrolling:touch]"
      aria-label="Account navigation"
    >
      <ul className="flex w-max min-w-full gap-2 px-1">
        {items.map((item) => {
          const active = isSidebarLinkActive(pathname, item.href, searchParams);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-brand-pink text-white shadow-sm"
                    : "border border-black/5 bg-surface text-muted hover:bg-mint/40 hover:text-foreground"
                }`}
              >
                {accountSidebarLabel(item.href, item.label, t.navbar)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
