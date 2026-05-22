import "server-only";

import type Stripe from "stripe";
import {
  activateMembershipFromCheckoutSession,
  throwCheckoutActivationFailure,
} from "@/lib/stripe-checkout-activate";
import { WebhookHandlerError } from "@/lib/stripe-webhook-handler-error";
import {
  membershipRoleFromPlanId,
  normalizeCatalogPlanId,
  planIdFromStripePriceId,
} from "@/lib/stripe-plans";
import { upsertUserMembershipAsAdmin } from "@/lib/membership-activate";
import type { MembershipRole, MembershipStatus } from "@/lib/membership";
import { getStripe } from "@/lib/stripe";
import {
  findSupabaseUserIdByEmail,
  membershipRoleFromMergedMetadata,
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
    console.error("[membership] upsert error", {
      message: result.error,
      code: result.code ?? null,
      supabaseError: result.supabaseError ?? null,
      context,
    });
    throw new WebhookHandlerError(`[stripe] ${context}: ${result.error}`, {
      step: result.step ?? "upsert_user_memberships",
      supabaseError: result.supabaseError ?? null,
      payloadAttempted: result.payloadAttempted ?? null,
    });
  }
  console.log("[membership] upsert success", {
    userId: result.membership.user_id,
    role: result.membership.role,
    planId: result.membership.plan_id,
    context,
  });
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

  const rawPlanId =
    overrides?.planId?.trim() ||
    subscription.metadata.plan_id?.trim() ||
    subscription.metadata.plan?.trim() ||
    subscription.items.data[0]?.price.metadata?.plan_id?.trim() ||
    planFromPrice ||
    undefined;
  const planId = rawPlanId
    ? normalizeCatalogPlanId(rawPlanId) ?? rawPlanId
    : undefined;

  const role =
    overrides?.role ??
    membershipRoleFromMergedMetadata(subscription.metadata) ??
    (customerMeta ? membershipRoleFromMergedMetadata(customerMeta) : null) ??
    (planId ? membershipRoleFromPlanId(planId) : null);

  if (!userId || !role || !planId) {
    const missing = [
      !userId ? "user_id" : null,
      !role ? "role" : null,
      !planId ? "plan_id" : null,
    ].filter(Boolean);
    throw new WebhookHandlerError(
      `[stripe] subscription ${subscription.id}: missing ${missing.join(", ")}`,
      { step: "resolve_subscription_context" },
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
  console.log("[stripe] handleCheckoutSessionCompleted start", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    mode: session.mode,
    metadata: session.metadata ?? {},
  });

  const result = await activateMembershipFromCheckoutSession(session);

  if (!result.ok) {
    throwCheckoutActivationFailure(session.id, result);
  }

  if (!result.activated) {
    console.log("[stripe] checkout completed; activation deferred until paid", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
    return;
  }
}

export async function handleCheckoutAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session,
): Promise<void> {
  console.log("[stripe] handleCheckoutAsyncPaymentSucceeded", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
  });

  const result = await activateMembershipFromCheckoutSession(session);

  if (!result.ok) {
    throwCheckoutActivationFailure(session.id, result);
  }

  if (!result.activated) {
    throw new WebhookHandlerError(
      `[stripe] async checkout ${session.id}: payment still not paid (${session.payment_status})`,
      { step: "checkout_payment_pending", sessionId: session.id },
    );
  }
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
