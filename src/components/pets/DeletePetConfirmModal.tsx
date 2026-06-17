"use client";

import { STATUS_ALERT_ERROR_CLASS } from "@/lib/status-colors";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef } from "react";

type DeletePetConfirmModalProps = {
  open: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeletePetConfirmModal({
  open,
  submitting,
  error,
  onClose,
  onConfirm,
}: DeletePetConfirmModalProps) {
  const { t } = useLanguage();
  const copy = t.account.petsPage;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%,26rem)] max-w-md rounded-3xl border border-black/10 bg-surface p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="px-5 py-5 sm:px-6">
        <h2 className="font-heading text-lg font-bold text-foreground">{copy.deletePetTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{copy.deletePetBody}</p>

        {error ? (
          <p className={`mt-4 ${STATUS_ALERT_ERROR_CLASS}`} role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={onClose}>
            {copy.deletePetCancel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            className="border-brand-pink/30 text-brand-pink hover:border-brand-pink/50 hover:bg-brand-pink/5"
            onClick={onConfirm}
          >
            {submitting ? copy.deletingPet : copy.deletePetConfirm}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
