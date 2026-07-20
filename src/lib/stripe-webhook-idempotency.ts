import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase-errors";

const TABLE = "stripe_webhook_events";

/**
 * Claim a Stripe event id before handling. Returns false when already processed.
 * When the idempotency table is missing, returns true (process without dedup).
 */
export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn("[stripe] webhook idempotency skipped: no admin client");
    return true;
  }

  const { error } = await admin.from(TABLE).insert({
    id: eventId,
    event_type: eventType,
  });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    console.log("[stripe] webhook event already processed", { eventId, eventType });
    return false;
  }

  if (isMissingRelationError(error)) {
    console.warn("[stripe] webhook idempotency table missing; processing without dedup");
    return true;
  }

  console.error("[stripe] webhook idempotency claim failed", {
    eventId,
    eventType,
    code: error.code,
    message: error.message,
  });
  throw new Error(`Webhook idempotency claim failed: ${error.message}`);
}
