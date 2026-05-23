"use client";

import { ProfileCollapsibleSection } from "@/components/profile/ProfileCollapsibleSection";
import { PhoneCountryFields } from "@/components/profile/PhoneCountryFields";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { useState } from "react";

export type TrustSafetyFormValues = {
  phoneDialCode: string;
  phoneNational: string;
  emergencyName: string;
  emergencyDialCode: string;
  emergencyNational: string;
  emergencyRelationship: string;
};

export const emptyTrustSafetyFormValues: TrustSafetyFormValues = {
  phoneDialCode: "+372",
  phoneNational: "",
  emergencyName: "",
  emergencyDialCode: "+372",
  emergencyNational: "",
  emergencyRelationship: "",
};

type TrustSafetyFormSectionProps = {
  values: TrustSafetyFormValues;
  emailVerified: boolean;
  phoneVerified: boolean;
  onChange: (values: TrustSafetyFormValues) => void;
  disabled?: boolean;
  /** When true, render fields only (no collapsible wrapper). */
  embedded?: boolean;
};

export function TrustSafetyFormSection({
  values,
  emailVerified,
  phoneVerified,
  onChange,
  disabled = false,
  embedded = false,
}: TrustSafetyFormSectionProps) {
  const { t } = useLanguage();
  const ts = t.trustSafety;
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  function patch(partial: Partial<TrustSafetyFormValues>) {
    onChange({ ...values, ...partial });
  }

  const hasPhoneDigits = Boolean(values.phoneNational.trim());

  const body = (
      <div className="space-y-4 sm:col-span-2">
        {!embedded ? <p className="text-sm text-muted">{ts.formSectionHint}</p> : null}

        <ul className="flex flex-wrap gap-2 text-xs">
          <StatusChip ok={emailVerified} label={ts.emailVerified} />
          <StatusChip ok={phoneVerified} label={ts.phoneVerified} />
        </ul>

        <PhoneCountryFields
          idPrefix="profile-phone"
          label={ts.yourPhoneLabel}
          dialCode={values.phoneDialCode}
          nationalNumber={values.phoneNational}
          onDialCodeChange={(phoneDialCode) => patch({ phoneDialCode })}
          onNationalChange={(phoneNational) => patch({ phoneNational })}
          disabled={disabled}
        />

        <div className="rounded-xl border border-black/[0.06] bg-mint/15 px-3 py-2.5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={phoneVerified ? "font-medium text-brand-teal" : "text-muted"}>
              {phoneVerified ? ts.phoneVerified : ts.phoneNotVerified}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || !hasPhoneDigits}
              onClick={() => setVerifyMsg(ts.verifyPhoneSoon)}
            >
              {ts.verifyPhoneButton}
            </Button>
          </div>
          {!hasPhoneDigits ? (
            <p className="mt-1 text-xs text-muted">{ts.phoneNationalHint}</p>
          ) : null}
          {verifyMsg ? (
            <p className="mt-2 text-xs font-medium text-brand-teal" role="status">
              {verifyMsg}
            </p>
          ) : null}
        </div>

        <div className="border-t border-black/5 pt-4">
          <h3 className="text-sm font-semibold text-foreground">{ts.emergencySectionTitle}</h3>
          <p className="mt-1 text-xs text-muted">{ts.emergencySectionHint}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="emergency-name" className="text-sm font-medium text-foreground">
              {ts.emergencyNameLabel}
            </label>
            <input
              id="emergency-name"
              type="text"
              value={values.emergencyName}
              disabled={disabled}
              onChange={(e) => patch({ emergencyName: e.target.value })}
              className="input-field mt-1"
              placeholder={ts.emergencyNamePlaceholder}
              autoComplete="name"
            />
          </div>
          <div className="sm:col-span-2">
            <PhoneCountryFields
              idPrefix="emergency-phone"
              label={ts.emergencyPhoneLabel}
              dialCode={values.emergencyDialCode}
              nationalNumber={values.emergencyNational}
              onDialCodeChange={(emergencyDialCode) => patch({ emergencyDialCode })}
              onNationalChange={(emergencyNational) => patch({ emergencyNational })}
              disabled={disabled}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="emergency-relationship" className="text-sm font-medium text-foreground">
              {ts.emergencyRelationshipLabel}
            </label>
            <input
              id="emergency-relationship"
              type="text"
              value={values.emergencyRelationship}
              disabled={disabled}
              onChange={(e) => patch({ emergencyRelationship: e.target.value })}
              className="input-field mt-1"
              placeholder={ts.emergencyRelationshipPlaceholder}
            />
          </div>
        </div>
      </div>
  );

  if (embedded) return body;

  return (
    <ProfileCollapsibleSection id="trust-safety" title={ts.formSectionTitle} defaultOpen>
      {body}
    </ProfileCollapsibleSection>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`rounded-full px-2.5 py-0.5 font-semibold ${
        ok ? "bg-mint/50 text-brand-teal" : "bg-black/5 text-muted"
      }`}
    >
      {label}
    </li>
  );
}
