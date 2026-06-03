"use client";

import {
  DashboardInfoCard,
  DASHBOARD_PANEL_SECTION_LABEL,
} from "@/components/dashboard/DashboardInfoCard";
import { DashboardCheckRow } from "@/components/dashboard/DashboardCheckRow";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { useLanguage } from "@/context/LanguageContext";
import type { DashboardSnapshot } from "@/lib/dashboard-data";
import { isProfileVerified } from "@/lib/trust-safety";
import {
  calculateTrustScore,
  type TrustCheck,
  type TrustCheckId,
} from "@/lib/trust-score";
import {
  DASHBOARD_CARD_INNER_CLASS,
  DASHBOARD_PROGRESS_FILL_CLASS,
  DASHBOARD_PROGRESS_TRACK_CLASS,
  dashboardProgressFillClass,
  dashboardScoreTextClass,
} from "@/lib/dashboard-theme";
import type { ProfileRow } from "@/lib/profile-utils";

type DashboardTrustCardProps = {
  profile: ProfileRow;
  emailVerified: boolean;
  snapshot: Pick<DashboardSnapshot, "reviewsCount" | "completedBookingsCount">;
};

export function DashboardTrustCard({
  profile,
  emailVerified,
  snapshot,
}: DashboardTrustCardProps) {
  const { t } = useLanguage();
  const ts = t.trustSafety;
  const phoneOnFile = Boolean(profile.phone_e164?.trim() || profile.phone?.trim());
  const breakdown = calculateTrustScore(
    profile,
    {
      emailVerified,
      completedBookingsCount: snapshot.completedBookingsCount,
      reviewsAsRevieweeCount: snapshot.reviewsCount,
    },
    { phoneOnFile },
  );
  const displayPercent = breakdown.percent;
  const verified = isProfileVerified({
    emailVerified,
    phoneVerified: profile.phone_verified && phoneOnFile,
  });

  return (
    <DashboardInfoCard title={ts.formSectionTitle} titleStyle="panel">
      {verified ? (
        <div className="mb-2">
          <VerifiedBadge tone="dashboard" />
        </div>
      ) : null}
      <div className={`${DASHBOARD_CARD_INNER_CLASS} px-2.5 py-2`}>
        <p className={DASHBOARD_PANEL_SECTION_LABEL}>{ts.trustScoreTitle}</p>
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
        <p className="mt-2 text-[0.7rem] text-muted">{ts.trustScoreHelper}</p>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-muted">
        {breakdown.checks.map((check) => (
          <DashboardCheckRow
            key={check.id}
            status={check.status}
            label={checklistLabel(check, ts)}
            hint={checklistHint(check, ts)}
          />
        ))}
      </ul>
    </DashboardInfoCard>
  );
}

type TrustSafetyStrings = {
  trustChecklistEmail: string;
  trustChecklistPhone: string;
  trustChecklistPhonePending: string;
  trustChecklistPhonePendingHint: string;
  trustChecklistPhoto: string;
  trustChecklistBio: string;
  trustChecklistEmergency: string;
  trustChecklistReviews: string;
  trustChecklistBookings: string;
};

function checklistLabel(check: TrustCheck, ts: TrustSafetyStrings): string {
  if (check.id === "phone" && check.status === "pending") {
    return ts.trustChecklistPhonePending;
  }
  const labels: Record<TrustCheckId, string> = {
    email: ts.trustChecklistEmail,
    phone: ts.trustChecklistPhone,
    photo: ts.trustChecklistPhoto,
    bio: ts.trustChecklistBio,
    emergency: ts.trustChecklistEmergency,
    reviews: ts.trustChecklistReviews,
    bookings: ts.trustChecklistBookings,
  };
  return labels[check.id];
}

function checklistHint(check: TrustCheck, ts: TrustSafetyStrings): string | undefined {
  if (check.id === "phone" && check.status === "pending") {
    return ts.trustChecklistPhonePendingHint;
  }
  return undefined;
}
