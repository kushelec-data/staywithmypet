"use server";

import { deliverNewMessageNotification } from "@/lib/message-notification-delivery";
import {
  triggerProfileCompletedEmail,
  triggerRequestCancelledEmails,
  triggerRequestStatusEmails,
  triggerWelcomeEmailsForRole,
  triggerWelcomeForModeSwitch,
  triggerEmailVerified,
  triggerPhoneVerified,
} from "@/lib/email-triggers";
import { onBookingCompleted } from "@/lib/booking-completion";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { resolveActiveMode } from "@/lib/profile-mode";
import { fetchUserProfile } from "@/lib/profile-load";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deliverCareRequestNotifications } from "@/lib/request-delivery";
import { fetchOwnerPetIntros } from "@/lib/pet-intro";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function sendWelcomeEmailsAction(role: ProfileRole): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  triggerWelcomeEmailsForRole(userId, role);
}

export async function sendWelcomeForModeSwitchAction(targetMode: ProfileActiveMode): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  triggerWelcomeForModeSwitch(userId, targetMode);
}

export async function sendProfileCompletedEmailAction(): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  const supabase = await createClient();
  const profile = await fetchUserProfile(supabase, userId);
  if (!profile) return;

  const petIntros = await fetchOwnerPetIntros(supabase, userId);
  const petsCount = petIntros.length;

  const activeMode = resolveActiveMode(profile.role, profile.active_mode);
  const completeness = computeProfileCompleteness(profile, {
    petsCount,
    activeMode,
    petIntros,
  });

  if (completeness.percent < 100) return;

  triggerProfileCompletedEmail(userId, profile.display_name?.trim() || undefined);
}

export async function sendEmailVerifiedEmailAction(): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) return;

  const profile = await fetchUserProfile(supabase, userId);
  triggerEmailVerified(userId, profile?.display_name?.trim() || undefined);
}

export async function sendPhoneVerifiedEmailAction(): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  const supabase = await createClient();
  const profile = await fetchUserProfile(supabase, userId);
  if (!profile?.phone_verified) return;

  triggerPhoneVerified(userId, profile.display_name?.trim() || undefined);
}

export async function sendRequestReceivedEmailAction(requestId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId || !requestId?.trim()) {
    console.warn("[request-email] error", { stage: "action", reason: "no_session_or_request_id" });
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("[request-email] error", {
      requestId,
      stage: "action",
      reason: "no_admin_client",
    });
    return;
  }

  const { data, error } = await admin
    .from("requests")
    .select("sender_id")
    .eq("id", requestId.trim())
    .maybeSingle();

  if (error) {
    console.error("[request-email] error", {
      requestId,
      stage: "action",
      reason: "load_failed",
      message: error.message,
    });
    return;
  }

  if (!data || data.sender_id !== userId) {
    console.warn("[request-email] error", {
      requestId,
      stage: "action",
      reason: "sender_mismatch_or_missing_row",
      userId,
    });
    return;
  }

  try {
    await deliverCareRequestNotifications(requestId.trim(), userId);
  } catch (err) {
    console.error("[request-email] error", {
      requestId,
      stage: "action",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function sendRequestStatusEmailsAction(
  requestId: string,
  decision: "accepted" | "declined",
): Promise<void> {
  const userId = await requireUserId();
  if (!userId || !requestId?.trim()) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("receiver_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!data || data.receiver_id !== userId) return;

  try {
    await triggerRequestStatusEmails(requestId, decision);
  } catch (err) {
    console.error("[email-event] request status emails failed", {
      requestId,
      decision,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function sendRequestCancelledEmailsAction(requestId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId || !requestId?.trim()) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("sender_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!data || data.sender_id !== userId) return;

  try {
    await triggerRequestCancelledEmails(requestId);
  } catch (err) {
    console.error("[request-email] error", {
      requestId,
      stage: "cancellation",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function sendBookingCompletedEmailsAction(bookingId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId || !bookingId?.trim()) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("pet_parent_id, pet_friend_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!data) return;
  if (userId !== data.pet_parent_id && userId !== data.pet_friend_id) return;

  await onBookingCompleted(bookingId, "manual");
}

export async function sendNewMessageEmailAction(input: {
  conversationId: string;
  messageId: string;
  recipientUserId: string;
}): Promise<void> {
  const userId = await requireUserId();
  if (!userId || !input.conversationId?.trim() || !input.messageId?.trim()) return;
  if (!input.recipientUserId?.trim() || input.recipientUserId === userId) return;

  await deliverNewMessageNotification({
    conversationId: input.conversationId.trim(),
    messageId: input.messageId.trim(),
    senderUserId: userId,
    recipientUserId: input.recipientUserId.trim(),
  });
}
