"use client";

import { CompleteBookingModal } from "@/components/bookings/CompleteBookingModal";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { canMarkBookingCompleted, type Booking } from "@/lib/bookings";
import { completeBookingAction } from "@/app/actions/bookings";
import { useState } from "react";

type BookingCompleteActionProps = {
  booking: Booking;
  disabled?: boolean;
  onCompleted: () => void;
};

export function BookingCompleteAction({ booking, disabled, onCompleted }: BookingCompleteActionProps) {
  const { t } = useLanguage();
  const b = t.bookings;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canMarkBookingCompleted(booking)) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await completeBookingAction(booking.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={disabled || submitting}
        className="w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        {b.markCompleted}
      </Button>
      <CompleteBookingModal
        open={open}
        petName={booking.petName}
        submitting={submitting}
        error={error}
        onClose={() => setOpen(false)}
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}
