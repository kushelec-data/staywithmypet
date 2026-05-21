"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RequestModal, type RequestFormValues } from "@/components/requests/RequestModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { todayDateInputValue, validateCareRequestForm } from "@/lib/request-validation";
import {
  createCareRequest,
  fetchRequesterPets,
  logRequestSubmitFailure,
  resolveRequesterProfileId,
  type RequestPetOption,
} from "@/lib/requests";
import { formatRequestSubmitErrorForUi } from "@/lib/supabase-errors";
import { createClient } from "@/lib/supabase";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { UpgradeMembershipModal } from "@/components/membership/UpgradeMembershipModal";
import { useProfile } from "@/context/ProfileContext";
import {
  canUseMembershipFeaturesForMode,
  emptyMembershipsByRole,
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
};

export function SendRequestButton({
  target,
  className = "",
  size = "sm",
  variant = "profile",
}: SendRequestButtonProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  const memberships = profile?.memberships ?? emptyMembershipsByRole();
  const needsUpgrade =
    Boolean(user) &&
    !canUseMembershipFeaturesForMode(memberships, senderMode);

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

  async function handleOpen() {
    if (authLoading || blocked) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setError(null);
    setSuccess(false);
    setNoPets(false);

    if (target.kind === "profile") {
      setPetsLoading(true);
      try {
        const owned = await fetchRequesterPets(supabase, user.id);
        if (!owned.length) {
          setNoPets(true);
          return;
        }
        setPets(owned);
      } catch {
        setError(t.requests.saveError);
        return;
      } finally {
        setPetsLoading(false);
      }
    }

    setOpen(true);
  }

  async function handleSubmit(values: RequestFormValues) {
    if (!user) return;

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
      setError(validationError);
      return;
    }

    const allowed = new Set(normalizeAvailabilityDates(target.availabilityDates));
    const invalidDate = normalizeAvailabilityDates(values.selectedDates).find((d) => !allowed.has(d));
    if (invalidDate) {
      setError(t.requests.dateNotAvailable);
      return;
    }

    if (needsUpgrade) {
      setUpgradeOpen(true);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { requestId } = await createCareRequest(supabase, {
        petId,
        petParentId,
        petFriendId,
        senderId,
        receiverId,
        message: values.message,
        careType: values.careType,
        selectedDates: values.selectedDates,
      });
      const { sendRequestReceivedEmailAction } = await import("@/app/actions/email-events");
      void sendRequestReceivedEmailAction(requestId.trim());
      setOpen(false);
      setSuccess(true);
    } catch (err) {
      logRequestSubmitFailure(err);
      if (isMembershipRequiredError(err)) {
        setUpgradeOpen(true);
        setError(null);
      } else {
        setError(formatRequestSubmitErrorForUi(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const modalTitle =
    target.kind === "pet"
      ? t.requests.sendForPet.replace("{name}", target.label)
      : t.requests.sendToFriend.replace("{name}", target.label);

  return (
    <>
      <Button
        type="button"
        variant="soft"
        size={size}
        className={`w-full ${className}`}
        onClick={handleOpen}
        disabled={authLoading || blocked || success || petsLoading}
      >
        {petsLoading ? t.auth.pleaseWait : buttonLabel}
      </Button>

      {noPets ? (
        <p className="mt-2 text-center text-xs text-muted">
          {t.requests.addPetFirst}{" "}
          <Link href="/pets/new" className="font-semibold text-brand-teal hover:text-brand-pink">
            {t.requests.addPetLink}
          </Link>
        </p>
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
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />

      <UpgradeMembershipModal
        open={upgradeOpen}
        role={senderMode === "pet_friend" ? "pet_friend" : "pet_parent"}
        activeMode={senderMode}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
