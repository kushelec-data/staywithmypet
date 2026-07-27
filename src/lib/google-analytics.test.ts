import {
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentRecord,
} from "@/lib/cookie-consent";
import {
  getGaMeasurementId,
  hasAnalyticsConsent,
  isGoogleAnalyticsEnabled,
  isGoogleAnalyticsProductionRuntime,
  pageView,
  track,
  trackPurchaseOnce,
} from "@/lib/google-analytics";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ORIGINAL_ENV = process.env;
const MEASUREMENT_ID = "G-N76E6F8CKC";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  get length() {
    return storage.size;
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
};

const sessionStorageMock = {
  getItem: (key: string) => storage.get(`session:${key}`) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(`session:${key}`, value);
  },
  removeItem: (key: string) => {
    storage.delete(`session:${key}`);
  },
  clear: () => {
    for (const key of [...storage.keys()]) {
      if (key.startsWith("session:")) storage.delete(key);
    }
  },
};

function writeAnalyticsConsent(analytics: boolean): void {
  const record: CookieConsentRecord = {
    necessary: true,
    analytics,
    marketing: false,
    decidedAt: new Date().toISOString(),
  };
  localStorageMock.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
}

describe("google-analytics consent gating", () => {
  beforeEach(() => {
    storage.clear();
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "production",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: MEASUREMENT_ID,
    };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    vi.stubGlobal("document", { title: "StayWithMyPet" });
    vi.stubGlobal("window", {
      location: {
        hostname: "www.staywithmypet.ee",
        href: "https://www.staywithmypet.ee/membership",
        pathname: "/membership",
        search: "",
        origin: "https://www.staywithmypet.ee",
      },
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      gtag: vi.fn(),
    });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.unstubAllGlobals();
  });

  it("exposes the configured measurement id from env only", () => {
    expect(getGaMeasurementId()).toBe(MEASUREMENT_ID);
    expect(getGaMeasurementId()).not.toContain("hardcode");
  });

  it("does not enable production runtime on localhost", () => {
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
    });
    expect(isGoogleAnalyticsProductionRuntime()).toBe(false);
  });

  it("does not load without analytics consent", () => {
    expect(hasAnalyticsConsent()).toBe(false);
    expect(isGoogleAnalyticsEnabled()).toBe(false);
  });

  it("loads when analytics consent is true in production runtime", () => {
    writeAnalyticsConsent(true);
    expect(hasAnalyticsConsent()).toBe(true);
    expect(isGoogleAnalyticsEnabled()).toBe(true);
  });

  it("does not send events when analytics consent is false", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", {
      location: {
        hostname: "www.staywithmypet.ee",
        href: "https://www.staywithmypet.ee/",
        pathname: "/",
        search: "",
        origin: "https://www.staywithmypet.ee",
      },
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      gtag,
    });

    pageView();
    track("login");
    trackPurchaseOnce({ transaction_id: "cs_test_123" });

    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends page_view and track events when analytics consent is granted", () => {
    writeAnalyticsConsent(true);
    const gtag = vi.fn();
    vi.stubGlobal("window", {
      location: {
        hostname: "www.staywithmypet.ee",
        href: "https://www.staywithmypet.ee/membership",
        pathname: "/membership",
        search: "",
        origin: "https://www.staywithmypet.ee",
      },
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      gtag,
    });

    pageView();
    track("sign_up");
    track("begin_checkout", { item_list_id: "membership" });

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "page_view",
      expect.objectContaining({
        page_path: "/membership",
        page_location: "https://www.staywithmypet.ee/membership",
        page_title: "StayWithMyPet",
      }),
    );
    expect(gtag).toHaveBeenCalledWith("event", "sign_up");
    expect(gtag).toHaveBeenCalledWith("event", "begin_checkout", {
      item_list_id: "membership",
    });
  });

  it("stops sending events after analytics consent is withdrawn", () => {
    writeAnalyticsConsent(true);
    const gtag = vi.fn();
    vi.stubGlobal("window", {
      location: {
        hostname: "www.staywithmypet.ee",
        href: "https://www.staywithmypet.ee/",
        pathname: "/",
        search: "",
        origin: "https://www.staywithmypet.ee",
      },
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      gtag,
    });

    pageView();
    expect(gtag).toHaveBeenCalledTimes(1);

    writeAnalyticsConsent(false);
    pageView();
    track("login");

    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("deduplicates purchase events by transaction_id", () => {
    writeAnalyticsConsent(true);
    const gtag = vi.fn();
    vi.stubGlobal("window", {
      location: {
        hostname: "www.staywithmypet.ee",
        href: "https://www.staywithmypet.ee/membership",
        pathname: "/membership",
        search: "",
        origin: "https://www.staywithmypet.ee",
      },
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      gtag,
    });

    trackPurchaseOnce({ transaction_id: "cs_test_123", value: 9.99, currency: "EUR" });
    trackPurchaseOnce({ transaction_id: "cs_test_123", value: 9.99, currency: "EUR" });

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "purchase", {
      transaction_id: "cs_test_123",
      value: 9.99,
      currency: "EUR",
    });
  });
});

describe("ConsentAwareGoogleAnalytics page views", () => {
  const componentSource = readFileSync(
    join(process.cwd(), "src/components/cookies/ConsentAwareGoogleAnalytics.tsx"),
    "utf8",
  );

  it("does not render scripts without analytics consent gate", () => {
    expect(componentSource).toContain("consent?.analytics === true");
    expect(componentSource).toContain("readCookieConsent");
    expect(componentSource).not.toContain("marketing");
  });

  it("loads gtag only when runtime, consent, and measurement id are present", () => {
    expect(componentSource).toContain("isGoogleAnalyticsProductionRuntime");
    expect(componentSource).toContain("shouldLoad = runtimeEnabled && analyticsEnabled");
    expect(componentSource).toContain("googletagmanager.com/gtag/js");
    expect(componentSource).toContain("send_page_view: false");
  });

  it("deduplicates page_view per route key", () => {
    expect(componentSource).toContain("lastSentRef");
    expect(componentSource).toContain("lastSentRef.current === pagePath");
  });
});
