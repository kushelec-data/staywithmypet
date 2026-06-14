"use client";

import {
  DashboardDetailRow,
  DashboardInfoCard,
} from "@/components/dashboard/DashboardInfoCard";
import { useLanguage } from "@/context/LanguageContext";
import { formatProfileLanguagesLine } from "@/lib/profile-languages";
import { resolvePrivateFormattedAddress } from "@/lib/profile-location";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import type { ProfileRow } from "@/lib/profile-utils";

type DashboardContactCardProps = {
  profile: ProfileRow;
};

export function DashboardContactCard({ profile }: DashboardContactCardProps) {
  const { t, locale } = useLanguage();
  const dh = t.dashboardHome;
  const acc = t.account;
  const ts = t.trustSafety;
  const emergency = parseEmergencyContactFromProfile(profile);
  const phoneOnFile = Boolean(profile.phone_e164?.trim() || profile.phone?.trim());

  return (
    <DashboardInfoCard title={dh.contact} titleStyle="panel" editHref="/profile/edit" editLabel={acc.edit}>
      <dl className="space-y-2 text-xs">
        <DashboardDetailRow
          label={dh.location}
          value={
            resolvePrivateFormattedAddress(profile) ||
            profile.location?.trim() ||
            acc.notSet
          }
        />
        <DashboardDetailRow
          label={dh.languages}
          value={
            profile.languages?.length
              ? formatProfileLanguagesLine(
                  profile.languages,
                  profile.details?.languages_other,
                  locale,
                )
              : "—"
          }
        />
        <DashboardDetailRow
          label={dh.phone}
          value={
            phoneOnFile
              ? profile.phone_verified
                ? dh.phoneOnFileVerified
                : dh.phoneOnFileNotVerified
              : dh.phoneNotAdded
          }
        />
        <DashboardDetailRow
          label={ts.emergencyContact}
          value={
            emergency ? `${emergency.name} ${dh.emergencyOnFile}` : ts.emergencyContactEmpty
          }
        />
      </dl>
    </DashboardInfoCard>
  );
}
