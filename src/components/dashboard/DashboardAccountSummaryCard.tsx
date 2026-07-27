"use client";

import {
  DashboardInfoCard,
  DASHBOARD_PANEL_SECTION_LABEL,
} from "@/components/dashboard/DashboardInfoCard";
import { useLanguage } from "@/context/LanguageContext";
import { dashboardCapabilitiesForActiveMode } from "@/lib/account-nav";
import { resolveActiveMode } from "@/lib/profile-mode";
import type { DashboardSnapshot } from "@/lib/dashboard-data";
import type { ProfileRow } from "@/lib/profile-utils";

const DASHBOARD_DIVIDER = "border-[#E5E2D8]";

type DashboardAccountSummaryCardProps = {
  profile: ProfileRow;
  snapshot: DashboardSnapshot;
};

function statLine(count: number, one: string, many: string): string {
  if (count === 1) return one;
  return many.replace("{count}", String(count));
}

export function DashboardAccountSummaryCard({
  profile,
  snapshot,
}: DashboardAccountSummaryCardProps) {
  const { t } = useLanguage();
  const activeMode = resolveActiveMode(profile.role, profile.active_mode);
  const caps = dashboardCapabilitiesForActiveMode(activeMode);
  const showRequestsQuickAction = caps.showIncomingRequests || caps.showOutgoingRequests;
  const isPetParent = activeMode === "pet_parent";
  const isPetFriend = activeMode === "pet_friend";
  const showPetStats = caps.showMyPets || caps.showSavedStat;
  const showRequestStats = showRequestsQuickAction;

  const requestStatLines = isPetParent
    ? [
        statLine(
          snapshot.careRequestsActive,
          t.requests.parentActiveOne,
          t.requests.parentActiveMany,
        ),
        statLine(
          snapshot.careRequestsAwaitingReply,
          t.requests.parentAwaitingOne,
          t.requests.parentAwaitingMany,
        ),
      ]
    : isPetFriend
      ? [
          statLine(
            snapshot.careRequestsIncoming,
            t.requests.friendIncomingOne,
            t.requests.friendIncomingMany,
          ),
          statLine(
            snapshot.careRequestsAwaitingReply,
            t.requests.friendPendingOne,
            t.requests.friendPendingMany,
          ),
        ]
      : [];

  const dh = t.dashboardHome;

  return (
    <DashboardInfoCard title={dh.accountSummary} titleStyle="panel">
      {showPetStats ? (
        <div>
          <p className={DASHBOARD_PANEL_SECTION_LABEL}>{t.requests.petsSectionLabel}</p>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {caps.showMyPets ? (
              <li>
                {snapshot.petsOwned === 1
                  ? dh.petsCountOne.replace("{count}", String(snapshot.petsOwned))
                  : dh.petsCountMany.replace("{count}", String(snapshot.petsOwned))}
              </li>
            ) : null}
            {caps.showSavedStat ? (
              <li>
                {snapshot.favoritesCount === 1
                  ? dh.savedPetsCountOne.replace("{count}", String(snapshot.favoritesCount))
                  : dh.savedPetsCountMany.replace("{count}", String(snapshot.favoritesCount))}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {showRequestStats && requestStatLines.length > 0 ? (
        <div className={showPetStats ? `mt-3 border-t ${DASHBOARD_DIVIDER} pt-3` : ""}>
          <p className={DASHBOARD_PANEL_SECTION_LABEL}>{t.requests.statsSectionLabel}</p>
          <ul className="mt-2 space-y-1 text-xs text-foreground/85">
            {requestStatLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </DashboardInfoCard>
  );
}
