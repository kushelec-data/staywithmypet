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
      className={`flex flex-col gap-3 rounded-xl bg-[#F8F6F1]/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className}`}
      aria-labelledby="membership-access-code-heading"
      data-testid="membership-access-code-section"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-teal shadow-sm">
          <Ticket className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            id="membership-access-code-heading"
            className="font-heading text-sm font-semibold text-foreground"
          >
            {copy.title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted sm:text-sm">{copy.description}</p>
        </div>
      </div>
      <Button
        href={invitedTestAccessCodeHref(role)}
        variant="outline"
        size="sm"
        className="w-full shrink-0 border-[#E5E2D8] bg-white sm:w-auto"
        data-testid="redeem-access-code"
      >
        {copy.activateButton}
      </Button>
    </section>
  );
}
