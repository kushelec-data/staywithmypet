import { DASHBOARD_PATH } from "@/lib/auth-routing";

export const MATCHES_PATH = "/matches";
export const MESSAGES_PATH = "/messages";

/** Pet parent flows must not redirect to user profile setup. */
export function isPetsAreaPath(pathname: string): boolean {
  return pathname === "/pets" || pathname.startsWith("/pets/");
}

/** Public marketing pages — always reachable without a complete profile. */
export function isPublicMarketingPath(pathname: string): boolean {
  return (
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/faq" ||
    pathname === "/how-it-works" ||
    pathname === "/articles" ||
    pathname.startsWith("/articles/") ||
    pathname === "/care" ||
    pathname.startsWith("/care/")
  );
}

export function isProfileFormPath(pathname: string): boolean {
  return (
    pathname === "/profile/setup" ||
    pathname.startsWith("/profile/setup/") ||
    pathname === "/profile/edit" ||
    pathname.startsWith("/profile/edit/")
  );
}

export function isDashboardAreaPath(pathname: string): boolean {
  return pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);
}

export function isMatchesPath(pathname: string): boolean {
  return pathname === MATCHES_PATH || pathname.startsWith(`${MATCHES_PATH}/`);
}

export function isMessagesPath(pathname: string): boolean {
  return pathname === MESSAGES_PATH || pathname.startsWith(`${MESSAGES_PATH}/`);
}

/** Account pages that stay on their own route when the profile is incomplete. */
export function isAllowedIncompleteProfilePath(pathname: string): boolean {
  return (
    isPublicMarketingPath(pathname) ||
    isMatchesPath(pathname) ||
    isMessagesPath(pathname) ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/requests" ||
    pathname === "/membership" ||
    pathname.startsWith("/membership/") ||
    pathname === "/pricing" ||
    pathname.startsWith("/pricing/") ||
    pathname === "/change-password" ||
    pathname.startsWith("/change-password/") ||
    pathname === "/saved" ||
    pathname === "/preferences" ||
    pathname === "/gallery" ||
    pathname === "/find-pets" ||
    pathname.startsWith("/find-pets/") ||
    pathname === "/find-care" ||
    pathname.startsWith("/find-care/") ||
    pathname === "/pet" ||
    pathname.startsWith("/pet/")
  );
}

/**
 * Incomplete profiles stay on Matches (locked empty state) instead of being
 * sent to /profile/setup. Role onboarding still redirects separately.
 */
export function shouldRedirectIncompleteProfileToSetup(pathname: string): boolean {
  return (
    !isProfileFormPath(pathname) &&
    !isDashboardAreaPath(pathname) &&
    !isPetsAreaPath(pathname) &&
    !isAllowedIncompleteProfilePath(pathname)
  );
}
