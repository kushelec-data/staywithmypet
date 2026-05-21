/** Hostnames allowed for `next/image` (must match next.config `images.remotePatterns`). */
const NEXT_IMAGE_HOSTS = new Set([
  "vbryiqcvrcpkqkbllntw.supabase.co",
  "lh3.googleusercontent.com",
]);

export function canUseNextImage(src: string): boolean {
  if (!src?.trim()) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  try {
    const { hostname } = new URL(src);
    if (NEXT_IMAGE_HOSTS.has(hostname)) return true;
    if (hostname.endsWith(".supabase.co")) return true;
    if (hostname === "googleusercontent.com" || hostname.endsWith(".googleusercontent.com")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
