"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { ACCOUNT_BODY_TEXT } from "@/lib/account-ui";
import { invitedTestAccessCodeHref } from "@/lib/membership-invited-access";
import type { MembershipRole } from "@/lib/membership";

type InvitedTestUserSectionProps = {
  role: MembershipRole;
};

export function InvitedTestUserSection({ role }: InvitedTestUserSectionProps) {
  const { t } = useLanguage();
  const copy = t.testAccess.invitedSection;

  return (
    <section
      className="rounded-2xl border border-neutral-200/60 bg-neutral-50/50 px-6 py-5 sm:px-7 sm:py-6"
      aria-labelledby="invited-test-user-heading"
      data-testid="invited-test-user-section"
      data-membership-section="access-code"
    >
      <h2
        id="invited-test-user-heading"
        className="font-heading text-base font-semibold text-foreground"
      >
        {copy.title}
      </h2>
      <p className={`mt-2 max-w-2xl ${ACCOUNT_BODY_TEXT}`}>{copy.description}</p>
      <div className="mt-4">
        <Button
          href={invitedTestAccessCodeHref(role)}
          variant="secondary"
          size="md"
          data-testid="activate-with-access-code"
        >
          {copy.activateButton}
        </Button>
      </div>
    </section>
  );
}
