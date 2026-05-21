import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { AccountNavItem } from "@/lib/legacy/nav";

type ModeNavItem = AccountNavItem & {
  modes: ProfileActiveMode[];
};

const sidebarItems: ModeNavItem[] = [
  { href: "/dashboard", label: "Dashboard", modes: ["pet_parent", "pet_friend"] },
  { href: "/dashboard/calendar", label: "Calendar", modes: ["pet_parent", "pet_friend"] },
  { href: "/pets", label: "My pets", modes: ["pet_parent"] },
  { href: "/pets/new", label: "Add pet", modes: ["pet_parent"] },
  { href: "/find-care", label: "Find Pet Friends", modes: ["pet_parent"] },
  { href: "/requests?direction=incoming", label: "Requests", modes: ["pet_parent"] },
  { href: "/dashboard/bookings", label: "Bookings", modes: ["pet_parent", "pet_friend"] },
  { href: "/messages", label: "Messages", modes: ["pet_parent", "pet_friend"] },
  { href: "/find-pets", label: "Search pets", modes: ["pet_friend"] },
  { href: "/saved", label: "Saved pets", modes: ["pet_friend"] },
  { href: "/requests?direction=outgoing", label: "Requests", modes: ["pet_friend"] },
  { href: "/profile/edit", label: "My profile", modes: ["pet_parent", "pet_friend"] },
  { href: "/membership", label: "Membership", modes: ["pet_parent", "pet_friend"] },
  { href: "/change-password", label: "Change password", modes: ["pet_parent", "pet_friend"] },
];

const headerItems: ModeNavItem[] = [
  { href: "/requests?direction=incoming", label: "Requests", modes: ["pet_parent"] },
  { href: "/find-care", label: "Find Pet Friends", modes: ["pet_parent"] },
  { href: "/requests?direction=outgoing", label: "Requests", modes: ["pet_friend"] },
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

export function sidebarNavForActiveMode(
  activeMode: ProfileActiveMode | null | undefined,
): AccountNavItem[] {
  if (!activeMode) return [{ href: "/dashboard", label: "Dashboard" }];
  return sidebarItems
    .filter((item) => item.modes.includes(activeMode))
    .map(({ href, label }) => ({ href, label }));
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
