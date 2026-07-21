"use client";

import { PublicProfileChips } from "@/components/public/PublicProfileChips";
import { PublicDetailGroups } from "@/components/public/PublicDetailGroups";
import { useLanguage } from "@/context/LanguageContext";
import { carePreferenceDisplayGroups } from "@/lib/profile-details";
import { translateProfileLabel } from "@/lib/profile-translations";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicProfileView } from "@/lib/public-profile";
import type { PublicDetailGroup } from "@/lib/public-pet-display";
import { useMemo } from "react";

type PublicMemberCareCardProps = {
  profile: PublicProfileView;
};

export function PublicMemberCareCard({ profile }: PublicMemberCareCardProps) {
  const { locale } = useLanguage();
  const pl = (en: string) => translateProfileLabel(en, locale);

  const groups = carePreferenceDisplayGroups(profile.details);
  const petTypeChips = useMemo(
    () => groups.petTypes.filter(Boolean).map((item) => pl(item)),
    [groups.petTypes, locale],
  );

  const detailGroups: PublicDetailGroup[] = useMemo(() => {
    const out: PublicDetailGroup[] = [];
    if (groups.careTypes.length) {
      out.push({
        label: pl("Care offered"),
        items: groups.careTypes.map((item) => pl(item)),
      });
    }
    if (groups.experience.length) {
      out.push({
        label: pl("Experience"),
        items: groups.experience.map((item) => pl(item)),
      });
    }
    if (groups.petSizes.length) {
      out.push({
        label: pl("Preferred pet size"),
        items: groups.petSizes.map((item) => pl(item)),
      });
    }
    return out;
  }, [groups, locale]);

  if (!petTypeChips.length && !detailGroups.length) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{pl("Care preferences")}</h2>
      {petTypeChips.length ? (
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-foreground">{pl("Pet types")}</h3>
          <div className="mt-1.5">
            <PublicProfileChips chips={petTypeChips} />
          </div>
        </div>
      ) : null}
      {detailGroups.length ? (
        <div className="mt-4">
          <PublicDetailGroups groups={detailGroups} />
        </div>
      ) : null}
    </section>
  );
}
