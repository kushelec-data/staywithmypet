"use client";

import { DashboardEmptyState, DashboardInfoCard } from "@/components/dashboard/DashboardInfoCard";
import { useLanguage } from "@/context/LanguageContext";
import { AvailabilityDateChips } from "@/components/ui/AvailabilityDateChips";
import type { ProfileSummaryLines } from "@/lib/profile-summaries";
import { DASHBOARD_TAG_CLASS } from "@/lib/dashboard-theme";

type ProfileSummaryCardProps = {
  summary: ProfileSummaryLines;
  editHref?: string;
  editLabel?: string;
};

export function ProfileSummaryCard({
  summary,
  editHref = "/profile/edit",
  editLabel,
}: ProfileSummaryCardProps) {
  const { t, locale } = useLanguage();
  const resolvedEditLabel = editLabel ?? t.common.edit;
  const chipLocale = summary.locale ?? locale;
  const hasContent =
    summary.lines.length > 0 || Boolean(summary.calendarDates?.length);

  return (
    <DashboardInfoCard title={summary.title} editHref={editHref} editLabel={resolvedEditLabel}>
      {hasContent ? (
        <div className="space-y-3">
          {summary.lines.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {summary.lines.map((line) => (
                <li
                  key={line}
                  className={`${DASHBOARD_TAG_CLASS} px-2.5 py-0.5 text-xs`}
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          {summary.calendarDates?.length ? (
            <AvailabilityDateChips
              dates={summary.calendarDates}
              label=""
              locale={chipLocale}
              tone="dashboard"
            />
          ) : null}
        </div>
      ) : (
        <DashboardEmptyState
          message={summary.emptyMessage}
          actionHref={editHref}
          actionLabel={t.common.addDetails}
        />
      )}
    </DashboardInfoCard>
  );
}
