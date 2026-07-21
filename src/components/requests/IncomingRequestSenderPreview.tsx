"use client";

import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import type { Dictionary } from "@/i18n/translations";
import {
  formatIncomingSenderHeadline,
  type RequestSenderPreview,
} from "@/lib/request-sender-preview";

type IncomingRequestSenderPreviewProps = {
  sender: RequestSenderPreview;
  petName: string | null;
  copy: Dictionary["requests"]["incomingSender"];
  reviewsCopy: Pick<Dictionary["reviews"], "reviewSingular" | "reviewPlural">;
  trustStatsBookings: string;
};

export function IncomingRequestSenderPreview({
  sender,
  petName,
  copy,
  reviewsCopy,
  trustStatsBookings,
}: IncomingRequestSenderPreviewProps) {
  const headline = formatIncomingSenderHeadline(
    { withPet: copy.headlineWithPet, generic: copy.headlineGeneric },
    sender.displayName,
    petName,
  );

  const ratingLabel =
    sender.ratingCount > 0
      ? `★ ${sender.ratingAvg.toFixed(1)} · ${sender.ratingCount} ${
          sender.ratingCount === 1 ? reviewsCopy.reviewSingular : reviewsCopy.reviewPlural
        }`
      : null;

  const bookingsLabel =
    sender.completedBookingsCount > 0
      ? trustStatsBookings.replace("{n}", String(sender.completedBookingsCount))
      : null;

  return (
    <section
      className="rounded-xl border border-brand-teal/15 bg-mint/30 px-4 py-4 sm:px-5 sm:py-5"
      aria-labelledby={`incoming-request-sender-${sender.id}`}
    >
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-teal">
        {copy.sectionTitle}
      </p>
      <p
        id={`incoming-request-sender-${sender.id}`}
        className="mt-2 font-heading text-base font-semibold leading-snug text-foreground sm:text-lg"
      >
        {headline}
      </p>

      <div className="mt-4 flex gap-3 sm:gap-4">
        <Link
          href={sender.profileHref}
          className="shrink-0 rounded-full ring-offset-2 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          aria-label={copy.viewSenderProfile.replace("{name}", sender.displayName)}
        >
          <ProfileAvatar
            userId={sender.id}
            displayName={sender.displayName}
            avatarUrl={sender.avatarUrl}
            size="lg"
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-1.5">
          <Link
            href={sender.profileHref}
            className="font-heading text-base font-bold text-foreground hover:text-brand-teal hover:underline"
          >
            {sender.displayName}
          </Link>

          {ratingLabel ? (
            <p className="text-sm font-medium text-brand-teal">{ratingLabel}</p>
          ) : null}

          {bookingsLabel ? <p className="text-sm text-muted">{bookingsLabel}</p> : null}

          {sender.cityLocation ? (
            <p className="flex items-start gap-1.5 text-sm text-muted">
              <span aria-hidden className="mt-0.5 shrink-0">
                📍
              </span>
              <span>{sender.cityLocation}</span>
            </p>
          ) : null}

          {sender.bio ? (
            <blockquote className="border-l-2 border-brand-teal/30 pl-3 text-sm italic leading-relaxed text-foreground/85">
              {sender.bio}
            </blockquote>
          ) : null}
        </div>
      </div>

      <Button href={sender.profileHref} variant="outline" size="sm" className="mt-4 w-full sm:w-auto">
        {copy.viewPublicProfile}
      </Button>
    </section>
  );
}
