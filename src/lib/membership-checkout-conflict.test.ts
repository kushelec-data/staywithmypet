import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));

const mockUpsertUserMembershipAsAdmin = vi.fn();
vi.mock("@/lib/membership-activate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/membership-activate")>();
  return {
    ...actual,
    upsertUserMembershipAsAdmin: (...args: unknown[]) => mockUpsertUserMembershipAsAdmin(...args),
  };
});

const mockResolveCheckoutActivationContext = vi.fn();
vi.mock("@/lib/stripe-webhook-resolve", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stripe-webhook-resolve")>();
  return {
    ...actual,
    resolveCheckoutActivationContext: (...args: unknown[]) =>
      mockResolveCheckoutActivationContext(...args),
  };
});

const mockCreateAdminClient = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { retrieve: vi.fn() },
  }),
}));

import {
  ACTIVE_MEMBERSHIP_CHECKOUT_CONFLICT_CODE,
  evaluateCheckoutActivationConflict,
  evaluateMembershipCheckoutConflict,
  isActiveRecurringMembership,
} from "@/lib/membership-checkout-conflict";
import { activateMembershipFromCheckoutSession } from "@/lib/stripe-checkout-activate";
import { handleCheckoutSessionCompleted } from "@/lib/stripe-webhook";

const USER_ID = "11111111-1111-4111-8111-111111111111";

const activeRecurringParent = {
  status: "active" as const,
  end_date: "2099-01-01",
  plan_id: "3-month-owner",
  stripe_subscription_id: "sub_existing",
  stripe_checkout_session_id: "cs_old",
};

const activeOneTimeParent = {
  status: "active" as const,
  end_date: "2099-01-01",
  plan_id: "one-time-owner",
  stripe_subscription_id: null,
  stripe_checkout_session_id: "cs_one_time",
};

const cancelledParent = {
  status: "cancelled" as const,
  end_date: "2099-01-01",
  plan_id: "3-month-owner",
  stripe_subscription_id: "sub_cancelled",
  stripe_checkout_session_id: "cs_cancelled",
};

describe("evaluateMembershipCheckoutConflict", () => {
  it("active recurring parent membership blocks one-time parent checkout", () => {
    const result = evaluateMembershipCheckoutConflict(
      activeRecurringParent,
      "pet_parent",
      "one-time-owner",
    );
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.code).toBe(ACTIVE_MEMBERSHIP_CHECKOUT_CONFLICT_CODE);
      expect(result.role).toBe("pet_parent");
    }
  });

  it("active recurring parent membership blocks second recurring parent checkout", () => {
    const result = evaluateMembershipCheckoutConflict(
      activeRecurringParent,
      "pet_parent",
      "1-year-owner",
    );
    expect(result.blocked).toBe(true);
  });

  it("parent membership does not block friend checkout", () => {
    const result = evaluateMembershipCheckoutConflict(null, "pet_friend", "3-month-friend");
    expect(result.blocked).toBe(false);
  });

  it("cancelled membership with remaining paid period blocks new checkout", () => {
    const result = evaluateMembershipCheckoutConflict(
      cancelledParent,
      "pet_parent",
      "3-month-owner",
    );
    expect(result.blocked).toBe(true);
  });

  it("cancelled membership after expiry permits new checkout", () => {
    const result = evaluateMembershipCheckoutConflict(
      {
        ...cancelledParent,
        end_date: "2020-01-01",
      },
      "pet_parent",
      "3-month-owner",
    );
    expect(result.blocked).toBe(false);
  });

  it("expired membership permits new checkout", () => {
    const result = evaluateMembershipCheckoutConflict(
      {
        status: "expired",
        end_date: "2020-01-01",
        plan_id: "3-month-owner",
        stripe_subscription_id: null,
        stripe_checkout_session_id: null,
      },
      "pet_parent",
      "one-time-owner",
    );
    expect(result.blocked).toBe(false);
  });

  it("active one-time membership blocks another purchase for the same role", () => {
    const result = evaluateMembershipCheckoutConflict(
      activeOneTimeParent,
      "pet_parent",
      "one-time-owner",
    );
    expect(result.blocked).toBe(true);
  });
});

describe("evaluateCheckoutActivationConflict", () => {
  it("detects active recurring membership rows", () => {
    expect(isActiveRecurringMembership(activeRecurringParent)).toBe(true);
    expect(isActiveRecurringMembership(activeOneTimeParent)).toBe(false);
  });

  it("one-time payment checkout cannot overwrite active recurring membership", () => {
    const result = evaluateCheckoutActivationConflict({
      sessionMode: "payment",
      sessionId: "cs_new_one_time",
      incomingPlanId: "one-time-owner",
      existing: activeRecurringParent,
    });
    expect(result.conflict).toBe(true);
  });
});

describe("checkout webhook activation guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveCheckoutActivationContext.mockResolvedValue({
      userId: USER_ID,
      role: "pet_parent",
      planId: "one-time-owner",
      priceId: "price_one_time",
    });
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: activeRecurringParent, error: null }),
            }),
          }),
        }),
      }),
    });
  });

  it("one-time webhook cannot overwrite active recurring membership", async () => {
    const session = {
      id: "cs_new_one_time",
      mode: "payment",
      payment_status: "paid",
      metadata: {
        user_id: USER_ID,
        membership_role: "pet_parent",
        plan_id: "one-time-owner",
      },
    } as Stripe.Checkout.Session;

    const result = await activateMembershipFromCheckoutSession(session);

    expect(result.ok).toBe(true);
    if (result.ok && !result.activated) {
      expect(result.reason).toBe("membership_conflict");
    }
    expect(mockUpsertUserMembershipAsAdmin).not.toHaveBeenCalled();
  });

  it("conflicting checkout.session.completed returns without throwing", async () => {
    const session = {
      id: "cs_new_one_time",
      mode: "payment",
      payment_status: "paid",
      metadata: { plan_id: "one-time-owner" },
    } as Stripe.Checkout.Session;

    await expect(handleCheckoutSessionCompleted(session)).resolves.toMatchObject({
      ok: true,
      activated: false,
      reason: "membership_conflict",
    });
  });
});

describe("conflicting webhook HTTP response", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  it("returns HTTP 200 after safely logging a membership conflict", async () => {
    vi.doMock("@/lib/debug-stripe-env", () => ({ logStripeEnvPresence: vi.fn() }));
    vi.doMock("@/lib/stripe-webhook-config", () => ({
      getMembershipWebhookHealth: () => ({ membershipWebhookWritable: true }),
      isMembershipWebhookWritable: () => true,
    }));
    vi.doMock("@/lib/stripe-webhook-idempotency", () => ({
      claimStripeWebhookEvent: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock("@/lib/stripe-webhook", () => ({
      handleCheckoutSessionCompleted: vi.fn().mockResolvedValue({
        ok: true,
        activated: false,
        sessionId: "cs_conflict",
        reason: "membership_conflict",
        code: "MEMBERSHIP_ACTIVATION_CONFLICT",
        userId: USER_ID,
        role: "pet_parent",
        planId: "one-time-owner",
      }),
      handleCheckoutAsyncPaymentSucceeded: vi.fn(),
      handleSubscriptionEvent: vi.fn(),
      handleInvoicePaymentSucceeded: vi.fn(),
      handleInvoicePaymentFailed: vi.fn(),
    }));
    vi.doMock("@/lib/stripe", () => ({
      getStripe: () => ({
        webhooks: {
          constructEvent: () => ({
            id: "evt_conflict",
            type: "checkout.session.completed",
            data: {
              object: {
                id: "cs_conflict",
                payment_status: "paid",
                metadata: {},
              },
            },
          }),
        },
      }),
    }));

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { received?: boolean };
    expect(body.received).toBe(true);
  });
});
