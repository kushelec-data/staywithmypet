import { PASSWORD_RESET_PATH } from "@/lib/auth-recovery";
import { resolveLoginReturnPath, resolvePostLoginPath } from "@/lib/auth-routing";
import type { ProfileRow } from "@/lib/profile-utils";

/** Password-recovery confirms must keep landing on the reset form. */
export function isRecoveryConfirmType(type: string | null | undefined): boolean {
  return type === "recovery";
}

/**
 * Post-confirmation destination. Role onboarding and profile setup override `next`
 * (including `/dashboard`). Recovery always stays on the reset path.
 */
export function resolveConfirmRedirectPath(
  profile: ProfileRow | null,
  nextParam: string | null,
  confirmType: string | null,
): string {
  if (isRecoveryConfirmType(confirmType)) {
    const next = resolveLoginReturnPath(nextParam);
    if (next === PASSWORD_RESET_PATH || next?.startsWith(`${PASSWORD_RESET_PATH}?`)) {
      return next;
    }
    return PASSWORD_RESET_PATH;
  }

  return resolvePostLoginPath(profile, nextParam);
}

/** Site URL fallback: confirmation tokens land on `/` instead of `/auth/confirm`. */
export function shouldForwardHomepageToAuthConfirm(
  pathname: string,
  searchParams: { get(name: string): string | null },
): boolean {
  if (pathname !== "/") return false;
  return Boolean(searchParams.get("code") || searchParams.get("token_hash"));
}
