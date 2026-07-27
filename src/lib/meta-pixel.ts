import { readCookieConsent } from "@/lib/cookie-consent";

export const META_PIXEL_SCRIPT_ID = "meta-pixel";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

export function getMetaPixelId(): string {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
}

/** Production build, pixel ID set, and not localhost. Does not check marketing consent. */
export function isMetaPixelProductionRuntime(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (!getMetaPixelId()) return false;
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

/** Whether the user has granted marketing cookies. Browser-only. */
export function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  return readCookieConsent()?.marketing === true;
}

/** Production runtime + marketing consent — required to load Pixel or send events. */
export function isMetaPixelEnabled(): boolean {
  return isMetaPixelProductionRuntime() && hasMarketingConsent();
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
