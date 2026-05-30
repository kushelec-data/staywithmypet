"use server";

import {
  triggerBookingCompletedEmails,
  triggerProfileCompletedEmail,
  triggerRequestStatusEmails,
  triggerWelcomeEmailsForRole,
  triggerWelcomeForModeSwitch,
} from "@/lib/email-triggers";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { resolveActiveMode } from "@/lib/profile-mode";
import { fetchUserProfile } from "@/lib/profile-load";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileActiveMode } from "@/lib/profile-mode";
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

export async function sendRequestReceivedEmailAction(requestId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId || !requestId?.trim()) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("sender_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!data || data.sender_id !== userId) {
    console.warn("[request:delivery] email action skipped — sender mismatch or missing row", {
      requestId,
      userId,
    });
    return;
  }

  await deliverCareRequestNotifications(requestId.trim(), userId);
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

  await triggerRequestStatusEmails(requestId, decision);
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

  await triggerBookingCompletedEmails(bookingId);
}
