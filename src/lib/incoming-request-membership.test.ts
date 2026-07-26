import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildIncomingRequestUpsellCopy,
  formatIncomingRequestUpsellText,
  incomingRequestMembershipHref,
  receiverNeedsMembershipToAccept,
  resolveIncomingRequestUpsellVariant,
} from "@/lib/incoming-request-membership";
import { emptyMembershipsByRole, hasActiveMembershipForRole, type UserMembership } from "@/lib/membership";

const activePetFriend: UserMembership = {
  id: "m1",
  user_id: "u1",
  role: "pet_friend",
  plan_id: "one-time-friend",
  plan_name: "One Time",
  status: "active",
  start_date: "2026-01-01",
  end_date: null,
  auto_renew: false,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  stripe_checkout_session_id: null,
  linked_booking_id: null,
  consumed_at: null,
  cancellation_restart_used: false,
};

const upsellCopy = {
  petFriendTitle: "{petName} would like you to look after them!",
  petFriendBody: "{petName} owner body",
  petFriendButton: "Activate Pet Friend Membership",
  petParentTitle: "Great news — someone would like to care for {petName}!",
  petParentBody: "Pet Parent body",
  petParentButton: "Activate Pet Parent Membership",
  fallbackTitle: "Fallback title",
  fallbackBody: "Fallback body",
};

describe("receiverNeedsMembershipToAccept", () => {
  it("returns true when receiver role has no active membership", () => {
    expect(receiverNeedsMembershipToAccept(emptyMembershipsByRole(), "pet_friend")).toBe(true);
  });

  it("returns false when receiver has active membership for role", () => {
    expect(
      receiverNeedsMembershipToAccept(
        { pet_parent: null, pet_friend: activePetFriend },
        "pet_friend",
      ),
    ).toBe(false);
  });

  it("returns true when only the wrong role is active", () => {
    expect(
      receiverNeedsMembershipToAccept(
        { pet_parent: null, pet_friend: activePetFriend },
        "pet_parent",
      ),
    ).toBe(true);
  });
});

describe("incoming request membership upsell copy", () => {
  it("uses pet friend copy with pet name", () => {
    const copy = buildIncomingRequestUpsellCopy(upsellCopy, "pet_friend", {
      petName: "Denny",
    });
    expect(copy.title).toBe("Denny would like you to look after them!");
    expect(copy.buttonLabel).toBe("Activate Pet Friend Membership");
  });

  it("uses pet parent copy with pet name", () => {
    const copy = buildIncomingRequestUpsellCopy(upsellCopy, "pet_parent", {
      petName: "Denny",
    });
    expect(copy.title).toBe("Great news — someone would like to care for Denny!");
    expect(copy.buttonLabel).toBe("Activate Pet Parent Membership");
  });

  it("builds membership URL with role and source", () => {
    expect(incomingRequestMembershipHref("pet_friend")).toBe(
      "/membership?role=friend&returnTo=%2Frequests%3Fdirection%3Dincoming&source=incoming-request",
    );
    expect(incomingRequestMembershipHref("pet_parent")).toBe(
      "/membership?role=parent&returnTo=%2Frequests%3Fdirection%3Dincoming&source=incoming-request",
    );
  });

  it("resolves upsell variant from receiver role", () => {
    expect(resolveIncomingRequestUpsellVariant("pet_friend")).toBe("pet_friend");
    expect(resolveIncomingRequestUpsellVariant("pet_parent")).toBe("pet_parent");
    expect(resolveIncomingRequestUpsellVariant(null)).toBe("fallback");
  });

  it("formats placeholders in translated strings", () => {
    expect(
      formatIncomingRequestUpsellText("{petName} from {senderName}", {
        petName: "Denny",
        senderName: "Alex",
      }),
    ).toBe("Denny from Alex");
  });
});

const baseMembership = (overrides: Partial<UserMembership>): UserMembership => ({
  id: "m1",
  user_id: "u1",
  role: "pet_friend",
  plan_id: "one-time-friend",
  plan_name: "One Time",
  status: "active",
  start_date: "2026-01-01",
  end_date: null,
  auto_renew: false,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  stripe_checkout_session_id: null,
  linked_booking_id: null,
  consumed_at: null,
  cancellation_restart_used: false,
  ...overrides,
});

describe("membership role qualification for accept", () => {
  it("accept requires the receiver role membership, not the other role", () => {
    const memberships = {
      pet_parent: null,
      pet_friend: baseMembership({ role: "pet_friend", status: "active" }),
    };
    expect(hasActiveMembershipForRole(memberships, "pet_friend")).toBe(true);
    expect(hasActiveMembershipForRole(memberships, "pet_parent")).toBe(false);
  });

  it("cancelled membership cannot accept", () => {
    const memberships = {
      pet_parent: null,
      pet_friend: baseMembership({ status: "cancelled" }),
    };
    expect(hasActiveMembershipForRole(memberships, "pet_friend")).toBe(false);
  });

  it("expired membership cannot accept", () => {
    const memberships = {
      pet_parent: null,
      pet_friend: baseMembership({
        status: "active",
        end_date: "2020-01-01",
      }),
    };
    expect(hasActiveMembershipForRole(memberships, "pet_friend")).toBe(false);
  });
});

describe("request card actions UI wiring", () => {
  it("passes membership upsell props from RequestListItem to RequestCardActions", () => {
    const listItem = readFileSync(
      join(process.cwd(), "src/components/requests/RequestListItem.tsx"),
      "utf8",
    );
    const cardActions = readFileSync(
      join(process.cwd(), "src/components/requests/RequestCardActions.tsx"),
      "utf8",
    );
    expect(listItem).toMatch(/needsMembershipToAccept/);
    expect(listItem).toMatch(/membershipUpsell/);
    expect(cardActions).toMatch(/needsMembershipToAccept/);
    expect(cardActions).toMatch(/membershipUpsell\.membershipHref/);
    expect(cardActions).toMatch(/!\s*needsMembershipToAccept/);
  });
});
