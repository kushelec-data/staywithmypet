"use client";

import { MembershipFloatingDogIllustration } from "@/components/membership/MembershipFloatingDogIllustration";
import { useLanguage } from "@/context/LanguageContext";
import type { MembershipRole } from "@/lib/membership";
import {
  dismissMembershipFloatingBanner,
  isMembershipFloatingBannerDismissed,
} from "@/lib/membership-floating-banner";
import { scrollToMembershipPlans } from "@/lib/membership-plans-scroll";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type BannerPhase = "idle" | "entering" | "visible" | "closing";

type MembershipFloatingDogBannerProps = {
  role?: MembershipRole;
  returnTo?: string | null;
};

const CLOSE_MS = 320;

export function MembershipFloatingDogBanner({
  role = "pet_parent",
  returnTo = null,
}: MembershipFloatingDogBannerProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const copy = t.account.membershipPage.floatingBanner;
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<BannerPhase>("idle");
  const enteredRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    if (isMembershipFloatingBannerDismissed()) return;

    enteredRef.current = true;
    setPhase("entering");

    const settleTimer = window.setTimeout(() => {
      setPhase("visible");
    }, 850);

    return () => {
      window.clearTimeout(settleTimer);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleViewPlans = useCallback(() => {
    scrollToMembershipPlans({
      role,
      returnTo,
      navigate: (href) => router.push(href),
    });
  }, [role, returnTo, router]);

  const handleClose = useCallback(() => {
    dismissMembershipFloatingBanner();
    setPhase("closing");
    closeTimerRef.current = window.setTimeout(() => {
      setPhase("idle");
    }, CLOSE_MS);
  }, []);

  if (!mounted || phase === "idle") return null;

  const motionClass =
    phase === "closing"
      ? "membership-floating-banner-exit"
      : phase === "entering"
        ? "membership-floating-banner-enter"
        : "";

  return createPortal(
    <div
      className="membership-floating-banner-shell pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3 sm:px-4"
      data-membership-floating-banner-root
    >
      <div
        className={`pointer-events-auto relative w-full max-w-[720px] ${motionClass}`}
        role="complementary"
        aria-label={copy.headline}
      >
        <div className="relative overflow-hidden rounded-2xl border border-brand-teal/10 bg-gradient-to-br from-mint/30 via-mint/10 to-lavender/20 shadow-[0_6px_20px_rgba(43,43,43,0.06)] backdrop-blur-[2px]">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-2 top-2 z-[2] inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted transition hover:bg-mint/30 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
            aria-label={copy.closeLabel}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="flex flex-col gap-2.5 p-3 pr-11 sm:flex-row sm:items-center sm:gap-3 sm:p-3 sm:pr-12">
            <div className="flex min-w-0 items-end gap-2 sm:shrink-0">
              <MembershipFloatingDogIllustration className="membership-floating-dog-illustration h-11 w-auto shrink-0 sm:h-14" />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium leading-snug text-foreground">
                {copy.headline}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted">
                {copy.supporting}
              </p>
            </div>

            <button
              type="button"
              onClick={handleViewPlans}
              className="inline-flex h-8 shrink-0 items-center justify-center self-start rounded-full bg-brand-teal px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-teal-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal sm:self-center sm:px-4 sm:text-sm"
            >
              {copy.viewPlans}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
