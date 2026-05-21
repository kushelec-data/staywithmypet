import { createClient } from "@/lib/supabase";

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Base URL for auth redirects (OAuth callback, password reset landing).
 * Prefers NEXT_PUBLIC_SITE_URL when set so links match dashboard config; falls back to the browser origin.
 */
export function getAuthRedirectOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) return site;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export function getAuthCallbackUrl(nextPath: string) {
  const origin = getAuthRedirectOrigin();
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
