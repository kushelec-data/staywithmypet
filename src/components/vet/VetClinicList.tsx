"use client";

import { VetClinicCard } from "@/components/vet/VetClinicCard";
import { useLanguage } from "@/context/LanguageContext";
import { VET_CLINICS, type VetClinic } from "@/data/vet-clinics";
import { getClinicsByCity, getClinicsForLocation } from "@/lib/vet-clinics";
import Link from "next/link";

type VetClinicListProps = {
  city?: string | null;
  location?: string | null;
  limit?: number;
  emergencyOnly?: boolean;
  compact?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
  emptyMessage?: string;
  className?: string;
};

function resolveClinics(props: VetClinicListProps): VetClinic[] {
  const { city, location, limit, emergencyOnly } = props;
  let list: VetClinic[] = [];
  if (city?.trim()) list = getClinicsByCity(city, { emergencyOnly });
  else if (location?.trim()) list = getClinicsForLocation(location, { emergencyOnly });
  if (list.length === 0 && !city?.trim() && !location?.trim()) {
    list = emergencyOnly ? VET_CLINICS.filter((c) => c.emergency) : [...VET_CLINICS];
  }
  if (limit != null) list = list.slice(0, limit);
  return list;
}

export function VetClinicList({
  city,
  location,
  limit,
  emergencyOnly,
  compact = false,
  showViewAll = false,
  viewAllHref = "/care/emergency",
  emptyMessage = "No clinics found for this area. See the full Estonia list.",
  className = "",
}: VetClinicListProps) {
  const { t } = useLanguage();
  const viewAllLabel = t.petPublicDetail.viewAllVetClinics;
  const clinics = resolveClinics({ city, location, limit, emergencyOnly });

  if (clinics.length === 0) {
    return (
      <p className={`text-sm text-muted ${className}`}>
        {emptyMessage}{" "}
        <Link href={viewAllHref} className="font-semibold text-brand-teal hover:text-brand-pink">
          {viewAllLabel}
        </Link>
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {clinics.map((clinic) => (
        <VetClinicCard key={`${clinic.clinic_name}-${clinic.address}`} clinic={clinic} compact={compact} />
      ))}
      {showViewAll ? (
        <p className="text-center text-sm">
          <Link href={viewAllHref} className="font-semibold text-brand-teal hover:text-brand-pink">
            {viewAllLabel} →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
