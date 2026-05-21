"use client";

import { DashboardInfoCard } from "@/components/dashboard/DashboardInfoCard";
import { VetClinicList } from "@/components/vet/VetClinicList";
import type { ProfileRow } from "@/lib/profile-utils";
import { extractCityFromLocation } from "@/lib/vet-clinics";

type DashboardVetClinicsCardProps = {
  profile: ProfileRow;
};

export function DashboardVetClinicsCard({ profile }: DashboardVetClinicsCardProps) {
  const city = extractCityFromLocation(profile.location);

  return (
    <DashboardInfoCard
      title="Emergency clinics"
      titleStyle="panel"
      className="h-full !p-4 sm:!p-4"
    >
      <p className="mb-2 text-[0.7rem] leading-snug text-muted">
        {city
          ? `Near ${city} — verify before visiting.`
          : "Add location to see nearby clinics."}
      </p>
      <VetClinicList
        city={city}
        location={profile.location}
        limit={2}
        compact
        showViewAll
        viewAllHref="/care/emergency"
        emptyMessage="Set your location to see nearby vet clinics."
        className="space-y-2"
      />
    </DashboardInfoCard>
  );
}
