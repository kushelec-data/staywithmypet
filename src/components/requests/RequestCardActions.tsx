"use client";

import { TermsAcceptanceCheckbox } from "@/components/legal/TermsAcceptanceCheckbox";
import { TermsReviewBanner } from "@/components/legal/TermsReviewBanner";
import { Button } from "@/components/ui/Button";
import type { Dictionary } from "@/i18n/translations";
import type { MembershipRole } from "@/lib/membership";
import type { CareRequest } from "@/lib/requests";

const ACTION_BUTTON_CLASS = "w-full min-w-0 sm:w-auto";

type RequestCardActionsProps = {
  request: CareRequest;
  direction: "incoming" | "outgoing";
  copy: Dictionary["requests"];
  acting: boolean;
  showRespondToMessage: boolean;
  showAcceptTerms: boolean;
  termsAlreadyAccepted: boolean;
  termsAccepted: boolean;
  termsCheckLoading: boolean;
  canAccept: boolean;
  receiverRole: MembershipRole | null;
  onTermsAcceptedChange: (accepted: boolean) => void;
  onAccept?: (id: string, termsAccepted: boolean, receiverRole: MembershipRole) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
};

/** Role-specific label for the other participant's public profile link. */
export function otherParticipantProfileLabel(
  participantId: string,
  request: Pick<CareRequest, "petFriendId" | "petParentId">,
  copy: Dictionary["requests"],
): string {
  if (participantId === request.petFriendId) return copy.viewPetFriendProfile;
  if (participantId === request.petParentId) return copy.viewPetParentProfile;
  return copy.viewProfile;
}

/** Incoming → sender; outgoing → receiver (maps to otherPartyProfileHref). */
export function otherParticipantId(
  request: Pick<CareRequest, "senderId" | "receiverId">,
  direction: "incoming" | "outgoing",
): string | null {
  const id = direction === "incoming" ? request.senderId : request.receiverId;
  return id?.trim() ? id : null;
}

export function RequestCardActions({
  request,
  direction,
  copy,
  acting,
  showRespondToMessage,
  showAcceptTerms,
  termsAlreadyAccepted,
  termsAccepted,
  termsCheckLoading,
  canAccept,
  receiverRole,
  onTermsAcceptedChange,
  onAccept,
  onDecline,
  onCancel,
}: RequestCardActionsProps) {
  const participantId = otherParticipantId(request, direction);
  const participantHref = request.otherPartyProfileHref;
  const participantLabel =
    participantId && participantHref
      ? otherParticipantProfileLabel(participantId, request, copy)
      : null;

  const showIncomingRespond = request.canRespond && direction === "incoming";
  const showOutgoingCancel = request.canCancel && direction === "outgoing";

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 border-t border-black/5 pt-4 dark:border-border sm:flex-row sm:flex-wrap sm:justify-end">
      {showAcceptTerms && !termsAlreadyAccepted ? (
        <div className="w-full min-w-0 space-y-3 sm:basis-full">
          <TermsReviewBanner />
          <TermsAcceptanceCheckbox
            variant="booking"
            id={`accept-terms-${request.id}`}
            checked={termsAccepted}
            onCheckedChange={onTermsAcceptedChange}
            disabled={acting || termsCheckLoading}
          />
        </div>
      ) : null}

      {participantHref && participantLabel ? (
        <Button href={participantHref} variant="outline" size="sm" className={ACTION_BUTTON_CLASS}>
          {participantLabel}
        </Button>
      ) : null}

      {request.petProfileHref ? (
        <Button href={request.petProfileHref} variant="outline" size="sm" className={ACTION_BUTTON_CLASS}>
          {copy.viewPetProfile}
        </Button>
      ) : null}

      {showRespondToMessage ? (
        <Button href={request.messagesHref} variant="outline" size="sm" className={ACTION_BUTTON_CLASS}>
          {copy.respondToMessage}
        </Button>
      ) : null}

      {showIncomingRespond ? (
        <>
          <Button
            type="button"
            size="sm"
            disabled={acting || !canAccept || !receiverRole}
            className={ACTION_BUTTON_CLASS}
            onClick={() =>
              receiverRole &&
              onAccept?.(request.id, termsAccepted || termsAlreadyAccepted, receiverRole)
            }
          >
            {copy.accept}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={acting}
            className={`${ACTION_BUTTON_CLASS} border-red-200/80 text-red-700 hover:border-red-300 hover:bg-red-50`}
            onClick={() => onDecline?.(request.id)}
          >
            {copy.decline}
          </Button>
        </>
      ) : null}

      {showOutgoingCancel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={acting}
          className={ACTION_BUTTON_CLASS}
          onClick={() => onCancel?.(request.id)}
        >
          {copy.cancelRequest}
        </Button>
      ) : null}
    </div>
  );
}
