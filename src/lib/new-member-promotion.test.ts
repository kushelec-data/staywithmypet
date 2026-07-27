import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { UserMembership } from "@/lib/membership";
import {
  dismissMembershipUpsellForSession,
  exposesCalculatedPromotionalPrice,
  isMembershipUpsellDismissedForSession,
  isWelcomeOfferEligibleForRoleFromProfile,
  newMemberPromotionMembershipHref,
  welcomeOfferDisplayModeForUser,
} from "@/lib/new-member-promotion";
import type { ProfileRow } from "@/lib/profile-utils";

function membershipRow(
  overrides: Partial<UserMembership> & Pick<UserMembership, "role" | "status">,
): UserMembership {
  return {
    id: "m1",
    user_id: "u1",
    role: overrides.role,
    plan_id: "3-month-owner",
    plan_name: "3 Month",
    status: overrides.status,
    start_date: "2026-01-01",
    end_date: "2027-04-01",
    auto_renew: false,
    linked_booking_id: null,
    consumed_at: null,
    cancellation_restart_used: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_checkout_session_id: null,
    ...overrides,
  };
}

function profileWithWelcomeOffer(
  welcome_offer_eligible_by_role: ProfileRow["welcome_offer_eligible_by_role"],
): ProfileRow {
  return {
    id: "u1",
    welcome_offer_eligible_by_role,
  } as ProfileRow;
}

describe("welcomeOfferDisplayModeForUser", () => {
  it("returns marketing for logged-out users without claiming confirmed eligibility", () => {
    expect(
      welcomeOfferDisplayModeForUser({ loggedIn: false, confirmedEligible: true }),
    ).toBe("marketing");
    expect(
      welcomeOfferDisplayModeForUser({ loggedIn: false, confirmedEligible: false }),
    ).toBe("marketing");
  });

  it("returns confirmed only for logged-in first-ever eligible users", () => {
    expect(
      welcomeOfferDisplayModeForUser({ loggedIn: true, confirmedEligible: true }),
    ).toBe("confirmed");
  });

  it("returns none for logged-in users with membership history", () => {
    expect(
      welcomeOfferDisplayModeForUser({ loggedIn: true, confirmedEligible: false }),
    ).toBe("none");
  });
});

describe("isWelcomeOfferEligibleForRoleFromProfile", () => {
  it("is true when profile snapshot marks role as first-ever eligible", () => {
    expect(
      isWelcomeOfferEligibleForRoleFromProfile(
        profileWithWelcomeOffer({ pet_parent: true, pet_friend: false }),
        "pet_parent",
      ),
    ).toBe(true);
  });

  it("is false when profile snapshot marks role as ineligible", () => {
    expect(
      isWelcomeOfferEligibleForRoleFromProfile(
        profileWithWelcomeOffer({ pet_parent: false, pet_friend: true }),
        "pet_parent",
      ),
    ).toBe(false);
  });

  it("evaluates pet friend independently from pet parent history", () => {
    expect(
      isWelcomeOfferEligibleForRoleFromProfile(
        profileWithWelcomeOffer({ pet_parent: false, pet_friend: true }),
        "pet_friend",
      ),
    ).toBe(true);
  });
});

describe("exposesCalculatedPromotionalPrice", () => {
  it("is always false so UI never exports frontend discount amounts", () => {
    expect(exposesCalculatedPromotionalPrice()).toBe(false);
  });
});

describe("newMemberPromotionMembershipHref", () => {
  it("routes logged-in users to membership and logged-out users through signup", () => {
    expect(
      newMemberPromotionMembershipHref({ role: "pet_parent", loggedIn: true }),
    ).toBe("/membership?role=parent");
    expect(
      newMemberPromotionMembershipHref({ role: "pet_friend", loggedIn: false }),
    ).toBe("/signup?next=%2Fmembership%3Frole%3Dfriend");
  });
});

describe("membership upsell dismiss", () => {
  it("stores and reads dismiss state in localStorage with 30 minute TTL", () => {
    const storage = new Map<string, string>();
    let now = 1_000;
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });
    vi.spyOn(Date, "now").mockImplementation(() => now);

    expect(isMembershipUpsellDismissedForSession()).toBe(false);
    dismissMembershipUpsellForSession();
    expect(isMembershipUpsellDismissedForSession()).toBe(true);

    now += 29 * 60 * 1000;
    expect(isMembershipUpsellDismissedForSession()).toBe(true);

    now += 2 * 60 * 1000;
    expect(isMembershipUpsellDismissedForSession()).toBe(false);

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

describe("welcome offer eligibility scenarios (profile snapshot)", () => {
  it("eligible with no membership history for role", () => {
    expect(
      isWelcomeOfferEligibleForRoleFromProfile(
        profileWithWelcomeOffer({ pet_parent: true, pet_friend: true }),
        "pet_parent",
      ),
    ).toBe(true);
  });

  it("ineligible with active membership for role", () => {
    expect(
      isWelcomeOfferEligibleForRoleFromProfile(
        profileWithWelcomeOffer({ pet_parent: false, pet_friend: true }),
        "pet_parent",
      ),
    ).toBe(false);
  });

  it("ineligible with cancelled membership for role", () => {
    const row = membershipRow({ role: "pet_parent", status: "cancelled" });
    expect(row.status).toBe("cancelled");
    expect(
      isWelcomeOfferEligibleForRoleFromProfile(
        profileWithWelcomeOffer({ pet_parent: false, pet_friend: true }),
        "pet_parent",
      ),
    ).toBe(false);
  });

  it("ineligible with expired membership for role", () => {
    const row = membershipRow({ role: "pet_friend", status: "expired" });
    expect(row.status).toBe("expired");
    expect(
      isWelcomeOfferEligibleForRoleFromProfile(
        profileWithWelcomeOffer({ pet_parent: true, pet_friend: false }),
        "pet_friend",
      ),
    ).toBe(false);
  });
});

describe("MembershipPlans UI guard", () => {
  it("does not render frontend-calculated promotional euro amounts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/pricing/MembershipPlans.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/line-through/);
    expect(source).not.toMatch(/newMemberPromotionalPricing/);
    expect(source).not.toMatch(/discountedPrice/);
  });
});
