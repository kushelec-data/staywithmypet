import "server-only";

import type Stripe from "stripe";
import {
  billingIntervalFromPlanId,
  computeMembershipEndDate,
  resolveStripePriceId,
} from "@/lib/stripe-plans";
import { upsertUserMembershipAsAdmin } from "@/lib/membership-activate";
import type { MembershipRole, MembershipStatus } from "@/lib/membership";
import { getStripe } from "@/lib/stripe";

function roleFromMetadata(value: string | undefined): MembershipRole | null {
  if (value === "pet_parent" || value === "pet_friend") return value;
  return null;
}

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

async function syncFromSubscription(
  subscription: Stripe.Subscription,
  overrides?: { planId?: string; role?: MembershipRole },
): Promise<void> {
  const customerMeta =
    typeof subscription.customer === "string"
      ? undefined
      : customerMetadata(subscription.customer);

  const userId =
    subscription.metadata.user_id?.trim() || customerMeta?.user_id?.trim();

  const role =
    overrides?.role ??
    roleFromMetadata(subscription.metadata.role) ??
    roleFromMetadata(customerMeta?.role);

  const planId =
    overrides?.planId?.trim() ||
    subscription.metadata.plan_id?.trim() ||
    subscription.items.data[0]?.price.metadata?.plan_id?.trim();

  if (!userId || !role || !planId) {
    console.warn("[stripe] subscription missing user_id, role, or plan_id", subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const status = subscriptionStatusToMembership(subscription.status);
  const startDate = periodStartIso(subscription) ?? new Date().toISOString();

  await upsertUserMembershipAsAdmin({
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
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.user_id?.trim() || session.client_reference_id?.trim();
  const role = roleFromMetadata(session.metadata?.role);
  const planId = session.metadata?.plan_id?.trim();

  if (!userId || !role || !planId) {
    console.warn("[stripe] checkout.session.completed missing metadata", session.id);
    return;
  }

  const stripe = getStripe();
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  let subscription: Stripe.Subscription | null = null;
  if (session.subscription) {
    const subId =
      typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    subscription = await stripe.subscriptions.retrieve(subId);
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const priceId = lineItems.data[0]?.price?.id ?? resolveStripePriceId(planId);

  const billingInterval = billingIntervalFromPlanId(planId);
  const startDate = new Date().toISOString();
  const endDate = subscription
    ? periodEndIso(subscription)
    : computeMembershipEndDate(billingInterval, new Date(startDate));

  const status: MembershipStatus =
    session.payment_status === "paid" || session.payment_status === "no_payment_required"
      ? "active"
      : "inactive";

  await upsertUserMembershipAsAdmin({
    userId,
    role,
    planId,
    status,
    startDate,
    endDate,
    autoRenew: Boolean(subscription) && !subscription?.cancel_at_period_end,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription?.id ?? null,
    stripePriceId: priceId,
    sendConfirmationEmail: true,
  });
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
  if (!subId) return;
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subId);
  await syncFromSubscription(subscription);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) return;
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subId);
  await syncFromSubscription(subscription);
}
