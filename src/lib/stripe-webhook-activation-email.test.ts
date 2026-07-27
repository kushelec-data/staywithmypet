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

const mockSubscriptionsRetrieve = vi.fn();
const mockGetStripe = vi.fn(() => ({
  subscriptions: { retrieve: mockSubscriptionsRetrieve },
  checkout: { sessions: { listLineItems: vi.fn() } },
  paymentIntents: { retrieve: vi.fn().mockResolvedValue({ metadata: {} }) },
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => mockGetStripe(),
}));

import { activateMembershipFromCheckoutSession } from "@/lib/stripe-checkout-activate";
import {
  handleCheckoutAsyncPaymentSucceeded,
  handleCheckoutSessionCompleted,
  handleInvoicePaymentSucceeded,
  handleSubscriptionEvent,
} from "@/lib/stripe-webhook";
import { claimStripeWebhookEvent } from "@/lib/stripe-webhook-idempotency";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PERIOD_START = Math.floor(new Date("2026-07-25T00:00:00.000Z").getTime() / 1000);
const PERIOD_END = Math.floor(new Date("2026-10-25T00:00:00.000Z").getTime() / 1000);

const membershipRow = {
  id: "mem-test-1",
  user_id: USER_ID,
  role: "pet_parent" as const,
  plan_id: "3-month-owner",
  plan_name: "3 Month",
  status: "active" as const,
  start_date: "2026-07-25",
  end_date: "2026-10-25",
  auto_renew: true,
  stripe_customer_id: "cus_test",
  stripe_subscription_id: "sub_test",
  stripe_price_id: "price_test",
  stripe_checkout_session_id: "cs_test_checkout",
};

function successUpsert() {
  mockUpsertUserMembershipAsAdmin.mockResolvedValue({
    ok: true,
    membership: membershipRow,
  });
}

function activeSubscription(
  overrides?: Partial<Stripe.Subscription>,
): Stripe.Subscription {
  return {
    id: "sub_test",
    object: "subscription",
    status: "active",
    customer: "cus_test",
    cancel_at_period_end: false,
    metadata: {
      user_id: USER_ID,
      membership_role: "pet_parent",
      plan_id: "3-month-owner",
    },
    items: {
      object: "list",
      data: [
        {
          id: "si_test",
          object: "subscription_item",
          price: { id: "price_test", metadata: {} } as Stripe.Price,
          current_period_start: PERIOD_START,
          current_period_end: PERIOD_END,
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: "/v1/subscription_items",
    },
    ...overrides,
  } as Stripe.Subscription;
}

function paidCheckoutSession(
  overrides?: Partial<Stripe.Checkout.Session>,
): Stripe.Checkout.Session {
  return {
    id: "cs_test_checkout",
    object: "checkout.session",
    mode: "subscription",
    payment_status: "paid",
    metadata: {
      user_id: USER_ID,
      membership_role: "pet_parent",
      plan_id: "3-month-owner",
    },
    client_reference_id: USER_ID,
    customer: "cus_test",
    subscription: "sub_test",
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("Stripe membership activation emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    successUpsert();
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });
    mockResolveCheckoutActivationContext.mockResolvedValue({
      userId: USER_ID,
      role: "pet_parent",
      planId: "3-month-owner",
      priceId: "price_test",
    });
    mockSubscriptionsRetrieve.mockImplementation(async () => activeSubscription());
  });

  it("subscription checkout (checkout.session.completed) sends one activation email", async () => {
    await handleCheckoutSessionCompleted(paidCheckoutSession());

    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledTimes(1);
    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ sendConfirmationEmail: true }),
    );
  });

  it("async successful checkout sends one activation email", async () => {
    await handleCheckoutAsyncPaymentSucceeded(paidCheckoutSession());

    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledTimes(1);
    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ sendConfirmationEmail: true }),
    );
  });

  it("customer.subscription.created sends no activation email", async () => {
    await handleSubscriptionEvent(activeSubscription());

    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledTimes(1);
    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ sendConfirmationEmail: false }),
    );
  });

  it("customer.subscription.updated with cancel_at_period_end keeps paid access until period end", async () => {
    await handleSubscriptionEvent(
      activeSubscription({ status: "active", cancel_at_period_end: true }),
    );

    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledTimes(1);
    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        sendConfirmationEmail: false,
        status: "cancelled",
        autoRenew: false,
      }),
    );
  });

  it("customer.subscription.deleted after paid period marks membership expired", async () => {
    await handleSubscriptionEvent(activeSubscription({ status: "canceled" }));

    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "expired",
      }),
    );
  });

  it("invoice.payment_succeeded sends no activation email", async () => {
    await handleInvoicePaymentSucceeded({
      id: "in_test",
      object: "invoice",
      parent: {
        subscription_details: { subscription: "sub_test" },
      },
    } as Stripe.Invoice);

    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_test");
    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledTimes(1);
    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ sendConfirmationEmail: false }),
    );
  });

  it("subscription renewal sync still updates membership without activation email", async () => {
    await handleSubscriptionEvent(activeSubscription({ status: "active" }));

    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        sendConfirmationEmail: false,
        planId: "3-month-owner",
        status: "active",
        stripeSubscriptionId: "sub_test",
      }),
    );
  });

  it("activateMembershipFromCheckoutSession enables confirmation email directly", async () => {
    await activateMembershipFromCheckoutSession(paidCheckoutSession({ mode: "payment" }));

    expect(mockUpsertUserMembershipAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ sendConfirmationEmail: true, source: "stripe_checkout" }),
    );
  });
});

describe("Stripe webhook checkout idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("repeated checkout.session.completed event is deduplicated via claimStripeWebhookEvent", async () => {
    const insert = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });

    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        insert,
      }),
    });

    const first = await claimStripeWebhookEvent("evt_checkout_dup", "checkout.session.completed");
    const second = await claimStripeWebhookEvent("evt_checkout_dup", "checkout.session.completed");

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(insert).toHaveBeenCalledTimes(2);
  });
});

describe("invoice.paid webhook routing", () => {
  const mockHandleInvoicePaymentSucceeded = vi.fn();
  const mockHandleInvoicePaymentFailed = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  async function postWebhookEvent(eventType: string) {
    vi.doMock("@/lib/debug-stripe-env", () => ({ logStripeEnvPresence: vi.fn() }));
    vi.doMock("@/lib/stripe-webhook-config", () => ({
      getMembershipWebhookHealth: () => ({ membershipWebhookWritable: true }),
      isMembershipWebhookWritable: () => true,
    }));
    vi.doMock("@/lib/stripe-webhook-idempotency", () => ({
      claimStripeWebhookEvent: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock("@/lib/stripe-webhook", () => ({
      handleCheckoutSessionCompleted: vi.fn(),
      handleCheckoutAsyncPaymentSucceeded: vi.fn(),
      handleSubscriptionEvent: vi.fn(),
      handleInvoicePaymentSucceeded: (...args: unknown[]) =>
        mockHandleInvoicePaymentSucceeded(...args),
      handleInvoicePaymentFailed: (...args: unknown[]) => mockHandleInvoicePaymentFailed(...args),
    }));
    vi.doMock("@/lib/stripe", () => ({
      getStripe: () => ({
        webhooks: {
          constructEvent: () => ({
            id: `evt_${eventType}`,
            type: eventType,
            data: { object: { id: "in_test", object: "invoice" } },
          }),
        },
      }),
    }));

    const { POST } = await import("@/app/api/stripe/webhook/route");
    return POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "test_sig" },
        body: "{}",
      }),
    );
  }

  it("invoice.paid does not send activation email or invoke invoice sync", async () => {
    const res = await postWebhookEvent("invoice.paid");
    expect(res.status).toBe(200);
    expect(mockHandleInvoicePaymentSucceeded).not.toHaveBeenCalled();
    expect(mockHandleInvoicePaymentFailed).not.toHaveBeenCalled();
  });

  it("invoice.payment_succeeded still invokes invoice sync", async () => {
    const res = await postWebhookEvent("invoice.payment_succeeded");
    expect(res.status).toBe(200);
    expect(mockHandleInvoicePaymentSucceeded).toHaveBeenCalledTimes(1);
  });
});
