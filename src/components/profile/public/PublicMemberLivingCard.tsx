import { PublicDetailGroups } from "@/components/public/PublicDetailGroups";
import { buildLivingSituationSummary } from "@/lib/profile-summaries";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicProfileView } from "@/lib/public-profile";

type PublicMemberLivingCardProps = {
  profile: PublicProfileView;
};

export function PublicMemberLivingCard({ profile }: PublicMemberLivingCardProps) {
  const living = buildLivingSituationSummary(profile.details, { publicSafe: true });
  if (!living.lines.length) return null;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>Living situation</h2>
      <div className="mt-3">
        <PublicDetailGroups groups={[{ label: "Home", items: living.lines }]} />
      </div>
    </section>
  );
}
