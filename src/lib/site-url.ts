import { publicProfileHref } from "@/lib/profile-completeness";
import { publicPetHref } from "@/lib/public-pet";

/** Canonical production origin for share links and emails when env is unset. */
export const DEFAULT_SITE_ORIGIN = "https://staywithmypet-clean.vercel.app";

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Site origin for share links, emails, and auth redirects.
 * Prefers NEXT_PUBLIC_SITE_URL so preview deployments do not emit preview URLs.
 */
export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (isLocalDevOrigin(origin)) return origin;
  }

  return DEFAULT_SITE_ORIGIN;
}

/** Absolute URL for a member's public profile page. */
export function absolutePublicProfileUrl(profileId: string, origin?: string): string {
  const base = (origin ?? getSiteOrigin()).replace(/\/$/, "");
  return `${base}${publicProfileHref(profileId)}`;
}

/** Absolute URL for a pet's public profile page. */
export function absolutePublicPetUrl(petId: string, origin?: string): string {
  const base = (origin ?? getSiteOrigin()).replace(/\/$/, "");
  return `${base}${publicPetHref(petId)}`;
}
