"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import {
  ACCOUNT_BODY_TEXT,
  ACCOUNT_CARD_CLASS,
  ACCOUNT_CARD_PADDING_COMPACT,
  ACCOUNT_FIELD_LABEL_CLASS,
  ACCOUNT_SECTION_TITLE,
} from "@/lib/account-ui";
import { buildMembershipPagePath, sanitizeReturnTo } from "@/lib/membership-return";
import { parseMembershipPageRole } from "@/lib/membership-upsell";
import { isStripeCheckoutEnabled } from "@/lib/stripe-feature";
import { membershipRoleTitle, type MembershipRole } from "@/lib/membership";

export function TestAccessCodePageClient() {
  const { user, loading: authLoading } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ta = t.testAccess;
  const planId = searchParams.get("planId")?.trim() ?? searchParams.get("plan_id")?.trim() ?? "";
  const role =
    parseMembershipPageRole(searchParams.get("role")) ??
    ("pet_parent" as MembershipRole);
  const returnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo")),
    [searchParams],
  );

  const dualRole = profile?.role === "both";
  const roleLabel = membershipRoleTitle(role);
  const planLabel = useMemo(() => {
    const plans =
      role === "pet_parent" ? t.pricing.petParentPlans : t.pricing.petFriendPlans;
    return plans.find((p) => p.id === planId)?.name ?? planId;
  }, [planId, role, t.pricing.petFriendPlans, t.pricing.petParentPlans]);

  useEffect(() => {
    if (isStripeCheckoutEnabled()) {
      router.replace("/membership");
      return;
    }
    if (authLoading) return;
    if (!user) {
      const next = `/test-access-code?${searchParams.toString()}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!planId) {
      router.replace("/membership");
    }
  }, [authLoading, planId, router, searchParams, user]);

  if (isStripeCheckoutEnabled() || authLoading || !user || !planId) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        {t.account.loading}
      </div>
    );
  }

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
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        dual?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? ta.invalidCode);
        setSubmitting(false);
        return;
      }

      await refreshProfile?.({ background: true });

      if (returnTo) {
        router.push(returnTo);
        return;
      }

      router.push(
        buildMembershipPagePath({
          role,
          success: true,
        }),
      );
    } catch {
      setError(t.pricing.checkoutError);
      setSubmitting(false);
    }
  }

  return (
    <AccountLayout title={ta.pageTitle} description={ta.pageDescription}>
      <div className={`mb-6 ${ACCOUNT_CARD_CLASS} ${ACCOUNT_CARD_PADDING_COMPACT}`}>
        <p className={ACCOUNT_FIELD_LABEL_CLASS}>{ta.selectedPlanLabel}</p>
        <p className={`mt-2 ${ACCOUNT_SECTION_TITLE}`}>
          {dualRole
            ? ta.dualRoleSummary.replace("{plan}", planLabel)
            : ta.singleRoleSummary.replace("{role}", roleLabel).replace("{plan}", planLabel)}
        </p>
        <p className={`mt-3 ${ACCOUNT_BODY_TEXT}`}>{ta.freeAccessNote}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`${ACCOUNT_CARD_CLASS} ${ACCOUNT_CARD_PADDING_COMPACT} max-w-lg`}
      >
        <label htmlFor="test-access-code" className={ACCOUNT_FIELD_LABEL_CLASS}>
          {ta.codeLabel}
        </label>
        <input
          id="test-access-code"
          name="code"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={ta.codePlaceholder}
          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-foreground outline-none ring-brand-teal/30 focus:ring-2"
          required
        />
        <p className={`mt-2 ${ACCOUNT_BODY_TEXT}`}>{ta.codeHint}</p>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" variant="primary" size="md" disabled={submitting || !code.trim()}>
            {submitting ? ta.activating : ta.activateButton}
          </Button>
          <Button href="/membership" variant="secondary" size="md">
            {ta.backToPlans}
          </Button>
        </div>
      </form>
    </AccountLayout>
  );
}
