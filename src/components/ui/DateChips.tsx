type DateChipsProps = {
  labels: string[];
  isos?: string[];
  moreCount?: number;
  /** Uppercase section label above chips (e.g. "Available"). */
  title?: string;
  className?: string;
  emptyLabel?: string;
  /** Smaller chips in a single tight row (search cards). */
  compact?: boolean;
};

const chipPrimary =
  "rounded-full bg-brand-teal px-2.5 py-0.5 text-[0.7rem] font-semibold text-white dark:bg-brand-teal/90";
const chipOverflow =
  "rounded-full border border-brand-teal/30 bg-mint/40 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brand-teal dark:border-brand-teal/40 dark:bg-mint/25";
const chipPrimaryCompact =
  "rounded-full bg-brand-teal px-2 py-0.5 text-[0.65rem] font-semibold leading-tight text-white dark:bg-brand-teal/90";
const chipOverflowCompact =
  "rounded-full border border-brand-teal/30 bg-mint/40 px-2 py-0.5 text-[0.65rem] font-semibold leading-tight text-brand-teal dark:border-brand-teal/40 dark:bg-mint/25";

/** Rounded availability date pills for cards and summaries. */
export function DateChips({
  labels,
  isos,
  moreCount = 0,
  title,
  className = "",
  emptyLabel,
  compact = false,
}: DateChipsProps) {
  if (!labels.length) {
    return emptyLabel ? (
      <p
        className={`font-medium text-muted ${compact ? "text-[0.65rem]" : "text-xs"} ${className}`.trim()}
      >
        {emptyLabel}
      </p>
    ) : null;
  }

  const primaryClass = compact ? chipPrimaryCompact : chipPrimary;
  const overflowClass = compact ? chipOverflowCompact : chipOverflow;

  if (compact) {
    return (
      <div className={`flex min-w-0 flex-wrap items-center gap-1 ${className}`.trim()}>
        {title ? (
          <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-brand-teal">
            {title}
          </span>
        ) : null}
        <ul className="flex min-w-0 flex-wrap items-center gap-1">
          {labels.map((label, i) => (
            <li key={isos?.[i] ?? label} className={primaryClass}>
              {label}
            </li>
          ))}
          {moreCount > 0 ? <li className={overflowClass}>+{moreCount}</li> : null}
        </ul>
      </div>
    );
  }

  return (
    <div className={className}>
      {title ? (
        <p className="text-xs font-bold uppercase tracking-wide text-brand-teal">{title}</p>
      ) : null}
      <ul className={`flex flex-wrap gap-1.5 ${title ? "mt-1.5" : ""}`}>
        {labels.map((label, i) => (
          <li key={isos?.[i] ?? label} className={primaryClass}>
            {label}
          </li>
        ))}
        {moreCount > 0 ? (
          <li className={overflowClass}>+{moreCount} more</li>
        ) : null}
      </ul>
    </div>
  );
}
