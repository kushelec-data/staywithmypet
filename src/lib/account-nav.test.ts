import { describe, expect, it } from "vitest";
import {
  mobileAccountMenuSecondaryItemsForActiveMode,
  mobileNavStripItemsForActiveMode,
} from "@/lib/account-nav";

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
