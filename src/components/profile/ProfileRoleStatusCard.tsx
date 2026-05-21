"use client";

import type { ProfileRow } from "@/lib/profile-utils";
import { formatActiveMode, formatProfileRoleLabel, resolveActiveMode } from "@/lib/profile-mode";

type ProfileRoleStatusCardProps = {
  profile: ProfileRow;
};

export function ProfileRoleStatusCard({ profile }: ProfileRoleStatusCardProps) {
  const accountType = formatProfileRoleLabel(profile.role);
  const currentMode = formatActiveMode(resolveActiveMode(profile.role, profile.active_mode));

  return (
    <div className="rounded-2xl border border-brand-teal/20 bg-mint/30 p-4 sm:p-5">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-teal">Account type</p>
      <p className="font-heading mt-2 text-lg font-semibold text-foreground">{accountType}</p>
      <p className="mt-3 text-sm text-muted">
        Current dashboard mode:{" "}
        <span className="font-medium text-foreground">{currentMode}</span>
      </p>
      {profile.role === "both" ? (
        <p className="mt-2 text-xs text-muted">
          Switch between Pet Parent and Pet Friend modes from the sidebar.
        </p>
      ) : profile.role === "pet_parent" ? (
        <p className="mt-2 text-xs text-muted">
          Use &ldquo;Switch to Pet Friend&rdquo; in the sidebar to browse pets and send requests.
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Use &ldquo;Switch to Pet Parent&rdquo; in the sidebar to list pets and receive requests.
        </p>
      )}
    </div>
  );
}
