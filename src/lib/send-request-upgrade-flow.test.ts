import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  dismissMembershipUpsellForSession,
  isMembershipUpsellDismissedForSession,
} from "@/lib/new-member-promotion";
import {
  resolveSendRequestOpenAction,
  shouldSubmitCareRequest,
} from "@/lib/send-request-upgrade-flow";
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

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("resolveSendRequestOpenAction", () => {
  it("opens upgrade modal on first click without membership", () => {
    expect(
      resolveSendRequestOpenAction({
        blocked: false,
        userLoggedIn: true,
        needsUpgrade: true,
      }),
    ).toBe("open_upgrade_modal");
  });

  it("does not open request form without membership", () => {
    expect(
      resolveSendRequestOpenAction({
        blocked: false,
        userLoggedIn: true,
        needsUpgrade: true,
      }),
    ).not.toBe("open_request_form");
  });

  it("opens request form when user has valid Pet Friend membership", () => {
    const memberships = { pet_parent: null, pet_friend: activePetFriend };
    expect(hasActiveMembershipForRole(memberships, "pet_friend")).toBe(true);

    expect(
      resolveSendRequestOpenAction({
        blocked: false,
        userLoggedIn: true,
        needsUpgrade: false,
      }),
    ).toBe("open_request_form");
  });

  it("still opens upgrade modal after automatic upsell was dismissed", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });
    dismissMembershipUpsellForSession();
    expect(isMembershipUpsellDismissedForSession()).toBe(true);

    expect(
      resolveSendRequestOpenAction({
        blocked: false,
        userLoggedIn: true,
        needsUpgrade: true,
      }),
    ).toBe("open_upgrade_modal");

    vi.unstubAllGlobals();
  });
});

describe("shouldSubmitCareRequest", () => {
  it("blocks request submission without membership", () => {
    expect(shouldSubmitCareRequest(true)).toBe(false);
  });

  it("allows submission with active membership", () => {
    expect(shouldSubmitCareRequest(false)).toBe(true);
  });
});

describe("SendRequestButton explicit upgrade modal flow", () => {
  const sendRequestSource = readSource("src/components/requests/SendRequestButton.tsx");
  const upgradeModalSource = readSource("src/components/membership/MembershipUpgradeModal.tsx");

  it("does not gate explicit clicks on automatic upsell dismiss storage", () => {
    expect(sendRequestSource).not.toMatch(/isMembershipUpsellDismissedForSession/);
    expect(sendRequestSource).not.toMatch(/dismissMembershipUpsellForSession/);
  });

  it("uses resolveSendRequestOpenAction for explicit open handling", () => {
    expect(sendRequestSource).toContain("resolveSendRequestOpenAction");
    expect(sendRequestSource).toContain('openAction === "open_upgrade_modal"');
  });

  it("closes upgrade modal by setting open state only", () => {
    expect(sendRequestSource).toContain("setUpgradeModalOpen(false)");
    expect(sendRequestSource).toMatch(/const closeUpgradeModal = useCallback\(\(\) => \{\s*setUpgradeModalOpen\(false\);/);
  });

  it("does not persist dismiss when Continue browsing is clicked", () => {
    expect(upgradeModalSource).not.toMatch(/dismissMembershipUpsellForSession/);
    expect(upgradeModalSource).toMatch(/const handleContinueBrowsing = useCallback\(\(\) => \{\s*onClose\(\);/);
  });

  it("closes via X, backdrop, and ESC through onClose only", () => {
    expect(upgradeModalSource).toContain("onClick={onClose}");
    expect(upgradeModalSource).toContain('if (event.key === "Escape")');
    expect(upgradeModalSource).toContain("onClose();");
  });

  it("reopens because openUpgradeModal always sets modal open", () => {
    expect(sendRequestSource).toMatch(/const openUpgradeModal = useCallback\(\(\) => \{\s*setUpgradeModalOpen\(true\);/);
  });

  it("guards submit path before calling submitCareRequestAction", () => {
    expect(sendRequestSource).toContain("shouldSubmitCareRequest");
    const submitGuardIndex = sendRequestSource.indexOf("shouldSubmitCareRequest(needsUpgrade)");
    const submitActionIndex = sendRequestSource.indexOf("submitCareRequestAction");
    expect(submitGuardIndex).toBeGreaterThan(-1);
    expect(submitActionIndex).toBeGreaterThan(submitGuardIndex);
  });

  it("resets sound guard when modal closes so reopen plays sound again", () => {
    expect(upgradeModalSource).toContain("playedSoundRef.current = false");
    expect(upgradeModalSource).toContain("playMembershipUpgradeModalSound()");
  });
});

describe("pet friend membership enforcement", () => {
  it("treats empty memberships as needing upgrade for pet friend send flow", () => {
    const memberships = emptyMembershipsByRole();
    expect(hasActiveMembershipForRole(memberships, "pet_friend")).toBe(false);
    expect(
      resolveSendRequestOpenAction({
        blocked: false,
        userLoggedIn: true,
        needsUpgrade: true,
      }),
    ).toBe("open_upgrade_modal");
  });
});
