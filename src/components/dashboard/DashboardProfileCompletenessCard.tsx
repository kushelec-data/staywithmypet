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
import {
  DASHBOARD_CARD_INNER_CLASS,
  DASHBOARD_PROGRESS_FILL_CLASS,
  DASHBOARD_PROGRESS_TRACK_CLASS,
  DASHBOARD_SCORE_TEXT_CLASS,
  dashboardProgressFillClass,
  dashboardScoreTextClass,
} from "@/lib/dashboard-theme";

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
    <DashboardInfoCard title={pc.sectionTitle} titleStyle="panel">
      <div className={`${DASHBOARD_CARD_INNER_CLASS} px-2.5 py-2`}>
        <p className={DASHBOARD_PANEL_SECTION_LABEL}>{pc.scoreTitle}</p>
        <p
          className={`mt-2 text-2xl font-semibold transition-colors duration-500 ${dashboardScoreTextClass(displayPercent)}`}
        >
          {displayPercent}%
        </p>
        <div
          className={`${DASHBOARD_PROGRESS_TRACK_CLASS} mt-2 h-1.5 overflow-hidden`}
          role="progressbar"
          aria-valuenow={displayPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full ${DASHBOARD_PROGRESS_FILL_CLASS} transition-all duration-700 ease-out ${dashboardProgressFillClass(displayPercent)}`}
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
        <p className={`${DASHBOARD_SCORE_TEXT_CLASS} mt-2 text-xs font-medium`}>{pc.profileComplete}</p>
      ) : null}
    </DashboardInfoCard>
  );
}
