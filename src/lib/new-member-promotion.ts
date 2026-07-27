import type { MembershipRole } from "@/lib/membership";
import type { WelcomeOfferEligibleByRole } from "@/lib/membership-load";
import { buildMembershipPagePath } from "@/lib/membership-return";
import { MEMBERSHIP_PATH } from "@/lib/auth-routing";
import type { ProfileRow } from "@/lib/profile-utils";
import { isWelcomeOfferEligibleForRole } from "@/lib/profile-utils";

export type { WelcomeOfferEligibleByRole };

/** How welcome-offer messaging should render (not user-specific until login). */
export type WelcomeOfferDisplayMode = "none" | "marketing" | "confirmed";

export function welcomeOfferDisplayModeForUser(options: {
  loggedIn: boolean;
  confirmedEligible: boolean;
}): WelcomeOfferDisplayMode {
  if (options.loggedIn) {
    return options.confirmedEligible ? "confirmed" : "none";
  }
  return "marketing";
}

/** Confirmed first-ever offer eligibility from profile snapshot (server-derived). */
export function isWelcomeOfferEligibleForRoleFromProfile(
  profile: ProfileRow | null | undefined,
  role: MembershipRole,
): boolean {
  return isWelcomeOfferEligibleForRole(profile, role);
}

export function newMemberPromotionMembershipHref(options: {
  role: MembershipRole;
  loggedIn: boolean;
  returnTo?: string | null;
}): string {
  const membershipPath = buildMembershipPagePath({
    role: options.role,
    returnTo: options.returnTo ?? null,
  });
  if (options.loggedIn) return membershipPath;
  return `/signup?next=${encodeURIComponent(membershipPath)}`;
}

export function newMemberPromotionMembershipHrefDefault(): string {
  return `/signup?next=${encodeURIComponent(MEMBERSHIP_PATH)}`;
}

export const WELCOME_OFFER_CODE = "WELCOME90";

const UPSELL_DISMISS_STORAGE_KEY = "swmp.membership-upsell.dismissed";
const UPSELL_DISMISS_TTL_MS = 30 * 60 * 1000;

export function isMembershipUpsellDismissedForSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(UPSELL_DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < UPSELL_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function dismissMembershipUpsellForSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UPSELL_DISMISS_STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Guard: UI must not expose frontend-calculated promotional euro amounts. */
export function exposesCalculatedPromotionalPrice(): false {
  return false;
}
