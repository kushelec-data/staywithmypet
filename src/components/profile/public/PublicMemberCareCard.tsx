import { PublicProfileChips } from "@/components/public/PublicProfileChips";
import { PublicDetailGroups } from "@/components/public/PublicDetailGroups";
import { carePreferenceDisplayGroups } from "@/lib/profile-details";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicProfileView } from "@/lib/public-profile";
import type { PublicDetailGroup } from "@/lib/public-pet-display";

type PublicMemberCareCardProps = {
  profile: PublicProfileView;
};

export function PublicMemberCareCard({ profile }: PublicMemberCareCardProps) {
  const groups = carePreferenceDisplayGroups(profile.details);
  const chipItems = [
    ...groups.petTypes.slice(0, 3),
    ...groups.experience.slice(0, 2),
    ...groups.careTypes.slice(0, 3),
    ...groups.petSizes.slice(0, 2),
  ].filter(Boolean);

  const detailGroups: PublicDetailGroup[] = [];
  if (groups.petTypes.length) {
    detailGroups.push({ label: "Pet types", items: groups.petTypes });
  }
  if (groups.careTypes.length) {
    detailGroups.push({ label: "Care offered", items: groups.careTypes });
  }
  if (groups.experience.length) {
    detailGroups.push({ label: "Experience", items: groups.experience });
  }

  if (!chipItems.length && !detailGroups.length) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>Care preferences</h2>
      {chipItems.length ? (
        <div className="mt-3">
          <PublicProfileChips chips={chipItems.slice(0, 8)} />
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
