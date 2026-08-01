import {
  handleCheckoutAsyncPaymentSucceeded,
  handleCheckoutSessionCompleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleSubscriptionEvent,
} from "@/lib/stripe-webhook";
import { logStripeEnvPresence } from "@/lib/debug-stripe-env";
import {
  getMembershipWebhookHealth,
  isMembershipWebhookWritable,
} from "@/lib/stripe-webhook-config";
import {
  checkoutSessionEmail,
  membershipRoleFromMergedMetadata,
} from "@/lib/stripe-webhook-resolve";
import { claimStripeWebhookEvent } from "@/lib/stripe-webhook-idempotency";
import { webhookFailureBody } from "@/lib/stripe-webhook-handler-error";
import { MEMBERSHIP_TABLE } from "@/lib/membership-activate";
import { isInternalSecretAuthorized } from "@/lib/security/internal-secret-auth";
import { isSafeDebugLoggingEnabled, safeLogError, safeLogInfo } from "@/lib/security/safe-log";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

function checkoutMetadataFields(meta: Stripe.Metadata | null | undefined) {
  const m = meta ?? {};
  return {
    user_id: m.user_id ?? m.userId ?? null,
    role: m.role ?? null,
    membership_role: m.membership_role ?? null,
    plan_id: m.plan_id ?? m.plan ?? m.planId ?? null,
    plan_key: m.plan_key ?? null,
    price_id: m.price_id ?? m.priceId ?? null,
  };
}

function logCheckoutHandlerFailure(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  err: unknown,
): void {
  const meta = session.metadata ?? {};
  const fields = checkoutMetadataFields(meta);
  const normalizedRole = membershipRoleFromMergedMetadata(meta);
  const body = webhookFailureBody(err);
  safeLogError("stripe webhook checkout handler failed", {
    eventType: event.type,
    eventId: event.id,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    metadataUserId: fields.user_id,
    metadataMembershipRole: fields.membership_role,
    metadataRole: fields.role,
    metadataPlanId: fields.plan_id,
    metadataPriceId: fields.price_id,
    normalizedRole,
    supabaseTable: MEMBERSHIP_TABLE,
    step: body.step,
    code: body.code,
    message: body.message,
    stack: err instanceof Error ? err.stack : undefined,
  });
}

function webhookFailureResponse(err: unknown): NextResponse {
  const body = webhookFailureBody(err);
  safeLogError("stripe webhook handler failed", {
    step: body.step,
    code: body.code,
    message: body.message,
  });
  return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Config probe (booleans only). Protected so the configuration surface is not
 * publicly readable: requires the internal cron/email secret via
 * `Authorization: Bearer <secret>` or `x-cron-secret`. Returns 404 when the
 * secret is unset or does not match, hiding the endpoint's existence.
 */
export async function GET(request: Request) {
  if (!isInternalSecretAuthorized(request, { allowEmailInternalHeader: true })) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(getMembershipWebhookHealth());
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  logStripeEnvPresence("webhook");

  const health = getMembershipWebhookHealth();
  if (isSafeDebugLoggingEnabled()) {
    safeLogInfo("stripe webhook env health", health);
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    safeLogError("stripe webhook rejected", { reason: "webhook_secret_not_configured" });
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  if (!isMembershipWebhookWritable()) {
    safeLogError("stripe webhook rejected", { reason: "membership_not_writable" });
    return NextResponse.json({ error: "Membership webhook not configured." }, { status: 503 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    if (!signature) {
      safeLogError("stripe webhook rejected", { reason: "missing_stripe_signature" });
      throw new Error("Missing stripe-signature header");
    }
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    if (isSafeDebugLoggingEnabled()) {
      safeLogError("stripe webhook signature debug", {
        webhookSecretExists: !!process.env.STRIPE_WEBHOOK_SECRET?.trim(),
        signatureHeaderExists: !!signature,
        rawBodyLength: body.length,
      });
    }
    if (signature) {
      safeLogError("stripe webhook signature verification failed", { message });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  safeLogInfo("stripe webhook event received", {
    eventType: event.type,
    eventId: event.id,
  });

  const shouldProcess = await claimStripeWebhookEvent(event.id, event.type);
  if (!shouldProcess) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};
        const fields = checkoutMetadataFields(meta);
        const normalizedRole = membershipRoleFromMergedMetadata(meta);
        const customerEmail = await checkoutSessionEmail(session);

        safeLogInfo("stripe checkout.session.completed", {
          eventType: event.type,
          eventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
          mode: session.mode,
          customerEmail,
          clientReferenceId: session.client_reference_id,
          metadataUserId: fields.user_id,
          normalizedRole,
          supabaseTable: MEMBERSHIP_TABLE,
        });

        if (event.type === "checkout.session.async_payment_succeeded") {
          await handleCheckoutAsyncPaymentSucceeded(session);
        } else {
          const activationResult = await handleCheckoutSessionCompleted(session);
          const upsertLog: Record<string, unknown> = {
            eventType: event.type,
            sessionId: session.id,
            normalizedRole,
            ok: true,
            activated: activationResult.activated,
          };
          if (activationResult.activated) {
            upsertLog.userId = activationResult.userId;
            upsertLog.role = activationResult.role;
            upsertLog.planId = activationResult.planId;
          } else {
            upsertLog.reason = activationResult.reason;
            if (activationResult.reason === "membership_conflict") {
              upsertLog.code = activationResult.code;
              upsertLog.userId = activationResult.userId;
              upsertLog.role = activationResult.role;
              upsertLog.planId = activationResult.planId;
            }
          }
          safeLogInfo("stripe checkout.session.completed upsert result", upsertLog);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        safeLogInfo("stripe webhook received", {
          eventType: event.type,
          subscriptionId: subscription.id,
        });
        await handleSubscriptionEvent(subscription);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        safeLogInfo("stripe webhook received", {
          eventType: event.type,
          invoiceId: invoice.id,
        });
        if (event.type === "invoice.payment_succeeded") {
          await handleInvoicePaymentSucceeded(invoice);
        } else {
          await handleInvoicePaymentFailed(invoice);
        }
        break;
      }
      case "invoice.paid":
        safeLogInfo("stripe webhook ignored invoice.paid", {
          eventType: event.type,
          eventId: event.id,
        });
        break;
      default:
        safeLogInfo("stripe webhook ignored unhandled event", { eventType: event.type });
        break;
    }
  } catch (err) {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      logCheckoutHandlerFailure(event, event.data.object as Stripe.Checkout.Session, err);
    } else {
      const body = webhookFailureBody(err);
      safeLogError("stripe webhook handler failed", {
        eventType: event.type,
        eventId: event.id,
        supabaseTable: MEMBERSHIP_TABLE,
        step: body.step,
        code: body.code,
        message: body.message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    return webhookFailureResponse(err);
  }

  safeLogInfo("stripe webhook handled ok", { eventType: event.type });
  return NextResponse.json({ received: true });
}
