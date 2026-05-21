import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hashBookingColor,
  monthBounds,
  type CalendarBooking,
} from "@/lib/booking-calendar";
import { pickPrimaryPhotoUrl } from "@/lib/pet-photos";
import { isMissingRelationError } from "@/lib/supabase-errors";
import type { BookingStatus } from "@/types/database";

const BOOKING_CALENDAR_SELECT =
  "id, pet_id, pet_parent_id, pet_friend_id, status, start_date, end_date, requests ( care_type )";

type BookingRow = {
  id: string;
  pet_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  requests: { care_type: string | null } | { care_type: string | null }[] | null;
};

type PetPhotoJoin = { public_url: string | null; is_primary: boolean; sort_order: number | null };

function pickCareType(requests: BookingRow["requests"]): string | null {
  if (!requests) return null;
  const row = Array.isArray(requests) ? requests[0] : requests;
  return row?.care_type?.trim() || null;
}

export async function fetchCalendarBookingsForMonth(
  supabase: SupabaseClient,
  filters: {
    petId?: string;
    petFriendId?: string;
    year: number;
    month: number;
    statuses?: BookingStatus[];
  },
): Promise<CalendarBooking[]> {
  const { start, end } = monthBounds(filters.year, filters.month);
  const statuses = filters.statuses ?? (["upcoming", "active"] as BookingStatus[]);

  let query = supabase
    .from("bookings")
    .select(BOOKING_CALENDAR_SELECT)
    .in("status", statuses)
    .lte("start_date", end)
    .gte("end_date", start);

  if (filters.petId) query = query.eq("pet_id", filters.petId);
  if (filters.petFriendId) query = query.eq("pet_friend_id", filters.petFriendId);

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as BookingRow[];
  if (!rows.length) return [];

  const petIds = [...new Set(rows.map((r) => r.pet_id))];
  const profileIds = [...new Set(rows.flatMap((r) => [r.pet_parent_id, r.pet_friend_id]))];

  const [{ data: pets }, { data: profiles }] = await Promise.all([
    supabase
      .from("pets")
      .select("id, name, pet_photos ( public_url, is_primary, sort_order )")
      .in("id", petIds),
    supabase.from("profiles").select("id, display_name, avatar_url").in("id", profileIds),
  ]);

  const petMap = new Map(
    (pets ?? []).map((p) => {
      const photos = (p as { pet_photos?: PetPhotoJoin[] }).pet_photos ?? [];
      return [
        p.id as string,
        {
          name: (p.name as string)?.trim() || "Pet",
          photoUrl: pickPrimaryPhotoUrl(
            photos.map((row) => ({
              public_url: row.public_url,
              is_primary: row.is_primary,
              sort_order: row.sort_order ?? 0,
            })),
          ),
        },
      ];
    }),
  );

  const profileMap = new Map(
    (profiles ?? []).map((pr) => [
      pr.id as string,
      {
        name: (pr.display_name as string)?.trim() || "Member",
        avatarUrl: (pr.avatar_url as string | null)?.trim() || null,
      },
    ]),
  );

  return rows.map((row) => {
    const pet = petMap.get(row.pet_id);
    const parent = profileMap.get(row.pet_parent_id);
    const friend = profileMap.get(row.pet_friend_id);
    return {
      id: row.id,
      petId: row.pet_id,
      petName: pet?.name ?? "Pet",
      petPhotoUrl: pet?.photoUrl ?? null,
      petParentId: row.pet_parent_id,
      parentName: parent?.name ?? "Member",
      parentPhotoUrl: parent?.avatarUrl ?? null,
      petFriendId: row.pet_friend_id,
      friendName: friend?.name ?? "Member",
      friendPhotoUrl: friend?.avatarUrl ?? null,
      status: row.status,
      careType: pickCareType(row.requests),
      startDate: row.start_date,
      endDate: row.end_date,
      color: hashBookingColor(row.id),
    };
  });
}

/** Public pet profile: booked dates only (no PII). */
export async function fetchPublicBookedDatesForMonth(
  petId: string,
  year: number,
  month: number,
): Promise<string[]> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month + 1),
  });
  const res = await fetch(`/api/pets/${petId}/booked-dates?${params}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { dates?: string[] };
  return Array.isArray(body.dates) ? body.dates.filter((d) => typeof d === "string") : [];
}
