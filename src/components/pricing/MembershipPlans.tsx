"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";
import { ACCOUNT_CARD_CLASS } from "@/lib/account-ui";
import { MEMBERSHIP_PATH } from "@/lib/auth-routing";
import { formatMembershipDate, isMembershipPlanPurchasable, ACTIVE_MEMBERSHIP_CHECKOUT_CONFLICT_CODE } from "@/lib/membership";
import type { MembershipPlanDefinition, MembershipRole } from "@/lib/membership";
import {
  checkoutRuntimeErrorForPlan,
  clearPlanCheckoutError,
  isOtherPlanBlockedByActiveMembership,
  isPlanCheckoutLoading,
  planConfigErrorForPlan,
  setPlanCheckoutError,
  type PlanCheckoutErrors,
} from "@/lib/membership-plan-checkout-state";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { WelcomeOfferDisplayMode } from "@/lib/new-member-promotion";

export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  dailyValue?: string;
  features: readonly string[];
  popular?: boolean;
  stripePriceId?: string | null;
};

type MembershipPlansProps = {
  /** Account page: checkout CTAs; marketing: links to signup/membership */
  variant?: "marketing" | "account";
  /** Active plan id for current mode (account page). */
  activePlanId?: string | null;
  currentPlanLabel?: string | null;
  /** @deprecated Prefer modeFilter — kept for marketing pages */
  initialTab?: "owner" | "friend";
  /** When set (account page), show only this role's plans — no role tabs. */
  modeFilter?: "owner" | "friend";
  /** Stripe-ready plans; when omitted, uses i18n pricing tables. */
  plans?: MembershipPlanDefinition[];
  /** Signed-in user id for Stripe Checkout (account page). */
  checkoutUserId?: string;
  checkoutRole?: MembershipRole;
  enableCheckout?: boolean;
  /** Server-resolved per-plan config errors, e.g. missing STRIPE_FRIEND_ONE_YEAR_PRICE_ID. */
  planCheckoutErrors?: Record<string, string | null>;
  /** After checkout, return user to this path (e.g. pet booking page). */
  checkoutReturnTo?: string | null;
  /** Legacy redirect to /test-access-code when Stripe is disabled. */
  useTestAccessFlow?: boolean;
  /** Label for Stripe checkout CTA (account page). */
  payWithStripeLabel?: string;
  /** Preferred checkout CTA label (e.g. Activate membership). */
  activateMembershipLabel?: string;
  /** Welcome-offer messaging on plan cards (no calculated prices). */
  promotionDisplayMode?: WelcomeOfferDisplayMode;
  promotionBadgeLabel?: string;
  promotionDiscountHeadline?: string;
  promotionCheckoutNote?: string;
  /** Secondary link to open platform access code form. */
  onOpenAccessCode?: (plan: PricingPlan) => void;
  accessCodeLinkLabel?: string;
  /** Active membership end date (shown on the current plan card). */
  activePlanEndDate?: string | null;
  activePlanEndDateLabel?: string;
  cancelPlanLabel?: string;
  cancelPlanLoading?: boolean;
  onCancelPlan?: () => void;
  /** When true, non-current plans for this role are disabled (account page). */
  roleHasActiveMembership?: boolean;
};

function planId(plan: PricingPlan | MembershipPlanDefinition): string {
  return "plan_id" in plan ? plan.plan_id : plan.id;
}

function planDisplayName(plan: PricingPlan | MembershipPlanDefinition): string {
  return "plan_name" in plan ? plan.plan_name : plan.name;
}

function planStripePriceId(plan: PricingPlan | MembershipPlanDefinition): string | null {
  if ("future_stripe_price_id" in plan) return plan.future_stripe_price_id;
  return plan.stripePriceId ?? null;
}

function planMatchesActive(
  plan: PricingPlan | MembershipPlanDefinition,
  activePlanId: string | null | undefined,
  currentPlanLabel: string | null | undefined,
): boolean {
  const id = planId(plan);
  if (activePlanId && id === activePlanId) return true;
  if (!currentPlanLabel?.trim()) return false;
  const normalized = currentPlanLabel.trim().toLowerCase();
  const name = planDisplayName(plan).toLowerCase();
  return name === normalized || id.toLowerCase() === normalized || normalized.includes(name);
}

function PlanCard({
  plan,
  variant,
  activePlanId,
  currentPlanLabel,
  getStartedLabel,
  choosePlanLabel,
  activePlanLabel,
  currentPlanButtonLabel,
  openingCheckoutLabel,
  redirectingLabel,
  checkoutUnavailableLabel,
  comingSoonLabel,
  activeMembershipExistsLabel,
  popularBadge,
  enableCheckout,
  useTestAccessFlow,
  checkoutUserId,
  checkoutRole,
  roleHasActiveMembership = false,
  checkoutLoadingPlanId,
  checkoutError,
  planConfigError,
  onChoosePlan,
  payWithStripeLabel,
  activateMembershipLabel,
  promotionDisplayMode = "none",
  promotionBadgeLabel,
  promotionDiscountHeadline,
  promotionCheckoutNote,
  onOpenAccessCode,
  accessCodeLinkLabel,
  activePlanEndDate,
  activePlanEndDateLabel,
  cancelPlanLabel,
  cancelPlanLoading,
  onCancelPlan,
}: {
  plan: PricingPlan;
  variant: "marketing" | "account";
  activePlanId?: string | null;
  currentPlanLabel?: string | null;
  getStartedLabel: string;
  choosePlanLabel: string;
  activePlanLabel: string;
  currentPlanButtonLabel: string;
  openingCheckoutLabel: string;
  redirectingLabel: string;
  checkoutUnavailableLabel: string;
  comingSoonLabel: string;
  activeMembershipExistsLabel: string;
  popularBadge: string;
  enableCheckout?: boolean;
  useTestAccessFlow?: boolean;
  checkoutUserId?: string;
  checkoutRole?: MembershipRole;
  roleHasActiveMembership?: boolean;
  checkoutLoadingPlanId?: string | null;
  checkoutError?: string | null;
  planConfigError?: string | null;
  onChoosePlan?: (plan: PricingPlan) => void;
  payWithStripeLabel?: string;
  activateMembershipLabel?: string;
  promotionDisplayMode?: WelcomeOfferDisplayMode;
  promotionBadgeLabel?: string;
  promotionDiscountHeadline?: string;
  promotionCheckoutNote?: string;
  onOpenAccessCode?: (plan: PricingPlan) => void;
  accessCodeLinkLabel?: string;
  activePlanEndDate?: string | null;
  activePlanEndDateLabel?: string;
  cancelPlanLabel?: string;
  cancelPlanLoading?: boolean;
  onCancelPlan?: () => void;
}) {
  const isCurrent =
    variant === "account" &&
    (Boolean(activePlanId) || Boolean(currentPlanLabel)) &&
    planMatchesActive(plan, activePlanId, currentPlanLabel);

  const blockedByActiveMembership = isOtherPlanBlockedByActiveMembership({
    variant,
    roleHasActiveMembership,
    isCurrentPlan: isCurrent,
  });

  const isLoading = isPlanCheckoutLoading(checkoutLoadingPlanId ?? null, plan.id);
  const purchaseDisabled = !isMembershipPlanPurchasable(plan.id);
  const canCheckout =
    variant === "account" &&
    (enableCheckout || useTestAccessFlow) &&
    !isCurrent &&
    !blockedByActiveMembership &&
    !purchaseDisabled &&
    !planConfigError &&
    Boolean(checkoutUserId) &&
    Boolean(checkoutRole) &&
    Boolean(onChoosePlan);

  const canCancel =
    variant === "account" &&
    isCurrent &&
    typeof onCancelPlan === "function" &&
    Boolean(cancelPlanLabel?.trim());

  const showComingSoon = purchaseDisabled && !isCurrent;

  const canOpenAccessCode =
    variant === "account" &&
    Boolean(onOpenAccessCode) &&
    Boolean(accessCodeLinkLabel) &&
    !isCurrent &&
    !purchaseDisabled &&
    !useTestAccessFlow;

  const isAccount = variant === "account";
  const checkoutCtaLabel =
    activateMembershipLabel ?? payWithStripeLabel ?? choosePlanLabel;
  const showPromotionOffer =
    promotionDisplayMode !== "none" &&
    !isCurrent &&
    !blockedByActiveMembership &&
    !showComingSoon;

  return (
    <article
      className={`relative mx-auto flex h-full w-full max-w-md flex-col sm:max-w-none ${
        isAccount
          ? `${ACCOUNT_CARD_CLASS} p-5 sm:p-6`
          : `card-elevated rounded-3xl bg-surface p-5 sm:p-6 lg:p-8 ${
              plan.popular || isCurrent ? "ring-2 ring-brand-teal/40 shadow-lg shadow-brand-teal/10" : ""
            }`
      } ${isAccount && (plan.popular || isCurrent) ? "ring-2 ring-[#2E6B3F]/25" : ""}`}
    >
      {plan.popular && !isCurrent && !showPromotionOffer ? (
        <span className="absolute -top-3 left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-[18rem] -translate-x-1/2 rounded-full bg-brand-teal px-3 py-1.5 text-center text-[0.65rem] font-semibold leading-tight tracking-normal text-white shadow-sm sm:w-auto sm:max-w-none sm:whitespace-nowrap sm:px-5 sm:text-xs">
          {popularBadge}
        </span>
      ) : null}
      {isCurrent ? (
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-pink px-4 py-1 text-xs font-semibold text-white shadow-sm">
          {activePlanLabel}
        </span>
      ) : showPromotionOffer && promotionBadgeLabel ? (
        <span className="absolute -top-3 left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-[18rem] -translate-x-1/2 rounded-full bg-brand-teal px-3 py-1.5 text-center text-[0.65rem] font-semibold leading-tight tracking-normal text-white shadow-sm sm:w-auto sm:max-w-none sm:whitespace-nowrap sm:px-4 sm:text-[0.7rem]">
          {promotionBadgeLabel}
        </span>
      ) : null}
      <h3
        className={`font-heading font-semibold capitalize text-foreground ${
          isAccount ? "text-base" : "text-lg sm:text-xl"
        } ${plan.popular || isCurrent || showPromotionOffer ? "pt-1 sm:pt-2" : ""}`}
      >
        {plan.name}
      </h3>
      <p
        className={`mt-2 font-heading font-bold ${
          isAccount
            ? "text-2xl text-[#2E6B3F]"
            : "text-3xl text-brand-teal sm:mt-3 sm:text-4xl"
        }`}
      >
        {plan.price}
      </p>
      {showPromotionOffer && promotionDiscountHeadline ? (
        <p className="mt-1 text-sm font-bold uppercase tracking-wide text-brand-teal">
          {promotionDiscountHeadline}
        </p>
      ) : null}
      {showPromotionOffer && promotionCheckoutNote ? (
        <p className="mt-1 text-xs text-muted">{promotionCheckoutNote}</p>
      ) : null}
      {plan.dailyValue ? (
        <p
          className={`mt-1 text-sm font-semibold text-[#2E6B3F] ${
            isAccount ? "" : "sm:mt-1.5"
          }`}
        >
          {plan.dailyValue}
        </p>
      ) : null}
      {isCurrent && activePlanEndDate && activePlanEndDateLabel ? (
        <p className={`mt-2 text-sm text-muted ${isAccount ? "" : "sm:mt-3"}`}>
          <span className="font-medium text-foreground">{activePlanEndDateLabel}: </span>
          {formatMembershipDate(activePlanEndDate) ?? activePlanEndDate}
        </p>
      ) : null}
      <ul
        className={`mt-4 flex-1 space-y-2.5 leading-relaxed text-muted sm:mt-5 sm:space-y-3 ${
          isAccount ? "text-sm" : "text-sm"
        }`}
      >
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="text-success shrink-0" aria-hidden>
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {variant === "marketing" ? (
        showComingSoon ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-6 w-full cursor-not-allowed opacity-60 sm:mt-8"
            size="lg"
            disabled
          >
            {comingSoonLabel}
          </Button>
        ) : (
          <Button
            href={`/login?next=${encodeURIComponent(MEMBERSHIP_PATH)}`}
            variant={plan.popular ? "primary" : "secondary"}
            className="mt-6 w-full sm:mt-8"
            size="lg"
          >
            {promotionDisplayMode !== "none" && activateMembershipLabel
              ? activateMembershipLabel
              : choosePlanLabel}
          </Button>
        )
      ) : (
        <>
          {planConfigError ? (
            <p className="mt-4 text-center text-sm text-amber-800" role="alert">
              {planConfigError}
            </p>
          ) : null}
          {checkoutError ? (
            <p className="mt-4 text-center text-sm text-red-600" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <Button
            type="button"
            variant={
              showComingSoon
                ? "secondary"
                : canCancel
                  ? "secondary"
                  : plan.popular
                    ? "primary"
                    : "secondary"
            }
            className={`mt-5 w-full sm:mt-6 ${showComingSoon || blockedByActiveMembership ? "cursor-not-allowed opacity-60" : isAccount ? "" : "sm:mt-8"}`}
            size={isAccount ? "sm" : "lg"}
            data-testid={
              canCheckout && enableCheckout && !useTestAccessFlow
                ? "membership-stripe-checkout-button"
                : undefined
            }
            disabled={
              showComingSoon || blockedByActiveMembership
                ? true
                : canCancel
                  ? cancelPlanLoading
                  : isCurrent || (!canCheckout && !isCurrent)
            }
            onClick={() => {
              if (canCancel && onCancelPlan) {
                onCancelPlan();
                return;
              }
              if (canCheckout && onChoosePlan) onChoosePlan(plan);
            }}
          >
            {isLoading
              ? enableCheckout && !useTestAccessFlow
                ? openingCheckoutLabel
                : redirectingLabel
              : showComingSoon
                ? comingSoonLabel
                : blockedByActiveMembership
                  ? activeMembershipExistsLabel
                  : canCancel
                    ? cancelPlanLoading
                      ? "…"
                      : cancelPlanLabel!
                    : isCurrent
                      ? currentPlanButtonLabel
                      : canCheckout
                        ? checkoutCtaLabel
                        : planConfigError ?? checkoutUnavailableLabel}
          </Button>
          {canOpenAccessCode ? (
            <button
              type="button"
              onClick={() => onOpenAccessCode!(plan)}
              className="mt-3 w-full text-center text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              {accessCodeLinkLabel}
            </button>
          ) : null}
        </>
      )}
    </article>
  );
}

export function activeModeToPricingTab(mode: ProfileActiveMode): "owner" | "friend" {
  return mode === "pet_friend" ? "friend" : "owner";
}

function membershipPlansToPricing(
  plans: MembershipPlanDefinition[],
  dailyValueById: Record<string, string | undefined>,
): PricingPlan[] {
  return plans.map((p) => ({
    id: p.plan_id,
    name: p.plan_name,
    price: p.price,
    dailyValue: dailyValueById[p.plan_id],
    features: p.features,
    popular: p.popular,
    stripePriceId: p.future_stripe_price_id,
  }));
}

export function MembershipPlans({
  variant = "marketing",
  activePlanId,
  currentPlanLabel,
  initialTab = "owner",
  modeFilter,
  plans: plansProp,
  checkoutUserId,
  checkoutRole,
  enableCheckout = false,
  planCheckoutErrors,
  checkoutReturnTo,
  useTestAccessFlow = false,
  payWithStripeLabel,
  activateMembershipLabel,
  promotionDisplayMode = "none",
  promotionBadgeLabel,
  promotionDiscountHeadline,
  promotionCheckoutNote,
  onOpenAccessCode,
  accessCodeLinkLabel,
  activePlanEndDate,
  activePlanEndDateLabel,
  cancelPlanLabel,
  cancelPlanLoading = false,
  onCancelPlan,
  roleHasActiveMembership = false,
}: MembershipPlansProps) {
  const { t } = useLanguage();
  const lockedTab = modeFilter ?? initialTab;
  const [tab, setTab] = useState<"owner" | "friend">(lockedTab);
  const pricingTab = modeFilter ?? tab;
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const [checkoutErrors, setCheckoutErrors] = useState<PlanCheckoutErrors>({});
  const showRoleTabs = variant === "marketing" && !modeFilter;

  useEffect(() => {
    setTab(modeFilter ?? initialTab);
  }, [modeFilter, initialTab]);

  const i18nPlans = tab === "owner" ? t.pricing.petParentPlans : t.pricing.petFriendPlans;
  const dailyValueById = Object.fromEntries(
    i18nPlans.map((plan) => [
      plan.id,
      "dailyValue" in plan ? plan.dailyValue : undefined,
    ]),
  ) as Record<string, string | undefined>;
  const rolePlans =
    plansProp?.filter((p) => p.role === (pricingTab === "owner" ? "pet_parent" : "pet_friend")) ??
    [];
  const plans: PricingPlan[] =
    variant === "account" && rolePlans.length > 0
      ? membershipPlansToPricing(rolePlans, dailyValueById)
      : i18nPlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          features: plan.features,
          popular: "popular" in plan ? plan.popular : undefined,
          dailyValue: "dailyValue" in plan ? plan.dailyValue : undefined,
        }));

  const effectiveCheckoutRole: MembershipRole | undefined =
    checkoutRole ?? (pricingTab === "owner" ? "pet_parent" : "pet_friend");

  async function handleChoosePlan(plan: PricingPlan) {
    if (!checkoutUserId || !effectiveCheckoutRole) return;
    if (roleHasActiveMembership) return;
    const selectedPlanId = planId(plan);
    if (!isMembershipPlanPurchasable(selectedPlanId)) return;
    setCheckoutErrors((prev) => clearPlanCheckoutError(prev, selectedPlanId));
    setCheckoutLoadingPlanId(selectedPlanId);

    if (useTestAccessFlow) {
      const params = new URLSearchParams({
        planId: selectedPlanId,
        role: effectiveCheckoutRole === "pet_parent" ? "parent" : "friend",
      });
      if (checkoutReturnTo) {
        params.set("returnTo", checkoutReturnTo);
      }
      window.location.href = `/test-access-code?${params.toString()}`;
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: effectiveCheckoutRole,
          planId: selectedPlanId,
          userId: checkoutUserId,
          returnTo: checkoutReturnTo ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        code?: string;
        planId?: string;
        priceEnv?: string | null;
      };
      if (!res.ok) {
        const message =
          data.code === ACTIVE_MEMBERSHIP_CHECKOUT_CONFLICT_CODE
            ? t.membershipCheckout.activeMembershipConflict
            : (data.error ?? t.pricing.checkoutError);
        throw new Error(message);
      }
      if (!data.url) {
        throw new Error(data.error ?? t.pricing.checkoutMissingUrl);
      }
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : t.pricing.checkoutError;
      setCheckoutErrors((prev) => setPlanCheckoutError(prev, selectedPlanId, message));
      setCheckoutLoadingPlanId(null);
    }
  }

  const membershipTabs = [
    { id: "owner" as const, label: t.roles.petParent.label, subtitle: t.roles.petParent.tagline },
    { id: "friend" as const, label: t.roles.petFriend.label, subtitle: t.roles.petFriend.tagline },
  ];

  return (
    <>
      {showRoleTabs ? (
        <div className="flex justify-center px-1">
          <div
            role="tablist"
            aria-label={t.common.membershipType}
            className="inline-flex max-w-full flex-row gap-1 rounded-full bg-mint/45 p-1 shadow-sm ring-1 ring-black/5"
          >
            {membershipTabs.map((item) => {
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(item.id)}
                  className={`rounded-full px-4 py-2 text-center transition-all duration-200 sm:px-5 sm:py-2.5 ${
                    selected
                      ? "bg-brand-teal text-white shadow-md shadow-brand-teal/20"
                      : "text-muted hover:bg-mint/60 hover:text-foreground"
                  }`}
                >
                  <span className="block text-xs font-semibold sm:text-sm">{item.label}</span>
                  <span
                    className={`mt-0.5 block text-[0.65rem] leading-tight sm:text-xs ${
                      selected ? "text-white/85" : "text-muted"
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className={`grid grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 ${
          showRoleTabs ? "mt-8 sm:mt-10 lg:mt-10" : variant === "account" ? "mt-0" : "mt-0"
        }`}
      >
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            variant={variant}
            activePlanId={activePlanId}
            currentPlanLabel={currentPlanLabel}
            getStartedLabel={t.pricing.getStarted}
            choosePlanLabel={t.pricing.choosePlan}
            activePlanLabel={t.pricing.activePlan}
            currentPlanButtonLabel={t.pricing.currentPlan}
            openingCheckoutLabel={t.pricing.openingCheckout}
            redirectingLabel={t.pricing.redirecting}
            checkoutUnavailableLabel={t.pricing.checkoutError}
            comingSoonLabel={t.pricing.comingSoon}
            activeMembershipExistsLabel={t.pricing.activeMembershipExists}
            popularBadge={t.pricing.mostPopular}
            enableCheckout={enableCheckout}
            useTestAccessFlow={useTestAccessFlow}
            checkoutUserId={checkoutUserId}
            checkoutRole={effectiveCheckoutRole}
            checkoutLoadingPlanId={checkoutLoadingPlanId}
            checkoutError={checkoutRuntimeErrorForPlan(checkoutErrors, plan.id)}
            planConfigError={planConfigErrorForPlan(planCheckoutErrors, plan.id)}
            onChoosePlan={enableCheckout || useTestAccessFlow ? handleChoosePlan : undefined}
            payWithStripeLabel={payWithStripeLabel}
            activateMembershipLabel={activateMembershipLabel}
            promotionDisplayMode={promotionDisplayMode}
            promotionBadgeLabel={promotionBadgeLabel}
            promotionDiscountHeadline={promotionDiscountHeadline}
            promotionCheckoutNote={promotionCheckoutNote}
            onOpenAccessCode={onOpenAccessCode}
            accessCodeLinkLabel={accessCodeLinkLabel}
            activePlanEndDate={activePlanEndDate}
            activePlanEndDateLabel={activePlanEndDateLabel}
            cancelPlanLabel={cancelPlanLabel}
            cancelPlanLoading={cancelPlanLoading}
            onCancelPlan={onCancelPlan}
            roleHasActiveMembership={roleHasActiveMembership}
          />
        ))}
      </div>
    </>
  );
}
