"use client";

import { STATUS_ALERT_SUCCESS_CLASS } from "@/lib/status-colors";
import { useLanguage } from "@/context/LanguageContext";

type PetListingVisibilityControlProps = {
  checked: boolean;
  disabled?: boolean;
  saving?: boolean;
  success?: boolean;
  onChange: (checked: boolean) => void;
};

export function PetListingVisibilityControl({
  checked,
  disabled = false,
  saving = false,
  success = false,
  onChange,
}: PetListingVisibilityControlProps) {
  const { t } = useLanguage();
  const copy = t.account.petsPage;

  return (
    <div className="rounded-2xl border border-black/10 bg-mint/15 px-4 py-4 sm:px-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 text-brand-teal focus:ring-2 focus:ring-brand-teal/40 disabled:opacity-50"
          checked={checked}
          disabled={disabled || saving}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            {copy.findPetsListingLabel}
          </span>
          <span className="mt-1 block text-sm text-muted">{copy.findPetsListingHelper}</span>
        </span>
      </label>
      {success ? (
        <p className={`mt-3 text-sm ${STATUS_ALERT_SUCCESS_CLASS}`} role="status">
          {copy.listingVisibilityUpdated}
        </p>
      ) : null}
      {saving ? (
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {copy.savingListingVisibility}
        </p>
      ) : null}
    </div>
  );
}
