"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import { MembershipUpsellToast } from "@/components/membership/MembershipUpsellToast";
import {
  SendRequestButton,
  type ParentToFriendRequestTarget,
} from "@/components/requests/SendRequestButton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import {
  canUseMembershipFeaturesForMode,
  emptyMembershipsByRole,
} from "@/lib/membership";
import type { MonthCursor } from "@/lib/booking-calendar";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";

type PetAvailabilityModalProps = {
  open: boolean;
  /** Display name for calendar heading */
  name: string;
  petId?: string | null;
  petFriendId?: string | null;
  dates: string[];
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Find Care: enable send-request flow from this modal. */
  careRequestTarget?: ParentToFriendRequestTarget | null;
  variant?: "default" | "pastel";
  visibility?: "full" | "public";
  monthCursor?: MonthCursor;
  onMonthCursorChange?: (cursor: MonthCursor) => void;
  /** Member profile: toggle dates in the full calendar (request-select). */
  selectedDates?: string[];
  onSelectedDatesChange?: (dates: string[]) => void;
  /** Pre-selected dates passed into the request modal. */
  initialSelectedDates?: string[];
};

export function PetAvailabilityModal({
  open,
  name,
  petId,
  petFriendId,
  dates,
  onClose,
  title,
  subtitle,
  careRequestTarget = null,
  variant = "default",
  visibility = "public",
  monthCursor,
  onMonthCursorChange,
  selectedDates,
  onSelectedDatesChange,
  initialSelectedDates = [],
}: PetAvailabilityModalProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [requestOpen, setRequestOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const upgradeToastOpenRef = useRef(false);

  const heading =
    title ??
    (careRequestTarget
      ? t.findCare.availabilityTitle.replace("{name}", name)
      : t.bookingCalendar.availabilityCalendarTitle);
  const description =
    subtitle ??
    (careRequestTarget ? t.findCare.availabilitySubtitle : "Dates when care is available.");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathnameWhenOpenedRef = useRef<string | null>(null);
  const wasOpenRef = useRef(false);
  const memberships = profile?.memberships ?? emptyMembershipsByRole();
  const hasParentMembership = canUseMembershipFeaturesForMode(memberships, "pet_parent");
  const selectable = Boolean(onSelectedDatesChange);
  const sortedSelected = useMemo(
    () => normalizeAvailabilityDates(selectedDates ?? []),
    [selectedDates],
  );
  const available = useMemo(() => normalizeAvailabilityDates(dates), [dates]);

  const returnUrl = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      pathnameWhenOpenedRef.current = pathname;
    }
    if (!open) {
      pathnameWhenOpenedRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open, pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.show();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (
      pathnameWhenOpenedRef.current !== null &&
      pathname !== pathnameWhenOpenedRef.current
    ) {
      onClose();
    }
  }, [pathname, open, onClose]);

  const closeUpgradeToast = useCallback(() => {
    upgradeToastOpenRef.current = false;
    setUpgradeOpen(false);
  }, []);

  const openUpgradeToast = useCallback(() => {
    if (upgradeToastOpenRef.current) return;
    upgradeToastOpenRef.current = true;
    setUpgradeOpen(true);
  }, []);

  useEffect(() => {
    if (!upgradeOpen) upgradeToastOpenRef.current = false;
  }, [upgradeOpen]);

  useEffect(() => {
    if (!open) {
      setRequestOpen(false);
      closeUpgradeToast();
    }
  }, [open, closeUpgradeToast]);

  function handleDialogCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  function handleSendCareRequest() {
    if (authLoading || profileLoading || !careRequestTarget) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }
    if (!hasParentMembership) {
      openUpgradeToast();
      return;
    }
    onClose();
    setRequestOpen(true);
  }

  const showCareActions = Boolean(careRequestTarget);
  const calendarViewRole =
    visibility === "full" ? (petId ? "pet-parent" : "pet-friend") : "public";

  if (!mounted || !open) return null;

  const modal = (
    <>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        onClose={onClose}
        onCancel={handleDialogCancel}
        className="fixed inset-0 z-[100] m-0 flex h-[100dvh] w-full max-w-none items-center justify-center border-0 bg-transparent p-0 open:flex [&:not([open])]:hidden"
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className="fixed inset-0 cursor-default bg-foreground/40"
          onClick={onClose}
        />
        <div
          role="document"
          className="relative z-10 mx-auto w-[min(calc(100%-2rem),720px)] max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-cream p-0 text-foreground shadow-xl dark:bg-surface sm:w-[min(calc(100%-3rem),720px)]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">{heading}</h2>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-2 py-1 text-sm text-muted hover:bg-mint/50 hover:text-foreground"
                aria-label={t.bookingCalendar.close}
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              {available.length > 0 || petId || petFriendId ? (
                <BookingCalendar
                  mode={selectable ? "request-select" : "availability-readonly"}
                  visibility={visibility}
                  viewRole={calendarViewRole}
                  availableDates={available}
                  selectedDates={selectable ? sortedSelected : []}
                  onChange={onSelectedDatesChange}
                  petId={petId}
                  petFriendId={petFriendId}
                  showLegend
                  showSelectedChips={selectable}
                  variant={variant}
                  className="rounded-2xl"
                  monthCursor={monthCursor}
                  onMonthCursorChange={onMonthCursorChange}
                />
              ) : (
                <p className="rounded-2xl bg-mint/30 px-4 py-6 text-center text-sm text-muted">
                  {t.findCare.noUpcomingDates}
                </p>
              )}
            </div>

            <div
              className={`mt-6 flex flex-col gap-2 sm:flex-row ${
                showCareActions ? "sm:justify-stretch" : "sm:justify-end"
              }`}
            >
              {showCareActions ? (
                <>
                  {!user ? (
                    <Button
                      type="button"
                      className="w-full sm:flex-1"
                      onClick={handleSendCareRequest}
                      disabled={authLoading || profileLoading}
                    >
                      {t.findCare.logInToSendRequest}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full sm:flex-1"
                      onClick={handleSendCareRequest}
                      disabled={authLoading || profileLoading}
                    >
                      {t.requests.sendCareRequest}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:flex-1"
                    onClick={onClose}
                  >
                    {t.bookingCalendar.close}
                  </Button>
                </>
              ) : (
                <Button type="button" size="sm" onClick={onClose}>
                  {t.bookingCalendar.close}
                </Button>
              )}
            </div>
          </div>
        </div>
      </dialog>

      {careRequestTarget ? (
        <>
          <SendRequestButton
            target={careRequestTarget}
            showTrigger={false}
            requestModalOpen={requestOpen}
            onRequestModalOpenChange={setRequestOpen}
            initialSelectedDates={initialSelectedDates}
          />
          <MembershipUpsellToast
            open={upgradeOpen}
            variant="findCare"
            name={careRequestTarget.label}
            role="pet_parent"
            onDismissModal={onClose}
            onClose={closeUpgradeToast}
          />
        </>
      ) : null}
    </>
  );

  return createPortal(modal, document.body);
}
