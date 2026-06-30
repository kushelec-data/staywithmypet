"use client";

import {
  acceptAllConsent,
  consentDraftFromRecord,
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_OPEN_PREFERENCES_EVENT,
  DEFAULT_COOKIE_CONSENT_DRAFT,
  notifyCookieConsentChange,
  readCookieConsent,
  rejectNonEssentialConsent,
  saveConsentPreferences,
  writeCookieConsent,
  type CookieConsentDraft,
  type CookieConsentRecord,
} from "@/lib/cookie-consent";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  hasDecided: boolean;
  showBanner: boolean;
  preferencesOpen: boolean;
  preferenceDraft: CookieConsentDraft;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
  setPreferenceDraft: (draft: CookieConsentDraft) => void;
  savePreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

/**
 * Scoped to cookie UI only (inside CookieConsentManager). Never wrap the app shell.
 */
export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferenceDraft, setPreferenceDraftState] = useState<CookieConsentDraft>(
    DEFAULT_COOKIE_CONSENT_DRAFT,
  );

  useEffect(() => {
    setHydrated(true);
    setConsent(readCookieConsent());

    const syncFromStorage = () => {
      setConsent(readCookieConsent());
    };

    const openFromExternal = () => {
      const stored = readCookieConsent();
      setConsent(stored);
      setPreferenceDraftState(consentDraftFromRecord(stored));
      setPreferencesOpen(true);
    };

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, syncFromStorage);
    window.addEventListener(COOKIE_OPEN_PREFERENCES_EVENT, openFromExternal);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, syncFromStorage);
      window.removeEventListener(COOKIE_OPEN_PREFERENCES_EVENT, openFromExternal);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const applyConsent = useCallback((record: CookieConsentRecord) => {
    writeCookieConsent(record);
    notifyCookieConsentChange();
    setConsent(record);
    setPreferenceDraftState(consentDraftFromRecord(record));
    setPreferencesOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    applyConsent(acceptAllConsent());
  }, [applyConsent]);

  const rejectNonEssential = useCallback(() => {
    applyConsent(rejectNonEssentialConsent());
  }, [applyConsent]);

  const openPreferences = useCallback(() => {
    setPreferenceDraftState(consentDraftFromRecord(consent));
    setPreferencesOpen(true);
  }, [consent]);

  const closePreferences = useCallback(() => {
    setPreferencesOpen(false);
  }, []);

  const setPreferenceDraft = useCallback((draft: CookieConsentDraft) => {
    setPreferenceDraftState(draft);
  }, []);

  const savePreferences = useCallback(() => {
    applyConsent(saveConsentPreferences(preferenceDraft));
  }, [applyConsent, preferenceDraft]);

  const hasDecided = consent !== null;

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasDecided,
      showBanner: hydrated && !hasDecided,
      preferencesOpen,
      preferenceDraft,
      acceptAll,
      rejectNonEssential,
      openPreferences,
      closePreferences,
      setPreferenceDraft,
      savePreferences,
    }),
    [
      acceptAll,
      closePreferences,
      consent,
      hasDecided,
      hydrated,
      openPreferences,
      preferenceDraft,
      preferencesOpen,
      rejectNonEssential,
      savePreferences,
      setPreferenceDraft,
    ],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}
