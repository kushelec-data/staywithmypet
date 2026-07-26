"use client";

import { DashboardContactCard } from "@/components/dashboard/DashboardContactCard";
import { DashboardTrustCard } from "@/components/dashboard/DashboardTrustCard";
import type { ProfileRow } from "@/lib/profile-utils";

type DashboardTrustContactCardsProps = {
  profile: ProfileRow;
  emailVerified: boolean;
  snapshot: {
    reviewsCount: number;
    completedBookingsCount: number;
  };
};

/** @deprecated Prefer `DashboardTrustCard` and `DashboardContactCard` separately. */
export function DashboardTrustContactCards({
  profile,
  emailVerified,
  snapshot,
}: DashboardTrustContactCardsProps) {
  return (
    <div className="space-y-3">
      <DashboardTrustCard
        profile={profile}
        emailVerified={emailVerified}
        snapshot={snapshot}
      />
      <DashboardContactCard profile={profile} />
    </div>
  );
}
