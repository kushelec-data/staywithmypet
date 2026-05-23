"use client";

import { RequestBookingCalendar } from "@/components/calendar/RequestBookingCalendar";
import { Button } from "@/components/ui/Button";
import { careTypeOptions } from "@/lib/legacy/search-filters";
import { useLanguage } from "@/context/LanguageContext";
import {
  countMessageCharacters,
  isMessageLengthValid,
  REQUEST_MESSAGE_MAX_CHARS,
} from "@/lib/request-validation";
import type { RequestPetOption } from "@/lib/requests";
import { useEffect, useRef, useState } from "react";

export type RequestFormValues = {
  petId: string | null;
  selectedDates: string[];
  message: string;
  careType: string;
};

type RequestModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  submitting: boolean;
  error: string | null;
  showPetSelector: boolean;
  pets: RequestPetOption[];
  /** Pet being requested (fixed for pet-target flows). */
  requestPetId?: string | null;
  availableDates: string[];
  initialSelectedDates?: string[];
  onClose: () => void;
  onSubmit: (values: RequestFormValues) => void;
};

export function RequestModal({
  open,
  title,
  subtitle,
  submitting,
  error,
  showPetSelector,
  pets,
  requestPetId,
  availableDates,
  initialSelectedDates = [],
  onClose,
  onSubmit,
}: RequestModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPetId, setSelectedPetId] = useState(requestPetId ?? pets[0]?.id ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const calendarPetId = requestPetId ?? (showPetSelector ? selectedPetId : null);
  const charCount = countMessageCharacters(message);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSelectedDates(initialSelectedDates);
    }
    wasOpenRef.current = open;
    if (!open) {
      setMessage("");
      setSelectedDates([]);
      setLocalError(null);
      setSelectedPetId(requestPetId ?? pets[0]?.id ?? "");
    }
  }, [open, requestPetId, pets, initialSelectedDates]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const careType = String(form.get("careType") ?? "");
    const msg = String(form.get("message") ?? "");
    const petId = showPetSelector ? String(form.get("petId") ?? "") : null;

    if (showPetSelector && !petId) {
      setLocalError(t.requests.selectPet);
      return;
    }
    if (!careType.trim()) {
      setLocalError(t.requests.careTypeRequired);
      return;
    }
    if (!selectedDates.length) {
      setLocalError(t.requests.datesRequired);
      return;
    }
    if (!isMessageLengthValid(msg)) {
      if (!msg.trim()) {
        setLocalError(t.requests.messageRequired);
      } else {
        setLocalError(
          t.requests.messageMaxChars.replace("{max}", String(REQUEST_MESSAGE_MAX_CHARS)),
        );
      }
      return;
    }

    setLocalError(null);
    onSubmit({
      petId: petId || null,
      selectedDates,
      message: msg,
      careType,
    });
  }

  const displayError = localError ?? error;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-[min(100%,32rem)] max-h-[90vh] overflow-y-auto rounded-3xl border border-black/10 bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/40"
    >
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-muted hover:bg-mint/50 hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {showPetSelector ? (
            <label className="block text-sm">
              <span className="font-medium text-foreground">{t.requests.selectPetLabel}</span>
              <select
                name="petId"
                required
                value={selectedPetId}
                onChange={(e) => {
                  setSelectedPetId(e.target.value);
                  setSelectedDates([]);
                }}
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-background px-3 py-2.5 text-sm"
              >
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="font-medium text-foreground">{t.searchFilters.careType}</span>
            <select
              name="careType"
              required
              defaultValue={careTypeOptions[0]}
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-background px-3 py-2.5 text-sm"
            >
              {careTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm">
            <p className="font-medium text-foreground">{t.requests.selectDatesLabel}</p>
            <p className="mt-1 text-xs text-muted">{t.requests.selectDatesHint}</p>
            <div className="mt-3">
              {calendarPetId ? (
                <RequestBookingCalendar
                  petId={calendarPetId}
                  availableDates={availableDates}
                  selectedDates={selectedDates}
                  onChange={setSelectedDates}
                  disabled={submitting}
                />
              ) : null}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-foreground">{t.requests.message}</span>
            <textarea
              name="message"
              rows={4}
              maxLength={REQUEST_MESSAGE_MAX_CHARS}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.requests.messagePlaceholder}
              className="mt-1.5 w-full resize-y rounded-xl border border-black/10 bg-background px-3 py-2.5 text-sm"
            />
            <p
              className={`mt-1 text-xs ${
                isMessageLengthValid(message) ? "text-brand-teal" : "text-muted"
              }`}
            >
              {t.requests.messageCharCount
                .replace("{count}", String(charCount))
                .replace("{max}", String(REQUEST_MESSAGE_MAX_CHARS))}
            </p>
          </label>
        </div>

        {displayError ? (
          <p
            className="mt-4 whitespace-pre-wrap rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink"
            role="alert"
          >
            {displayError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            {t.requests.cancel}
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? t.auth.pleaseWait : t.requests.submit}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
