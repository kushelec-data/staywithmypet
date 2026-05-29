"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { AccountSidebarNavLink } from "@/components/account/AccountSidebarNavLink";
import { sidebarSectionsForActiveMode } from "@/lib/account-nav";
import type { ProfileActiveMode } from "@/lib/profile-mode";

type DashboardAccountNavStripProps = {
  activeMode: ProfileActiveMode | null | undefined;
};

/** Horizontal account nav for mobile (replaces tall sidebar block). */
export function DashboardAccountNavStrip({ activeMode }: DashboardAccountNavStripProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const sections = sidebarSectionsForActiveMode(activeMode);

  return (
    <nav
      className="-mx-1 mb-4 overflow-x-auto overscroll-x-contain pb-1 lg:hidden [-webkit-overflow-scrolling:touch]"
      aria-label="Account navigation"
    >
      <ul className="flex w-max min-w-full items-center gap-2 px-1">
        {sections.flatMap((section) =>
          section.items.map((item) => (
            <li key={item.href} className="shrink-0">
              <AccountSidebarNavLink
                item={item}
                pathname={pathname}
                searchParams={searchParams}
                navbarT={t.navbar}
                variant="strip"
              />
            </li>
          )),
        )}
      </ul>
    </nav>
  );
}
