"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { useLanguage } from "@/context/LanguageContext";
import { DASHBOARD_LINK_CLASS } from "@/lib/dashboard-theme";
import {
  resolveInitialMonthCursor,
  type MonthCursor,
} from "@/lib/booking-calendar";

const EDIT_AVAILABILITY_HREF = "/profile/edit?step=availability";

type DashboardAvailabilityMiniCalendarProps = {
  availabilityDates: string[];
  petFriendId: string;
  emptyLabel?: string;
};

export function DashboardAvailabilityMiniCalendar({
  availabilityDates,
  petFriendId,
  emptyLabel = "Not set",
}: DashboardAvailabilityMiniCalendarProps) {
  const { t } = useLanguage();
  const [monthCursor, setMonthCursor] = useState<MonthCursor>(() =>
    resolveInitialMonthCursor(availabilityDates, availabilityDates),
  );

  useEffect(() => {
    setMonthCursor(resolveInitialMonthCursor(availabilityDates, availabilityDates));
  }, [availabilityDates, petFriendId]);

  return (
    <div className="space-y-2">
      <div className="w-full max-w-[min(100%,320px)]">
        <AvailabilityCalendar
          selectedDates={availabilityDates}
          onChange={() => {}}
          readOnly
          compact
          petFriendId={petFriendId}
          viewRole="pet-friend"
          showLegend
          showViewOnlyHint={false}
          monthCursor={monthCursor}
          onMonthCursorChange={setMonthCursor}
          maxWidthClass="max-w-full"
          className="w-full"
        />
      </div>
      {availabilityDates.length === 0 ? (
        <p className="text-xs text-muted">{emptyLabel}</p>
      ) : null}
      <Link
        href={EDIT_AVAILABILITY_HREF}
        className={`${DASHBOARD_LINK_CLASS} inline-block text-xs font-semibold`}
      >
        {t.dashboardCalendar.editAvailability}
      </Link>
    </div>
  );
}
