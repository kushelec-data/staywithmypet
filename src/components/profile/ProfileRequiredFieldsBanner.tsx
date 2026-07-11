"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { ProfileRequiredFieldsResult } from "@/lib/profile-required-fields";

type ProfileRequiredFieldsBannerProps = {
  result: ProfileRequiredFieldsResult;
  className?: string;
};

export function ProfileRequiredFieldsBanner({
  result,
  className = "",
}: ProfileRequiredFieldsBannerProps) {
  const { t } = useLanguage();
  const copy = t.profileRequiredFields;

  return (
    <div
      className={`rounded-2xl border border-black/5 bg-mint/20 px-4 py-3 text-sm ${className}`}
      role="status"
    >
      <p className="text-muted">{copy.requiredHint}</p>
      <p className="mt-2 font-medium text-foreground">
        {copy.progress
          .replace("{completed}", String(result.completedCount))
          .replace("{total}", String(result.totalCount))}
      </p>
      {!result.marketplaceMinimumEligible ? (
        <p className="mt-1 text-brand-teal">{copy.visibilityHint}</p>
      ) : result.marketplaceReady ? (
        <p className="mt-1 font-medium text-brand-teal">{copy.marketplaceReady}</p>
      ) : null}
    </div>
  );
}
