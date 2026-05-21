"use client";

import { CompleteBookingModal } from "@/components/bookings/CompleteBookingModal";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { canMarkBookingCompleted, completeBooking, formatBookingError, type Booking } from "@/lib/bookings";
import { createClient } from "@/lib/supabase";
import { useMemo, useState } from "react";

type BookingCompleteActionProps = {
  booking: Booking;
  disabled?: boolean;
  onCompleted: () => void;
};

export function BookingCompleteAction({ booking, disabled, onCompleted }: BookingCompleteActionProps) {
  const { t } = useLanguage();
  const b = t.bookings;
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canMarkBookingCompleted(booking)) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await completeBooking(supabase, booking.id);
      const { sendBookingCompletedEmailsAction } = await import("@/app/actions/email-events");
      void sendBookingCompletedEmailsAction(booking.id);
      setOpen(false);
      onCompleted();
    } catch (err) {
      setError(formatBookingError(err));
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
