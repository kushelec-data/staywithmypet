import "server-only";

import type { DueScheduledEmailRow } from "@/lib/email-send";
import type { EmailTemplateContext } from "@/lib/emails/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileDisplayName } from "@/lib/profile-display";
import { speciesDisplayLabel, type PetSpecies } from "@/lib/pet-data";

function normalizeSpecies(raw: string | null): PetSpecies {
  if (raw === "dog" || raw === "cat" || raw === "rabbit" || raw === "bird" || raw === "other") {
    return raw;
  }
  return "other";
}

export async function hydrateScheduledEmailContext(
  row: DueScheduledEmailRow,
): Promise<EmailTemplateContext | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  let bookingId = row.related_booking_id;
  if (!bookingId && row.related_request_id) {
    const { data: booking } = await admin
      .from("bookings")
      .select("id")
      .eq("request_id", row.related_request_id)
      .maybeSingle();
    bookingId = booking?.id ?? null;
  }

  if (!bookingId) return {};

  const { data: booking } = await admin
    .from("bookings")
    .select("id, request_id, pet_id, pet_parent_id, pet_friend_id, start_date, end_date")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return {};

  const { data: request } = await admin
    .from("requests")
    .select("care_type, pet_parent_id, pet_friend_id")
    .eq("id", booking.request_id)
    .maybeSingle();

  const { data: pet } = await admin
    .from("pets")
    .select("name, species, breed")
    .eq("id", booking.pet_id)
    .maybeSingle();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", row.user_id)
    .maybeSingle();

  const species = normalizeSpecies((pet?.species as string | null) ?? null);
  const typeLabel = speciesDisplayLabel(species, (pet?.breed as string | null) ?? null).toLowerCase();

  const role =
    row.event_type === "review_reminder_friend"
      ? "pet_friend"
      : row.event_type === "review_reminder_parent"
        ? "pet_parent"
        : row.user_id === booking.pet_parent_id
          ? "pet_parent"
          : "pet_friend";

  const otherId =
    row.user_id === booking.pet_parent_id ? booking.pet_friend_id : booking.pet_parent_id;
  const { data: otherProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", otherId)
    .maybeSingle();

  return {
    recipientName: profileDisplayName(profile as { display_name: string } | null) ?? undefined,
    recipientRole: role,
    petName: (pet?.name as string | undefined)?.trim() || "your pet",
    petType: typeLabel,
    careType: (request?.care_type as string | null) ?? undefined,
    dateFrom: booking.start_date,
    dateTo: booking.end_date,
    bookingId: booking.id,
    otherPartyName:
      profileDisplayName(otherProfile as { display_name: string } | null) ?? "Member",
  };
}
