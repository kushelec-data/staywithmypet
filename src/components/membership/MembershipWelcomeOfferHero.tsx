"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { MembershipRole } from "@/lib/membership";
import { scrollToMembershipPlans } from "@/lib/membership-plans-scroll";
import { WELCOME_OFFER_CODE } from "@/lib/new-member-promotion";
import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type MembershipWelcomeOfferHeroProps = {
  role: MembershipRole;
  returnTo?: string | null;
  className?: string;
};

export function MembershipWelcomeOfferHero({
  role,
  returnTo,
  className = "",
}: MembershipWelcomeOfferHeroProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const copy = t.account.membershipPage.welcomeOffer;
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleActivate = useCallback(() => {
    scrollToMembershipPlans({
      role,
      returnTo,
      navigate: (href) => router.push(href),
    });
  }, [role, returnTo, router]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(WELCOME_OFFER_CODE);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = WELCOME_OFFER_CODE;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        return;
      }
    }

    setCopied(true);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <section
      className={`rounded-2xl border border-neutral-200/70 bg-[#FCFCFC] px-6 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)] sm:px-8 sm:py-7 ${className}`}
      aria-label={copy.badge}
      data-membership-section="launch-offer"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2E6B3F]">
        {copy.badge}
      </p>

      <h2 className="mt-3 max-w-xl font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-[#2B2B2B] sm:text-[1.75rem]">
        {copy.headlineLine1} {copy.headlineLine2}
      </h2>

      <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#4B5563]">{copy.supporting}</p>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleActivate}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2E6B3F] px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(46,107,63,0.18)] transition hover:bg-[#286035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] sm:max-w-[220px]"
        >
          {copy.activate}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => void handleCopyCode()}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#2E6B3F]/28 bg-white px-5 text-sm font-semibold text-[#2E6B3F] transition hover:border-[#2E6B3F]/40 hover:bg-[#FAFDFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] sm:max-w-[220px]"
          aria-label={copied ? copy.copied : copy.copyCode}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              {copy.copied}
            </>
          ) : (
            <>
              {copy.copy}{" "}
              <span className="font-mono tracking-[0.12em]">{WELCOME_OFFER_CODE}</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
