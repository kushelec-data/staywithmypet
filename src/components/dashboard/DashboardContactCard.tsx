"use client";

import {
  DashboardDetailRow,
  DashboardInfoCard,
} from "@/components/dashboard/DashboardInfoCard";
import { useLanguage } from "@/context/LanguageContext";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import type { ProfileRow } from "@/lib/profile-utils";

type DashboardContactCardProps = {
  profile: ProfileRow;
};

export function DashboardContactCard({ profile }: DashboardContactCardProps) {
  const { t } = useLanguage();
  const ts = t.trustSafety;
  const emergency = parseEmergencyContactFromProfile(profile);
  const phoneOnFile = Boolean(profile.phone_e164?.trim() || profile.phone?.trim());

  return (
    <DashboardInfoCard title="Contact" titleStyle="panel" editHref="/profile/edit">
      <dl className="space-y-2 text-xs">
        <DashboardDetailRow
          label="Location"
          value={profile.location?.trim() || "Not set"}
        />
        <DashboardDetailRow
          label="Languages"
          value={profile.languages?.length ? profile.languages.join(", ") : "—"}
        />
        <DashboardDetailRow
          label="Phone"
          value={
            phoneOnFile
              ? profile.phone_verified
                ? "On file · verified"
                : "On file · not verified"
              : "Not added"
          }
        />
        <DashboardDetailRow
          label={ts.emergencyContact}
          value={
            emergency ? `${emergency.name} · on file` : ts.emergencyContactEmpty
          }
        />
      </dl>
    </DashboardInfoCard>
  );
}
