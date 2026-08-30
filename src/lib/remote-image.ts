import { getSupabasePublicEnv } from "@/lib/supabase/env";

/** Hostnames allowed for `next/image` (must match next.config `images.remotePatterns`). */
const NEXT_IMAGE_HOSTS = new Set([
  "vbryiqcvrcpkqkbllntw.supabase.co",
  "lh3.googleusercontent.com",
]);

function hostnameFromSrc(src: string): string | null {
  try {
    return new URL(src).hostname;
  } catch {
    return null;
  }
}

function supabaseProjectHostname(): string | null {
  const { url } = getSupabasePublicEnv();
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isSupabaseHostname(hostname: string): boolean {
  const envHost = supabaseProjectHostname();
  if (envHost && hostname === envHost) return true;
  return hostname.endsWith(".supabase.co");
}

/** True for objects in Supabase Storage (pet-photos, avatars, etc.). */
export function isSupabaseStorageImageUrl(src: string): boolean {
  const trimmed = src?.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (!isSupabaseHostname(parsed.hostname)) return false;
    return parsed.pathname.includes("/storage/v1/object/");
  } catch {
    return false;
  }
}

/**
 * User-generated Storage files must not go through `/_next/image`
 * (Vercel Image Optimization returns 402 when the quota is exhausted).
 */
export function shouldBypassNextImageOptimization(src: string): boolean {
  return isSupabaseStorageImageUrl(src);
}

export function canUseNextImage(src: string): boolean {
  if (!src?.trim()) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  const hostname = hostnameFromSrc(src);
  if (!hostname) return false;
  if (NEXT_IMAGE_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".supabase.co")) return true;
  if (hostname === "googleusercontent.com" || hostname.endsWith(".googleusercontent.com")) {
    return true;
  }
  return false;
}
