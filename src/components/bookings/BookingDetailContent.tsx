"use client";

import { STATUS_ALERT_ERROR_CLASS } from "@/lib/status-colors";
import Link from "next/link";
import { BookingCompleteAction } from "@/components/bookings/BookingCompleteAction";
import { ConfirmedBookingGuidanceNote } from "@/components/bookings/ConfirmedBookingGuidanceNote";
import { RequestMessagePreview } from "@/components/requests/RequestMessagePreview";
import { BookingReviewBanner } from "@/components/messages/BookingReviewBanner";
import { UserSafetyActions } from "@/components/trust/UserSafetyActions";
import { VetClinicNearbySection } from "@/components/vet/VetClinicNearbySection";
import { useProfile } from "@/context/ProfileContext";
import { BookingReviewsSection } from "@/components/bookings/BookingReviewsSection";
import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_LINK_CLASS } from "@/lib/account-ui";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  bookingStatusBadgeClasses,
  bookingStatusLabel,
  cancelBooking,
  fetchBookingById,
  formatBookingError,
  messagesHrefForBooking,
  type BookingDetail,
} from "@/lib/bookings";
import { formatBookingDatesForRow } from "@/lib/date-format";
import { markBookingNotificationsRead } from "@/lib/notifications";
import { fetchReviewsForBooking, type ReviewDisplay } from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type BookingDetailContentProps = {
  bookingId: string;
};

export function BookingDetailContent({ bookingId }: BookingDetailContentProps) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const b = t.bookings;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [bookingReviews, setBookingReviews] = useState<ReviewDisplay[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const dateLabel = useMemo(
    () =>
      booking
        ? formatBookingDatesForRow(
            {
              requested_dates: booking.requestedDates,
              date_from: booking.startDate,
              date_to: booking.endDate,
            },
            { locale },
          )
        : "",
    [booking, locale],
  );

  const loadReviews = useCallback(async () => {
    if (!booking || booking.displayStatus !== "completed") {
      setBookingReviews([]);
      return;
    }
    setReviewsLoading(true);
    try {
      const rows = await fetchReviewsForBooking(supabase, booking.id);
      setBookingReviews(rows);
    } catch {
      setBookingReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [supabase, booking]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=/dashboard/bookings/${bookingId}`);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchBookingById(supabase, user.id, bookingId)
      .then((data) => {
        if (!cancelled) {
          setBooking(data);
          if (!data) setError(b.notFound);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : b.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router, supabase, bookingId, b.loadError, b.notFound]);

  useEffect(() => {
    if (booking?.displayStatus === "completed") {
      void loadReviews();
    } else {
      setBookingReviews([]);
    }
  }, [booking, loadReviews]);

  useEffect(() => {
    if (!user || !booking) return;
    void markBookingNotificationsRead(supabase, user.id, booking.id, booking.requestId).catch(
      () => {
        /* bell will reconcile on next refresh */
      },
    );
  }, [supabase, user?.id, booking?.id, booking?.requestId]);

  async function handleCancel() {
    if (!booking) return;
    setActing(true);
    setActionError(null);
    try {
      await cancelBooking(supabase, booking.id);
      router.push("/dashboard/bookings?tab=cancelled");
    } catch (err) {
      setActionError(formatBookingError(err));
    } finally {
      setActing(false);
    }
  }

  const canCancel =
    booking?.displayStatus === "upcoming" || booking?.displayStatus === "active";

  const showConfirmedGuidance =
    booking?.displayStatus === "upcoming" || booking?.displayStatus === "active";

  const breadcrumbTitle = booking
    ? b.careForPet.replace("{name}", booking.petName)
    : b.detailTitle;

  const breadcrumbParent = {
    label: b.pageTitle,
    href: booking
      ? `/dashboard/bookings?tab=${booking.displayStatus}`
      : "/dashboard/bookings",
  };

  return (
    <AccountLayout
      title={b.detailTitle}
      description={b.detailDescription}
      hideCompleteProfileBanner
      breadcrumbTitle={breadcrumbTitle}
      breadcrumbParent={breadcrumbParent}
    >
      <p className="mb-4">
        <Link
          href={`/dashboard/bookings?tab=${booking?.displayStatus ?? "upcoming"}`}
          className={`text-sm ${ACCOUNT_LINK_CLASS}`}
        >
          ← {b.backToList}
        </Link>
      </p>

      {loading ? (
        <p className="text-sm text-muted">{b.loading}</p>
      ) : error ? (
        <p className={STATUS_ALERT_ERROR_CLASS} role="alert">
          {error}
        </p>
      ) : booking && user ? (
        <AccountCard className="p-5 sm:p-8">
          {booking.displayStatus === "completed" ? (
            <div className="mb-5">
              <BookingReviewBanner bookingId={booking.id} petName={booking.petName} />
            </div>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                {b.careForPet.replace("{name}", booking.petName)}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {b.bookedOn} {booking.createdAtLabel}
              </p>
            </div>
            <span className={bookingStatusBadgeClasses(booking.displayStatus)}>
              {bookingStatusLabel(booking.displayStatus)}
            </span>
          </div>

          {showConfirmedGuidance ? (
            <ConfirmedBookingGuidanceNote
              className="mt-5"
              messagesHref={messagesHrefForBooking(booking.requestId)}
            />
          ) : null}

          <dl className="mt-6 grid gap-3 border-t border-black/5 pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{b.petLabel}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{booking.petName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{b.parentLabel}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{booking.parentName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{b.friendLabel}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{booking.friendName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{b.careTypeLabel}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{booking.careType ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{b.datesLabel}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-foreground">{dateLabel}</dd>
            </div>
            {booking.displayStatus === "completed" && booking.completedAtLabel ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{b.completedOn}</dt>
                <dd className="mt-1 text-sm font-medium">{booking.completedAtLabel}</dd>
              </div>
            ) : null}
            {booking.displayStatus === "cancelled" && booking.cancelledAtLabel ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{b.cancelledOn}</dt>
                <dd className="mt-1 text-sm font-medium">{booking.cancelledAtLabel}</dd>
              </div>
            ) : null}
          </dl>

          {booking.displayStatus === "cancelled" && booking.cancelledReason ? (
            <div className="mt-4 rounded-xl bg-cream/60 px-4 py-3 ring-1 ring-black/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{b.cancelledReasonLabel}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{booking.cancelledReason}</p>
            </div>
          ) : null}

          {booking.message ? (
            <div className="mt-4">
              <RequestMessagePreview label={b.messageLabel} message={booking.message} />
            </div>
          ) : null}

          <BookingReviewsSection
            booking={booking}
            userId={user.id}
            reviews={bookingReviews}
            loading={reviewsLoading}
            onReviewsChange={() => void loadReviews()}
          />

          {actionError ? (
            <p className={`mt-4 ${STATUS_ALERT_ERROR_CLASS}`} role="alert">
              {actionError}
            </p>
          ) : null}

          <VetClinicNearbySection
            className="mt-6"
            location={profile?.location}
            title="Know where the nearest clinic is"
            description="Know where the nearest clinic is before your booking starts. Save these contacts and verify opening hours in advance."
            limit={2}
          />

          <div className="mt-6 border-t border-black/5 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t.trustSafety.safetySectionTitle}
            </p>
            <UserSafetyActions
              className="mt-2"
              currentUserId={user.id}
              targetUserId={booking.otherPartyId}
              targetUserName={booking.otherPartyName}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-black/5 pt-6 sm:flex-row sm:flex-wrap">
            <Link href={messagesHrefForBooking(booking.requestId)}>
              <Button type="button" variant="primary" size="sm" className="w-full sm:w-auto">
                {b.openChat}
              </Button>
            </Link>
            {booking.displayStatus === "active" ? (
              <BookingCompleteAction
                booking={booking}
                disabled={acting}
                onCompleted={() => router.push("/dashboard/bookings?tab=completed")}
              />
            ) : null}
            {canCancel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={acting}
                className="w-full sm:w-auto"
                onClick={() => void handleCancel()}
              >
                {b.cancelBooking}
              </Button>
            ) : null}
          </div>
        </AccountCard>
      ) : null}
    </AccountLayout>
  );
}
