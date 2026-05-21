export const DASHBOARD_REFRESH_EVENT = "staywithmypet:dashboard-refresh";

/** Notify dashboard (and other listeners) to reload Supabase-backed data. */
export function notifyDashboardRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT));
}
