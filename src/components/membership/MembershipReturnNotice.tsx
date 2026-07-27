"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type MembershipReturnNoticeProps = {
  returnTo: string;
  className?: string;
};

export function MembershipReturnNotice({ returnTo, className = "" }: MembershipReturnNoticeProps) {
  const { t } = useLanguage();
  const copy = t.account.membershipPage.returnNotice;

  return (
    <div
      className={`mt-8 flex items-start gap-3 rounded-xl bg-mint/25 px-4 py-3 text-sm text-muted ${className}`}
      role="status"
    >
      <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
      <div className="min-w-0">
        <p className="leading-relaxed text-foreground/90">{copy.hint}</p>
        <Link
          href={returnTo}
          className="mt-1.5 inline-flex font-semibold text-brand-teal underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
        >
          {copy.link}
        </Link>
      </div>
    </div>
  );
}
