"use client";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useLanguage } from "@/context/LanguageContext";
import type { BookingParticipantDetails } from "@/lib/booking-participant-details";
import { formatPhoneForDisplay, telHrefFromPhone } from "@/lib/phone-format";

type BookingContactInformationCardProps = {
  details: BookingParticipantDetails;
};

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
  const { otherParty, showPrivateContact, contact } = details;

  if (!showPrivateContact || !contact) {
    return null;
  }

  const notProvided = copy.notProvided;
  const phoneDisplay =
    formatPhoneForDisplay(contact.phoneE164 ?? contact.phoneDisplay) ??
    contact.phoneDisplay ??
    null;
  const phoneHref = telHrefFromPhone(contact.phoneE164 ?? contact.phoneDisplay);

  const mainSectionTitle =
    otherParty.role === "pet_parent" ? copy.ownerContact : copy.petFriendContact;

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
            value={contact.address ?? notProvided}
          />
        </div>
      </div>
    </section>
  );
}
