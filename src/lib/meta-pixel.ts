const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";

export const META_PIXEL_SCRIPT_ID = "meta-pixel";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

export function getMetaPixelId(): string {
  return META_PIXEL_ID;
}

/** Production build, pixel ID set, and not localhost. Safe to call on server (skips hostname check). */
export function isMetaPixelEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (!META_PIXEL_ID) return false;
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    ) {
      return false;
    }
  }
  return true;
}

function callFbq(...args: unknown[]): void {
  if (!isMetaPixelEnabled()) return;
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(...args);
}

export function pageView(): void {
  callFbq("track", "PageView");
}

export function track(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (params !== undefined) {
    callFbq("track", eventName, params);
    return;
  }
  callFbq("track", eventName);
}
