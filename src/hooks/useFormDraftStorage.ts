"use client";

import {
  FORM_DRAFT_VERSION,
  readFormDraft,
  removeFormDraft,
  stableDraftJson,
  writeFormDraft,
  type FormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useCallback, useEffect, useRef, useState } from "react";

export type FormDraftStatus = "idle" | "saved" | "restored";

export type UseFormDraftStorageOptions<T> = {
  key: string;
  data: T;
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: (data: T) => void;
};

export function useFormDraftStorage<T>({
  key,
  data,
  enabled = true,
  debounceMs = 500,
  onRestore,
}: UseFormDraftStorageOptions<T>) {
  const [draftStatus, setDraftStatus] = useState<FormDraftStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const serverBaselineRef = useRef<{ at: number; json: string } | null>(null);
  const hydratedRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  const clearDraft = useCallback(() => {
    removeFormDraft(key);
    serverBaselineRef.current = {
      at: Date.now(),
      json: stableDraftJson(data),
    };
    setIsDirty(false);
    setDraftStatus("idle");
  }, [data, key]);

  const markHydratedFromServer = useCallback(
    (baseline: T): boolean => {
      if (hydratedRef.current) return false;
      hydratedRef.current = true;

      const at = Date.now();
      const baselineJson = stableDraftJson(baseline);
      serverBaselineRef.current = { at, json: baselineJson };

      const draft = readFormDraft<T>(key);
      if (!draft || draft.version !== FORM_DRAFT_VERSION) {
        return false;
      }

      const draftJson = stableDraftJson(draft.data);
      if (draftJson === baselineJson) {
        removeFormDraft(key);
        return false;
      }

      const draftIsNewerThanBaseline =
        draft.serverBaselineAt == null || draft.savedAt >= draft.serverBaselineAt;

      if (!draftIsNewerThanBaseline) {
        return false;
      }

      onRestoreRef.current?.(draft.data);
      setDraftStatus("restored");
      setIsDirty(true);
      return true;
    },
    [key],
  );

  useEffect(() => {
    if (!enabled || !hydratedRef.current) return;

    const baselineJson = serverBaselineRef.current?.json;
    if (baselineJson === undefined) return;

    const currentJson = stableDraftJson(data);
    const dirty = currentJson !== baselineJson;
    setIsDirty(dirty);

    if (!dirty) {
      removeFormDraft(key);
      setDraftStatus("idle");
      return;
    }

    const timer = window.setTimeout(() => {
      const envelope: FormDraftEnvelope<T> = {
        version: FORM_DRAFT_VERSION,
        savedAt: Date.now(),
        serverBaselineAt: serverBaselineRef.current?.at ?? null,
        data,
      };
      writeFormDraft(key, envelope);
      setDraftStatus("saved");
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [data, debounceMs, enabled, key]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return {
    draftStatus,
    clearDraft,
    markHydratedFromServer,
    isDirty,
  };
}
