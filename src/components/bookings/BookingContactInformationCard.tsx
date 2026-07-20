"use client";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useLanguage } from "@/context/LanguageContext";
import {
  type BookingParticipantDetails,
  type PrivateContactInfo,
} from "@/lib/booking-participant-details";
import { googleMapsSearchUrl } from "@/lib/maps-url";
import { formatPhoneForDisplay, telHrefFromPhone } from "@/lib/phone-format";

type BookingContactInformationCardProps = {
  details: BookingParticipantDetails;
};

function fallbackContact(): PrivateContactInfo {
  return {
    phoneE164: null,
    phoneDisplay: null,
    email: null,
    address: null,
    mapsUrl: null,
    emergencyContact: null,
  };
}

function ContactField({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
        {icon} {label}
      </p>
      {href ? (
        <a
          href={href}
          className="mt-0.5 inline-block break-words text-sm font-medium text-primary hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</p>
      )}
    </div>
  );
}

export function BookingContactInformationCard({ details }: BookingContactInformationCardProps) {
  const { t } = useLanguage();
  const copy = t.bookings.contactInfo;
  const { otherParty, showPrivateContact } = details;

  if (!showPrivateContact) {
    return null;
  }

  const contact = details.contact ?? fallbackContact();
  const notProvided = copy.notProvided;
  const phoneDisplay =
    formatPhoneForDisplay(contact.phoneE164 ?? contact.phoneDisplay) ??
    contact.phoneDisplay ??
    null;
  const phoneHref = telHrefFromPhone(contact.phoneE164 ?? contact.phoneDisplay);
  const addressDisplay = contact.address ?? notProvided;
  const addressHref =
    contact.mapsUrl ??
    (contact.address
      ? googleMapsSearchUrl({ formattedAddress: contact.address, address: contact.address })
      : null);

  const mainSectionTitle =
    otherParty.role === "pet_parent" ? copy.ownerContact : copy.petFriendContact;

  const emergency = contact.emergencyContact;

  return (
    <section className="mt-6 min-w-0 rounded-xl bg-cream/40 px-4 py-4 ring-1 ring-black/[0.04] sm:px-5">
      <h3 className="font-heading text-sm font-bold text-foreground sm:text-base">{copy.title}</h3>

      <div className="mt-4 flex min-w-0 items-start gap-3">
        <ProfileAvatar
          userId={otherParty.id}
          displayName={otherParty.displayName}
          avatarUrl={otherParty.avatarUrl}
          size="sm"
          shape="rounded-xl"
          className="shrink-0"
        />
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">{otherParty.displayName}</p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">
            {otherParty.role === "pet_friend" ? t.roles.petFriend.label : t.roles.petParent.label}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-black/5 pt-5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">{mainSectionTitle}</h4>
        <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
          <ContactField
            icon="📞"
            label={copy.phone}
            value={phoneDisplay ?? notProvided}
            href={phoneHref}
          />
          <ContactField
            icon="✉"
            label={copy.email}
            value={contact.email ?? notProvided}
            href={contact.email ? `mailto:${contact.email}` : null}
          />
          <ContactField
            icon="🏠"
            label={copy.address}
            value={addressDisplay}
            href={addressHref}
          />
        </div>
      </div>

      <div className="mt-5 border-t border-black/5 pt-5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
          {copy.emergencyContact}
        </h4>
        <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
          <ContactField
            icon="👤"
            label={copy.emergencyName}
            value={emergency?.name ?? notProvided}
          />
          <ContactField
            icon="🤝"
            label={copy.emergencyRelationship}
            value={emergency?.relationship ?? notProvided}
          />
          <ContactField
            icon="📞"
            label={copy.emergencyPhone}
            value={
              emergency?.phone
                ? formatPhoneForDisplay(emergency.phone) ?? emergency.phone
                : notProvided
            }
            href={emergency?.phone ? telHrefFromPhone(emergency.phone) : null}
          />
        </div>
      </div>
    </section>
  );
}
