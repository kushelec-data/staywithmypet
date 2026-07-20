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
import { maskId, redactEmail } from "@/lib/security/log-redact";
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
  console.error("[stripe] webhook checkout handler failed", {
    eventType: event.type,
    eventId: event.id,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    metadataUserId: maskId(fields.user_id),
    metadataMembershipRole: fields.membership_role,
    metadataRole: fields.role,
    metadataPlanId: fields.plan_id,
    metadataPriceId: fields.price_id,
    normalizedRole,
    supabaseTable: MEMBERSHIP_TABLE,
    ...body,
    stack: err instanceof Error ? err.stack : undefined,
  });
}

function webhookFailureResponse(err: unknown): NextResponse {
  const body = webhookFailureBody(err);
  console.error("[stripe] webhook handler failed", body);
  return NextResponse.json(body, { status: 500 });
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
  const configured =
    process.env.CRON_SECRET?.trim() || process.env.EMAIL_INTERNAL_SECRET?.trim();
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    request.headers.get("x-cron-secret")?.trim() ||
    request.headers.get("x-email-internal-secret")?.trim();

  if (!configured || !provided || provided !== configured) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(getMembershipWebhookHealth());
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  logStripeEnvPresence("webhook");

  const health = getMembershipWebhookHealth();
  console.log("[stripe] webhook env health", health);

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    console.error("[stripe] webhook rejected: STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  if (!isMembershipWebhookWritable()) {
    console.error("[stripe] webhook rejected: cannot write memberships", health);
    return NextResponse.json({ error: "Membership webhook not configured." }, { status: 503 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    if (!signature) {
      console.error("[stripe] webhook rejected: missing stripe-signature header");
      throw new Error("Missing stripe-signature header");
    }
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe] webhook signature debug", {
      webhookSecretExists: !!process.env.STRIPE_WEBHOOK_SECRET?.trim(),
      webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.trim().slice(0, 8) ?? null,
      signatureHeaderExists: !!signature,
      rawBodyLength: body.length,
      endpointPath: new URL(request.url).pathname,
    });
    if (signature) {
      console.error("[stripe] webhook signature verification failed:", message);
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log("[stripe] signature verified");
  console.log("[stripe] webhook event received", {
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

        console.log("[stripe] checkout.session.completed", {
          eventType: event.type,
          eventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
          mode: session.mode,
          customerEmail: redactEmail(customerEmail),
          clientReferenceId: maskId(session.client_reference_id),
          metadataUserId: maskId(fields.user_id),
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
          }
          console.log("[stripe] checkout.session.completed upsert result", upsertLog);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[stripe] webhook received", {
          eventType: event.type,
          subscriptionId: subscription.id,
        });
        await handleSubscriptionEvent(subscription);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[stripe] webhook received", {
          eventType: event.type,
          invoiceId: invoice.id,
        });
        if (event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") {
          await handleInvoicePaymentSucceeded(invoice);
        } else {
          await handleInvoicePaymentFailed(invoice);
        }
        break;
      }
      default:
        console.log("[stripe] webhook ignored unhandled event", { eventType: event.type });
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
      console.error("[stripe] webhook handler failed", {
        eventType: event.type,
        eventId: event.id,
        supabaseTable: MEMBERSHIP_TABLE,
        ...body,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    return webhookFailureResponse(err);
  }

  console.log("[stripe] webhook handled ok", { eventType: event.type });
  return NextResponse.json({ received: true });
}
