"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef } from "react";

type CompleteBookingModalProps = {
  open: boolean;
  petName: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function CompleteBookingModal({
  open,
  petName,
  submitting,
  error,
  onClose,
  onConfirm,
}: CompleteBookingModalProps) {
  const { t } = useLanguage();
  const b = t.bookings;
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
        <h2 className="font-heading text-lg font-bold text-foreground">{b.completeConfirmTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {b.completeConfirmBody.replace("{name}", petName)}
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={onClose}>
            {b.completeConfirmCancel}
          </Button>
          <Button type="button" variant="primary" size="sm" disabled={submitting} onClick={onConfirm}>
            {submitting ? b.completing : b.markCompleted}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
