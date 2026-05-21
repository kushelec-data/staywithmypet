import { PublicDetailGroups } from "@/components/public/PublicDetailGroups";
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
  const details = profile.details;
  const care = buildPetCarePreferencesSummary(details);
  const living = buildLivingSituationSummary(details, { publicSafe: true });
  const availability = buildAvailabilitySummary(details);

  const groups: PublicDetailGroup[] = [];
  if (care.lines.length) groups.push({ label: "Pet care preferences", items: care.lines });
  if (living.lines.length) groups.push({ label: "Living situation", items: living.lines });
  if (availability.lines.length) groups.push({ label: "Availability", items: availability.lines });

  if (!groups.length) return null;

  return (
    <section className="card-elevated rounded-2xl p-4 sm:p-5">
      <header>
        <h2 className="font-heading text-base font-semibold text-foreground">Care & home</h2>
        <p className="mt-0.5 text-xs text-muted">What this member offers</p>
      </header>
      <div className="mt-3">
        <PublicDetailGroups groups={groups} />
      </div>
    </section>
  );
}
