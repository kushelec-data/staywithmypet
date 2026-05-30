import "server-only";

import { triggerRequestReceivedEmail, triggerRequestSentEmail } from "@/lib/email-triggers";
import { profileDisplayName } from "@/lib/profile-display";
import { createAdminClient } from "@/lib/supabase/admin";

type RequestDeliveryRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
};

function trace(message: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.info(`[request:delivery] ${message}`, detail);
  } else {
    console.info(`[request:delivery] ${message}`);
  }
}

async function loadRequestForDelivery(requestId: string): Promise<RequestDeliveryRow | null> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn("[request:delivery] SUPABASE_SERVICE_ROLE_KEY missing — cannot verify request row");
    return null;
  }

  const { data, error } = await admin
    .from("requests")
    .select("id, sender_id, receiver_id, pet_parent_id, pet_friend_id")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    console.error("[request:delivery] load request failed", error.message);
    return null;
  }

  return (data as RequestDeliveryRow | null) ?? null;
}

/**
 * Idempotent in-app notification for the receiver (DB trigger may have failed silently).
 */
export async function ensureInAppRequestReceivedNotification(
  requestId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn("[request:delivery] cannot insert notification — admin client unavailable");
    return false;
  }

  const row = await loadRequestForDelivery(requestId);
  if (!row?.receiver_id || !row.sender_id || row.receiver_id === row.sender_id) {
    return false;
  }

  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", row.receiver_id)
    .eq("related_request_id", requestId)
    .limit(1);

  if (existing?.length) {
    trace("in-app notification already exists", { requestId, receiverId: row.receiver_id });
    return true;
  }

  const { data: senderProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", row.sender_id)
    .maybeSingle();

  const senderName = profileDisplayName(senderProfile as { display_name: string } | null) ?? "Someone";

  const { error: insertError } = await admin.from("notifications").insert({
    user_id: row.receiver_id,
    type: "request_received",
    title: "New care request",
    body: `${senderName} sent you a care request`,
    related_request_id: requestId,
    read_at: null,
  });

  if (insertError) {
    console.error("[request:delivery] notification insert failed", {
      requestId,
      message: insertError.message,
    });
    return false;
  }

  trace("in-app notification created", { requestId, receiverId: row.receiver_id });
  return true;
}

/** Email + in-app delivery after a successful insert (sender must match session). */
export async function deliverCareRequestNotifications(
  requestId: string,
  sessionUserId: string,
): Promise<void> {
  const row = await loadRequestForDelivery(requestId);
  if (!row) {
    trace("request row not found for delivery", { requestId });
    return;
  }

  if (row.sender_id !== sessionUserId) {
    console.warn("[request:delivery] sender mismatch — skipping delivery", {
      requestId,
      sessionUserId,
      senderId: row.sender_id,
    });
    return;
  }

  trace("delivering notifications", {
    requestId,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    petParentId: row.pet_parent_id,
    petFriendId: row.pet_friend_id,
  });

  await ensureInAppRequestReceivedNotification(requestId);

  await Promise.all([
    triggerRequestSentEmail(requestId),
    triggerRequestReceivedEmail(requestId),
  ]);
}
