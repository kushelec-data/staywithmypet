"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  newMemberPromotionMembershipHref,
  type WelcomeOfferDisplayMode,
} from "@/lib/new-member-promotion";
import type { MembershipRole } from "@/lib/membership";
import { DASHBOARD_CALLOUT_CLASS } from "@/lib/dashboard-theme";

type NewMemberPromotionBannerProps = {
  role: MembershipRole;
  /** none hides the banner; marketing = logged-out/general; confirmed = authenticated eligible. */
  displayMode: WelcomeOfferDisplayMode;
  loggedIn: boolean;
  returnTo?: string | null;
  /** Compact single-line style for dashboard. */
  variant?: "default" | "compact" | "strip";
  className?: string;
};

export function NewMemberPromotionBanner({
  role,
  displayMode,
  loggedIn,
  returnTo,
  variant = "default",
  className = "",
}: NewMemberPromotionBannerProps) {
  const { t } = useLanguage();
  const promo = t.newMemberPromotion;

  if (displayMode === "none") return null;

  const href = newMemberPromotionMembershipHref({ role, loggedIn, returnTo });
  const isConfirmed = displayMode === "confirmed";

  if (variant === "compact" && isConfirmed) {
    return (
      <div className={`${DASHBOARD_CALLOUT_CLASS} p-4 sm:p-5 ${className}`}>
        <p className="text-sm text-foreground">{promo.dashboardBannerBody}</p>
        <Button href={href} size="sm" className="mt-3">
          {promo.activateMembershipCta}
        </Button>
      </div>
    );
  }

  if (variant === "strip") {
    return (
      <div
        className={`flex flex-col gap-3 rounded-2xl border border-lavender/80 bg-lavender/45 px-4 py-3 shadow-[0_4px_16px_rgba(46,107,63,0.08)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className}`}
        role="region"
        aria-label={promo.bannerAriaLabel}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-white/70 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-brand-teal">
            {promo.planBadge}
          </span>
          <p className="text-sm font-semibold leading-snug text-foreground">
            {promo.stripOfferLine}
          </p>
        </div>
        <Button href={href} size="sm" className="w-full shrink-0 sm:w-auto">
          {promo.activateMembershipCta}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-brand-teal/25 bg-mint/35 p-4 sm:p-5 ${className}`}
      role="region"
      aria-label={promo.bannerAriaLabel}
    >
      <p className="font-heading text-lg font-bold uppercase tracking-wide text-brand-teal">
        {promo.discountHeadline}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground sm:text-base">
        {promo.offerSupportingCopy}
      </p>
      <p className="mt-2 text-xs text-muted">{promo.checkoutNote}</p>
      <div className="mt-3">
        <Button href={href} size="sm">
          {promo.activateMembershipCta}
        </Button>
      </div>
    </div>
  );
}
