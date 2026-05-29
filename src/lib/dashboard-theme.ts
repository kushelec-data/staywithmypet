/**
 * Dashboard color system — single source of truth.
 * Keep in sync with `.dashboard-area` in `src/app/globals.css`.
 */
export const DASHBOARD_COLORS = {
  primary: "#2E6B3F",
  primaryHover: "#255A34",
  light: "#DDEEDF",
  cardBg: "#F8F6F1",
  cardBorder: "#E5E2D8",
} as const;

/** Shared card surface (sidebar, center column, right column). */
export const DASHBOARD_CARD_CLASS =
  "rounded-2xl border border-[#E5E2D8] bg-[#F8F6F1] shadow-[0_1px_2px_rgba(46,107,63,0.05)]";

/** Nested panel inside a card (score blocks, pet rows). */
export const DASHBOARD_CARD_INNER_CLASS =
  "rounded-xl border border-[#E5E2D8] bg-[#DDEEDF]";

export const DASHBOARD_CALLOUT_CLASS =
  "rounded-2xl border border-[#E5E2D8] bg-[color-mix(in_srgb,#DDEEDF_65%,#F8F6F1)]";

export const DASHBOARD_NAV_ACTIVE_CLASS =
  "rounded-xl bg-[#DDEEDF] text-[#2E6B3F] shadow-sm ring-1 ring-[#E5E2D8]";

export const DASHBOARD_NAV_INACTIVE_CLASS =
  "text-muted transition-colors hover:bg-[#DDEEDF] hover:text-[#2E6B3F]";

export const DASHBOARD_LINK_CLASS =
  "font-semibold text-[#2E6B3F] transition-opacity hover:opacity-80";

export const DASHBOARD_TAG_CLASS =
  "rounded-full border border-[#E5E2D8] bg-[#DDEEDF] font-medium text-[#2E6B3F]";

export const DASHBOARD_PROGRESS_TRACK_CLASS = "rounded-full bg-[#E5E2D8]";

export const DASHBOARD_PROGRESS_FILL_CLASS = "rounded-full bg-[#2E6B3F]";

export const DASHBOARD_SCORE_TEXT_CLASS = "text-[#2E6B3F]";

export const DASHBOARD_STATUS_COMPLETE_CLASS =
  "rounded-full bg-[#DDEEDF] text-[#2E6B3F]";

export const DASHBOARD_STATUS_BADGE_CLASS =
  "inline-flex items-center gap-1 rounded-full border border-[#E5E2D8] bg-[#DDEEDF] px-2.5 py-0.5 text-xs font-semibold text-[#2E6B3F]";

export function dashboardScoreTextClass(percent: number): string {
  if (percent >= 70) return DASHBOARD_SCORE_TEXT_CLASS;
  if (percent >= 40) return "text-amber-700 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function dashboardProgressFillClass(_percent: number): string {
  return DASHBOARD_PROGRESS_FILL_CLASS;
}
