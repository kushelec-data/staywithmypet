"use client";

import {
  DashboardInfoCard,
  DASHBOARD_PANEL_SECTION_LABEL,
} from "@/components/dashboard/DashboardInfoCard";
import { DashboardCheckRow } from "@/components/dashboard/DashboardCheckRow";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { useLanguage } from "@/context/LanguageContext";
import type { DashboardSnapshot } from "@/lib/dashboard-data";
import { parseEmergencyContactFromProfile, isProfileVerified } from "@/lib/trust-safety";
import {
  buildTrustBreakdown,
  trustInputFromProfileSnapshot,
  trustScoreBarClass,
  trustScoreTierClass,
  type TrustCheck,
  type TrustCheckId,
} from "@/lib/trust-score";
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
  const emergency = parseEmergencyContactFromProfile(profile);
  const phoneOnFile = Boolean(profile.phone_e164?.trim() || profile.phone?.trim());
  const trustInput = trustInputFromProfileSnapshot({
    emailVerified,
    phoneVerified: profile.phone_verified,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    completedBookingsCount: snapshot.completedBookingsCount,
    reviewsAsRevieweeCount: snapshot.reviewsCount,
    hasEmergencyContact: Boolean(emergency),
  });
  const breakdown = buildTrustBreakdown(trustInput, { phoneOnFile });
  const displayPercent = breakdown.percent;
  const verified = isProfileVerified({
    emailVerified,
    phoneVerified: profile.phone_verified && phoneOnFile,
  });

  return (
    <DashboardInfoCard
      title={ts.formSectionTitle}
      titleStyle="panel"
      className="!bg-swmp-warm-surface/80"
    >
      {verified ? (
        <div className="mb-2">
          <VerifiedBadge />
        </div>
      ) : null}
      <div className="rounded-xl bg-surface/90 px-2.5 py-2">
        <p className={DASHBOARD_PANEL_SECTION_LABEL}>{ts.trustScoreTitle}</p>
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
