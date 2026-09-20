import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  headerNavForActiveMode,
  isSidebarLinkActive,
  mobileAccountMenuSecondaryItemsForActiveMode,
  mobileNavStripItemsForActiveMode,
  sidebarNavForActiveMode,
} from "@/lib/account-nav";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("mobileNavStripItemsForActiveMode", () => {
  it("returns pet parent priority links in order", () => {
    expect(mobileNavStripItemsForActiveMode("pet_parent").map((item) => item.href)).toEqual([
      "/dashboard",
      "/requests?direction=incoming",
      "/messages",
      "/dashboard/bookings",
      "/pets",
    ]);
  });

  it("returns pet friend priority links in order", () => {
    expect(mobileNavStripItemsForActiveMode("pet_friend").map((item) => item.href)).toEqual([
      "/dashboard",
      "/requests?direction=outgoing",
      "/messages",
      "/dashboard/bookings",
      "/saved",
    ]);
  });
});

describe("mobileAccountMenuSecondaryItemsForActiveMode", () => {
  it("returns calendar, membership, and change password for both modes", () => {
    for (const mode of ["pet_parent", "pet_friend"] as const) {
      expect(
        mobileAccountMenuSecondaryItemsForActiveMode(mode).map((item) => item.href),
      ).toEqual(["/dashboard/calendar", "/membership", "/change-password"]);
    }
  });

  it("returns no secondary links when active mode is unknown", () => {
    expect(mobileAccountMenuSecondaryItemsForActiveMode(null)).toEqual([]);
  });
});

describe("account sidebar Matches navigation", () => {
  const parentHrefs = sidebarNavForActiveMode("pet_parent").map((item) => item.href);
  const friendHrefs = sidebarNavForActiveMode("pet_friend").map((item) => item.href);

  it("uses /matches for Pet Parent and Pet Friend", () => {
    expect(parentHrefs).toContain("/matches");
    expect(friendHrefs).toContain("/matches");
    expect(readSource("src/app/(account)/matches/page.tsx")).toContain("MatchesPageContent");
  });

  it("highlights Matches only on the Matches route", () => {
    expect(isSidebarLinkActive("/matches", "/matches")).toBe(true);
    expect(isSidebarLinkActive("/profile/setup", "/matches")).toBe(false);
    expect(isSidebarLinkActive("/profile/edit", "/matches")).toBe(false);
    expect(isSidebarLinkActive("/dashboard", "/matches")).toBe(false);
  });

  it("highlights each account item on its own route in Pet Parent mode", () => {
    const params = new URLSearchParams("direction=incoming");
    expect(isSidebarLinkActive("/dashboard", "/dashboard")).toBe(true);
    expect(isSidebarLinkActive("/dashboard/calendar", "/dashboard/calendar")).toBe(true);
    expect(isSidebarLinkActive("/dashboard/bookings", "/dashboard/bookings")).toBe(true);
    expect(isSidebarLinkActive("/messages", "/messages")).toBe(true);
    expect(isSidebarLinkActive("/requests", "/requests?direction=incoming", params)).toBe(true);
    expect(isSidebarLinkActive("/profile/edit", "/profile/edit")).toBe(true);
    expect(isSidebarLinkActive("/membership", "/membership")).toBe(true);
    expect(isSidebarLinkActive("/matches", "/dashboard")).toBe(false);
    expect(isSidebarLinkActive("/matches", "/profile/edit")).toBe(false);
    expect(parentHrefs).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/matches",
        "/dashboard/calendar",
        "/dashboard/bookings",
        "/messages",
        "/requests?direction=incoming",
        "/profile/edit",
        "/membership",
      ]),
    );
  });

  it("highlights each account item on its own route in Pet Friend mode", () => {
    const params = new URLSearchParams("direction=outgoing");
    expect(isSidebarLinkActive("/matches", "/matches")).toBe(true);
    expect(isSidebarLinkActive("/saved", "/saved")).toBe(true);
    expect(isSidebarLinkActive("/requests", "/requests?direction=outgoing", params)).toBe(true);
    expect(isSidebarLinkActive("/matches", "/saved")).toBe(false);
    expect(friendHrefs).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/matches",
        "/dashboard/calendar",
        "/dashboard/bookings",
        "/messages",
        "/saved",
        "/requests?direction=outgoing",
        "/profile/edit",
        "/membership",
      ]),
    );
    expect(friendHrefs).not.toContain("/pets");
    expect(headerNavForActiveMode("pet_friend").some((item) => item.href === "/matches")).toBe(false);
  });

  it("keeps Matches selected from the sidebar link component when pathname is /matches", () => {
    const link = readSource("src/components/account/AccountSidebarNavLink.tsx");
    expect(link).toContain("isSidebarLinkActive(pathname, item.href, searchParams)");
    expect(link).toContain("ACCOUNT_NAV_ACTIVE_CLASS");
  });
});
