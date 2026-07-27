"use client";

import { DashboardInfoCard } from "@/components/dashboard/DashboardInfoCard";
import { VetClinicList } from "@/components/vet/VetClinicList";
import { useLanguage } from "@/context/LanguageContext";
import type { ProfileRow } from "@/lib/profile-utils";
import { extractCityFromLocation } from "@/lib/vet-clinics";

type DashboardVetClinicsCardProps = {
  profile: ProfileRow;
};

export function DashboardVetClinicsCard({ profile }: DashboardVetClinicsCardProps) {
  const { t } = useLanguage();
  const dh = t.dashboardHome;
  const city = extractCityFromLocation(profile.location);

  return (
    <DashboardInfoCard
      title={dh.emergencyClinics}
      titleStyle="panel"
      className="h-full !p-4 sm:!p-4"
    >
      <details>
        <summary className="cursor-pointer list-none text-[0.7rem] leading-snug text-muted marker:content-none [&::-webkit-details-marker]:hidden">
          {city ? dh.clinicsNearCity.replace("{city}", city) : dh.addLocationForClinics}
        </summary>
        <div className="mt-2">
          <VetClinicList
            city={city}
            location={profile.location}
            limit={2}
            compact
            showViewAll
            viewAllHref="/care/emergency"
            emptyMessage={dh.setLocationForClinics}
            className="space-y-2"
          />
        </div>
      </details>
    </DashboardInfoCard>
  );
}
