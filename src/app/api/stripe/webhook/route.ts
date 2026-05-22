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
import { checkoutSessionEmail } from "@/lib/stripe-webhook-resolve";
import {
  isWebhookHandlerError,
  type WebhookHandlerError,
} from "@/lib/stripe-webhook-handler-error";
import { MEMBERSHIP_TABLE } from "@/lib/membership-activate";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

function checkoutMetadataFields(meta: Stripe.Metadata | null | undefined) {
  const m = meta ?? {};
  return {
    user_id: m.user_id ?? m.userId ?? null,
    membership_role: m.membership_role ?? null,
    role: m.role ?? null,
    plan_id: m.plan_id ?? m.plan ?? m.planId ?? null,
  };
}

function webhookFailureDiagnostics(err: unknown): {
  step: string;
  supabaseErrorCode: string | null;
  supabaseErrorMessage: string | null;
  supabaseErrorDetails: string | null;
  supabaseErrorHint: string | null;
  payloadAttempted: WebhookHandlerError["payloadAttempted"];
  message: string;
} {
  const handlerErr = isWebhookHandlerError(err) ? err : null;
  const supabaseError = handlerErr?.supabaseError ?? null;
  return {
    step: handlerErr?.step ?? "unknown",
    supabaseErrorCode: supabaseError?.code ?? null,
    supabaseErrorMessage: supabaseError?.message ?? null,
    supabaseErrorDetails: supabaseError?.details ?? null,
    supabaseErrorHint: supabaseError?.hint ?? null,
    payloadAttempted: handlerErr?.payloadAttempted ?? null,
    message: err instanceof Error ? err.message : String(err),
  };
}

function logCheckoutHandlerFailure(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  err: unknown,
): void {
  const meta = session.metadata ?? {};
  const fields = checkoutMetadataFields(meta);
  const diagnostics = webhookFailureDiagnostics(err);
  console.error("[stripe] webhook checkout handler failed", {
    eventType: event.type,
    eventId: event.id,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    sessionMetadata: meta,
    metadataUserId: fields.user_id,
    metadataMembershipRole: fields.membership_role,
    metadataRole: fields.role,
    metadataPlanId: fields.plan_id,
    supabaseTable: MEMBERSHIP_TABLE,
    ...diagnostics,
    stack: err instanceof Error ? err.stack : undefined,
  });
}

function webhookFailureResponse(err: unknown): NextResponse {
  const diagnostics = webhookFailureDiagnostics(err);
  console.error("[stripe] webhook handler failed", diagnostics);

  return NextResponse.json(
    {
      error: "Webhook handler failed",
      step: diagnostics.step,
      supabaseErrorCode: diagnostics.supabaseErrorCode,
      supabaseErrorMessage: diagnostics.supabaseErrorMessage,
      supabaseErrorDetails: diagnostics.supabaseErrorDetails,
      supabaseErrorHint: diagnostics.supabaseErrorHint,
      payloadAttempted: diagnostics.payloadAttempted,
    },
    { status: 500 },
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Production-safe config probe (booleans only). */
export async function GET() {
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

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = await checkoutSessionEmail(session);
        console.log("[stripe] webhook checkout session", {
          eventType: event.type,
          eventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
          mode: session.mode,
          customerEmail,
          clientReferenceId: session.client_reference_id ?? null,
        });
        const metaFields = checkoutMetadataFields(session.metadata);
        console.log("[stripe] webhook session.metadata", session.metadata ?? {});
        console.log("[stripe] webhook checkout metadata fields", {
          ...metaFields,
          paymentStatus: session.payment_status,
          supabaseTable: MEMBERSHIP_TABLE,
        });
        if (event.type === "checkout.session.async_payment_succeeded") {
          await handleCheckoutAsyncPaymentSucceeded(session);
        } else {
          await handleCheckoutSessionCompleted(session);
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
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[stripe] webhook received", {
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
      const diagnostics = webhookFailureDiagnostics(err);
      console.error("[stripe] webhook handler failed", {
        eventType: event.type,
        eventId: event.id,
        supabaseTable: MEMBERSHIP_TABLE,
        ...diagnostics,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
    return webhookFailureResponse(err);
  }

  console.log("[stripe] webhook handled ok", { eventType: event.type });
  return NextResponse.json({ received: true });
}
