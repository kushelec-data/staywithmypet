"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { invitedTestAccessCodeHref } from "@/lib/membership-invited-access";
import type { MembershipRole } from "@/lib/membership";
import { Ticket } from "lucide-react";

type InvitedTestUserSectionProps = {
  role: MembershipRole;
  className?: string;
};

export function InvitedTestUserSection({ role, className = "" }: InvitedTestUserSectionProps) {
  const { t } = useLanguage();
  const copy = t.testAccess.invitedSection;

  return (
    <section
      className={`rounded-[22px] border border-neutral-200/80 bg-neutral-50/90 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-5 ${className}`}
      aria-labelledby="membership-access-code-heading"
      data-testid="membership-access-code-section"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex min-w-0 items-start gap-3 md:gap-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-teal shadow-sm">
            <Ticket className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2
              id="membership-access-code-heading"
              className="font-heading text-sm font-semibold text-foreground sm:text-base"
            >
              {copy.title}
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-muted sm:text-sm">{copy.description}</p>
          </div>
        </div>

        <div className="w-full shrink-0 md:w-auto">
          <Button
            href={invitedTestAccessCodeHref(role)}
            variant="outline"
            size="sm"
            className="w-full border-[#E5E2D8] bg-white md:w-auto"
            data-testid="redeem-access-code"
          >
            {copy.activateButton}
          </Button>
        </div>
      </div>
    </section>
  );
}
