"use client";

import { useEffect, useState } from "react";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { CalendarInsightsPanel } from "@/components/calendar/CalendarInsightsPanel";
import { CalendarLegendPanel } from "@/components/calendar/CalendarLegendPanel";
import { AccountCard } from "@/components/account/AccountCard";
import { useCalendarBookings } from "@/hooks/useCalendarBookings";
import {
  resolveInitialMonthCursor,
  type CalendarViewRole,
  type MonthCursor,
} from "@/lib/booking-calendar";

type DashboardCalendarViewProps = {
  availabilityDates: string[];
  petId?: string | null;
  petFriendId?: string | null;
  viewRole: CalendarViewRole;
  editHref: string;
  editLabel: string;
};

export function DashboardCalendarView({
  availabilityDates,
  petId,
  petFriendId,
  viewRole,
  editHref,
  editLabel,
}: DashboardCalendarViewProps) {
  const [monthCursor, setMonthCursor] = useState<MonthCursor>(() =>
    resolveInitialMonthCursor(availabilityDates, availabilityDates),
  );

  useEffect(() => {
    setMonthCursor(resolveInitialMonthCursor(availabilityDates, availabilityDates));
  }, [petId, petFriendId, availabilityDates]);

  const { bookings, blockingBookedDateSet, loading } = useCalendarBookings({
    petId,
    petFriendId,
    visibility: "full",
    viewRole,
    year: monthCursor.year,
    month: monthCursor.month,
    enabled: Boolean(petId || petFriendId),
  });

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,260px)] lg:gap-6">
      <CalendarLegendPanel className="lg:sticky lg:top-24" />

      <div className="mx-auto w-full min-w-0 max-w-[22rem] justify-self-center lg:max-w-[24rem]">
        <AccountCard className="p-3 sm:p-4">
          <AvailabilityCalendar
            selectedDates={availabilityDates}
            onChange={() => {}}
            readOnly
            petId={petId}
            petFriendId={petFriendId}
            viewRole={viewRole}
            showLegend={false}
            showViewOnlyHint={false}
            monthCursor={monthCursor}
            onMonthCursorChange={setMonthCursor}
            maxWidthClass="max-w-full"
          />
        </AccountCard>
      </div>

      <CalendarInsightsPanel
        availabilityDates={availabilityDates}
        bookings={bookings}
        blockingBookedDateSet={blockingBookedDateSet}
        monthCursor={monthCursor}
        loading={loading}
        editHref={editHref}
        editLabel={editLabel}
        className="lg:sticky lg:top-24"
      />
    </div>
  );
}
