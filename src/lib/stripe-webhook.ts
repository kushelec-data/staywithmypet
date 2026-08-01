import "server-only";

import type Stripe from "stripe";
import {
  activateMembershipFromCheckoutSession,
  throwCheckoutActivationFailure,
  type CheckoutActivationResult,
} from "@/lib/stripe-checkout-activate";
import { safeLogError, safeLogInfo, safeLogWarn } from "@/lib/security/safe-log";
import { WebhookHandlerError } from "@/lib/stripe-webhook-handler-error";
import {
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
      return "active";
    case "canceled":
      return "expired";
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

/** Map Stripe subscription to DB status without ending paid access early. */
function resolveMembershipStatusFromSubscription(
  subscription: Stripe.Subscription,
): MembershipStatus {
  if (subscription.status === "active" || subscription.status === "trialing") {
    if (subscription.cancel_at_period_end) {
      return "cancelled";
    }
    return "active";
  }
  return subscriptionStatusToMembership(subscription.status);
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

/** plan_id from Stripe Price metadata, legacy env, or role-based price env fallback. */
async function resolvePlanIdFromStripePrice(priceId: string): Promise<string | undefined> {
  const fromEnv = planIdFromStripePriceId(priceId);
  if (fromEnv) {
    return normalizeCatalogPlanId(fromEnv) ?? fromEnv;
  }

  try {
    const price = await getStripe().prices.retrieve(priceId);
    const metaPlan =
      price.metadata?.plan_id?.trim() ||
      price.metadata?.plan?.trim() ||
      price.metadata?.planId?.trim();
    if (metaPlan) {
      return normalizeCatalogPlanId(metaPlan) ?? metaPlan;
    }
  } catch (err) {
    safeLogWarn("[stripe] price retrieve failed for plan_id resolution", {
      priceIdSuffix: priceId.slice(-6),
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return undefined;
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
    safeLogError("[membership] upsert error", {
      message: result.error,
      code: result.code ?? null,
      supabaseError: result.supabaseError ?? null,
      context,
    });
    throw new WebhookHandlerError(`[stripe] ${context}: ${result.error}`, {
      step: result.step ?? "upsert_user_memberships",
      code: result.code ?? result.supabaseError?.code ?? null,
      supabaseError: result.supabaseError ?? null,
      payloadAttempted: result.payloadAttempted ?? null,
    });
  }
  safeLogInfo("[membership] upsert success", {
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
        safeLogInfo("[stripe] subscription user resolved via customer email", {
          subscriptionId: subscription.id,
          userId,
        });
      }
    }
  } catch (err) {
    safeLogError("stripe subscription customer lookup failed", {
      message: err instanceof Error ? err.message : String(err),
    });
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
  const planFromPrice = priceId ? await resolvePlanIdFromStripePrice(priceId) : undefined;

  const rawPlanId =
    overrides?.planId?.trim() ||
    subscription.metadata.plan_key?.trim() ||
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
    (customerMeta ? membershipRoleFromMergedMetadata(customerMeta) : null);

  if (!role) {
    safeLogWarn("[stripe] subscription sync skipped: missing membership_role metadata", {
      subscriptionId: subscription.id,
      status: subscription.status,
      metadata: subscription.metadata ?? {},
    });
    return;
  }

  if (!userId || !planId) {
    const missing = [
      !userId ? "user_id" : null,
      !planId ? "plan_id" : null,
    ].filter(Boolean);
    throw new WebhookHandlerError(
      `[stripe] subscription ${subscription.id}: missing ${missing.join(", ")}`,
      { step: "resolve_subscription_context" },
    );
  }

  safeLogInfo("[stripe] subscription sync", {
    subscriptionId: subscription.id,
    userId,
    role,
    planId,
    planKey: subscription.metadata.plan_key ?? null,
    status: subscription.status,
  });

  const status = resolveMembershipStatusFromSubscription(subscription);
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
    source: "stripe_subscription",
    sendConfirmationEmail: false,
  });

  await assertMembershipUpsert(result, `subscription ${subscription.id}`);
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<Extract<CheckoutActivationResult, { ok: true }>> {
  safeLogInfo("[stripe] handleCheckoutSessionCompleted start", {
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
    if (result.reason === "membership_conflict") {
      safeLogInfo("[stripe] checkout completed; activation skipped (membership conflict)", {
        sessionId: session.id,
        userId: result.userId,
        role: result.role,
        planId: result.planId,
        code: result.code,
      });
    } else {
      safeLogInfo("[stripe] checkout completed; activation deferred until paid", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
    }
  }

  return result;
}

export async function handleCheckoutAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session,
): Promise<void> {
  safeLogInfo("[stripe] handleCheckoutAsyncPaymentSucceeded", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
  });

  const result = await activateMembershipFromCheckoutSession(session);

  if (!result.ok) {
    throwCheckoutActivationFailure(session.id, result);
  }

  if (!result.activated) {
    if (result.reason === "membership_conflict") {
      safeLogInfo("[stripe] async checkout activation skipped (membership conflict)", {
        sessionId: session.id,
        code: result.code,
      });
      return;
    }
    throw new WebhookHandlerError(
      `[stripe] async checkout ${session.id}: payment still not paid (${session.payment_status})`,
      { step: "checkout_payment_pending", sessionId: session.id },
    );
  }
}

export async function handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
  if (
    subscription.status === "incomplete" ||
    subscription.status === "incomplete_expired"
  ) {
    safeLogInfo("[stripe] subscription sync deferred until active (checkout webhook activates)", {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
    return;
  }
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
    safeLogWarn("stripe invoice.payment_succeeded without subscription", {
      invoiceId: invoice.id,
    });
    return;
  }
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subId);
  await syncFromSubscription(subscription);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) {
    safeLogWarn("stripe invoice.payment_failed without subscription", {
      invoiceId: invoice.id,
    });
    return;
  }
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subId);
  await syncFromSubscription(subscription);
}
