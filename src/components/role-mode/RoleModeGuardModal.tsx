"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { RoleModeSearchPage } from "@/lib/role-mode-search";
import { useEffect, useRef } from "react";

type RoleModeGuardModalProps = {
  open: boolean;
  page: RoleModeSearchPage;
  switching: boolean;
  error: string | null;
  onSwitch: () => void;
  onCancel: () => void;
};

export function RoleModeGuardModal({
  open,
  page,
  switching,
  error,
  onSwitch,
  onCancel,
}: RoleModeGuardModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copy = page === "care" ? t.roleMode.findCareBlocked : t.roleMode.findPetsBlocked;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="w-[min(100%,28rem)] rounded-3xl border border-brand-teal/15 bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/30"
    >
      <div className="rounded-3xl bg-gradient-to-b from-mint/40 to-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
          {t.roleMode.eyebrow}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground">{copy.message}</p>
        {error ? (
          <p className="mt-3 rounded-xl bg-brand-pink-muted/40 px-3 py-2 text-sm text-brand-pink" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" disabled={switching} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" size="sm" disabled={switching} onClick={onSwitch}>
            {switching ? t.roleMode.switching : copy.switch}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
