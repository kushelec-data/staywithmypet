import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase-errors";
import { safeLogError, safeLogInfo, safeLogWarn } from "@/lib/security/safe-log";

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
    safeLogWarn("stripe webhook idempotency skipped", { reason: "no_admin_client" });
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
    safeLogInfo("stripe webhook event already processed", { eventId, eventType });
    return false;
  }

  if (isMissingRelationError(error)) {
    safeLogWarn("stripe webhook idempotency table missing", {
      reason: "processing_without_dedup",
    });
    return true;
  }

  safeLogError("stripe webhook idempotency claim failed", {
    eventId,
    eventType,
    code: error.code,
    message: error.message,
  });
  throw new Error(`Webhook idempotency claim failed: ${error.message}`);
}
