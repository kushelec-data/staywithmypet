"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { invitedTestAccessCodeHref } from "@/lib/membership-invited-access";
import type { MembershipRole } from "@/lib/membership";

type InvitedTestUserSectionProps = {
  role: MembershipRole;
  className?: string;
};

export function InvitedTestUserSection({ role, className = "" }: InvitedTestUserSectionProps) {
  const { t } = useLanguage();
  const copy = t.testAccess.invitedSection;

  return (
    <section
      className={`rounded-2xl border border-lavender/80 bg-lavender/35 px-4 py-3 shadow-[0_2px_12px_rgba(46,107,63,0.06)] ${className}`}
      aria-labelledby="membership-access-code-heading"
      data-testid="membership-access-code-section"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2
            id="membership-access-code-heading"
            className="font-heading text-sm font-semibold text-foreground"
          >
            {copy.title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">{copy.description}</p>
        </div>
        <Button
          href={invitedTestAccessCodeHref(role)}
          variant="secondary"
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          data-testid="redeem-access-code"
        >
          {copy.activateButton}
        </Button>
      </div>
    </section>
  );
}
