import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSendTransactionalEmail = vi.fn();
vi.mock("@/lib/email-send", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email-send")>();
  return {
    ...actual,
    sendTransactionalEmail: (...args: unknown[]) => mockSendTransactionalEmail(...args),
  };
});

import { buildMembershipActivatedEmail } from "@/lib/email-templates/platform-emails";
import { computeMembershipEndDate } from "@/lib/stripe-plans";
import {
  membershipActivationEmailUniqueKey,
  membershipEmailContext,
  membershipPlanDisplayName,
  membershipPriceDisplay,
} from "@/lib/membership-email-content";
import { triggerMembershipConfirmationEmail } from "@/lib/membership-emails";
import type { MembershipRole, UserMembership } from "@/lib/membership";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const START_DATE = "2026-07-25";

const ALL_PLANS = [
  { planId: "one-time-owner", role: "pet_parent" as const, price: "€18", name: "One Time" },
  { planId: "one-time-friend", role: "pet_friend" as const, price: "€12", name: "One Time" },
  { planId: "3-month-owner", role: "pet_parent" as const, price: "€79", name: "3 Month" },
  { planId: "3-month-friend", role: "pet_friend" as const, price: "€49", name: "3 Month" },
  { planId: "1-year-owner", role: "pet_parent" as const, price: "€249", name: "1 Year" },
  { planId: "1-year-friend", role: "pet_friend" as const, price: "€119", name: "1 Year" },
] as const;

function billingIntervalForPlan(planId: string): "one_time" | "3_months" | "12_months" {
  if (planId.startsWith("one-time")) return "one_time";
  if (planId.startsWith("3-month")) return "3_months";
  return "12_months";
}

function makeMembership(
  planId: string,
  role: MembershipRole,
  overrides?: Partial<UserMembership>,
): UserMembership {
  const interval = billingIntervalForPlan(planId);
  const endDate = computeMembershipEndDate(interval, new Date(`${START_DATE}T12:00:00.000Z`));
  const autoRenew = interval !== "one_time";

  return {
    id: `mem-${planId}`,
    user_id: USER_ID,
    role,
    plan_id: planId,
    plan_name: membershipPlanDisplayName(planId, "en"),
    status: "active",
    start_date: START_DATE,
    end_date: endDate,
    auto_renew: autoRenew,
    stripe_customer_id: "cus_test",
    stripe_subscription_id: autoRenew ? "sub_test" : null,
    stripe_price_id: "price_test",
    stripe_checkout_session_id: `cs_${planId}`,
    linked_booking_id: null,
    consumed_at: null,
    cancellation_restart_used: false,
    ...overrides,
  };
}

function buildActivationEmail(planId: string, role: MembershipRole) {
  const membership = makeMembership(planId, role);
  return buildMembershipActivatedEmail(membershipEmailContext(membership, "Alex", "en"), "en");
}

describe("membership activation email — one email per plan checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendTransactionalEmail.mockResolvedValue({ sent: true, skipped: false });
  });

  for (const { planId, role } of ALL_PLANS) {
    it(`${planId} sends exactly one activation email`, async () => {
      const membership = makeMembership(planId, role);
      triggerMembershipConfirmationEmail(USER_ID, membership, "Alex");
      await vi.waitFor(() => expect(mockSendTransactionalEmail).toHaveBeenCalledTimes(1));

      expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "membership_activated",
          userId: USER_ID,
          uniqueKey: `membership_activated_cs_${planId}`,
          context: expect.objectContaining({
            packageName: membershipPlanDisplayName(planId, "en"),
            membershipPrice: membershipPriceDisplay(planId, "en"),
          }),
        }),
      );
    });
  }
});

describe("membership activation email content", () => {
  it("one-time email says Automatic Renewal: No", () => {
    const template = buildActivationEmail("one-time-owner", "pet_parent");
    expect(template.text).toContain("Automatic Renewal: No");
    expect(template.text).not.toContain("Automatic Renewal: Yes");
  });

  it("recurring emails say Automatic Renewal: Yes", () => {
    for (const planId of ["3-month-owner", "3-month-friend", "1-year-owner", "1-year-friend"]) {
      const role = planId.includes("friend") ? "pet_friend" : "pet_parent";
      const template = buildActivationEmail(planId, role);
      expect(template.text).toContain("Automatic Renewal: Yes");
    }
  });

  it("all emails show the correct plan name", () => {
    for (const { planId, role, name } of ALL_PLANS) {
      const template = buildActivationEmail(planId, role);
      expect(template.text).toContain(`Package: ${name}`);
    }
  });

  it("all emails show the correct start and end dates", () => {
    for (const { planId, role } of ALL_PLANS) {
      const membership = makeMembership(planId, role);
      const template = buildActivationEmail(planId, role);
      const endIso = membership.end_date!;
      const endLabel = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(endIso));

      expect(template.text).toContain("Start Date: July 25, 2026");
      expect(template.text).toContain(`End Date: ${endLabel}`);
    }
  });

  it('no email contains "— per period"', () => {
    for (const { planId, role } of ALL_PLANS) {
      const template = buildActivationEmail(planId, role);
      expect(template.text).not.toContain("— per period");
      expect(template.text).not.toContain("per period");
    }
  });

  it("uses required subject and heading", () => {
    const template = buildActivationEmail("3-month-owner", "pet_parent");
    expect(template.subject).toBe("Your StayWithMyPet membership is active");
    expect(template.text).toContain("Membership Activated");
  });

  it("shows role-specific price lines without hardcoded €79 for every plan", () => {
    expect(buildActivationEmail("one-time-owner", "pet_parent").text).toContain("Price: €18");
    expect(buildActivationEmail("one-time-friend", "pet_friend").text).toContain("Price: €12");
    expect(buildActivationEmail("3-month-owner", "pet_parent").text).toContain(
      "Price: €79 per 3 months",
    );
    expect(buildActivationEmail("1-year-owner", "pet_parent").text).toContain("Price: €249 per year");
    expect(buildActivationEmail("1-year-friend", "pet_friend").text).toContain(
      "Price: €119 per year",
    );
  });
});

describe("membership activation email dedupe", () => {
  it("duplicate delivery of the same checkout event uses the same dedupe key", () => {
    const first = makeMembership("one-time-owner", "pet_parent", {
      stripe_checkout_session_id: "cs_same_checkout",
    });
    const second = makeMembership("one-time-owner", "pet_parent", {
      id: "mem-other-row",
      stripe_checkout_session_id: "cs_same_checkout",
    });

    expect(membershipActivationEmailUniqueKey(first)).toBe(
      membershipActivationEmailUniqueKey(second),
    );
  });

  it("a new checkout session gets a distinct dedupe key even on the same membership row", () => {
    const first = makeMembership("3-month-owner", "pet_parent", {
      stripe_checkout_session_id: "cs_first",
    });
    const second = makeMembership("3-month-owner", "pet_parent", {
      stripe_checkout_session_id: "cs_second",
    });

    expect(membershipActivationEmailUniqueKey(first)).not.toBe(
      membershipActivationEmailUniqueKey(second),
    );
  });
});

describe("subscription and invoice sync events send no activation email", () => {
  it("is covered by stripe-webhook-activation-email.test.ts (sendConfirmationEmail: false)", async () => {
    const { handleSubscriptionEvent } = await import("@/lib/stripe-webhook");
    expect(typeof handleSubscriptionEvent).toBe("function");
  });
});
