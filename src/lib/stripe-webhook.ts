import "server-only";

import type Stripe from "stripe";
import {
  billingIntervalFromPlanId,
  computeMembershipEndDate,
  membershipRoleFromPlanId,
  planIdFromStripePriceId,
  resolveStripePriceId,
} from "@/lib/stripe-plans";
import { upsertUserMembershipAsAdmin } from "@/lib/membership-activate";
import type { MembershipRole, MembershipStatus } from "@/lib/membership";
import { getStripe } from "@/lib/stripe";
import {
  findSupabaseUserIdByEmail,
  resolveCheckoutActivationContext,
  roleFromStripeMetadata,
} from "@/lib/stripe-webhook-resolve";

function subscriptionStatusToMembership(status: Stripe.Subscription.Status): MembershipStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "canceled":
      return "cancelled";
    case "unpaid":
    case "past_due":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "inactive";
    default:
      return "inactive";
  }
}

function firstSubscriptionItem(subscription: Stripe.Subscription): Stripe.SubscriptionItem | undefined {
  const items = subscription.items?.data;
  return items?.[0];
}

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const end = firstSubscriptionItem(subscription)?.current_period_end;
  if (!end) return null;
  return new Date(end * 1000).toISOString();
}

function periodStartIso(subscription: Stripe.Subscription): string | null {
  const start = firstSubscriptionItem(subscription)?.current_period_start;
  if (!start) return null;
  return new Date(start * 1000).toISOString();
}

function customerMetadata(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer,
): Stripe.Metadata | undefined {
  if (typeof customer === "string" || customer.deleted) return undefined;
  return customer.metadata;
}

async function assertMembershipUpsert(
  result: Awaited<ReturnType<typeof upsertUserMembershipAsAdmin>>,
  context: string,
): Promise<void> {
  if (!result.ok) {
    throw new Error(`[stripe] ${context}: ${result.error}`);
  }
}

async function resolveSubscriptionUserId(
  subscription: Stripe.Subscription,
  customerId: string | null,
): Promise<string | null> {
  const customerMeta =
    typeof subscription.customer === "string"
      ? undefined
      : customerMetadata(subscription.customer);

  let userId =
    subscription.metadata.user_id?.trim() || customerMeta?.user_id?.trim() || null;

  if (userId) return userId;

  if (!customerId) return null;

  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (!customer.deleted && customer.email?.trim()) {
      userId = await findSupabaseUserIdByEmail(customer.email);
      if (userId) {
        console.log("[stripe] subscription user resolved via customer email", {
          subscriptionId: subscription.id,
          userId,
        });
      }
    }
  } catch (err) {
    console.error(
      "[stripe] subscription customer lookup failed",
      err instanceof Error ? err.message : String(err),
    );
  }

  return userId;
}

async function syncFromSubscription(
  subscription: Stripe.Subscription,
  overrides?: { planId?: string; role?: MembershipRole },
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const customerMeta =
    typeof subscription.customer === "string"
      ? undefined
      : customerMetadata(subscription.customer);

  const userId = await resolveSubscriptionUserId(subscription, customerId);

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const planFromPrice = priceId ? planIdFromStripePriceId(priceId) : null;

  const planId =
    overrides?.planId?.trim() ||
    subscription.metadata.plan_id?.trim() ||
    subscription.items.data[0]?.price.metadata?.plan_id?.trim() ||
    planFromPrice ||
    undefined;

  const role =
    overrides?.role ??
    roleFromStripeMetadata(subscription.metadata.role) ??
    roleFromStripeMetadata(customerMeta?.role) ??
    (planId ? membershipRoleFromPlanId(planId) : null);

  if (!userId || !role || !planId) {
    const missing = [
      !userId ? "user_id" : null,
      !role ? "role" : null,
      !planId ? "plan_id" : null,
    ].filter(Boolean);
    throw new Error(
      `[stripe] subscription ${subscription.id}: missing ${missing.join(", ")}`,
    );
  }

  console.log("[stripe] subscription sync", {
    subscriptionId: subscription.id,
    userId,
    role,
    planId,
    status: subscription.status,
  });

  const status = subscriptionStatusToMembership(subscription.status);
  const startDate = periodStartIso(subscription) ?? new Date().toISOString();

  const result = await upsertUserMembershipAsAdmin({
    userId,
    role,
    planId,
    status,
    startDate,
    endDate: periodEndIso(subscription),
    autoRenew: !subscription.cancel_at_period_end && status === "active",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    sendConfirmationEmail: status === "active" || status === "trialing",
  });

  await assertMembershipUpsert(result, `subscription ${subscription.id}`);
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const stripe = getStripe();
  const { userId, role, planId, priceId } = await resolveCheckoutActivationContext(session);

  console.log("[stripe] user found for checkout", { sessionId: session.id, userId });

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  let subscription: Stripe.Subscription | null = null;
  if (session.subscription) {
    const subId =
      typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    subscription = await stripe.subscriptions.retrieve(subId);
  }

  const resolvedPriceId = priceId ?? resolveStripePriceId(planId);
  const billingInterval = billingIntervalFromPlanId(planId);
  const startDate = subscription
    ? periodStartIso(subscription) ?? new Date().toISOString()
    : new Date().toISOString();
  const endDate = subscription
    ? periodEndIso(subscription)
    : computeMembershipEndDate(billingInterval, new Date(startDate));

  const status: MembershipStatus =
    session.payment_status === "paid" || session.payment_status === "no_payment_required"
      ? "active"
      : "inactive";

  if (status !== "active") {
    console.warn("[stripe] checkout completed but payment_status not active", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
  }

  const result = await upsertUserMembershipAsAdmin({
    userId,
    role,
    planId,
    status,
    startDate,
    endDate,
    autoRenew: Boolean(subscription) && !subscription?.cancel_at_period_end,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription?.id ?? null,
    stripePriceId: resolvedPriceId,
    sendConfirmationEmail: status === "active",
  });

  await assertMembershipUpsert(result, `checkout ${session.id}`);
}

export async function handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
  await syncFromSubscription(subscription);
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subRef = invoice.parent?.subscription_details?.subscription;
  if (!subRef) return null;
  return typeof subRef === "string" ? subRef : subRef.id;
}

export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) {
    console.warn("[stripe] invoice.payment_succeeded without subscription", invoice.id);
    return;
  }
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subId);
  await syncFromSubscription(subscription);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) {
    console.warn("[stripe] invoice.payment_failed without subscription", invoice.id);
    return;
  }
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subId);
  await syncFromSubscription(subscription);
}
