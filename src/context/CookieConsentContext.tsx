"use client";

import {
  acceptAllConsent,
  consentDraftFromRecord,
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
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

const CONSENT_CHANGE_EVENT = "swmp-cookie-consent-change";

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

function subscribeToConsent(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getConsentSnapshot(): CookieConsentRecord | null {
  return readCookieConsent();
}

function persistConsent(record: CookieConsentRecord) {
  writeCookieConsent(record);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const consent = useSyncExternalStore(subscribeToConsent, getConsentSnapshot, () => null);
  const hasDecided = consent !== null;
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferenceDraft, setPreferenceDraftState] = useState<CookieConsentDraft>(() =>
    consentDraftFromRecord(consent),
  );

  const applyConsent = useCallback((record: CookieConsentRecord) => {
    persistConsent(record);
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

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasDecided,
      showBanner: !hasDecided,
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
