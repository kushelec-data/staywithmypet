"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { MembershipRole } from "@/lib/membership";
import { scrollToMembershipPlans } from "@/lib/membership-plans-scroll";
import { WELCOME_OFFER_CODE } from "@/lib/new-member-promotion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
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
  const [copyBouncing, setCopyBouncing] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const copyBounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      if (copyBounceTimerRef.current) window.clearTimeout(copyBounceTimerRef.current);
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
    setCopyBouncing(true);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    if (copyBounceTimerRef.current) window.clearTimeout(copyBounceTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    copyBounceTimerRef.current = window.setTimeout(() => setCopyBouncing(false), 320);
  }, []);

  return (
    <section
      className={`welcome-offer-card relative mx-auto w-full max-w-[1200px] overflow-hidden rounded-[24px] border border-neutral-200/90 bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_rgba(15,23,42,0.06)] sm:px-8 sm:py-7 lg:min-h-[220px] lg:max-h-[260px] lg:px-10 lg:py-8 ${className}`}
      aria-label={copy.badge}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[24px] opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 0% 0%, rgba(46,107,63,0.04), transparent 55%), radial-gradient(ellipse 70% 60% at 100% 100%, rgba(46,107,63,0.03), transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 xl:gap-14">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5EC] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#2E6B3F] sm:text-[0.7rem]">
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
            {copy.badge}
          </span>

          <h2 className="mt-4 font-heading text-[2rem] font-bold leading-[1.08] tracking-[-0.02em] text-[#2B2B2B] sm:text-[2.5rem] lg:text-[3rem] xl:text-[48px]">
            <span className="block">{copy.headlineLine1}</span>
            <span className="block">{copy.headlineLine2}</span>
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#4B5563] sm:text-[0.9375rem]">
            {copy.supporting}
          </p>
          <p className="mt-1.5 text-xs text-[#6B7280] sm:text-sm">{copy.footnote}</p>
        </div>

        <div className="relative flex min-w-0 flex-col gap-3 sm:gap-3.5">
          <div
            className="pointer-events-none absolute -right-4 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(46,107,63,0.08)_0%,transparent_70%)] sm:h-40 sm:w-40"
            aria-hidden
          />

          <button
            type="button"
            onClick={() => void handleCopyCode()}
            className={`welcome-offer-coupon group relative w-full rounded-2xl border-2 border-dashed border-[#2E6B3F]/25 bg-[#F6FBF7] px-4 py-4 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] sm:px-5 sm:py-4 ${copied ? "membership-coupon-copied" : ""} ${copyBouncing ? "membership-copy-bounce" : ""}`}
            aria-label={copied ? copy.copied : copy.copyCode}
          >
            <p className="font-mono text-xl font-semibold tracking-[0.22em] text-[#2E6B3F] sm:text-2xl">
              {WELCOME_OFFER_CODE}
            </p>
            <p className="mt-1.5 text-xs font-medium text-[#6B7280] transition-colors duration-200 group-hover:text-[#2E6B3F] sm:text-sm">
              {copied ? (
                <span className="inline-flex items-center justify-center gap-1.5 text-[#2E6B3F]">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {copy.copied}
                </span>
              ) : (
                copy.clickToCopy
              )}
            </p>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyCode()}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#2E6B3F]/35 bg-white px-4 text-sm font-semibold text-[#2E6B3F] transition-[border-color,background-color,box-shadow] duration-200 hover:border-[#2E6B3F]/55 hover:bg-[#FAFDFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F]"
            aria-label={copied ? copy.copied : copy.copyCode}
          >
            {copied ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden />
                {copy.copied}
              </span>
            ) : (
              copy.copy
            )}
          </button>

          <button
            type="button"
            onClick={handleActivate}
            className="welcome-offer-activate inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E6B3F] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(46,107,63,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] sm:h-[3.25rem] sm:text-[0.9375rem]"
          >
            {copy.activate}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
