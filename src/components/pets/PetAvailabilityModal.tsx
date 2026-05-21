"use client";

import { BookingCalendar } from "@/components/calendar/BookingCalendar";
import { UpgradeMembershipModal } from "@/components/membership/UpgradeMembershipModal";
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
}: PetAvailabilityModalProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const [requestOpen, setRequestOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const heading =
    title ??
    (careRequestTarget
      ? t.findCare.availabilityTitle.replace("{name}", name)
      : `${name}'s calendar`);
  const description =
    subtitle ??
    (careRequestTarget ? t.findCare.availabilitySubtitle : "Dates when care is available.");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const memberships = profile?.memberships ?? emptyMembershipsByRole();
  const hasParentMembership = canUseMembershipFeaturesForMode(memberships, "pet_parent");

  const returnUrl = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setRequestOpen(false);
      setUpgradeOpen(false);
    }
  }, [open]);

  function handleSendCareRequest() {
    if (authLoading || !careRequestTarget) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }
    if (!hasParentMembership) {
      setUpgradeOpen(true);
      return;
    }
    onClose();
    setRequestOpen(true);
  }

  const showCareActions = Boolean(careRequestTarget);

  return (
    <>
      <dialog
        ref={dialogRef}
        onClose={onClose}
        className="w-[min(100%,28rem)] max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-cream p-0 text-foreground shadow-xl backdrop:bg-foreground/40 dark:bg-surface"
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
            {dates.length > 0 ? (
              <BookingCalendar
                mode="availability-readonly"
                visibility="public"
                viewRole="public"
                availableDates={dates}
                selectedDates={[]}
                petId={petId}
                petFriendId={petFriendId}
                showLegend
                showSelectedChips={false}
                className="rounded-2xl"
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
                    disabled={authLoading}
                  >
                    {t.findCare.logInToSendRequest}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full sm:flex-1"
                    onClick={handleSendCareRequest}
                    disabled={authLoading}
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
      </dialog>

      {careRequestTarget ? (
        <>
          <SendRequestButton
            target={careRequestTarget}
            showTrigger={false}
            requestModalOpen={requestOpen}
            onRequestModalOpenChange={setRequestOpen}
          />
          <UpgradeMembershipModal
            open={upgradeOpen}
            activeMode="pet_parent"
            message={t.findCare.upgradeToRequest}
            primaryLabel={t.findCare.viewMembershipPlans}
            secondaryLabel={t.findCare.maybeLater}
            onClose={() => setUpgradeOpen(false)}
          />
        </>
      ) : null}
    </>
  );
}
