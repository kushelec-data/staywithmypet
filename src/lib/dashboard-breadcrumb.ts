import { DASHBOARD_PATH } from "@/lib/auth-routing";
import type { Dictionary } from "@/i18n/translations";

export type DashboardBreadcrumbParent = {
  label: string;
  href?: string;
};

export type DashboardBreadcrumbConfig = {
  title: string;
  parent?: DashboardBreadcrumbParent;
};

type SearchParamsLike = { get(key: string): string | null } | null | undefined;

type BreadcrumbLabels = Dictionary["account"]["breadcrumb"];

/** Resolve breadcrumb trail from the current dashboard route (localized). */
export function dashboardBreadcrumbFromPath(
  labels: BreadcrumbLabels,
  pathname: string,
  searchParams?: SearchParamsLike,
): DashboardBreadcrumbConfig | null {
  if (pathname === DASHBOARD_PATH) return null;

  if (pathname === "/pets") {
    return { title: labels.myPets };
  }
  if (pathname === "/pets/new") {
    return { title: labels.addPet, parent: { label: labels.myPets, href: "/pets" } };
  }
  if (/^\/pets\/[^/]+\/edit$/.test(pathname)) {
    return { title: labels.editPet, parent: { label: labels.myPets, href: "/pets" } };
  }

  if (pathname === "/requests") {
    return { title: labels.requests };
  }
  if (pathname === "/messages") {
    return { title: labels.messages };
  }

  if (pathname === "/profile/edit") {
    return { title: labels.editProfile };
  }
  if (pathname === "/profile/setup") {
    return { title: labels.setupProfile };
  }
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return { title: labels.profile };
  }

  if (pathname === "/membership") {
    return { title: labels.membership };
  }
  if (pathname === "/change-password") {
    return { title: labels.changePassword };
  }
  if (pathname === "/preferences") {
    return { title: labels.preferences };
  }
  if (pathname === "/saved") {
    return { title: labels.savedPets };
  }
  if (pathname === "/find-pets") {
    return { title: labels.searchPets };
  }
  if (pathname === "/find-care") {
    return { title: labels.findPetFriends };
  }
  if (pathname === "/gallery") {
    return { title: labels.gallery };
  }

  if (pathname === "/dashboard/calendar") {
    return { title: labels.calendar };
  }

  if (pathname === "/dashboard/bookings") {
    return { title: labels.bookings };
  }

  if (/^\/dashboard\/bookings\/[^/]+$/.test(pathname)) {
    return {
      title: labels.bookingDetails,
      parent: { label: labels.bookings, href: "/dashboard/bookings" },
    };
  }

  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const last = segments[segments.length - 1];
  if (isUuidSegment(last)) {
    const parentSegment = segments.length >= 2 ? segments[segments.length - 2] : null;
    const parentLabel = parentSegment ? humanizeSegment(parentSegment) : undefined;
    return {
      title: labels.details,
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
