import { resolveLoginReturnPath } from "@/lib/auth-routing";
import { getAuthRedirectOrigin as resolveAuthRedirectOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase";

/** Short-lived cookie holding post-OAuth return path (avoids query params in redirectTo). */
export const OAUTH_RETURN_COOKIE = "swmp_oauth_return";

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Base URL for auth redirects (OAuth callback, password reset landing). */
export function getAuthRedirectOrigin(): string {
  return resolveAuthRedirectOrigin();
}

/** Supabase OAuth redirect target — bare callback URL without query params. */
export function getOAuthCallbackUrl(): string {
  return `${getAuthRedirectOrigin()}/auth/callback`;
}

export function getAuthCallbackUrl(nextPath: string) {
  const origin = getAuthRedirectOrigin();
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export function buildOAuthReturnCookie(returnPath: string): string {
  const safePath = resolveLoginReturnPath(returnPath);
  if (!safePath) {
    throw new Error("Invalid OAuth return path");
  }
  return `${OAUTH_RETURN_COOKIE}=${encodeURIComponent(safePath)}; path=/; max-age=600; SameSite=Lax`;
}

/** Email confirmation and recovery links (signup confirm, password reset). */
export function getAuthConfirmUrl(nextPath: string) {
  const origin = getAuthRedirectOrigin();
  return `${origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
}
