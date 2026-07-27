"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { MembershipRole } from "@/lib/membership";
import { scrollToMembershipPlans } from "@/lib/membership-plans-scroll";
import { WELCOME_OFFER_CODE } from "@/lib/new-member-promotion";
import {
  ArrowRight,
  Check,
  Clipboard,
  Sparkles,
  Tag,
} from "lucide-react";
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
  const discountBadge = t.newMemberPromotion.discountHeadline;
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
      className={`relative overflow-hidden rounded-2xl border border-brand-teal/20 bg-gradient-to-br from-mint/45 via-lavender/35 to-brand-pink/20 px-3.5 py-3 shadow-[0_10px_36px_rgba(46,107,63,0.14)] sm:px-4 sm:py-3.5 ${className}`}
      aria-label={copy.badge}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand-pink/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-brand-teal/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/3 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-lavender/30 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between lg:gap-5">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/75 px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-brand-teal shadow-sm">
            <Sparkles className="h-3 w-3" aria-hidden />
            {copy.badge}
          </span>

          <div className="mt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
            <span
              className="inline-flex h-[3.25rem] w-[3.25rem] shrink-0 -rotate-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal via-[#3d8b55] to-brand-teal-hover text-center text-[0.62rem] font-bold leading-tight tracking-wide text-white shadow-[0_6px_18px_rgba(46,107,63,0.35)] sm:h-14 sm:w-14 sm:text-[0.68rem]"
              aria-hidden
            >
              {discountBadge}
            </span>
            <h2 className="min-w-0 flex-1 font-heading text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
              {copy.headline}
            </h2>
          </div>

          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-foreground/65">{copy.supporting}</p>
        </div>

        <div className="relative w-full shrink-0 lg:max-w-[18rem]">
          <div className="rounded-xl bg-gradient-to-br from-mint/40 via-white/50 to-lavender/35 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <div
              className="pointer-events-none absolute inset-2 rounded-lg opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(46,107,63,0.12) 0, transparent 45%), radial-gradient(circle at 80% 80%, rgba(236,180,200,0.15) 0, transparent 40%)",
              }}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className={`membership-coupon-ticket group relative w-full rounded-lg border-2 border-dashed border-brand-teal/35 bg-white/55 px-3 py-2 text-center shadow-[0_3px_14px_rgba(15,60,55,0.08)] backdrop-blur-[1px] transition hover:border-brand-teal/50 hover:bg-white/70 hover:shadow-[0_6px_20px_rgba(15,60,55,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${copied ? "membership-coupon-copied" : ""} ${copyBouncing ? "membership-copy-bounce" : ""}`}
              aria-label={copied ? copy.copied : copy.copyCode}
            >
              <span className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-mint/50 text-brand-teal">
                <Tag className="h-3 w-3" aria-hidden />
              </span>
              <p className="font-mono text-sm font-semibold tracking-[0.2em] text-brand-teal sm:text-base">
                {WELCOME_OFFER_CODE}
              </p>
              <p className="mt-0.5 text-[0.68rem] font-medium text-foreground/55 transition group-hover:text-brand-teal/85">
                {copied ? (
                  <span className="inline-flex items-center justify-center gap-1 text-brand-teal">
                    <Check className="h-3 w-3" aria-hidden />
                    {copy.copied}
                  </span>
                ) : (
                  copy.clickToCopy
                )}
              </p>
            </button>

            <div className="relative mt-2 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-brand-teal/30 bg-mint/25 px-3 text-xs font-medium text-brand-teal transition hover:border-brand-teal/45 hover:bg-mint/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
                aria-label={copied ? copy.copied : copy.copyCode}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {copy.copied}
                  </>
                ) : (
                  <>
                    <Clipboard className="h-3.5 w-3.5" aria-hidden />
                    {copy.copy}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleActivate}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-teal px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(46,107,63,0.28)] transition hover:bg-brand-teal-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
              >
                {copy.activate}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
