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
      className={`rounded-2xl border border-brand-teal/10 bg-gradient-to-br from-mint/15 via-[#FCFCFA] to-lavender/10 px-3.5 py-3 shadow-[0_4px_20px_rgba(15,60,55,0.04)] sm:px-4 sm:py-3.5 ${className}`}
      aria-label={copy.badge}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal/15 bg-white/90 px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-brand-teal">
            <Sparkles className="h-3 w-3" aria-hidden />
            {copy.badge}
          </span>
          <h2 className="mt-2 font-heading text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
            {copy.headline}
          </h2>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted/80">{copy.supporting}</p>
        </div>

        <div className="w-full shrink-0 lg:max-w-[18rem]">
          <button
            type="button"
            onClick={() => void handleCopyCode()}
            className={`membership-coupon-ticket group w-full rounded-xl border-2 border-dashed border-brand-teal/30 bg-white/90 px-3.5 py-2.5 text-center shadow-[0_2px_12px_rgba(15,60,55,0.06)] transition hover:border-brand-teal/45 hover:bg-white hover:shadow-[0_4px_16px_rgba(15,60,55,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${copied ? "membership-coupon-copied" : ""} ${copyBouncing ? "membership-copy-bounce" : ""}`}
            aria-label={copied ? copy.copied : copy.copyCode}
          >
            <span className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-mint/40 text-brand-teal">
              <Tag className="h-3.5 w-3.5" aria-hidden />
            </span>
            <p className="font-mono text-sm font-semibold tracking-[0.2em] text-brand-teal sm:text-base">
              {WELCOME_OFFER_CODE}
            </p>
            <p className="mt-1 text-[0.68rem] font-medium text-muted/75 transition group-hover:text-brand-teal/80">
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

          <div className="mt-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-brand-teal/25 bg-white px-3 text-xs font-medium text-brand-teal transition hover:border-brand-teal/40 hover:bg-mint/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
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
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-teal px-5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(46,107,63,0.22)] transition hover:bg-brand-teal-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
            >
              {copy.activate}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
