"use client";

import { PublicDetailGroups } from "@/components/public/PublicDetailGroups";
import { useLanguage } from "@/context/LanguageContext";
import {
  buildAvailabilitySummary,
  buildLivingSituationSummary,
  buildPetCarePreferencesSummary,
} from "@/lib/profile-summaries";
import type { PublicProfileView } from "@/lib/public-profile";
import type { PublicDetailGroup } from "@/lib/public-pet-display";

type PublicCareSectionProps = {
  profile: PublicProfileView;
};

export function PublicCareSection({ profile }: PublicCareSectionProps) {
  const { t, locale } = useLanguage();
  const ui = t.publicProfileUi;
  const details = profile.details;
  const care = buildPetCarePreferencesSummary(details, { locale });
  const living = buildLivingSituationSummary(details, { publicSafe: true, locale });
  const availability = buildAvailabilitySummary(details, { locale });

  const groups: PublicDetailGroup[] = [];
  if (care.lines.length) groups.push({ label: ui.petCarePreferences, items: care.lines });
  if (living.lines.length) groups.push({ label: ui.livingSituation, items: living.lines });
  if (availability.lines.length) groups.push({ label: ui.availability, items: availability.lines });

  if (!groups.length) return null;

  return (
    <section className="card-elevated rounded-2xl p-4 sm:p-5">
      <header>
        <h2 className="font-heading text-base font-semibold text-foreground">{ui.careAndHome}</h2>
        <p className="mt-0.5 text-xs text-muted">{ui.whatMemberOffers}</p>
      </header>
      <div className="mt-3">
        <PublicDetailGroups groups={groups} />
      </div>
    </section>
  );
}
