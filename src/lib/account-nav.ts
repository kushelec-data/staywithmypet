import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { AccountNavItem } from "@/lib/legacy/nav";

type ModeNavItem = AccountNavItem & {
  modes: ProfileActiveMode[];
};

const MARKETPLACE_PATHS = new Set(["/find-care", "/find-pets"]);

export function isMarketplaceNavHref(href: string): boolean {
  return MARKETPLACE_PATHS.has(href.split("?")[0].split("#")[0]);
}

/** In-account sidebar links (dashboard area). */
const accountSidebarItems: ModeNavItem[] = [
  { href: "/dashboard", label: "Dashboard", modes: ["pet_parent", "pet_friend"] },
  { href: "/dashboard/calendar", label: "Calendar", modes: ["pet_parent", "pet_friend"] },
  { href: "/pets", label: "My pets", modes: ["pet_parent"] },
  { href: "/pets/new", label: "Add pet", modes: ["pet_parent"] },
  { href: "/requests?direction=incoming", label: "Requests", modes: ["pet_parent"] },
  { href: "/dashboard/bookings", label: "Bookings", modes: ["pet_parent", "pet_friend"] },
  { href: "/messages", label: "Messages", modes: ["pet_parent", "pet_friend"] },
  { href: "/saved", label: "Saved pets", modes: ["pet_friend"] },
  { href: "/requests?direction=outgoing", label: "Requests", modes: ["pet_friend"] },
  { href: "/profile/edit", label: "Edit Profile", modes: ["pet_parent", "pet_friend"] },
  { href: "/membership", label: "Membership", modes: ["pet_parent", "pet_friend"] },
  { href: "/change-password", label: "Change password", modes: ["pet_parent", "pet_friend"] },
];

/** Marketplace search — leaves the account shell. */
const marketplaceSidebarItems: ModeNavItem[] = [
  { href: "/find-care", label: "Find Pet Friends", modes: ["pet_parent"] },
  { href: "/find-pets", label: "Find Pets", modes: ["pet_friend"] },
];

export type AccountSidebarSectionId = "account" | "marketplace";

export type AccountSidebarSection = {
  id: AccountSidebarSectionId;
  items: AccountNavItem[];
};

const headerItems: ModeNavItem[] = [
  { href: "/requests?direction=incoming", label: "Requests", modes: ["pet_parent"] },
  { href: "/find-care", label: "Find Pet Friends", modes: ["pet_parent"] },
  { href: "/requests?direction=outgoing", label: "Requests", modes: ["pet_friend"] },
  { href: "/find-pets", label: "Find Pets", modes: ["pet_friend"] },
  { href: "/saved", label: "Saved", modes: ["pet_parent", "pet_friend"] },
];

/** One sidebar item active at a time — exact path + query rules. */
export function isSidebarLinkActive(
  pathname: string,
  href: string,
  searchParams?: { get(key: string): string | null },
): boolean {
  const [pathPart, queryPart] = href.split("?");
  const path = pathPart.split("#")[0];

  if (path === "/dashboard") return pathname === "/dashboard";
  if (path === "/dashboard/calendar") {
    return pathname === "/dashboard/calendar" || pathname.startsWith("/dashboard/calendar/");
  }
  if (path === "/pets") return pathname === "/pets";
  if (path === "/pets/new") return pathname === "/pets/new";
  if (path === "/profile/edit") return pathname === "/profile/edit";
  if (path === "/membership") return pathname === "/membership";
  if (path === "/change-password") return pathname === "/change-password";
  if (path === "/saved") return pathname === "/saved";
  if (path === "/messages") return pathname === "/messages";
  if (path === "/dashboard/bookings") {
    return pathname === "/dashboard/bookings" || pathname.startsWith("/dashboard/bookings/");
  }
  if (path === "/find-pets") return pathname === "/find-pets";
  if (path === "/find-care") return pathname === "/find-care";

  if (pathname.startsWith("/pets/") && pathname !== "/pets" && pathname !== "/pets/new") {
    return false;
  }

  if (path === "/requests") {
    if (pathname !== "/requests") return false;
    if (!queryPart) return !searchParams?.get("direction");
    const hrefDirection = new URLSearchParams(queryPart).get("direction");
    const currentDirection = searchParams?.get("direction");
    if (hrefDirection) {
      return currentDirection === hrefDirection;
    }
    return !currentDirection;
  }

  return pathname === path;
}

function itemsForMode(items: ModeNavItem[], activeMode: ProfileActiveMode): AccountNavItem[] {
  return items
    .filter((item) => item.modes.includes(activeMode))
    .map(({ href, label }) => ({ href, label }));
}

const MOBILE_NAV_STRIP_HREFS: Record<ProfileActiveMode, string[]> = {
  pet_parent: [
    "/dashboard",
    "/requests?direction=incoming",
    "/messages",
    "/dashboard/bookings",
    "/pets",
  ],
  pet_friend: [
    "/dashboard",
    "/requests?direction=outgoing",
    "/messages",
    "/dashboard/bookings",
    "/saved",
  ],
};

function accountNavItemForHref(activeMode: ProfileActiveMode, href: string): AccountNavItem {
  const match = accountSidebarItems.find(
    (item) => item.href === href && item.modes.includes(activeMode),
  );
  if (match) {
    return { href: match.href, label: match.label };
  }
  return { href, label: href };
}

/** Secondary mobile account menu links (not in the five-item dashboard strip). */
const MOBILE_ACCOUNT_MENU_SECONDARY_HREFS = [
  "/dashboard/calendar",
  "/membership",
  "/change-password",
] as const;

/** Explicit mobile dashboard nav strip — five priority links per active mode. */
export function mobileNavStripItemsForActiveMode(
  activeMode: ProfileActiveMode | null | undefined,
): AccountNavItem[] {
  if (!activeMode) {
    return [{ href: "/dashboard", label: "Dashboard" }];
  }
  return MOBILE_NAV_STRIP_HREFS[activeMode].map((href) =>
    accountNavItemForHref(activeMode, href),
  );
}

/** Calendar, membership, and account settings — mobile account menu only. */
export function mobileAccountMenuSecondaryItemsForActiveMode(
  activeMode: ProfileActiveMode | null | undefined,
): AccountNavItem[] {
  if (!activeMode) return [];
  return MOBILE_ACCOUNT_MENU_SECONDARY_HREFS.flatMap((href) => {
    const match = accountSidebarItems.find(
      (item) => item.href === href && item.modes.includes(activeMode),
    );
    return match ? [{ href: match.href, label: match.label }] : [];
  });
}

export function sidebarSectionsForActiveMode(
  activeMode: ProfileActiveMode | null | undefined,
): AccountSidebarSection[] {
  if (!activeMode) {
    return [{ id: "account", items: [{ href: "/dashboard", label: "Dashboard" }] }];
  }

  return [
    { id: "account", items: itemsForMode(accountSidebarItems, activeMode) },
    { id: "marketplace", items: itemsForMode(marketplaceSidebarItems, activeMode) },
  ];
}

export function sidebarNavForActiveMode(
  activeMode: ProfileActiveMode | null | undefined,
): AccountNavItem[] {
  return sidebarSectionsForActiveMode(activeMode).flatMap((section) => section.items);
}

export function headerNavForActiveMode(activeMode: ProfileActiveMode | null | undefined): AccountNavItem[] {
  if (!activeMode) return [];
  return headerItems.filter((item) => item.modes.includes(activeMode)).map(({ href, label }) => ({ href, label }));
}

export type DashboardCapabilities = {
  showMyPets: boolean;
  showAddPet: boolean;
  showIncomingRequests: boolean;
  showOutgoingRequests: boolean;
  showSavedStat: boolean;
  showRequestsSentStat: boolean;
  showMyPetsStat: boolean;
  showSearchPetsCta: boolean;
  showFindCareCta: boolean;
};

export function dashboardCapabilitiesForActiveMode(
  activeMode: ProfileActiveMode | null | undefined,
): DashboardCapabilities {
  switch (activeMode) {
    case "pet_parent":
      return {
        showMyPets: true,
        showAddPet: true,
        showIncomingRequests: true,
        showOutgoingRequests: false,
        showSavedStat: false,
        showRequestsSentStat: false,
        showMyPetsStat: true,
        showSearchPetsCta: false,
        showFindCareCta: true,
      };
    case "pet_friend":
      return {
        showMyPets: false,
        showAddPet: false,
        showIncomingRequests: false,
        showOutgoingRequests: true,
        showSavedStat: true,
        showRequestsSentStat: true,
        showMyPetsStat: false,
        showSearchPetsCta: true,
        showFindCareCta: false,
      };
    default:
      return {
        showMyPets: false,
        showAddPet: false,
        showIncomingRequests: false,
        showOutgoingRequests: false,
        showSavedStat: false,
        showRequestsSentStat: false,
        showMyPetsStat: false,
        showSearchPetsCta: false,
        showFindCareCta: false,
      };
  }
}

export function dashboardCapabilitiesForRole(
  activeMode: ProfileActiveMode | null | undefined,
): DashboardCapabilities {
  return dashboardCapabilitiesForActiveMode(activeMode);
}

export function sidebarNavForRole(activeMode: ProfileActiveMode | null | undefined): AccountNavItem[] {
  return sidebarNavForActiveMode(activeMode);
}

export function headerNavForRole(activeMode: ProfileActiveMode | null | undefined): AccountNavItem[] {
  return headerNavForActiveMode(activeMode);
}
