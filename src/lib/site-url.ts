import { publicProfileHref } from "@/lib/profile-completeness";
import { publicPetHref } from "@/lib/public-pet";

/** Last-resort production origin for server-rendered emails when env is unset. */
const FALLBACK_PRODUCTION_ORIGIN = "https://www.staywithmypet.ee";

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

/** Browser origin when running in the client (Preview, Production, or local). */
export function getClientOrigin(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeOrigin(window.location.origin);
}

/** Request origin for server routes (OAuth confirm/callback, API redirects). */
export function getRequestOrigin(request: Request | URL): string {
  const origin = request instanceof URL ? request.origin : new URL(request.url).origin;
  return normalizeOrigin(origin);
}

/**
 * Origin for Supabase auth redirects (OAuth, email confirm, password reset).
 * Always uses the current browser origin on the client so Preview deployments
 * do not send users to NEXT_PUBLIC_SITE_URL or a hardcoded production host.
 */
export function getAuthRedirectOrigin(): string {
  const clientOrigin = getClientOrigin();
  if (clientOrigin) return clientOrigin;

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL?.trim()) {
    return normalizeOrigin(`https://${process.env.VERCEL_URL.trim()}`);
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return FALLBACK_PRODUCTION_ORIGIN;
}

/**
 * Canonical site origin for share links and emails.
 * Prefers NEXT_PUBLIC_SITE_URL in production; uses current origin in the browser when unset.
 */
export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);

  const clientOrigin = getClientOrigin();
  if (clientOrigin) return clientOrigin;

  if (process.env.VERCEL_ENV === "production") {
    return FALLBACK_PRODUCTION_ORIGIN;
  }

  return "http://localhost:3000";
}

/** Absolute URL for a member's public profile page. */
export function absolutePublicProfileUrl(profileId: string, origin?: string): string {
  const base = normalizeOrigin(origin ?? getSiteOrigin());
  return `${base}${publicProfileHref(profileId)}`;
}

/** Absolute URL for a pet's public profile page. */
export function absolutePublicPetUrl(petId: string, origin?: string): string {
  const base = normalizeOrigin(origin ?? getSiteOrigin());
  return `${base}${publicPetHref(petId)}`;
}
