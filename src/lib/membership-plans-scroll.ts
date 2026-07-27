import type { MembershipRole } from "@/lib/membership";
import { buildMembershipPagePath } from "@/lib/membership-return";

export const MEMBERSHIP_PLANS_SECTION_ID = "membership-plans";

export const MEMBERSHIP_PLAN_POPULAR_SELECTOR = '[data-membership-plan-popular="true"]';

const POPULAR_HIGHLIGHT_CLASS = "membership-plan-popular-highlight";
const HIGHLIGHT_MS = 1400;
const FOCUS_DELAY_MS = 280;

export function membershipActivateFallbackHref(
  role: MembershipRole,
  returnTo?: string | null,
): string {
  return buildMembershipPagePath({ role, returnTo });
}

export type ScrollToMembershipPlansOptions = {
  role?: MembershipRole;
  returnTo?: string | null;
  navigate?: (href: string) => void;
};

/**
 * Scrolls to pricing cards on the membership page. When the section is missing,
 * navigates to the membership page (preserving role + returnTo).
 */
export function scrollToMembershipPlans(options: ScrollToMembershipPlansOptions = {}): boolean {
  if (typeof document === "undefined") return false;

  const section = document.getElementById(MEMBERSHIP_PLANS_SECTION_ID);
  if (!section) {
    if (options.role && options.navigate) {
      options.navigate(membershipActivateFallbackHref(options.role, options.returnTo));
      return true;
    }
    return false;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const popularPlan = section.querySelector<HTMLElement>(MEMBERSHIP_PLAN_POPULAR_SELECTOR);
  const scrollTarget = popularPlan ?? section;

  scrollTarget.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: popularPlan ? "center" : "start",
  });

  window.setTimeout(() => {
    if (popularPlan && !prefersReducedMotion) {
      popularPlan.classList.add(POPULAR_HIGHLIGHT_CLASS);
      window.setTimeout(() => popularPlan.classList.remove(POPULAR_HIGHLIGHT_CLASS), HIGHLIGHT_MS);
    }

    const focusTarget =
      popularPlan?.querySelector<HTMLElement>("[data-membership-plan-focus]:not([disabled])") ??
      section.querySelector<HTMLElement>("[data-membership-plan-focus]:not([disabled])") ??
      section.querySelector<HTMLElement>(
        '[data-membership-plan-card] button[type="button"]:not([disabled])',
      );
    focusTarget?.focus({ preventScroll: true });
  }, prefersReducedMotion ? 0 : FOCUS_DELAY_MS);

  return true;
}
