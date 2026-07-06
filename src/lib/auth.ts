import { getSiteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase";

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Base URL for auth redirects (OAuth callback, password reset landing). */
export function getAuthRedirectOrigin(): string {
  return getSiteOrigin();
}

export function getAuthCallbackUrl(nextPath: string) {
  const origin = getAuthRedirectOrigin();
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

/** Email confirmation and recovery links (signup confirm, password reset). */
export function getAuthConfirmUrl(nextPath: string) {
  const origin = getAuthRedirectOrigin();
  return `${origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
}
