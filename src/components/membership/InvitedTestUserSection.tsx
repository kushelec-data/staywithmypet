"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { ACCOUNT_BODY_TEXT, ACCOUNT_CARD_CLASS, ACCOUNT_CARD_PADDING_COMPACT } from "@/lib/account-ui";
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
      className={`mt-8 ${ACCOUNT_CARD_CLASS} ${ACCOUNT_CARD_PADDING_COMPACT}`}
      aria-labelledby="invited-test-user-heading"
      data-testid="invited-test-user-section"
    >
      <h2
        id="invited-test-user-heading"
        className="font-heading text-base font-semibold text-foreground"
      >
        {copy.title}
      </h2>
      <p className={`mt-2 ${ACCOUNT_BODY_TEXT}`}>{copy.description}</p>
      <div className="mt-5">
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
