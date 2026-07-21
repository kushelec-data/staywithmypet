"use client";

import Link from "next/link";
import { ConfirmedBookingGuidanceNote } from "@/components/bookings/ConfirmedBookingGuidanceNote";
import { BookingTermsNotice } from "@/components/legal/BookingTermsNotice";
import { RequestCardActions } from "@/components/requests/RequestCardActions";
import { RequestMessagePreview } from "@/components/requests/RequestMessagePreview";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { bookingTermsContextForRole } from "@/lib/terms-acceptance";
import {
  buildIncomingRequestUpsellCopy,
  receiverNeedsMembershipToAccept,
} from "@/lib/incoming-request-membership";
import type { MembershipRole } from "@/lib/membership";
import { emptyMembershipsByRole } from "@/lib/membership";
import { formatBookingDatesForRow } from "@/lib/date-format";
import type { CareRequest } from "@/lib/requests";
import {
  getRequestDisplayStatus,
  localizeRequestMessage,
  requestStatusBadgeClasses,
  requestStatusLabel,
} from "@/lib/requests";
import { ACCOUNT_CARD_CLASS, ACCOUNT_LIST_ITEM_TITLE } from "@/lib/account-ui";
import { useEffect, useState } from "react";

type RequestListItemProps = {
  request: CareRequest;
  direction: "incoming" | "outgoing";
  currentUserId?: string;
  acting: boolean;
  onAccept?: (id: string, termsAccepted: boolean, receiverRole: MembershipRole) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
};

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand-teal/80" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function PetIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand-teal/80" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5.5 14.5c1.2-2 3.3-3 6.5-3s5.3 1 6.5 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 18c1.5-1 3.5-1.5 8-1.5s6.5.5 8 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 19c1.5-2.5 4-4 7-4s5.5 1.5 7 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function RequestListItem({
  request,
  direction,
  currentUserId,
  acting,
  onAccept,
  onDecline,
  onCancel,
}: RequestListItemProps) {
  const { t, locale } = useLanguage();
  const { profile, loading: profileLoading } = useProfile();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAlreadyAccepted, setTermsAlreadyAccepted] = useState(false);
  const [termsCheckLoading, setTermsCheckLoading] = useState(false);

  const receiverRole: MembershipRole | null =
    currentUserId === request.petParentId
      ? "pet_parent"
      : currentUserId === request.petFriendId
        ? "pet_friend"
        : null;

  const showAcceptTerms =
    request.canRespond &&
    direction === "incoming" &&
    request.status === "pending" &&
    receiverRole !== null;

  useEffect(() => {
    if (!showAcceptTerms || !receiverRole) {
      setTermsAlreadyAccepted(false);
      return;
    }

    let cancelled = false;
    setTermsCheckLoading(true);
    (async () => {
      try {
        const { hasBookingTermsForRequestAction } = await import("@/app/actions/terms-acceptance");
        const accepted = await hasBookingTermsForRequestAction(
          request.id,
          bookingTermsContextForRole(receiverRole),
        );
        if (!cancelled) {
          setTermsAlreadyAccepted(accepted);
          if (accepted) setTermsAccepted(true);
        }
      } catch {
        if (!cancelled) setTermsAlreadyAccepted(false);
      } finally {
        if (!cancelled) setTermsCheckLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showAcceptTerms, receiverRole, request.id]);

  const canAccept =
    termsAlreadyAccepted || (termsAccepted && !termsCheckLoading);

  const memberships = profile?.memberships ?? emptyMembershipsByRole();
  const needsMembershipToAccept =
    showAcceptTerms &&
    !profileLoading &&
    receiverNeedsMembershipToAccept(memberships, receiverRole);
  const membershipUpsell =
    needsMembershipToAccept && receiverRole
      ? buildIncomingRequestUpsellCopy(t.requests.incomingMembershipUpsell, receiverRole, {
          petName: request.petName,
          senderName: request.senderName,
        })
      : null;

  const dateLabel = formatBookingDatesForRow(
    {
      requested_dates: request.requestedDates,
      date_from: request.dateFrom,
      date_to: request.dateTo,
    },
    { locale },
  );
  const petTitle =
    request.petName && request.petSpeciesLabel
      ? `${request.petName} · ${request.petSpeciesLabel}`
      : request.petName;
  const title = petTitle
    ? t.requests.careForPet.replace("{name}", petTitle)
    : t.requests.requestWith.replace("{name}", request.otherPartyName);

  const messageText = localizeRequestMessage(request.message, t.requests);
  const displayStatus = getRequestDisplayStatus(request);
  const showRespondToMessage = request.canOpenMessages;
  const hasProfileActions = Boolean(request.petProfileHref || request.otherPartyProfileHref);
  const showRequestActions =
    hasProfileActions ||
    (request.canRespond && direction === "incoming") ||
    (request.canCancel && direction === "outgoing") ||
    showRespondToMessage ||
    showAcceptTerms;

  return (
    <li>
      <article className={`${ACCOUNT_CARD_CLASS} min-w-0 transition-shadow hover:shadow-[0_2px_8px_rgba(46,107,63,0.08)]`}>
        <div className="flex min-w-0 w-full flex-col gap-4 p-5 sm:gap-5 sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className={ACCOUNT_LIST_ITEM_TITLE}>{title}</h3>
              <p className="mt-1 text-xs text-muted">
                {t.requests.sentOn} {request.createdAtLabel}
              </p>
            </div>
            <span className={requestStatusBadgeClasses(displayStatus)}>
              {requestStatusLabel(displayStatus, t.requests)}
            </span>
          </header>

          <div className="grid gap-3 border-t border-[#E5E2D8] pt-4 sm:grid-cols-2 sm:gap-x-6">
            <MetaRow icon={<UserIcon />} label={t.requests.from} value={request.senderName} />
            <MetaRow icon={<UserIcon />} label={t.requests.to} value={request.receiverName} />
            <MetaRow icon={<CalendarIcon />} label={t.requests.datesLabel} value={dateLabel} />
            {request.careType ? (
              <MetaRow icon={<PetIcon />} label={t.requests.careTypeLabel} value={request.careType} />
            ) : null}
          </div>

          {messageText ? (
            <div className="border-t border-[#E5E2D8] pt-4">
              <RequestMessagePreview
                className="max-w-2xl"
                label={t.requests.message}
                message={messageText}
                href={showRespondToMessage ? request.messagesHref : null}
              />
            </div>
          ) : null}

          {request.status === "accepted" ? (
            <div className="border-t border-[#E5E2D8] pt-4 space-y-3">
              <ConfirmedBookingGuidanceNote messagesHref={`/messages?request=${request.id}`} />
              <BookingTermsNotice />
            </div>
          ) : null}

          {request.status === "completed" ? (
            <div className="border-t border-[#E5E2D8] pt-4">
              <Link
                href={`/messages?request=${request.id}`}
                className="inline-flex text-sm font-semibold text-brand-teal hover:underline"
              >
                {t.requests.openMessages}
              </Link>
            </div>
          ) : null}

          {showRequestActions ? (
            <RequestCardActions
              request={request}
              direction={direction}
              copy={t.requests}
              acting={acting}
              showRespondToMessage={showRespondToMessage}
              showAcceptTerms={showAcceptTerms}
              termsAlreadyAccepted={termsAlreadyAccepted}
              termsAccepted={termsAccepted}
              termsCheckLoading={termsCheckLoading}
              canAccept={canAccept}
              receiverRole={receiverRole}
              needsMembershipToAccept={needsMembershipToAccept}
              membershipUpsell={membershipUpsell}
              onTermsAcceptedChange={setTermsAccepted}
              onAccept={onAccept}
              onDecline={onDecline}
              onCancel={onCancel}
            />
          ) : null}
        </div>
      </article>
    </li>
  );
}
