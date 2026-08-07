"use client";

import { TermsLegalLink } from "@/components/legal/TermsLegalLink";
import { useLanguage } from "@/context/LanguageContext";
import { PRIVACY_PATH, SAFETY_PATH, TERMS_PATH } from "@/lib/terms-acceptance";
import {
  TERMS_ACCEPTANCE_HIGHLIGHT_CLASS,
  TERMS_ACCEPTANCE_SHAKE_CLASS,
  TERMS_SHAKE_ANIMATION_NAME,
} from "@/lib/signup-terms-validation";
import type { RefObject } from "react";

export type TermsAcceptanceVariant = "signup" | "membership" | "booking";

type TermsAcceptanceCheckboxProps = {
  variant: TermsAcceptanceVariant;
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Inline validation message shown beside the checkbox. */
  error?: string | null;
  /** Highlights the checkbox when validation failed. */
  invalid?: boolean;
  /** Red outline and background on the whole Terms block. */
  highlighted?: boolean;
  /** Runs the one-shot shake animation on the Terms block. */
  shaking?: boolean;
  onShakeEnd?: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  containerRef?: RefObject<HTMLDivElement | null>;
  /** When false, terms are validated in app logic instead of HTML5 constraint validation. */
  required?: boolean;
};

export function TermsAcceptanceCheckbox({
  variant,
  id,
  checked,
  onCheckedChange,
  disabled = false,
  className = "",
  error = null,
  invalid = false,
  highlighted = false,
  shaking = false,
  onShakeEnd,
  inputRef,
  containerRef,
  required = true,
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

  const showInvalid = invalid || Boolean(error);
  const showHighlight = highlighted || showInvalid;
  const errorId = `${id}-error`;

  return (
    <div
      ref={containerRef}
      aria-describedby={error ? errorId : undefined}
      onAnimationEnd={(event) => {
        if (event.animationName === TERMS_SHAKE_ANIMATION_NAME) {
          onShakeEnd?.();
        }
      }}
      className={[
        "flex min-w-0 items-start gap-3",
        showHighlight ? TERMS_ACCEPTANCE_HIGHLIGHT_CLASS : "",
        shaking ? TERMS_ACCEPTANCE_SHAKE_CLASS : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        ref={inputRef}
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        aria-invalid={showInvalid || undefined}
        aria-describedby={error ? errorId : undefined}
        required={required}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded text-brand-teal focus:ring-2 disabled:opacity-50 ${
          showInvalid
            ? "border-2 border-red-600 ring-2 ring-red-600/25 focus:ring-red-600/40"
            : "border-black/20 focus:ring-brand-teal/40"
        }`}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm leading-relaxed text-foreground">
          {label}
        </label>
        {error ? (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
