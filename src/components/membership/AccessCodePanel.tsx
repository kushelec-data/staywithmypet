"use client";

import { FormEvent, useState } from "react";
import { MembershipPlanTermsInfo } from "@/components/legal/MembershipPlanTermsInfo";
import { TermsAcceptanceCheckbox } from "@/components/legal/TermsAcceptanceCheckbox";
import { TermsReviewBanner } from "@/components/legal/TermsReviewBanner";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  ACCOUNT_BODY_TEXT,
  ACCOUNT_CARD_CLASS,
  ACCOUNT_CARD_PADDING_COMPACT,
  ACCOUNT_FIELD_LABEL_CLASS,
} from "@/lib/account-ui";
import { membershipRoleTitle, type MembershipRole } from "@/lib/membership";

type AccessCodePanelProps = {
  open: boolean;
  onClose: () => void;
  planId: string;
  planLabel: string;
  role: MembershipRole;
  returnTo?: string | null;
  onSuccess?: () => void;
};

export function AccessCodePanel({
  open,
  onClose,
  planId,
  planLabel,
  role,
  returnTo,
  onSuccess,
}: AccessCodePanelProps) {
  const { t } = useLanguage();
  const copy = t.testAccess;
  const [code, setCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/test-access-code/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          role,
          planId,
          termsAccepted,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error ?? copy.invalidCode);
        setSubmitting(false);
        return;
      }

      onSuccess?.();
      if (returnTo) {
        window.location.href = returnTo;
        return;
      }
      window.location.reload();
    } catch {
      setError(t.pricing.checkoutError);
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`mb-6 ${ACCOUNT_CARD_CLASS} ${ACCOUNT_CARD_PADDING_COMPACT}`}
      role="region"
      aria-label={copy.accessCodePanelTitle}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">
            {copy.accessCodePanelTitle}
          </h3>
          <p className={`mt-1 ${ACCOUNT_BODY_TEXT}`}>
            {copy.accessCodePanelDescription
              .replace("{role}", membershipRoleTitle(role))
              .replace("{plan}", planLabel)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-sm text-muted underline-offset-2 hover:underline"
        >
          {copy.closeAccessCode}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <TermsReviewBanner className="mb-4" />
        <MembershipPlanTermsInfo planId={planId} className="mb-4" />

        <label htmlFor="membership-access-code" className={ACCOUNT_FIELD_LABEL_CLASS}>
          {copy.codeLabel}
        </label>
        <input
          id="membership-access-code"
          name="code"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={copy.codePlaceholder}
          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-foreground outline-none ring-brand-teal/30 focus:ring-2"
          required
        />
        <p className={`mt-2 ${ACCOUNT_BODY_TEXT}`}>{copy.codeHint}</p>

        <TermsAcceptanceCheckbox
          variant="membership"
          id="inline-membership-terms"
          checked={termsAccepted}
          onCheckedChange={setTermsAccepted}
          disabled={submitting}
          className="mt-4"
        />

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            variant="secondary"
            size="md"
            disabled={submitting || !code.trim() || !termsAccepted}
          >
            {submitting ? copy.activating : copy.activateButton}
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            {copy.backToPlans}
          </Button>
        </div>
      </form>
    </div>
  );
}
