"use client";

import { Button } from "@/components/ui/Button";
import { RequestModal, type RequestFormValues } from "@/components/requests/RequestModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import {
  DATE_NOT_AVAILABLE_ERROR,
  PAST_DATE_REQUEST_ERROR,
  todayDateInputValue,
  validateCareRequestForm,
} from "@/lib/request-validation";
import {
  fetchRequesterPets,
  logRequestSubmitFailure,
  resolveRequesterProfileId,
  type RequestPetOption,
} from "@/lib/requests";
import { formatRequestSubmitErrorForUi } from "@/lib/supabase-errors";
import { createClient } from "@/lib/supabase";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CareRequestActionErrorCode } from "@/app/actions/care-requests";
import { MembershipUpgradeModal } from "@/components/membership/MembershipUpgradeModal";
import {
  resolveSendRequestOpenAction,
  shouldSubmitCareRequest,
} from "@/lib/send-request-upgrade-flow";
import { useProfile } from "@/context/ProfileContext";
import {
  emptyMembershipsByRole,
  hasActiveMembershipForRole,
} from "@/lib/membership";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import { isMembershipRequiredError } from "@/lib/membership-access";

/** Pet Friend requests to care for someone's pet. */
export type PetCareRequestTarget = {
  kind: "pet";
  petId: string;
  petOwnerId: string;
  label: string;
  availabilityDates: string[];
};

/** Pet Parent requests a Pet Friend (with one of parent's pets). */
export type ParentToFriendRequestTarget = {
  kind: "profile";
  friendId: string;
  label: string;
  availabilityDates: string[];
};

export type SendRequestTarget = PetCareRequestTarget | ParentToFriendRequestTarget;

type SendRequestButtonProps = {
  target: SendRequestTarget;
  className?: string;
  size?: "sm" | "md";
  variant?: "pet-care" | "profile";
  /** Hide the default trigger; use with controlled request modal. */
  showTrigger?: boolean;
  requestModalOpen?: boolean;
  onRequestModalOpenChange?: (open: boolean) => void;
  /** Pre-selected dates from a public profile availability calendar. */
  initialSelectedDates?: string[];
};

export function SendRequestButton({
  target,
  className = "",
  size = "sm",
  variant = "profile",
  showTrigger = true,
  requestModalOpen,
  onRequestModalOpenChange,
  initialSelectedDates = [],
}: SendRequestButtonProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [openInternal, setOpenInternal] = useState(false);
  const open = requestModalOpen ?? openInternal;
  const setOpen = onRequestModalOpenChange ?? setOpenInternal;
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Synchronous guard against double submits: state updates are async, so a
  // fast double-click can re-enter handleSubmit before the button disables.
  const submitInFlightRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pets, setPets] = useState<RequestPetOption[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [noPets, setNoPets] = useState(false);

  const isOwnPet = target.kind === "pet" && user?.id === target.petOwnerId;
  const isSelfProfile = target.kind === "profile" && user?.id === target.friendId;
  const blocked = isOwnPet || isSelfProfile;

  const senderMode: ProfileActiveMode =
    target.kind === "pet" ? "pet_friend" : "pet_parent";
  const senderRole = senderMode === "pet_friend" ? "pet_friend" : "pet_parent";
  const memberships = profile?.memberships ?? emptyMembershipsByRole();
  const membershipCheckReady = Boolean(user) && !profileLoading && !authLoading;
  const hasSenderMembership =
    membershipCheckReady && hasActiveMembershipForRole(memberships, senderRole);
  const needsUpgrade = membershipCheckReady && !hasSenderMembership;
  const membershipRequiredMessage =
    senderRole === "pet_parent"
      ? t.requests.petParentMembershipRequired
      : t.requests.petFriendMembershipRequired;

  const bookableDates = useMemo(() => {
    const min = todayDateInputValue();
    return normalizeAvailabilityDates(target.availabilityDates).filter((d) => d >= min);
  }, [target.availabilityDates]);

  const returnUrl = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const buttonLabel =
    success
      ? t.requests.requestSent
      : variant === "pet-care"
        ? t.requests.sendCareRequest
        : t.requests.sendRequest;

  const isControlledModal = requestModalOpen !== undefined;

  const openUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
  }, []);

  const loadRequesterPets = useCallback(async () => {
    if (!user || target.kind !== "profile") return [];
    setPetsLoading(true);
    try {
      const owned = await fetchRequesterPets(supabase, user.id);
      setPets(owned);
      setNoPets(owned.length === 0);
      return owned;
    } catch {
      setError(t.requests.saveError);
      setPets([]);
      setNoPets(false);
      return null;
    } finally {
      setPetsLoading(false);
    }
  }, [supabase, target.kind, t.requests.saveError, user]);

  useEffect(() => {
    if (!user || blocked || authLoading || target.kind !== "profile") return;
    void loadRequesterPets();
  }, [user, blocked, authLoading, target.kind, loadRequesterPets]);

  useEffect(() => {
    if (!isControlledModal || !requestModalOpen || !user || blocked || authLoading || profileLoading) {
      return;
    }
    if (needsUpgrade) {
      setOpen(false);
      openUpgradeModal();
      return;
    }
    if (target.kind !== "profile") {
      setOpen(true);
      return;
    }
    if (petsLoading) return;
    if (noPets || pets.length === 0) {
      setOpen(false);
      router.push("/pets/new");
      return;
    }
    setOpen(true);
  }, [
    isControlledModal,
    requestModalOpen,
    user,
    blocked,
    authLoading,
    profileLoading,
    target.kind,
    pets.length,
    noPets,
    petsLoading,
    router,
    setOpen,
    needsUpgrade,
    openUpgradeModal,
  ]);

  function resolveSubmitErrorMessage(code: CareRequestActionErrorCode): string {
    switch (code) {
      case "MEMBERSHIP_REQUIRED":
        return membershipRequiredMessage;
      case "TERMS_REQUIRED":
        return t.termsAcceptance.errors.acceptanceRequired;
      case "TERMS_STORAGE_ERROR":
        return t.termsAcceptance.errors.recordFailed;
      case "TERMS_SCHEMA_MISSING":
        return t.termsAcceptance.errors.schemaMissing;
      case "TERMS_AUTH_ERROR":
        return t.termsAcceptance.errors.sessionInvalid;
      case "INVALID_DATES":
        return t.requests.invalidDates;
      case "DATES_UNAVAILABLE":
        return t.requests.datesAlreadyBooked;
      case "REQUEST_ALREADY_EXISTS":
        return t.requests.duplicateRequest;
      case "REQUEST_PERMISSION_DENIED":
        return t.requests.permissionDenied;
      case "NOT_SIGNED_IN":
        return t.auth.errorGeneric;
      default:
        return t.requests.saveError;
    }
  }

  async function handleOpen() {
    if (authLoading || profileLoading || blocked) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setError(null);
    setSuccess(false);

    const openAction = resolveSendRequestOpenAction({
      blocked,
      userLoggedIn: Boolean(user),
      needsUpgrade,
    });
    if (openAction === "open_upgrade_modal") {
      openUpgradeModal();
      return;
    }

    if (target.kind === "profile") {
      const owned =
        pets.length > 0 && !noPets ? pets : (await loadRequesterPets()) ?? [];
      if (!owned.length) {
        router.push("/pets/new");
        return;
      }
      setOpen(true);
      return;
    }

    setOpen(true);
  }

  async function handleSubmit(values: RequestFormValues) {
    if (!user) return;
    if (submitInFlightRef.current || submitting) return;

    let petParentId: string;
    let petFriendId: string;
    let senderId: string;
    let receiverId: string;
    let petId: string;

    if (target.kind === "pet") {
      // CASE 2: Pet Friend → Pet Parent's pet
      petParentId = target.petOwnerId;
      petFriendId = user.id;
      senderId = user.id;
      receiverId = target.petOwnerId;
      petId = target.petId;
    } else {
      const selectedPetId = values.petId;
      if (!selectedPetId) {
        setError(t.requests.selectPet);
        return;
      }
      // CASE 1: Pet Parent → Pet Friend
      petParentId = user.id;
      petFriendId = target.friendId;
      senderId = user.id;
      receiverId = target.friendId;
      petId = selectedPetId;
    }

    try {
      await resolveRequesterProfileId(supabase);
    } catch (err) {
      logRequestSubmitFailure(err);
      setError(formatRequestSubmitErrorForUi(err));
      return;
    }

    const validationError = validateCareRequestForm({
      careType: values.careType,
      selectedDates: values.selectedDates,
      message: values.message,
      petParentId,
      petFriendId,
    });
    if (validationError) {
      setError(
        validationError === PAST_DATE_REQUEST_ERROR
          ? t.requests.pastDates
          : validationError,
      );
      return;
    }

    const allowed = new Set(normalizeAvailabilityDates(target.availabilityDates));
    const invalidDate = normalizeAvailabilityDates(values.selectedDates).find((d) => !allowed.has(d));
    if (invalidDate) {
      setError(t.requests.dateNotAvailable);
      return;
    }

    if (!shouldSubmitCareRequest(needsUpgrade)) {
      setOpen(false);
      openUpgradeModal();
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const { submitCareRequestAction } = await import("@/app/actions/care-requests");
      const result = await submitCareRequestAction({
        petId,
        petParentId,
        petFriendId,
        receiverId,
        message: values.message,
        careType: values.careType,
        selectedDates: values.selectedDates,
        termsAccepted: values.termsAccepted,
        senderRole,
      });

      if (!result.success) {
        if (result.code === "MEMBERSHIP_REQUIRED") {
          setOpen(false);
          openUpgradeModal();
        }
        setError(
          result.code === "DATES_UNAVAILABLE"
            ? result.blockReason === "pending"
              ? t.requests.datesPending
              : t.requests.datesAlreadyBooked
            : resolveSubmitErrorMessage(result.code),
        );
        return;
      }

      setOpen(false);
      setSuccess(true);
    } catch (err) {
      logRequestSubmitFailure(err, {
        flow: target.kind,
        petId,
        petParentId,
        petFriendId,
        senderId,
        receiverId,
      });
      if (isMembershipRequiredError(err)) {
        setOpen(false);
        openUpgradeModal();
        setError(null);
      } else {
        const msg = formatRequestSubmitErrorForUi(err);
        setError(
          msg === PAST_DATE_REQUEST_ERROR
            ? t.requests.pastDates
            : msg === DATE_NOT_AVAILABLE_ERROR
              ? t.requests.dateNotAvailable
              : msg,
        );
      }
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  const modalTitle =
    target.kind === "pet"
      ? t.requests.sendForPet.replace("{name}", target.label)
      : t.requests.sendToFriend.replace("{name}", target.label);

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="soft"
          size={size}
          className={`w-full ${className}`}
          onClick={handleOpen}
          disabled={authLoading || profileLoading || blocked || success}
        >
          {buttonLabel}
        </Button>
      ) : null}

      {success ? (
        <p className="mt-2 text-center text-xs font-medium text-brand-teal">{t.requests.sentSuccess}</p>
      ) : null}

      {isOwnPet ? (
        <p className="mt-2 text-center text-xs text-muted">{t.requests.cannotRequestOwnPet}</p>
      ) : null}

      {isSelfProfile ? (
        <p className="mt-2 text-center text-xs text-muted">{t.requests.cannotRequestSelf}</p>
      ) : null}

      <RequestModal
        open={open}
        title={modalTitle}
        subtitle={t.requests.formSubtitle}
        submitting={submitting}
        error={error}
        showPetSelector={target.kind === "profile"}
        pets={pets}
        requestPetId={target.kind === "pet" ? target.petId : null}
        availableDates={bookableDates}
        initialSelectedDates={initialSelectedDates}
        membershipBlocked={needsUpgrade}
        membershipMessage={membershipRequiredMessage}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />

      <MembershipUpgradeModal
        open={upgradeModalOpen}
        role={senderRole}
        returnTo={returnUrl}
        onClose={closeUpgradeModal}
      />
    </>
  );
}
