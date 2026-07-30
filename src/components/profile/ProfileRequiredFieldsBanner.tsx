"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type {
  ProfileRequiredFieldStatus,
  ProfileRequiredFieldsResult,
} from "@/lib/profile-required-fields";

type ProfileRequiredFieldsBannerProps = {
  result: ProfileRequiredFieldsResult;
  onCompleteNow?: () => void;
  onFocusMissingField?: (field: ProfileRequiredFieldStatus) => void;
  className?: string;
};

export function ProfileRequiredFieldsBanner({
  result,
  onCompleteNow,
  onFocusMissingField,
  className = "",
}: ProfileRequiredFieldsBannerProps) {
  const { t } = useLanguage();
  const copy = t.profileRequiredFields;
  const missing = result.missing;
  const allComplete = missing.length === 0;

  return (
    <div
      className={`rounded-xl border border-black/5 bg-mint/20 px-3 py-2.5 text-sm ${className}`}
      role="status"
    >
      <p className="text-xs text-muted">{copy.requiredHint}</p>
      <p className="mt-1 font-medium text-foreground">
        {copy.progress
          .replace("{completed}", String(result.completedCount))
          .replace("{total}", String(result.totalCount))}
      </p>

      {!allComplete ? (
        <div className="mt-2">
          <p className="text-sm font-medium text-foreground">
            {missing.length === 1
              ? copy.missingOne
              : copy.missingMany.replace("{count}", String(missing.length))}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-foreground">
            {missing.map((field) => {
              const label = copy.items[field.labelKey];
              const actionable = Boolean(field.focusId || field.href);
              return (
                <li key={field.id}>
                  {actionable && onFocusMissingField ? (
                    <button
                      type="button"
                      onClick={() => onFocusMissingField(field)}
                      className="text-left text-brand-teal underline-offset-2 hover:underline"
                    >
                      {label}
                    </button>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {onCompleteNow ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="mt-2.5 bg-[#2E6B3F] hover:bg-[#255A34]"
              onClick={onCompleteNow}
            >
              {copy.completeNow}
            </Button>
          ) : null}
        </div>
      ) : result.marketplaceReady ? (
        <p className="mt-1 font-medium text-brand-teal">{copy.marketplaceReady}</p>
      ) : !result.marketplaceMinimumEligible ? (
        <p className="mt-1 text-brand-teal">{copy.visibilityHint}</p>
      ) : null}
    </div>
  );
}
