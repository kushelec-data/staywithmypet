"use client";

import { PublicDetailGroups } from "@/components/public/PublicDetailGroups";
import { useLanguage } from "@/context/LanguageContext";
import { buildLivingSituationSummary } from "@/lib/profile-summaries";
import { translateProfileLabel } from "@/lib/profile-translations";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicProfileView } from "@/lib/public-profile";
import { useMemo } from "react";

type PublicMemberLivingCardProps = {
  profile: PublicProfileView;
};

export function PublicMemberLivingCard({ profile }: PublicMemberLivingCardProps) {
  const { locale } = useLanguage();
  const pl = (en: string) => translateProfileLabel(en, locale);

  const living = useMemo(
    () => buildLivingSituationSummary(profile.details, { publicSafe: true, locale }),
    [profile.details, locale],
  );

  if (!living.lines.length) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>{pl("Living situation")}</h2>
      <div className="mt-3">
        <PublicDetailGroups groups={[{ label: pl("Home"), items: living.lines }]} />
      </div>
    </section>
  );
}
