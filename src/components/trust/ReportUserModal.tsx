"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { REPORT_REASONS, formatTrustSafetyError, submitReport } from "@/lib/trust-safety";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

type ReportUserModalProps = {
  open: boolean;
  reportedUserId: string;
  reportedUserName: string;
  reporterId: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function ReportUserModal({
  open,
  reportedUserId,
  reportedUserName,
  reporterId,
  onClose,
  onSubmitted,
}: ReportUserModalProps) {
  const { t } = useLanguage();
  const ts = t.trustSafety;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setReason(REPORT_REASONS[0]);
      setDetails("");
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitReport(supabase, reporterId, reportedUserId, reason, details);
      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(formatTrustSafetyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%,28rem)] max-w-lg rounded-3xl border border-black/10 bg-surface p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        <header className="border-b border-black/5 px-5 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-bold text-foreground">{ts.reportTitle}</h2>
          <p className="mt-1 text-sm text-muted">
            {ts.reportSubtitle.replace("{name}", reportedUserName)}
          </p>
        </header>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          {success ? (
            <p className="rounded-xl bg-mint/40 px-3 py-2 text-sm text-brand-teal" role="status">
              {ts.reportSuccess}
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="report-reason" className="text-sm font-semibold text-foreground">
                  {ts.reportReasonLabel}
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  className="input-field mt-1"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="report-details" className="text-sm font-semibold text-foreground">
                  {ts.reportDetailsLabel}
                </label>
                <textarea
                  id="report-details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={submitting}
                  placeholder={ts.reportDetailsPlaceholder}
                  className="input-field mt-1 resize-y"
                />
              </div>
            </>
          )}

          {error ? (
            <p className="rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-black/5 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={onClose}>
            {success ? ts.close : ts.cancel}
          </Button>
          {!success ? (
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? ts.submitting : ts.reportSubmit}
            </Button>
          ) : null}
        </footer>
      </form>
    </dialog>
  );
}
