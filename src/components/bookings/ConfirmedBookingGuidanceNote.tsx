"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";

type ConfirmedBookingGuidanceNoteProps = {
  messagesHref: string;
  className?: string;
};

export function ConfirmedBookingGuidanceNote({
  messagesHref,
  className = "",
}: ConfirmedBookingGuidanceNoteProps) {
  const { t } = useLanguage();
  const copy = t.bookings.confirmedGuidance;

  return (
    <aside
      className={`rounded-xl border border-[#E5E2D8] bg-[#DDEEDF]/70 px-4 py-3.5 shadow-sm ring-1 ring-[#2E6B3F]/10 ${className}`}
      aria-label={copy.title}
    >
      <div className="flex gap-3">
        <span className="text-lg leading-none" aria-hidden>
          🎉
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold leading-snug text-[#2E6B3F]">{copy.title}</p>
          <p className="text-sm leading-relaxed text-foreground/85">{copy.body}</p>
          <Link href={messagesHref} className="inline-block">
            <Button type="button" variant="primary" size="sm">
              {copy.openMessages}
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
