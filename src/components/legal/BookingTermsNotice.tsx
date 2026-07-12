"use client";

import { TermsLegalLink } from "@/components/legal/TermsLegalLink";
import { useLanguage } from "@/context/LanguageContext";
import { SAFETY_PATH, TERMS_PATH } from "@/lib/terms-acceptance";

type BookingTermsNoticeProps = {
  className?: string;
};

/** Informational notice for confirmed bookings / calendar (no checkbox). */
export function BookingTermsNotice({ className = "" }: BookingTermsNoticeProps) {
  const { t } = useLanguage();
  const copy = t.termsAcceptance.calendarNotice;

  return (
    <p className={`text-xs leading-relaxed text-muted ${className}`}>
      {copy.beforeTerms}{" "}
      <TermsLegalLink href={TERMS_PATH} className="text-xs">
        {copy.termsLink}
      </TermsLegalLink>{" "}
      {copy.beforeSafety}{" "}
      <TermsLegalLink href={SAFETY_PATH} className="text-xs">
        {copy.safetyLink}
      </TermsLegalLink>
      {copy.suffix}
    </p>
  );
}
