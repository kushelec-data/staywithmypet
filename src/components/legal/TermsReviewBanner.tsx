"use client";

import { TermsAcceptanceCheckbox } from "@/components/legal/TermsAcceptanceCheckbox";
import { useLanguage } from "@/context/LanguageContext";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type TermsReviewBannerProps = {
  onNeedsAcceptanceChange?: (needs: boolean) => void;
  className?: string;
};

/**
 * Shown when the user has not accepted the current Terms version.
 * Does not block navigation — gates are enforced at important actions.
 */
export function TermsReviewBanner({ onNeedsAcceptanceChange, className = "" }: TermsReviewBannerProps) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getTermsAcceptanceStatusAction } = await import("@/app/actions/terms-acceptance");
        const status = await getTermsAcceptanceStatusAction();
        if (cancelled) return;
        const needs = !status.hasCurrentVersion;
        setVisible(needs);
        onNeedsAcceptanceChange?.(needs);
      } catch {
        if (!cancelled) {
          setVisible(false);
          onNeedsAcceptanceChange?.(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onNeedsAcceptanceChange]);

  if (loading || !visible) return null;

  return (
    <div
      className={`rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
      role="status"
    >
      <p>{t.termsAcceptance.banner.message}</p>
    </div>
  );
}

type TermsReviewGateProps = {
  children: (props: {
    needsTermsReview: boolean;
    termsAccepted: boolean;
    setTermsAccepted: (value: boolean) => void;
    banner: ReactNode;
    checkbox: ReactNode;
    canProceed: boolean;
  }) => React.ReactNode;
  checkboxId: string;
  checkboxVariant: "membership" | "booking";
};

/** Combines banner + mandatory checkbox for gated actions. */
export function TermsReviewGate({
  children,
  checkboxId,
  checkboxVariant,
}: TermsReviewGateProps) {
  const [needsTermsReview, setNeedsTermsReview] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const banner = (
    <TermsReviewBanner
      onNeedsAcceptanceChange={setNeedsTermsReview}
      className="mb-4"
    />
  );

  const checkbox = (
    <TermsAcceptanceCheckbox
      variant={checkboxVariant}
      id={checkboxId}
      checked={termsAccepted}
      onCheckedChange={setTermsAccepted}
      className="mt-4"
    />
  );

  const canProceed = termsAccepted;

  return <>{children({ needsTermsReview, termsAccepted, setTermsAccepted, banner, checkbox, canProceed })}</>;
}
