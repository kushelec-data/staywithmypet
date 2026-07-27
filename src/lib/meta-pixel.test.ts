import {
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentRecord,
} from "@/lib/cookie-consent";
import {
  getMetaPixelId,
  hasMarketingConsent,
  isMetaPixelEnabled,
  isMetaPixelProductionRuntime,
  pageView,
  track,
} from "@/lib/meta-pixel";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;
const PIXEL_ID = "1234567890";

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

function writeMarketingConsent(marketing: boolean): void {
  const record: CookieConsentRecord = {
    necessary: true,
    analytics: false,
    marketing,
    decidedAt: new Date().toISOString(),
  };
  localStorageMock.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
}

describe("meta-pixel consent gating", () => {
  beforeEach(() => {
    storage.clear();
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "production",
      NEXT_PUBLIC_META_PIXEL_ID: PIXEL_ID,
    };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      location: { hostname: "www.staywithmypet.ee" },
      localStorage: localStorageMock,
      fbq: vi.fn(),
    });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.unstubAllGlobals();
  });

  it("exposes the configured pixel id", () => {
    expect(getMetaPixelId()).toBe(PIXEL_ID);
  });

  it("does not enable production runtime on localhost", () => {
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
      localStorage: localStorageMock,
    });
    expect(isMetaPixelProductionRuntime()).toBe(false);
  });

  it("requires marketing consent to enable pixel", () => {
    expect(hasMarketingConsent()).toBe(false);
    expect(isMetaPixelEnabled()).toBe(false);

    writeMarketingConsent(true);
    expect(hasMarketingConsent()).toBe(true);
    expect(isMetaPixelEnabled()).toBe(true);
  });

  it("does not send events without marketing consent", () => {
    const fbq = vi.fn();
    vi.stubGlobal("window", {
      location: { hostname: "www.staywithmypet.ee" },
      localStorage: localStorageMock,
      fbq,
    });

    pageView();
    track("Lead");
    track("Purchase", { value: 10 });

    expect(fbq).not.toHaveBeenCalled();
  });

  it("sends events when marketing consent is granted", () => {
    writeMarketingConsent(true);
    const fbq = vi.fn();
    vi.stubGlobal("window", {
      location: { hostname: "www.staywithmypet.ee" },
      localStorage: localStorageMock,
      fbq,
    });

    pageView();
    track("CompleteRegistration");
    track("InitiateCheckout");
    track("Purchase");
    track("Lead");

    expect(fbq).toHaveBeenCalledWith("track", "PageView");
    expect(fbq).toHaveBeenCalledWith("track", "CompleteRegistration");
    expect(fbq).toHaveBeenCalledWith("track", "InitiateCheckout");
    expect(fbq).toHaveBeenCalledWith("track", "Purchase");
    expect(fbq).toHaveBeenCalledWith("track", "Lead");
  });

  it("stops sending events after marketing consent is withdrawn", () => {
    writeMarketingConsent(true);
    const fbq = vi.fn();
    vi.stubGlobal("window", {
      location: { hostname: "www.staywithmypet.ee" },
      localStorage: localStorageMock,
      fbq,
    });

    pageView();
    expect(fbq).toHaveBeenCalledTimes(1);

    writeMarketingConsent(false);
    pageView();
    track("Lead");

    expect(fbq).toHaveBeenCalledTimes(1);
  });
});
