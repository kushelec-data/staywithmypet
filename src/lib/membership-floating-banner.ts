export const MEMBERSHIP_FLOATING_BANNER_DISMISS_KEY =
  "staywithmypet_membership_floating_banner_dismissed";

export const MEMBERSHIP_FLOATING_BANNER_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isMembershipFloatingBannerDismissed(now = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(MEMBERSHIP_FLOATING_BANNER_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return now - dismissedAt < MEMBERSHIP_FLOATING_BANNER_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function dismissMembershipFloatingBanner(now = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEMBERSHIP_FLOATING_BANNER_DISMISS_KEY, String(now));
  } catch {
    /* ignore */
  }
}

/** Test helper */
export function clearMembershipFloatingBannerDismissal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MEMBERSHIP_FLOATING_BANNER_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}
