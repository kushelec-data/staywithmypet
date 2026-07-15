"use client";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type {
  BookingParticipantDetails,
  RequestParticipantDetails,
} from "@/lib/booking-participant-details";

const ACTION_BUTTON_CLASS = "w-full min-w-0 sm:w-auto";

type ParticipantDetailsData = BookingParticipantDetails | RequestParticipantDetails;

type BookingParticipantSectionProps = {
  details: ParticipantDetailsData;
};

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function BookingParticipantSection({ details }: BookingParticipantSectionProps) {
  const { t } = useLanguage();
  const copy = t.bookings.participants;
  const { otherParty, showPrivateContact, contact, pet } = details;

  const sectionTitle =
    otherParty.role === "pet_friend" ? copy.petFriendDetails : copy.petParentDetails;

  const profileButtonLabel =
    otherParty.role === "pet_friend" ? copy.viewPetFriendProfile : copy.viewPetParentProfile;

  const roleLabel =
    otherParty.role === "pet_friend" ? t.roles.petFriend.label : t.roles.petParent.label;

  const telHref = contact?.phoneE164
    ? `tel:${contact.phoneE164.replace(/\s/g, "")}`
    : contact?.phoneDisplay
      ? `tel:${contact.phoneDisplay.replace(/\s/g, "")}`
      : null;

  return (
    <div className="mt-6 space-y-5 border-t border-black/5 pt-6">
      <section className="min-w-0 rounded-xl bg-cream/40 px-4 py-4 ring-1 ring-black/[0.04] sm:px-5">
        <h3 className="font-heading text-sm font-bold text-foreground sm:text-base">{sectionTitle}</h3>

        <div className="mt-4 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <ProfileAvatar
            userId={otherParty.id}
            displayName={otherParty.displayName}
            avatarUrl={otherParty.avatarUrl}
            size="sm"
            shape="rounded-xl"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">{otherParty.displayName}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">{roleLabel}</p>
            <div className="mt-3">
              <Button
                href={otherParty.profileHref}
                variant="outline"
                size="sm"
                className={ACTION_BUTTON_CLASS}
              >
                {profileButtonLabel}
              </Button>
            </div>
          </div>
        </div>

        {showPrivateContact && contact ? (
          <div className="mt-4 grid min-w-0 gap-4 border-t border-black/5 pt-4 sm:grid-cols-2">
            {contact.phoneDisplay ? (
              <ContactRow label={copy.phoneNumber} value={contact.phoneDisplay} />
            ) : null}
            {contact.email ? <ContactRow label={copy.email} value={contact.email} /> : null}
            {contact.address ? <ContactRow label={copy.fullAddress} value={contact.address} /> : null}
            {contact.emergencyContact ? (
              <div className="min-w-0 sm:col-span-2">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                  {copy.emergencyContact}
                </p>
                <p className="mt-0.5 break-words text-sm font-medium text-foreground">
                  {contact.emergencyContact.name}
                  {contact.emergencyContact.phone !== "—"
                    ? ` · ${contact.emergencyContact.phone}`
                    : ""}
                </p>
              </div>
            ) : null}

            <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 sm:flex-row sm:flex-wrap">
              {telHref ? (
                <Button href={telHref} variant="primary" size="sm" className={ACTION_BUTTON_CLASS}>
                  {copy.call}
                </Button>
              ) : null}
              {contact.email ? (
                <Button
                  href={`mailto:${contact.email}`}
                  variant="outline"
                  size="sm"
                  className={ACTION_BUTTON_CLASS}
                >
                  {copy.email}
                </Button>
              ) : null}
              {contact.mapsUrl ? (
                <Button
                  href={contact.mapsUrl}
                  variant="outline"
                  size="sm"
                  className={ACTION_BUTTON_CLASS}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.openInMaps}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 border-t border-black/5 pt-4 text-sm text-muted">{copy.availableAfterConfirmation}</p>
        )}
      </section>

      {pet ? (
        <section className="min-w-0 rounded-xl bg-cream/40 px-4 py-4 ring-1 ring-black/[0.04] sm:px-5">
          <h3 className="font-heading text-sm font-bold text-foreground sm:text-base">{copy.petDetails}</h3>
          <p className="mt-2 text-sm font-medium text-foreground">{pet.name}</p>

          {showPrivateContact ? (
            <div className="mt-3 grid min-w-0 gap-3">
              {pet.careInstructions ? (
                <ContactRow label={copy.careInstructions} value={pet.careInstructions} />
              ) : null}
              {pet.requiresMedication ? (
                <ContactRow label={copy.medication} value={copy.medicationYes} />
              ) : null}
              {pet.feedingSchedule ? (
                <ContactRow label={copy.feeding} value={pet.feedingSchedule} />
              ) : null}
            </div>
          ) : null}

          <div className="mt-3">
            <Button href={pet.profileHref} variant="outline" size="sm" className={ACTION_BUTTON_CLASS}>
              {t.requests.viewPetProfile}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
