"use client";

import { BookingListItem } from "@/components/bookings/BookingListItem";
import { BookingsEmptyState } from "@/components/bookings/BookingsEmptyState";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  cancelBooking,
  fetchBookings,
  formatBookingError,
  formatBookingsLoadError,
  type Booking,
  type BookingTab,
} from "@/lib/bookings";
import { fetchMyReviewDisplaysForBookings, type ReviewDisplay } from "@/lib/reviews";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const TABS: BookingTab[] = ["upcoming", "active", "completed", "cancelled"];

function parseTab(value: string | null): BookingTab {
  if (value && TABS.includes(value as BookingTab)) return value as BookingTab;
  return "upcoming";
}

export function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [myReviews, setMyReviews] = useState<Map<string, ReviewDisplay>>(new Map());

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchBookings(supabase, user.id, tab);
      setBookings(data);
      if (tab === "completed" && data.length) {
        const reviews = await fetchMyReviewDisplaysForBookings(
          supabase,
          user.id,
          data.map((b) => b.id),
        );
        setMyReviews(reviews);
      } else {
        setMyReviews(new Map());
      }
    } catch (err) {
      setBookings([]);
      setMyReviews(new Map());
      setLoadError(formatBookingsLoadError(err));
    } finally {
      setLoading(false);
    }
  }, [supabase, user, tab, t.bookings.loadError]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard/bookings");
      return;
    }
    load();
  }, [authLoading, user, router, load, tab]);

  function setTab(next: BookingTab) {
    router.push(`/dashboard/bookings?tab=${next}`);
  }

  function handleCompleted() {
    setActionSuccess(t.bookings.completedSuccess);
    router.push("/dashboard/bookings?tab=completed");
  }

  async function handleCancel(bookingId: string) {
    if (!user) return;
    setActingId(bookingId);
    setActionError(null);
    setActionSuccess(null);
    const previous = bookings;
    setBookings((list) => list.filter((b) => b.id !== bookingId));
    try {
      await cancelBooking(supabase, bookingId);
      setActionSuccess(t.bookings.cancelledSuccess);
    } catch (err) {
      setBookings(previous);
      setActionError(formatBookingError(err));
    } finally {
      setActingId(null);
    }
  }

  const tabLabels: Record<BookingTab, string> = {
    upcoming: t.bookings.tabUpcoming,
    active: t.bookings.tabActive,
    completed: t.bookings.tabCompleted,
    cancelled: t.bookings.tabCancelled,
  };

  return (
    <DashboardShell
      title={t.bookings.pageTitle}
      description={t.bookings.pageDescription}
      hideCompleteProfileBanner
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === key
                ? "bg-brand-teal text-white"
                : "bg-mint/40 text-brand-teal hover:bg-mint/60"
            }`}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted">{t.bookings.tabHelp}</p>

      {loadError ? (
        <p className="mb-4 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p className="mb-4 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="mb-4 rounded-xl bg-mint/50 px-3 py-2 text-sm text-brand-teal" role="status">
          {actionSuccess}
        </p>
      ) : null}

      <section className="card-elevated rounded-3xl p-4 sm:p-6 lg:p-8">
        {loading ? (
          <p className="px-2 py-8 text-center text-sm text-muted sm:py-12">{t.bookings.loading}</p>
        ) : bookings.length === 0 ? (
          <BookingsEmptyState tab={tab} />
        ) : (
          <ul className="space-y-4 sm:space-y-5">
            {bookings.map((booking) => (
              <BookingListItem
                key={booking.id}
                booking={booking}
                tab={tab}
                acting={actingId === booking.id}
                userId={user!.id}
                myReview={myReviews.get(booking.id) ?? null}
                onReviewSubmitted={() => void load()}
                onCompleted={tab === "active" ? handleCompleted : undefined}
                onCancel={tab === "upcoming" || tab === "active" ? handleCancel : undefined}
              />
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
