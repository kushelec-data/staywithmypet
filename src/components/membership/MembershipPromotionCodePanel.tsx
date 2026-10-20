"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TermsAcceptanceCheckbox } from "@/components/legal/TermsAcceptanceCheckbox";
import { TermsReviewBanner } from "@/components/legal/TermsReviewBanner";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import {
  ACCOUNT_BODY_TEXT,
  ACCOUNT_CARD_CLASS,
  ACCOUNT_CARD_PADDING_COMPACT,
  ACCOUNT_FIELD_LABEL_CLASS,
  ACCOUNT_SECTION_TITLE,
} from "@/lib/account-ui";
import { buildMembershipPagePath } from "@/lib/membership-return";
import { membershipRoleTitle, type MembershipRole } from "@/lib/membership";

type MembershipPromotionCodePanelProps = {
  role: MembershipRole;
  returnTo?: string | null;
  showRole?: boolean;
  onRoleChange?: (role: MembershipRole) => void;
};

export function MembershipPromotionCodePanel({
  role,
  returnTo,
  showRole = false,
  onRoleChange,
}: MembershipPromotionCodePanelProps) {
  const { t } = useLanguage();
  const { refreshProfile } = useProfile();
  const router = useRouter();
  const copy = t.account.membershipPage.promotionCode;
  const [code, setCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
          termsAccepted,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error ?? copy.invalidCode);
        setSubmitting(false);
        return;
      }

      await refreshProfile?.({ background: true });

      if (returnTo) {
        router.push(returnTo);
        return;
      }

      router.push(buildMembershipPagePath({ role, success: true }));
    } catch {
      setError(t.pricing.checkoutError);
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${ACCOUNT_CARD_CLASS} ${ACCOUNT_CARD_PADDING_COMPACT}`}
      data-membership-section="promotion-code"
    >
      <h2 className={ACCOUNT_SECTION_TITLE}>{copy.title}</h2>
      <p className={`mt-2 ${ACCOUNT_BODY_TEXT}`}>{copy.description}</p>

      {showRole ? (
        <fieldset className="mt-4">
          <legend className={ACCOUNT_FIELD_LABEL_CLASS}>{copy.roleLabel}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["pet_parent", "pet_friend"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onRoleChange?.(option)}
                className={
                  option === role
                    ? "rounded-full bg-brand-teal px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-foreground"
                }
                aria-pressed={option === role}
              >
                {membershipRoleTitle(option)}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className={`mt-3 text-sm font-medium text-foreground`}>
          {membershipRoleTitle(role)}
        </p>
      )}

      <TermsReviewBanner className="mt-4" />

      <label htmlFor="membership-promotion-code" className={`mt-4 block ${ACCOUNT_FIELD_LABEL_CLASS}`}>
        {copy.codeLabel}
      </label>
      <input
        id="membership-promotion-code"
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
        id="membership-promotion-terms"
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

      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={submitting || !code.trim() || !termsAccepted}
        >
          {submitting ? copy.activating : copy.activateButton}
        </Button>
      </div>
    </form>
  );
}
