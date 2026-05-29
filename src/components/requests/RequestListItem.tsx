"use client";

import Link from "next/link";
import { ConfirmedBookingGuidanceNote } from "@/components/bookings/ConfirmedBookingGuidanceNote";
import { RequestMessagePreview } from "@/components/requests/RequestMessagePreview";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { CareRequest } from "@/lib/requests";
import {
  normalizeRequestMessage,
  requestStatusBadgeClasses,
  requestStatusLabel,
} from "@/lib/requests";
import { ACCOUNT_CARD_CLASS } from "@/lib/account-ui";

type RequestListItemProps = {
  request: CareRequest;
  direction: "incoming" | "outgoing";
  acting: boolean;
  onAccept?: (id: string) => void;
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
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function RequestListItem({
  request,
  direction,
  acting,
  onAccept,
  onDecline,
  onCancel,
}: RequestListItemProps) {
  const { t } = useLanguage();
  const title = request.petName
    ? t.requests.careForPet.replace("{name}", request.petName)
    : t.requests.requestWith.replace("{name}", request.otherPartyName);

  const messageText = normalizeRequestMessage(request.message);
  const showActions =
    (request.canRespond && direction === "incoming") ||
    (request.canCancel && direction === "outgoing");

  return (
    <li>
      <article className={`${ACCOUNT_CARD_CLASS} overflow-hidden transition-shadow hover:shadow-[0_2px_8px_rgba(46,107,63,0.08)]`}>
        <div className="flex flex-col gap-4 p-5 sm:gap-5 sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-lg font-bold leading-snug text-foreground">{title}</h3>
              <p className="mt-1 text-xs text-muted">
                {t.requests.sentOn} {request.createdAtLabel}
              </p>
            </div>
            <span className={requestStatusBadgeClasses(request.status)}>
              {requestStatusLabel(request.status)}
            </span>
          </header>

          <div className="grid gap-3 border-t border-[#E5E2D8] pt-4 sm:grid-cols-2 sm:gap-x-6">
            <MetaRow icon={<UserIcon />} label={t.requests.from} value={request.senderName} />
            <MetaRow icon={<UserIcon />} label={t.requests.to} value={request.receiverName} />
            <MetaRow icon={<CalendarIcon />} label={t.requests.datesLabel} value={request.dateLabel} />
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
              />
            </div>
          ) : null}

          {request.status === "accepted" ? (
            <div className="border-t border-[#E5E2D8] pt-4">
              <ConfirmedBookingGuidanceNote messagesHref={`/messages?request=${request.id}`} />
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

          {showActions ? (
            <div className="flex flex-col gap-2 border-t border-black/5 pt-4 dark:border-border sm:flex-row sm:flex-wrap sm:justify-end">
              {request.canRespond && direction === "incoming" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={acting}
                    className="w-full sm:w-auto"
                    onClick={() => onAccept?.(request.id)}
                  >
                    {t.requests.accept}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={acting}
                    className="w-full border-red-200/80 text-red-700 hover:border-red-300 hover:bg-red-50 sm:w-auto"
                    onClick={() => onDecline?.(request.id)}
                  >
                    {t.requests.decline}
                  </Button>
                </>
              ) : null}
              {request.canCancel && direction === "outgoing" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={acting}
                  className="w-full sm:w-auto"
                  onClick={() => onCancel?.(request.id)}
                >
                  {t.requests.cancelRequest}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </li>
  );
}
