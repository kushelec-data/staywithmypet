export const COOKIE_CONSENT_STORAGE_KEY = "staywithmypet_cookie_consent";

export const COOKIE_CONSENT_CHANGE_EVENT = "swmp-cookie-consent-change";

export const COOKIE_OPEN_PREFERENCES_EVENT = "swmp-open-cookie-preferences";

export type CookieConsentCategories = {
  /** Always true — auth, security, language, and other essential cookies. */
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsentRecord = CookieConsentCategories & {
  decidedAt: string;
};

export type CookieConsentDraft = {
  analytics: boolean;
  marketing: boolean;
};

export const DEFAULT_COOKIE_CONSENT_DRAFT: CookieConsentDraft = {
  analytics: false,
  marketing: false,
};

export function acceptAllConsent(): CookieConsentRecord {
  return {
    necessary: true,
    analytics: true,
    marketing: true,
    decidedAt: new Date().toISOString(),
  };
}

export function rejectNonEssentialConsent(): CookieConsentRecord {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    decidedAt: new Date().toISOString(),
  };
}

export function saveConsentPreferences(draft: CookieConsentDraft): CookieConsentRecord {
  return {
    necessary: true,
    analytics: draft.analytics,
    marketing: draft.marketing,
    decidedAt: new Date().toISOString(),
  };
}

/** Read stored consent. Call only from useEffect or event handlers (browser APIs). */
export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Persist consent. Call only from useEffect or event handlers (browser APIs). */
export function writeCookieConsent(record: CookieConsentRecord): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
}

export function notifyCookieConsentChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
}

export function requestOpenCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_OPEN_PREFERENCES_EVENT));
}

export function consentDraftFromRecord(record: CookieConsentRecord | null): CookieConsentDraft {
  if (!record) return { ...DEFAULT_COOKIE_CONSENT_DRAFT };
  return {
    analytics: record.analytics,
    marketing: record.marketing,
  };
}
