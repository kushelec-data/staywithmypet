"use client";

import { VetClinicList } from "@/components/vet/VetClinicList";
import { useLanguage } from "@/context/LanguageContext";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { Stethoscope } from "lucide-react";
import Link from "next/link";

type VetClinicNearbySectionProps = {
  location?: string | null;
  city?: string | null;
  title?: string;
  description?: string;
  limit?: number;
  emergencyOnly?: boolean;
  compact?: boolean;
  className?: string;
};

export function VetClinicNearbySection({
  location,
  city,
  title = "Nearby vet clinics in your area",
  description = "Know where to get professional help if something urgent comes up during care.",
  limit = 3,
  emergencyOnly = false,
  compact = true,
  className = "",
}: VetClinicNearbySectionProps) {
  const { t } = useLanguage();
  const defaults = t.petPublicDetail;

  return (
    <section className={`${PUBLIC_CARD} ${className}`}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal"
          aria-hidden
        >
          <Stethoscope className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={PUBLIC_SECTION_TITLE}>{title ?? defaults.emergencyCareNearby}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">
            {description ?? defaults.vetClinicsDescription}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <VetClinicList
          city={city}
          location={location}
          limit={limit}
          emergencyOnly={emergencyOnly}
          compact={compact}
          showViewAll
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        <Link href="/care/emergency" className="font-semibold text-brand-teal hover:text-brand-pink">
          {defaults.emergencyClinicListLink} →
        </Link>
      </p>
    </section>
  );
}
