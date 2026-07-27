"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { MembershipRole } from "@/lib/membership";
import { scrollToMembershipPlans } from "@/lib/membership-plans-scroll";
import { WELCOME_OFFER_CODE } from "@/lib/new-member-promotion";
import { ArrowRight, Check, Tag } from "lucide-react";
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
      className={`welcome-offer-card relative mx-auto w-full max-w-[1200px] overflow-hidden rounded-[24px] border border-neutral-200/80 bg-[#FCFCFC] px-7 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_28px_rgba(15,23,42,0.05)] sm:px-9 sm:py-6 lg:flex lg:min-h-[190px] lg:max-h-[220px] lg:items-center lg:px-11 lg:py-7 ${className}`}
      aria-label={copy.badge}
      data-testid="membership-welcome-offer"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[24px]"
        style={{
          background:
            "radial-gradient(ellipse 55% 80% at 100% 50%, rgba(46,107,63,0.045), transparent 62%), radial-gradient(ellipse 40% 50% at 0% 100%, rgba(236,180,200,0.035), transparent 55%)",
        }}
        aria-hidden
      />

      <div className="relative flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:gap-16 xl:gap-20">
        <div className="min-w-0 lg:w-[62%]">
          <span className="inline-flex items-center rounded-full bg-[#EEF7F0] px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[#2E6B3F] sm:text-[0.65rem]">
            {copy.badge}
          </span>

          <h2 className="mt-2.5 max-w-xl font-heading text-[1.625rem] font-bold leading-[1.12] tracking-[-0.02em] text-[#2B2B2B] sm:text-[1.875rem] lg:text-[2.25rem]">
            {copy.headline}
          </h2>

          <p className="mt-1.5 text-sm leading-snug text-[#4B5563]">{copy.supporting}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">{copy.footnote}</p>
        </div>

        <div className="relative min-w-0 lg:w-[38%]">
          <div
            className="pointer-events-none absolute -right-2 top-1/2 h-24 w-28 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(46,107,63,0.07)_0%,transparent_72%)]"
            aria-hidden
          />

          <div className="relative flex flex-col gap-6">
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className={`welcome-offer-coupon group w-full rounded-[18px] border border-dashed border-[#2E6B3F]/28 bg-[#F3FAF5] px-3 py-2.5 text-left transition-[border-color,background-color] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] sm:px-3.5 ${copied ? "border-[#2E6B3F]/45 bg-[#EBF5EE]" : ""}`}
              aria-label={copied ? copy.copied : copy.copyCode}
            >
              <span className="mb-1 inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/80 text-[#2E6B3F]">
                <Tag className="h-3 w-3" aria-hidden />
              </span>
              <p className="font-mono text-base font-semibold tracking-[0.18em] text-[#2E6B3F] sm:text-lg">
                {WELCOME_OFFER_CODE}
              </p>
              <p className="mt-0.5 text-[0.6875rem] font-medium text-[#6B7280] transition-colors duration-200 group-hover:text-[#2E6B3F]">
                {copied ? (
                  <span className="inline-flex items-center gap-1 text-[#2E6B3F]">
                    <Check className="h-3 w-3" aria-hidden />
                    {copy.copied}
                  </span>
                ) : (
                  copy.clickToCopy
                )}
              </p>
            </button>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[#2E6B3F]/32 bg-[#FAFDFB] px-3 text-sm font-semibold text-[#2E6B3F] transition-[border-color,background-color,box-shadow] duration-200 hover:border-[#2E6B3F]/48 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] sm:max-w-[42%]"
                aria-label={copied ? copy.copied : copy.copyCode}
              >
                {copied ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {copy.copied}
                  </span>
                ) : (
                  copy.copy
                )}
              </button>

              <button
                type="button"
                onClick={handleActivate}
                className="welcome-offer-activate inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2E6B3F] px-4 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(46,107,63,0.2)] transition-[background-color,box-shadow] duration-200 hover:bg-[#286035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] sm:min-w-0 sm:flex-[1.15]"
              >
                {copy.activate}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
