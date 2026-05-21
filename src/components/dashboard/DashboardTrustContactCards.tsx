"use client";

import { DashboardContactCard } from "@/components/dashboard/DashboardContactCard";
import { DashboardTrustCard } from "@/components/dashboard/DashboardTrustCard";
import type { DashboardSnapshot } from "@/lib/dashboard-data";
import type { ProfileRow } from "@/lib/profile-utils";

type DashboardTrustContactCardsProps = {
  profile: ProfileRow;
  emailVerified: boolean;
  snapshot: Pick<DashboardSnapshot, "reviewsCount" | "completedBookingsCount">;
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
