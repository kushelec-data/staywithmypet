import {
  STATUS_CHIP_AVAILABLE_CLASS,
  STATUS_CHIP_AVAILABLE_COMPACT_CLASS,
  STATUS_CHIP_AVAILABLE_OVERFLOW_CLASS,
  STATUS_CHIP_AVAILABLE_OVERFLOW_COMPACT_CLASS,
} from "@/lib/status-colors";

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

const chipPrimary = STATUS_CHIP_AVAILABLE_CLASS;
const chipOverflow = STATUS_CHIP_AVAILABLE_OVERFLOW_CLASS;
const chipPrimaryCompact = STATUS_CHIP_AVAILABLE_COMPACT_CLASS;
const chipOverflowCompact = STATUS_CHIP_AVAILABLE_OVERFLOW_COMPACT_CLASS;

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
