"use client";

import {
  DashboardInfoCard,
  DASHBOARD_PANEL_SECTION_LABEL,
} from "@/components/dashboard/DashboardInfoCard";
import { DashboardCheckRow } from "@/components/dashboard/DashboardCheckRow";
import { useLanguage } from "@/context/LanguageContext";
import {
  completenessItemStatus,
  type ProfileCompleteness,
  type ProfileCompletenessInput,
} from "@/lib/profile-completeness";
import { trustScoreBarClass, trustScoreTierClass } from "@/lib/trust-score";

type DashboardProfileCompletenessCardProps = {
  profile: ProfileCompletenessInput;
  completeness: ProfileCompleteness;
};

export function DashboardProfileCompletenessCard({
  profile,
  completeness,
}: DashboardProfileCompletenessCardProps) {
  const { t } = useLanguage();
  const pc = t.profileCompleteness;
  const displayPercent = completeness.percent;

  return (
    <DashboardInfoCard
      title={pc.sectionTitle}
      titleStyle="panel"
      className="!bg-swmp-warm-surface/80"
    >
      <div className="rounded-xl bg-surface/90 px-2.5 py-2">
        <p className={DASHBOARD_PANEL_SECTION_LABEL}>{pc.scoreTitle}</p>
        <p
          className={`mt-2 text-2xl font-semibold transition-colors duration-500 ${trustScoreTierClass(displayPercent)}`}
        >
          {displayPercent}%
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5"
          role="progressbar"
          aria-valuenow={displayPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${trustScoreBarClass(displayPercent)}`}
            style={{ width: `${displayPercent}%` }}
          />
        </div>
        <p className="mt-2 text-[0.7rem] text-muted">{pc.scoreHelper}</p>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-muted">
        {completeness.items.map((item) => (
          <DashboardCheckRow
            key={item.id}
            status={completenessItemStatus(item, profile)}
            label={item.label}
            href={item.href}
          />
        ))}
      </ul>
      {completeness.missing.length === 0 ? (
        <p className="mt-2 text-xs text-brand-teal">{pc.profileComplete}</p>
      ) : null}
    </DashboardInfoCard>
  );
}
