import {
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
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Production-safe config probe (booleans only). */
export async function GET() {
  return NextResponse.json(getMembershipWebhookHealth());
}

export async function POST(request: Request) {
  logStripeEnvPresence("webhook");

  const health = getMembershipWebhookHealth();
  console.log("[stripe] webhook env health", health);

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[stripe] webhook rejected: STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  if (!isMembershipWebhookWritable()) {
    console.error("[stripe] webhook rejected: cannot write memberships", health);
    return NextResponse.json({ error: "Membership webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe] webhook rejected: missing stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe] webhook signature verification failed", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log("[stripe] webhook signature verified", { eventType: event.type, eventId: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = await checkoutSessionEmail(session);
        console.log("[stripe] webhook received checkout.session.completed", {
          eventType: event.type,
          eventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
          mode: session.mode,
          customerEmail,
          clientReferenceId: session.client_reference_id ?? null,
          metadata: session.metadata ?? {},
        });
        await handleCheckoutSessionCompleted(session);
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
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[stripe] webhook handler failed", {
      eventType: event.type,
      eventId: event.id,
      message,
      stack,
    });
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  console.log("[stripe] webhook handled ok", { eventType: event.type });
  return NextResponse.json({ received: true });
}
