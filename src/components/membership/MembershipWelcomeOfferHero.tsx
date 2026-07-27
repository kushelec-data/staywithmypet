"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { MembershipRole } from "@/lib/membership";
import { scrollToMembershipPlans } from "@/lib/membership-plans-scroll";
import { WELCOME_OFFER_CODE } from "@/lib/new-member-promotion";
import { Check, Copy } from "lucide-react";
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
      className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br from-lavender/70 via-[#FAF5FF] to-mint/45 px-5 py-6 shadow-[0_16px_48px_rgba(46,107,63,0.08)] sm:px-8 sm:py-8 ${className}`}
      aria-label={copy.badge}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-pink/15 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-brand-teal/10 blur-2xl"
        aria-hidden
      />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-teal">
            {copy.badge}
          </span>
          <h2 className="mt-4 font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
            {copy.headline}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            {copy.supporting}
          </p>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_8px_32px_rgba(15,60,55,0.08)] backdrop-blur-sm">
          <p className="text-center font-mono text-2xl font-bold tracking-[0.2em] text-foreground">
            {WELCOME_OFFER_CODE}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className={`membership-upgrade-btn-lift inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E2D8] bg-[#F8F6F1] px-5 text-sm font-semibold text-foreground transition hover:border-brand-teal/30 hover:bg-mint/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal sm:flex-none ${copyBouncing ? "membership-copy-bounce" : ""}`}
              aria-label={copied ? copy.copied : copy.copyCode}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-brand-teal" aria-hidden />
                  {copy.copied}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden />
                  {copy.copy}
                </>
              )}
            </button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="membership-upgrade-btn-lift w-full sm:w-auto sm:min-w-[11rem]"
              onClick={handleActivate}
            >
              {copy.activate}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
