"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { MembershipRole } from "@/lib/membership";
import { scrollToMembershipPlans } from "@/lib/membership-plans-scroll";
import { WELCOME_OFFER_CODE } from "@/lib/new-member-promotion";
import { ArrowRight, Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type MembershipWelcomeOfferHeroProps = {
  role: MembershipRole;
  returnTo?: string | null;
  className?: string;
};

function copyButtonLabel(copyLabel: string, code: string): string {
  const verb = copyLabel.trim().split(/\s+/)[0] ?? copyLabel;
  return `${verb} ${code}`;
}

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
      className={`welcome-offer-card relative w-full overflow-hidden rounded-[22px] border border-brand-teal/10 bg-gradient-to-br from-mint/30 via-background to-lavender/20 px-6 py-7 shadow-[0_8px_32px_rgba(15,23,42,0.05)] sm:px-8 sm:py-8 ${className}`}
      aria-label={copy.badge}
      data-testid="membership-welcome-offer"
    >
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-brand-teal sm:text-[0.65rem]">
          {copy.badge}
        </span>

        <h2 className="mt-4 font-heading text-[1.75rem] font-bold leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[2rem]">
          {copy.headline}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-[0.9375rem]">
          {copy.supporting}
        </p>
        <p className="mt-2 text-xs text-muted/80">{copy.footnote}</p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void handleCopyCode()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-teal/25 bg-background/80 px-4 text-sm font-semibold text-brand-teal transition hover:border-brand-teal/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal sm:min-w-[11rem]"
            aria-label={copied ? copy.copied : copy.copyCode}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 shrink-0" aria-hidden />
                {copy.copied}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 shrink-0" aria-hidden />
                {copyButtonLabel(copy.copy, WELCOME_OFFER_CODE)}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleActivate}
            className="welcome-offer-activate inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-teal px-5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(46,107,63,0.18)] transition hover:bg-brand-teal-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal sm:min-w-[12rem]"
          >
            {copy.activate}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
