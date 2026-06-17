export const FORM_DRAFT_VERSION = 1;

export type FormDraftEnvelope<T> = {
  version: number;
  savedAt: number;
  serverBaselineAt: number | null;
  data: T;
};

export function readFormDraft<T>(key: string): FormDraftEnvelope<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormDraftEnvelope<T>;
    if (parsed?.version !== FORM_DRAFT_VERSION || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeFormDraft<T>(key: string, envelope: FormDraftEnvelope<T>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Quota or private mode — ignore draft persistence failures.
  }
}

export function removeFormDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function formDraftStorageKey(parts: string[]): string {
  return ["swmp", "draft", `v${FORM_DRAFT_VERSION}`, ...parts].join(":");
}

export function stableDraftJson(value: unknown): string {
  return JSON.stringify(value);
}
