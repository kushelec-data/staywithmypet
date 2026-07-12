"use client";

import { useLanguage } from "@/context/LanguageContext";
import { membershipPlanTermsKind } from "@/lib/terms-acceptance";

type MembershipPlanTermsInfoProps = {
  planId: string;
  className?: string;
};

export function MembershipPlanTermsInfo({ planId, className = "" }: MembershipPlanTermsInfoProps) {
  const { t } = useLanguage();
  const copy = t.termsAcceptance.membershipPlan;
  const kind = membershipPlanTermsKind(planId);

  const details =
    kind === "one_time"
      ? copy.oneTime
      : kind === "3_months"
        ? copy.threeMonth
        : copy.oneYear;

  return (
    <div
      className={`rounded-xl border border-black/10 bg-mint/20 px-4 py-3 text-sm text-foreground ${className}`}
      role="region"
      aria-label={copy.ariaLabel}
    >
      <p className="font-semibold text-brand-teal">{details.title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
        {details.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}
