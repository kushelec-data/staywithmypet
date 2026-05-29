/**
 * Account area design system — single source of truth.
 * Sync with `.account-area` in `src/app/globals.css`.
 */
export const ACCOUNT_COLORS = {
  primary: "#2E6B3F",
  primaryHover: "#255A34",
  light: "#DDEEDF",
  cardBg: "#F8F6F1",
  cardBorder: "#E5E2D8",
} as const;

export const ACCOUNT_LAYOUT_SHELL =
  "account-area mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8";

export const ACCOUNT_LAYOUT_PADDING = "py-6 sm:py-8";

export const ACCOUNT_LAYOUT_GRID =
  "grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8";

export const ACCOUNT_LAYOUT_GRID_WITH_ASIDE =
  "grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:gap-8";

export const ACCOUNT_PAGE_HEADER_EYEBROW =
  "text-sm font-semibold uppercase tracking-wider text-[#2E6B3F]";

export const ACCOUNT_PAGE_TITLE =
  "font-heading text-2xl font-semibold text-foreground sm:text-3xl";

export const ACCOUNT_PAGE_DESCRIPTION = "mt-2 max-w-2xl text-sm text-muted sm:text-base";

export const ACCOUNT_CONTENT_STACK = "mt-6 space-y-4 sm:space-y-5";

/** Shared card surface — radius 20px per design spec. */
export const ACCOUNT_CARD_CLASS =
  "rounded-[20px] border border-[#E5E2D8] bg-[#F8F6F1] shadow-[0_1px_2px_rgba(46,107,63,0.05)]";

export const ACCOUNT_CARD_INNER_CLASS =
  "rounded-xl border border-[#E5E2D8] bg-[#DDEEDF]";

export const ACCOUNT_CALLOUT_CLASS =
  "rounded-[20px] border border-[#E5E2D8] bg-[color-mix(in_srgb,#DDEEDF_65%,#F8F6F1)]";

export const ACCOUNT_NAV_ACTIVE_CLASS =
  "rounded-xl bg-[#DDEEDF] text-[#2E6B3F] shadow-sm ring-1 ring-[#E5E2D8]";

export const ACCOUNT_NAV_INACTIVE_CLASS =
  "text-muted transition-colors hover:bg-[#DDEEDF] hover:text-[#2E6B3F]";

export const ACCOUNT_TAB_ACTIVE_CLASS =
  "rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#2E6B3F]/15";

export const ACCOUNT_TAB_INACTIVE_CLASS =
  "rounded-full border border-[#E5E2D8] bg-[#F8F6F1] px-4 py-2 text-sm font-semibold text-[#2E6B3F] transition-colors hover:bg-[#DDEEDF]";

export const ACCOUNT_LINK_CLASS =
  "font-semibold text-[#2E6B3F] transition-opacity hover:opacity-80";

export const ACCOUNT_TAG_CLASS =
  "rounded-full border border-[#E5E2D8] bg-[#DDEEDF] font-medium text-[#2E6B3F]";

export const ACCOUNT_PROGRESS_TRACK_CLASS = "rounded-full bg-[#E5E2D8]";

export const ACCOUNT_PROGRESS_FILL_CLASS = "rounded-full bg-[#2E6B3F]";

export const ACCOUNT_SCORE_TEXT_CLASS = "text-[#2E6B3F]";

export const ACCOUNT_STATUS_COMPLETE_CLASS =
  "rounded-full bg-[#DDEEDF] text-[#2E6B3F]";

export const ACCOUNT_STATUS_BADGE_CLASS =
  "inline-flex items-center gap-1 rounded-full border border-[#E5E2D8] bg-[#DDEEDF] px-2.5 py-0.5 text-xs font-semibold text-[#2E6B3F]";

export const ACCOUNT_MESSAGES_PANEL_CLASS = `${ACCOUNT_CARD_CLASS} flex min-h-0 min-w-0 flex-col overflow-hidden`;

export const ACCOUNT_LIST_ITEM_ACTIVE_CLASS =
  "rounded-2xl bg-[#DDEEDF] shadow-sm ring-1 ring-[#E5E2D8]";

export const ACCOUNT_LIST_ITEM_INACTIVE_CLASS =
  "rounded-2xl hover:bg-[#F8F6F1]";

export const ACCOUNT_ALERT_ERROR_CLASS =
  "rounded-xl border border-brand-pink/25 bg-brand-pink-muted/40 px-3 py-2 text-sm text-brand-pink";

export const ACCOUNT_ALERT_SUCCESS_CLASS =
  "rounded-xl border border-[#E5E2D8] bg-[#DDEEDF]/80 px-3 py-2 text-sm text-[#2E6B3F]";

export function accountScoreTextClass(percent: number): string {
  if (percent >= 70) return ACCOUNT_SCORE_TEXT_CLASS;
  if (percent >= 40) return "text-amber-700 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function accountProgressFillClass(_percent: number): string {
  return ACCOUNT_PROGRESS_FILL_CLASS;
}

/** @deprecated Use account-ui exports — kept for gradual migration */
export {
  ACCOUNT_COLORS as DASHBOARD_COLORS,
  ACCOUNT_CARD_CLASS as DASHBOARD_CARD_CLASS,
  ACCOUNT_CARD_INNER_CLASS as DASHBOARD_CARD_INNER_CLASS,
  ACCOUNT_CALLOUT_CLASS as DASHBOARD_CALLOUT_CLASS,
  ACCOUNT_NAV_ACTIVE_CLASS as DASHBOARD_NAV_ACTIVE_CLASS,
  ACCOUNT_NAV_INACTIVE_CLASS as DASHBOARD_NAV_INACTIVE_CLASS,
  ACCOUNT_LINK_CLASS as DASHBOARD_LINK_CLASS,
  ACCOUNT_TAG_CLASS as DASHBOARD_TAG_CLASS,
  ACCOUNT_PROGRESS_TRACK_CLASS as DASHBOARD_PROGRESS_TRACK_CLASS,
  ACCOUNT_PROGRESS_FILL_CLASS as DASHBOARD_PROGRESS_FILL_CLASS,
  ACCOUNT_SCORE_TEXT_CLASS as DASHBOARD_SCORE_TEXT_CLASS,
  ACCOUNT_STATUS_COMPLETE_CLASS as DASHBOARD_STATUS_COMPLETE_CLASS,
  ACCOUNT_STATUS_BADGE_CLASS as DASHBOARD_STATUS_BADGE_CLASS,
  accountScoreTextClass as dashboardScoreTextClass,
  accountProgressFillClass as dashboardProgressFillClass,
};
