"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { BookingParticipantDetails } from "@/lib/booking-participant-details";
import { formatPhoneForDisplay, telHrefFromPhone } from "@/lib/phone-format";
import {
  buildPreferredVetFullAddress,
  preferredVetMapsUrl,
  type PreferredVetClinicInfo,
} from "@/lib/preferred-vet-clinic";

type BookingEmergencyVetInformationCardProps = {
  details: BookingParticipantDetails;
};

function FieldRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
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

function VetDetailsBlock({
  clinic,
  copy,
}: {
  clinic: PreferredVetClinicInfo;
  copy: ReturnType<typeof useLanguage>["t"]["bookings"]["emergencyVetInfo"];
}) {
  const fullAddress = buildPreferredVetFullAddress(clinic);
  const mapsUrl = preferredVetMapsUrl(clinic);
  const clinicPhoneDisplay = clinic.phone ? formatPhoneForDisplay(clinic.phone) ?? clinic.phone : null;
  const clinicPhoneHref = clinic.phone ? telHrefFromPhone(clinic.phone) : null;
  const emergencyPhoneDisplay = clinic.emergencyPhone
    ? formatPhoneForDisplay(clinic.emergencyPhone) ?? clinic.emergencyPhone
    : null;
  const emergencyPhoneHref = clinic.emergencyPhone ? telHrefFromPhone(clinic.emergencyPhone) : null;

  return (
    <div className="mt-5 border-t border-black/5 pt-5">
      <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">{copy.vetSectionTitle}</h4>
      <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
        <FieldRow label={copy.clinicName} value={clinic.clinicName} />
        {clinic.veterinarianName ? (
          <FieldRow label={copy.veterinarianName} value={clinic.veterinarianName} />
        ) : null}
        {clinicPhoneDisplay ? (
          <FieldRow label={copy.clinicPhone} value={clinicPhoneDisplay} href={clinicPhoneHref} />
        ) : null}
        {emergencyPhoneDisplay ? (
          <FieldRow
            label={copy.emergencyClinicPhone}
            value={emergencyPhoneDisplay}
            href={emergencyPhoneHref}
          />
        ) : null}
        {clinic.email ? (
          <FieldRow label={copy.clinicEmail} value={clinic.email} href={`mailto:${clinic.email}`} />
        ) : null}
        {fullAddress ? <FieldRow label={copy.clinicAddress} value={fullAddress} /> : null}
        {clinic.openingHours ? (
          <FieldRow label={copy.openingHours} value={clinic.openingHours} />
        ) : null}
        {clinic.notes ? <FieldRow label={copy.ownerNotes} value={clinic.notes} /> : null}
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        {clinicPhoneHref ? (
          <Button href={clinicPhoneHref} variant="primary" size="sm" className="w-full sm:w-auto">
            {copy.callClinic}
          </Button>
        ) : null}
        {emergencyPhoneHref ? (
          <Button href={emergencyPhoneHref} variant="outline" size="sm" className="w-full sm:w-auto">
            {copy.callEmergencyNumber}
          </Button>
        ) : null}
        {mapsUrl ? (
          <Button
            href={mapsUrl}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.openInMaps}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function BookingEmergencyVetInformationCard({
  details,
}: BookingEmergencyVetInformationCardProps) {
  const { t } = useLanguage();
  const copy = t.bookings.emergencyVetInfo;
  const notProvided = copy.notProvided;

  if (!details.showPrivateContact) {
    return null;
  }

  const emergency = details.petParentEmergency;
  const emergencyPhoneDisplay = emergency?.phone
    ? formatPhoneForDisplay(emergency.phone) ?? emergency.phone
    : null;
  const emergencyPhoneHref = emergency?.phone ? telHrefFromPhone(emergency.phone) : null;

  const showVetSection = details.sharePreferredVet !== false;
  const clinic = details.preferredVet;
  const isPetParent = details.viewerRole === "pet_parent";

  const hasEmergency =
    Boolean(emergency?.name?.trim()) ||
    Boolean(emergency?.phone?.trim()) ||
    Boolean(emergency?.relationship?.trim());

  if (!hasEmergency && !showVetSection) {
    return null;
  }

  return (
    <section className="mt-6 min-w-0 rounded-xl bg-cream/40 px-4 py-4 ring-1 ring-black/[0.04] sm:px-5">
      <h3 className="font-heading text-sm font-bold text-foreground sm:text-base">{copy.title}</h3>

      {hasEmergency ? (
        <div className="mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
            {copy.emergencySectionTitle}
          </h4>
          <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
            <FieldRow label={copy.emergencyName} value={emergency?.name?.trim() || notProvided} />
            <FieldRow
              label={copy.emergencyRelationship}
              value={emergency?.relationship?.trim() || notProvided}
            />
            <FieldRow
              label={copy.emergencyPhone}
              value={emergencyPhoneDisplay ?? notProvided}
              href={emergencyPhoneHref}
            />
          </div>
        </div>
      ) : null}

      {showVetSection ? (
        clinic ? (
          <VetDetailsBlock clinic={clinic} copy={copy} />
        ) : isPetParent ? (
          <div className="mt-5 border-t border-black/5 pt-5">
            <p className="text-sm text-muted">{copy.addPreferredVetPrompt}</p>
            <Link
              href="/profile/edit"
              className="mt-2 inline-block text-sm font-semibold text-brand-teal hover:text-brand-pink"
            >
              {copy.addPreferredVetLink}
            </Link>
          </div>
        ) : (
          <div className="mt-5 border-t border-black/5 pt-5">
            <p className="text-sm text-muted">{copy.noPreferredVetProvided}</p>
          </div>
        )
      ) : null}
    </section>
  );
}
