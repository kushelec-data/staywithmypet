import {
  STATUS_CHIP_AVAILABLE_CLASS,
  STATUS_CHIP_AVAILABLE_OVERFLOW_CLASS,
} from "@/lib/status-colors";
import { formatAvailabilityDates, type DateFormatLocale } from "@/lib/date-format";
import { DASHBOARD_TAG_CLASS } from "@/lib/dashboard-theme";

export type AvailabilityDateChipsProps = {
  dates: string[] | null | undefined;
  /** Row label above chips (default "Availability"). */
  label?: string;
  maxPreview?: number;
  locale?: DateFormatLocale;
  upcomingOnly?: boolean;
  className?: string;
  emptyLabel?: string;
  /** Use unified dashboard greens when rendered inside account pages. */
  tone?: "default" | "dashboard";
};

const chipDefault = STATUS_CHIP_AVAILABLE_CLASS;
const chipOverflowDefault = STATUS_CHIP_AVAILABLE_OVERFLOW_CLASS;
const chipDashboard = `${DASHBOARD_TAG_CLASS} px-2.5 py-0.5 text-[0.7rem]`;
const chipOverflowDashboard = `${DASHBOARD_TAG_CLASS} px-2.5 py-0.5 text-[0.7rem] opacity-90`;

/** Availability date pills (max preview + overflow). */
export function AvailabilityDateChips({
  dates,
  label = "Availability",
  maxPreview = 3,
  locale,
  upcomingOnly,
  className = "",
  emptyLabel,
  tone = "default",
}: AvailabilityDateChipsProps) {
  const chipPrimary = tone === "dashboard" ? chipDashboard : chipDefault;
  const chipOverflow = tone === "dashboard" ? chipOverflowDashboard : chipOverflowDefault;
  const { previewLabels, previewIsos, moreCount, totalCount } = formatAvailabilityDates(dates, {
    locale,
    maxPreview,
    upcomingOnly,
  });

  if (!totalCount) {
    if (!emptyLabel) return null;
    return (
      <div className={className}>
        {label ? (
          <p className="text-xs font-semibold text-foreground/80">{label}</p>
        ) : null}
        <p className={`text-xs text-muted ${label ? "mt-1" : ""}`.trim()}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {label ? (
        <p className="text-xs font-semibold text-foreground/80">{label}</p>
      ) : null}
      <ul className={`flex flex-wrap gap-1.5 ${label ? "mt-1.5" : ""}`}>
        {previewLabels.map((chipLabel, i) => (
          <li key={previewIsos[i] ?? chipLabel} className={chipPrimary}>
            {chipLabel}
          </li>
        ))}
        {moreCount > 0 ? (
          <li className={chipOverflow}>+{moreCount} more</li>
        ) : null}
      </ul>
    </div>
  );
}
