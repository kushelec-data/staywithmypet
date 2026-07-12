"use client";

import { TermsLegalLink } from "@/components/legal/TermsLegalLink";
import { useLanguage } from "@/context/LanguageContext";
import { PRIVACY_PATH, SAFETY_PATH, TERMS_PATH } from "@/lib/terms-acceptance";

export type TermsAcceptanceVariant = "signup" | "membership" | "booking";

type TermsAcceptanceCheckboxProps = {
  variant: TermsAcceptanceVariant;
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function TermsAcceptanceCheckbox({
  variant,
  id,
  checked,
  onCheckedChange,
  disabled = false,
  className = "",
}: TermsAcceptanceCheckboxProps) {
  const { t } = useLanguage();
  const copy = t.termsAcceptance;

  const label =
    variant === "signup" ? (
      <>
        {copy.signup.beforeTerms}{" "}
        <TermsLegalLink href={TERMS_PATH}>{copy.signup.termsLink}</TermsLegalLink>{" "}
        {copy.signup.beforePrivacy}{" "}
        <TermsLegalLink href={PRIVACY_PATH}>{copy.signup.privacyLink}</TermsLegalLink>
        {copy.signup.suffix}
      </>
    ) : variant === "membership" ? (
      <>
        {copy.membership.beforeTerms}{" "}
        <TermsLegalLink href={TERMS_PATH}>{copy.membership.termsLink}</TermsLegalLink>
        {copy.membership.suffix}
      </>
    ) : (
      <>
        {copy.booking.beforeTerms}{" "}
        <TermsLegalLink href={TERMS_PATH}>{copy.booking.termsLink}</TermsLegalLink>
        {copy.booking.beforeSafety}{" "}
        <TermsLegalLink href={SAFETY_PATH}>{copy.booking.safetyLink}</TermsLegalLink>
        {copy.booking.suffix}
      </>
    );

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 text-brand-teal focus:ring-2 focus:ring-brand-teal/40 disabled:opacity-50"
        required
      />
      <label htmlFor={id} className="text-sm leading-relaxed text-foreground">
        {label}
      </label>
    </div>
  );
}
