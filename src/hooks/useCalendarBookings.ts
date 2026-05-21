"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyViewRoleToDayMap,
  bookedDatesSet,
  mergeBookingsByDay,
  type CalendarBooking,
  type CalendarViewRole,
  type DayBookingSlice,
} from "@/lib/booking-calendar";
import {
  fetchCalendarBookingsForMonth,
  fetchPublicBookedDatesForMonth,
} from "@/lib/booking-calendar-fetch";
import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type UseCalendarBookingsOptions = {
  petId?: string | null;
  petFriendId?: string | null;
  visibility: "full" | "public";
  viewRole: CalendarViewRole;
  year: number;
  month: number;
  enabled?: boolean;
};

type UseCalendarBookingsResult = {
  bookings: CalendarBooking[];
  dayMap: Map<string, DayBookingSlice[]>;
  bookedDateSet: Set<string>;
  loading: boolean;
  error: string | null;
};

export function useCalendarBookings({
  petId,
  petFriendId,
  visibility,
  viewRole,
  year,
  month,
  enabled = true,
}: UseCalendarBookingsOptions): UseCalendarBookingsResult {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [publicBookedDates, setPublicBookedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load(client: SupabaseClient) {
      setLoading(true);
      setError(null);
      try {
        if (visibility === "public" && petId) {
          const dates = await fetchPublicBookedDatesForMonth(petId, year, month);
          if (!cancelled) {
            setBookings([]);
            setPublicBookedDates(dates);
          }
          return;
        }

        if (!petId && !petFriendId) {
          if (!cancelled) {
            setBookings([]);
            setPublicBookedDates([]);
          }
          return;
        }

        const data = await fetchCalendarBookingsForMonth(client, {
          petId: petId ?? undefined,
          petFriendId: petFriendId ?? undefined,
          year,
          month,
        });
        if (!cancelled) {
          setBookings(data);
          setPublicBookedDates([]);
        }
      } catch (err) {
        if (!cancelled) {
          setBookings([]);
          setPublicBookedDates([]);
          setError(err instanceof Error ? err.message : "Could not load bookings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load(supabase);
    return () => {
      cancelled = true;
    };
  }, [supabase, petId, petFriendId, visibility, year, month, enabled]);

  const dayMap = useMemo(() => {
    if (visibility === "public" && publicBookedDates.length) {
      const map = new Map<string, DayBookingSlice[]>();
      for (const iso of publicBookedDates) {
        map.set(iso, []);
      }
      return map;
    }
    const raw = mergeBookingsByDay(bookings);
    return applyViewRoleToDayMap(raw, viewRole);
  }, [bookings, publicBookedDates, visibility, viewRole]);

  const bookedDateSet = useMemo(() => bookedDatesSet(dayMap), [dayMap]);

  return { bookings, dayMap, bookedDateSet, loading, error };
}
