import { getAuthRedirectOrigin as resolveAuthRedirectOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Base URL for auth redirects (OAuth callback, password reset landing). */
export function getAuthRedirectOrigin(): string {
  return resolveAuthRedirectOrigin();
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

export type StartGoogleOAuthResult = {
  redirectUrl: string | null;
  error: Error | null;
};

/** Starts Google OAuth and ensures the browser navigates to Supabase authorize URL. */
export async function startGoogleOAuth(
  supabase: SupabaseClient,
  nextPath: string,
): Promise<StartGoogleOAuthResult> {
  const redirectTo = getAuthCallbackUrl(nextPath);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account consent",
        access_type: "offline",
      },
    },
  });

  if (error) {
    return { redirectUrl: null, error };
  }

  const redirectUrl = data?.url ?? null;
  if (redirectUrl && typeof window !== "undefined") {
    window.location.assign(redirectUrl);
  }

  return { redirectUrl, error: null };
}
