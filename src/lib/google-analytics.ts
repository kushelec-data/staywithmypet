import { readCookieConsent } from "@/lib/cookie-consent";

export const GA_MEASUREMENT_INIT_SCRIPT_ID = "google-analytics-init";

const PURCHASE_DEDUP_STORAGE_PREFIX = "swmp_ga_purchase:";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getGaMeasurementId(): string {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
}

/** Production build, measurement ID set, and not localhost. Does not check analytics consent. */
export function isGoogleAnalyticsProductionRuntime(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (!getGaMeasurementId()) return false;
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

/** Whether the user has granted analytics cookies. Browser-only. */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return readCookieConsent()?.analytics === true;
}

/** Production runtime + analytics consent — required to load GA4 or send events. */
export function isGoogleAnalyticsEnabled(): boolean {
  return isGoogleAnalyticsProductionRuntime() && hasAnalyticsConsent();
}

function callGtag(...args: unknown[]): void {
  if (!isGoogleAnalyticsEnabled()) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
}

export function pageView(url?: string): void {
  if (!isGoogleAnalyticsEnabled()) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const pagePath =
    url ??
    `${window.location.pathname}${window.location.search}`;
  const pageLocation = url
    ? new URL(url, window.location.origin).href
    : window.location.href;

  callGtag("event", "page_view", {
    page_location: pageLocation,
    page_path: pagePath,
    page_title: typeof document !== "undefined" ? document.title : undefined,
  });
}

export function track(
  eventName: string,
  parameters?: Record<string, unknown>,
): void {
  if (parameters !== undefined) {
    callGtag("event", eventName, parameters);
    return;
  }
  callGtag("event", eventName);
}

export type PurchaseEventParams = {
  transaction_id: string;
  value?: number;
  currency?: string;
};

function purchaseAlreadyTracked(transactionId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return (
      window.sessionStorage.getItem(`${PURCHASE_DEDUP_STORAGE_PREFIX}${transactionId}`) ===
      "1"
    );
  } catch {
    return false;
  }
}

function markPurchaseTracked(transactionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${PURCHASE_DEDUP_STORAGE_PREFIX}${transactionId}`, "1");
  } catch {
    /* storage unavailable */
  }
}

/** Sends purchase once per transaction_id per browser session (survives refresh). */
export function trackPurchaseOnce(params: PurchaseEventParams): void {
  const transactionId = params.transaction_id?.trim();
  if (!transactionId) return;
  if (!isGoogleAnalyticsEnabled()) return;
  if (purchaseAlreadyTracked(transactionId)) return;

  const eventParams: Record<string, unknown> = {
    transaction_id: transactionId,
  };
  if (typeof params.value === "number" && Number.isFinite(params.value)) {
    eventParams.value = params.value;
  }
  if (typeof params.currency === "string" && params.currency.trim()) {
    eventParams.currency = params.currency.trim();
  }

  markPurchaseTracked(transactionId);
  track("purchase", eventParams);
}
