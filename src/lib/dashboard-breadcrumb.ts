import { DASHBOARD_PATH } from "@/lib/auth-routing";

export type DashboardBreadcrumbParent = {
  label: string;
  href?: string;
};

export type DashboardBreadcrumbConfig = {
  title: string;
  parent?: DashboardBreadcrumbParent;
};

type SearchParamsLike = { get(key: string): string | null } | null | undefined;

/** Resolve breadcrumb trail from the current dashboard route. */
export function dashboardBreadcrumbFromPath(
  pathname: string,
  searchParams?: SearchParamsLike,
): DashboardBreadcrumbConfig | null {
  if (pathname === DASHBOARD_PATH) return null;

  if (pathname === "/pets") {
    return { title: "My pets" };
  }
  if (pathname === "/pets/new") {
    return { title: "Add pet", parent: { label: "My pets", href: "/pets" } };
  }
  if (/^\/pets\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit pet", parent: { label: "My pets", href: "/pets" } };
  }

  if (pathname === "/requests") {
    return { title: "Requests" };
  }
  if (pathname === "/messages") {
    return { title: "Messages" };
  }

  if (pathname === "/profile/edit") {
    return { title: "Edit Profile" };
  }
  if (pathname === "/profile/setup") {
    return { title: "Set up your profile" };
  }
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return { title: "Profile" };
  }

  if (pathname === "/membership") {
    return { title: "Membership" };
  }
  if (pathname === "/change-password") {
    return { title: "Change password" };
  }
  if (pathname === "/preferences") {
    return { title: "My preferences" };
  }
  if (pathname === "/saved") {
    return { title: "Saved pets" };
  }
  if (pathname === "/find-pets") {
    return { title: "Search pets" };
  }
  if (pathname === "/find-care") {
    return { title: "Find Pet Friends" };
  }
  if (pathname === "/gallery") {
    return { title: "Your gallery" };
  }

  if (pathname === "/dashboard/calendar") {
    return { title: "Calendar" };
  }

  if (pathname === "/dashboard/bookings") {
    return { title: "Bookings" };
  }

  if (/^\/dashboard\/bookings\/[^/]+$/.test(pathname)) {
    return {
      title: "Booking details",
      parent: { label: "Bookings", href: "/dashboard/bookings" },
    };
  }

  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const last = segments[segments.length - 1];
  if (isUuidSegment(last)) {
    const parentSegment = segments.length >= 2 ? segments[segments.length - 2] : null;
    const parentLabel = parentSegment ? humanizeSegment(parentSegment) : undefined;
    return {
      title: "Details",
      parent: parentLabel
        ? {
            label: parentLabel,
            href: "/" + segments.slice(0, -1).join("/"),
          }
        : undefined,
    };
  }

  return { title: humanizeSegment(last) };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidSegment(value: string): boolean {
  return UUID_RE.test(value);
}

function humanizeSegment(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
