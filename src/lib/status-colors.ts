/**
 * Central status colour palette — calendars, legends, badges, chips, alerts.
 * Hex values are mirrored in `src/app/globals.css` (`--status-*` variables).
 */

export const STATUS_HEX = {
  available: "#C8EDD6",
  booked: "#F5D0D6",
  pending: "#FFE08A",
  /** ~12% darker than white card — visible on cream/surface backgrounds. */
  unavailable: "#CDD1D8",
  selected: "#265D32",
  today: "#3D8B52",
  surface: "#FFFFFF",
  text: "#333333",
  textMuted: "#5C5C5C",
  border: "rgba(0, 0, 0, 0.08)",
} as const;

export type StatusSemantic =
  | "available"
  | "booked"
  | "pending"
  | "unavailable"
  | "selected"
  | "success"
  | "warning"
  | "error";

/** @deprecated Use STATUS_HEX — kept for calendar imports during migration. */
export const CALENDAR_STATUS_HEX = {
  available: STATUS_HEX.available,
  booked: STATUS_HEX.booked,
  pending: STATUS_HEX.pending,
  unavailable: STATUS_HEX.unavailable,
  todayBorder: STATUS_HEX.today,
  selectedBorder: STATUS_HEX.selected,
  surface: STATUS_HEX.surface,
  text: STATUS_HEX.text,
  textMuted: STATUS_HEX.textMuted,
  border: STATUS_HEX.border,
} as const;

const BADGE_BASE =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide ring-1";

export const STATUS_BADGE = {
  available: `${BADGE_BASE} bg-status-available-bg text-status-available-text ring-status-available-border`,
  booked: `${BADGE_BASE} bg-status-booked-bg text-status-booked-text ring-status-booked-border`,
  pending: `${BADGE_BASE} bg-status-pending-bg text-status-pending-text ring-status-pending-border`,
  unavailable: `${BADGE_BASE} bg-status-unavailable-bg text-status-unavailable-text ring-status-unavailable-border`,
  success: `${BADGE_BASE} bg-success-bg text-success-text ring-status-available-border`,
  warning: `${BADGE_BASE} bg-status-warning-bg text-status-warning-text ring-status-warning-border`,
  error: `${BADGE_BASE} bg-error-bg text-error-text ring-brand-pink/25`,
} as const;

export function statusBadgeClass(kind: StatusSemantic): string {
  switch (kind) {
    case "available":
      return STATUS_BADGE.available;
    case "booked":
      return STATUS_BADGE.booked;
    case "pending":
      return STATUS_BADGE.pending;
    case "unavailable":
      return STATUS_BADGE.unavailable;
    case "selected":
      return STATUS_BADGE.available;
    case "success":
      return STATUS_BADGE.success;
    case "warning":
      return STATUS_BADGE.warning;
    case "error":
      return STATUS_BADGE.error;
    default:
      return STATUS_BADGE.unavailable;
  }
}

export const STATUS_ALERT_ERROR_CLASS =
  "rounded-xl border border-brand-pink/25 bg-error-bg px-3 py-2 text-sm text-error-text";

export const STATUS_ALERT_SUCCESS_CLASS =
  "rounded-xl bg-success-bg px-3 py-2 text-sm font-medium text-success-text";

export const STATUS_ALERT_WARNING_CLASS =
  "rounded-xl border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-status-warning-text";

export const STATUS_ALERT_ERROR_COMPACT_CLASS =
  "rounded-lg border border-brand-pink/25 bg-error-bg px-2.5 py-1.5 text-xs text-error-text";

export const STATUS_ALERT_WARNING_COMPACT_CLASS =
  "border-b border-status-warning-border bg-status-warning-bg px-4 py-2.5 text-xs leading-relaxed text-status-warning-text";

/** Soft warning surface for cards and panels. */
export const STATUS_SURFACE_WARNING_CLASS =
  "border border-status-warning-border bg-status-warning-bg/50";

/** Availability date pills on pet/search cards. */
export const STATUS_CHIP_AVAILABLE_CLASS =
  "rounded-full bg-status-available-bg px-2.5 py-0.5 text-[0.7rem] font-semibold text-status-available-text ring-1 ring-status-available-border";

export const STATUS_CHIP_AVAILABLE_OVERFLOW_CLASS =
  "rounded-full border border-status-available-border bg-status-available-bg/70 px-2.5 py-0.5 text-[0.7rem] font-semibold text-status-available-text";

export const STATUS_CHIP_AVAILABLE_COMPACT_CLASS =
  "rounded-full bg-status-available-bg px-2 py-0.5 text-[0.65rem] font-semibold leading-tight text-status-available-text ring-1 ring-status-available-border";

export const STATUS_CHIP_AVAILABLE_OVERFLOW_COMPACT_CLASS =
  "rounded-full border border-status-available-border bg-status-available-bg/70 px-2 py-0.5 text-[0.65rem] font-semibold leading-tight text-status-available-text";

/** Dashboard checklist row icons. */
export const STATUS_CHECK_COMPLETE_CLASS =
  "rounded-full bg-status-available-bg text-status-available-text ring-1 ring-status-available-border";

export const STATUS_CHECK_PENDING_CLASS =
  "border border-status-pending-border bg-status-pending-bg text-status-pending-text";

export const STATUS_CHECK_MISSING_CLASS =
  "border border-status-unavailable-border bg-status-unavailable-bg text-status-unavailable-text";

export const STATUS_CHECK_PENDING_TEXT_CLASS = "text-status-pending-text";

/** Trust / progress bar fills. */
export function statusProgressFillClass(percent: number): string {
  if (percent >= 70) return "bg-status-available-text";
  if (percent >= 40) return "bg-status-warning-text";
  return "bg-error-text";
}

export function statusScoreTextClass(percent: number): string {
  if (percent >= 70) return "text-status-available-text";
  if (percent >= 40) return "text-status-warning-text";
  return "text-error-text";
}
