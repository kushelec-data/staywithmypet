"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { FormDraftStatus as FormDraftStatusValue } from "@/hooks/useFormDraftStorage";

type FormDraftStatusProps = {
  status: FormDraftStatusValue;
  className?: string;
};

export function FormDraftStatus({ status, className = "" }: FormDraftStatusProps) {
  const { t } = useLanguage();

  if (status === "idle") return null;

  const label = status === "restored" ? t.common.draftRestored : t.common.draftSaved;

  return (
    <p
      className={`text-xs text-muted ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {label}
    </p>
  );
}
