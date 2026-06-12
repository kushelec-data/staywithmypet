"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { ProfileRow } from "@/lib/profile-utils";
import { formatActiveMode, formatProfileRoleLabel, resolveActiveMode } from "@/lib/profile-mode";

type ProfileRoleStatusCardProps = {
  profile: ProfileRow;
};

export function ProfileRoleStatusCard({ profile }: ProfileRoleStatusCardProps) {
  const { t } = useLanguage();
  const setup = t.account.profileSetup;
  const accountType = formatProfileRoleLabel(profile.role, t.roles);
  const currentMode = formatActiveMode(
    resolveActiveMode(profile.role, profile.active_mode),
    t.roles,
  );

  return (
    <div className="rounded-2xl border border-brand-teal/20 bg-mint/30 p-4 sm:p-5">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-teal">
        {setup.accountType}
      </p>
      <p className="font-heading mt-2 text-lg font-semibold text-foreground">{accountType}</p>
      <p className="mt-3 text-sm text-muted">
        {setup.currentDashboardMode}{" "}
        <span className="font-medium text-foreground">{currentMode}</span>
      </p>
      {profile.role === "both" ? (
        <p className="mt-2 text-xs text-muted">{setup.switchModeHint}</p>
      ) : profile.role === "pet_parent" ? (
        <p className="mt-2 text-xs text-muted">{setup.switchToFriendHint}</p>
      ) : (
        <p className="mt-2 text-xs text-muted">{setup.switchToParentHint}</p>
      )}
    </div>
  );
}
