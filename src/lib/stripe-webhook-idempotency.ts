import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase-errors";

const TABLE = "stripe_webhook_events";

/**
 * Returns true when this event should be processed (first delivery).
 * Returns false when already processed (safe to ack without re-running handlers).
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

  if (!error) return true;

  if (error.code === "23505") {
    console.log("[stripe] webhook duplicate event skipped", { eventId, eventType });
    return false;
  }

  if (isMissingRelationError(error)) {
    console.warn("[stripe] webhook idempotency table missing; processing without dedup");
    return true;
  }

  console.error("[stripe] webhook idempotency claim failed", {
    eventId,
    eventType,
    message: error.message,
    code: error.code,
  });
  throw error;
}
