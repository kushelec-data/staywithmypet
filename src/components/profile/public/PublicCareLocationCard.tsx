"use client";

import { PublicDetailGroups } from "@/components/public/PublicDetailGroups";
import { useLanguage } from "@/context/LanguageContext";
import { formatCareLocationPreferenceLabel } from "@/lib/care-location-preference";
import { resolvedCareLocationPreference } from "@/lib/profile-details";
import { translateProfileLabel } from "@/lib/profile-translations";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicProfileView } from "@/lib/public-profile";

type PublicCareLocationCardProps = {
  profile: PublicProfileView;
};

export function PublicCareLocationCard({ profile }: PublicCareLocationCardProps) {
  const { locale } = useLanguage();
  const pl = (en: string) => translateProfileLabel(en, locale);
  const label = formatCareLocationPreferenceLabel(resolvedCareLocationPreference(profile.details));
  if (!label) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{pl("Care location")}</h2>
      <div className="mt-3">
        <PublicDetailGroups
          groups={[{ label: pl("Care location"), items: [pl(label)] }]}
        />
      </div>
    </section>
  );
}
