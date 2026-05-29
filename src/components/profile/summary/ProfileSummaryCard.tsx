import { DashboardEmptyState, DashboardInfoCard } from "@/components/dashboard/DashboardInfoCard";
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
  editLabel = "Edit",
}: ProfileSummaryCardProps) {
  const hasContent =
    summary.lines.length > 0 || Boolean(summary.calendarDates?.length);

  return (
    <DashboardInfoCard title={summary.title} editHref={editHref} editLabel={editLabel}>
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
              locale={summary.locale}
              tone="dashboard"
            />
          ) : null}
        </div>
      ) : (
        <DashboardEmptyState
          message={summary.emptyMessage}
          actionHref={editHref}
          actionLabel="Add details"
        />
      )}
    </DashboardInfoCard>
  );
}
