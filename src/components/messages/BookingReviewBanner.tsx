"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { bookingDetailsHref } from "@/lib/bookings";

type BookingReviewBannerProps = {
  bookingId: string;
  petName: string | null;
};

export function BookingReviewBanner({ bookingId, petName }: BookingReviewBannerProps) {
  const { t } = useLanguage();
  const m = t.messages;

  return (
    <div className="mx-3 my-2 flex max-h-16 shrink-0 items-center gap-2.5 rounded-xl bg-mint/50 px-3 py-2 dark:bg-mint/20 sm:mx-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{m.reviewBannerTitle}</p>
        <p className="truncate text-[0.6875rem] text-[#4b4b4b] dark:text-muted">
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
