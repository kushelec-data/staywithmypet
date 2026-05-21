import { formatAvailabilityDates, type DateFormatLocale } from "@/lib/date-format";

export type AvailabilityDateChipsProps = {
  dates: string[] | null | undefined;
  /** Row label above chips (default "Availability"). */
  label?: string;
  maxPreview?: number;
  locale?: DateFormatLocale;
  upcomingOnly?: boolean;
  className?: string;
  emptyLabel?: string;
};

const chipPrimary =
  "rounded-full bg-mint/55 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brand-teal dark:bg-mint/20 dark:text-mint";
const chipOverflow =
  "rounded-full border border-brand-teal/25 bg-cream/70 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brand-teal dark:border-brand-teal/35 dark:bg-cream/10 dark:text-brand-teal/90";

/** Availability date pills (max preview + overflow). */
export function AvailabilityDateChips({
  dates,
  label = "Availability",
  maxPreview = 3,
  locale,
  upcomingOnly,
  className = "",
  emptyLabel,
}: AvailabilityDateChipsProps) {
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
