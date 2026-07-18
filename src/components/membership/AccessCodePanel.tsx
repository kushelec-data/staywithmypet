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
import type { MembershipRole } from "@/lib/membership";
import { membershipRoleTitle } from "@/lib/membership";

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
    <div className={`mt-6 ${ACCOUNT_CARD_CLASS} ${ACCOUNT_CARD_PADDING_COMPACT} w-full min-w-0`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={ACCOUNT_FIELD_LABEL_CLASS}>{copy.accessCodeSectionTitle}</p>
          <p className="mt-1 text-sm text-foreground">
            {copy.singleRoleSummary
              .replace("{role}", membershipRoleTitle(role))
              .replace("{plan}", planLabel)}
          </p>
          <p className={`mt-2 ${ACCOUNT_BODY_TEXT}`}>{copy.platformAccessNote}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {copy.closeAccessCode}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 w-full min-w-0">
        <TermsReviewBanner className="mb-4" />
        <MembershipPlanTermsInfo planId={planId} className="mb-4" />

        <label htmlFor="platform-access-code" className={ACCOUNT_FIELD_LABEL_CLASS}>
          {copy.codeLabel}
        </label>
        <input
          id="platform-access-code"
          name="code"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={copy.codePlaceholder}
          className="mt-2 w-full min-w-0 rounded-xl border border-black/10 bg-white px-4 py-3 text-foreground outline-none ring-brand-teal/30 focus:ring-2"
          required
        />
        <p className={`mt-2 ${ACCOUNT_BODY_TEXT}`}>{copy.codeHint}</p>

        <TermsAcceptanceCheckbox
          variant="membership"
          id={`platform-access-terms-${planId}`}
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

        <Button
          type="submit"
          variant="secondary"
          size="md"
          className="mt-6 w-full min-w-0 sm:w-auto"
          disabled={submitting || !code.trim() || !termsAccepted}
        >
          {submitting ? copy.activating : copy.activateButton}
        </Button>
      </form>
    </div>
  );
}
