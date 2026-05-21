import { publicProfileHref } from "@/lib/profile-completeness";
import { publicPetHref } from "@/lib/public-pet";

/** Site origin for share links (production or local). */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
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
