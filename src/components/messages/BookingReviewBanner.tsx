"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES_META_TEXT_MUTED_CLASS } from "@/lib/messages-ui";
import { useLanguage } from "@/context/LanguageContext";
import { bookingDetailsHref } from "@/lib/bookings";
import { fetchMyReviewForBooking } from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

type BookingReviewBannerProps = {
  bookingId: string;
  petName: string | null;
};

export function BookingReviewBanner({ bookingId, petName }: BookingReviewBannerProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const m = t.messages;
  const supabase = useMemo(() => createClient(), []);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id || !bookingId) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    void fetchMyReviewForBooking(supabase, user.id, bookingId)
      .then((review) => {
        if (!cancelled) setVisible(!review);
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id, bookingId]);

  if (!visible) return null;

  return (
    <div className="mx-3 my-2 flex max-h-16 shrink-0 items-center gap-2.5 rounded-xl border border-[#E4DED2] bg-[#DDEEDF] px-3 py-2 sm:mx-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[#2B2B2B]">{m.reviewBannerTitle}</p>
        <p className={`truncate text-[0.6875rem] ${MESSAGES_META_TEXT_MUTED_CLASS}`}>
          {m.reviewBannerBody.replace("{name}", petName?.trim() || "your pet")}
        </p>
      </div>
      <Link
        href={bookingDetailsHref(bookingId)}
        className="shrink-0 rounded-full bg-brand-teal px-3 py-1.5 text-[0.6875rem] font-semibold text-white hover:bg-brand-teal-hover"
      >
        {m.reviewBannerCta}
      </Link>
    </div>
  );
}
