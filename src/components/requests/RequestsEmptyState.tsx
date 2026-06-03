"use client";

import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { useLanguage } from "@/context/LanguageContext";

type RequestsEmptyStateProps = {
  isIncoming: boolean;
};

export function RequestsEmptyState({ isIncoming }: RequestsEmptyStateProps) {
  const { t } = useLanguage();
  const r = t.requests;

  return (
    <AccountEmptyState
      icon="📬"
      title={r.emptyTitle}
      description={
        <>
          <p>{isIncoming ? r.receivedEmpty : r.sentEmpty}</p>
          <p className="mt-1">{r.emptyDescription}</p>
        </>
      }
      actions={[
        { href: "/find-care", label: r.browseFriends },
        { href: "/find-pets", label: r.browsePets, variant: "outline" },
      ]}
    />
  );
}
