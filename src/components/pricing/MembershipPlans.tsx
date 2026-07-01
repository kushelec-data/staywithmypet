"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";
import { ACCOUNT_CARD_CLASS } from "@/lib/account-ui";
import { MEMBERSHIP_PATH } from "@/lib/auth-routing";
import { formatMembershipDate, isMembershipPlanPurchasable } from "@/lib/membership";
import type { MembershipPlanDefinition, MembershipRole } from "@/lib/membership";
import type { ProfileActiveMode } from "@/lib/profile-mode";

export type PricingPlan = {
  id: string;
  name: string;
  price: string;
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
  /** Server-resolved per-plan config errors, e.g. "Missing STRIPE_PRICE_PARENT_3M". */
  planCheckoutErrors?: Record<string, string | null>;
  /** After checkout, return user to this path (e.g. pet booking page). */
  checkoutReturnTo?: string | null;
  /** When true, plan selection redirects to /test-access-code instead of Stripe. */
  useTestAccessFlow?: boolean;
  /** Active membership end date (shown on the current plan card). */
  activePlanEndDate?: string | null;
  activePlanEndDateLabel?: string;
  cancelPlanLabel?: string;
  cancelPlanLoading?: boolean;
  onCancelPlan?: () => void;
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
  redirectingLabel,
  checkoutUnavailableLabel,
  comingSoonLabel,
  popularBadge,
  enableCheckout,
  useTestAccessFlow,
  checkoutUserId,
  checkoutRole,
  checkoutLoadingPlanId,
  checkoutError,
  planConfigError,
  onChoosePlan,
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
  redirectingLabel: string;
  checkoutUnavailableLabel: string;
  comingSoonLabel: string;
  popularBadge: string;
  enableCheckout?: boolean;
  useTestAccessFlow?: boolean;
  checkoutUserId?: string;
  checkoutRole?: MembershipRole;
  checkoutLoadingPlanId?: string | null;
  checkoutError?: string | null;
  planConfigError?: string | null;
  onChoosePlan?: (plan: PricingPlan) => void;
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

  const isLoading = checkoutLoadingPlanId === plan.id;
  const purchaseDisabled = !isMembershipPlanPurchasable(plan.id);
  const canCheckout =
    variant === "account" &&
    (enableCheckout || useTestAccessFlow) &&
    !isCurrent &&
    !purchaseDisabled &&
    !planConfigError &&
    Boolean(checkoutUserId) &&
    Boolean(checkoutRole) &&
    Boolean(onChoosePlan);

  const canCancel =
    variant === "account" && isCurrent && Boolean(onCancelPlan) && Boolean(cancelPlanLabel);

  const showComingSoon = purchaseDisabled && !isCurrent && !canCancel;

  const isAccount = variant === "account";

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
      {plan.popular && !isCurrent ? (
        <span className="absolute -top-3 left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-[18rem] -translate-x-1/2 rounded-full bg-brand-teal px-3 py-1.5 text-center text-[0.65rem] font-semibold leading-tight tracking-normal text-white shadow-sm sm:w-auto sm:max-w-none sm:whitespace-nowrap sm:px-5 sm:text-xs">
          {popularBadge}
        </span>
      ) : null}
      {isCurrent ? (
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-pink px-4 py-1 text-xs font-semibold text-white shadow-sm">
          {activePlanLabel}
        </span>
      ) : null}
      <h3
        className={`font-heading font-semibold capitalize text-foreground ${
          isAccount ? "text-base" : "text-lg sm:text-xl"
        } ${plan.popular || isCurrent ? "pt-1 sm:pt-2" : ""}`}
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
            {choosePlanLabel}
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
            className={`mt-5 w-full sm:mt-6 ${showComingSoon ? "cursor-not-allowed opacity-60" : isAccount ? "" : "sm:mt-8"}`}
            size={isAccount ? "sm" : "lg"}
            disabled={
              showComingSoon
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
              ? redirectingLabel
              : showComingSoon
                ? comingSoonLabel
                : canCancel
                  ? cancelPlanLoading
                    ? "…"
                    : cancelPlanLabel!
                  : isCurrent
                    ? currentPlanButtonLabel
                    : canCheckout
                      ? choosePlanLabel
                      : planConfigError ?? checkoutUnavailableLabel}
          </Button>
        </>
      )}
    </article>
  );
}

export function activeModeToPricingTab(mode: ProfileActiveMode): "owner" | "friend" {
  return mode === "pet_friend" ? "friend" : "owner";
}

function membershipPlansToPricing(plans: MembershipPlanDefinition[]): PricingPlan[] {
  return plans.map((p) => ({
    id: p.plan_id,
    name: p.plan_name,
    price: p.price,
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
  activePlanEndDate,
  activePlanEndDateLabel,
  cancelPlanLabel,
  cancelPlanLoading = false,
  onCancelPlan,
}: MembershipPlansProps) {
  const { t } = useLanguage();
  const lockedTab = modeFilter ?? initialTab;
  const [tab, setTab] = useState<"owner" | "friend">(lockedTab);
  const pricingTab = modeFilter ?? tab;
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const showRoleTabs = variant === "marketing" && !modeFilter;

  useEffect(() => {
    setTab(modeFilter ?? initialTab);
  }, [modeFilter, initialTab]);

  const i18nPlans = tab === "owner" ? t.pricing.petParentPlans : t.pricing.petFriendPlans;
  const rolePlans =
    plansProp?.filter((p) => p.role === (pricingTab === "owner" ? "pet_parent" : "pet_friend")) ??
    [];
  const plans =
    variant === "account" && rolePlans.length > 0
      ? membershipPlansToPricing(rolePlans)
      : i18nPlans;

  const effectiveCheckoutRole: MembershipRole | undefined =
    checkoutRole ?? (pricingTab === "owner" ? "pet_parent" : "pet_friend");

  async function handleChoosePlan(plan: PricingPlan) {
    if (!checkoutUserId || !effectiveCheckoutRole) return;
    if (!isMembershipPlanPurchasable(plan.id)) return;
    setCheckoutError(null);
    setCheckoutLoadingPlanId(plan.id);

    if (useTestAccessFlow) {
      const params = new URLSearchParams({
        planId: planId(plan),
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
          planId: planId(plan),
          userId: checkoutUserId,
          returnTo: checkoutReturnTo ?? undefined,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? t.pricing.checkoutError);
      }
      if (!data.url) {
        throw new Error(data.error ?? t.pricing.checkoutMissingUrl);
      }
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : t.pricing.checkoutError);
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
            redirectingLabel={t.pricing.redirecting}
            checkoutUnavailableLabel={t.pricing.checkoutError}
            comingSoonLabel={t.pricing.comingSoon}
            popularBadge={t.pricing.mostPopular}
            enableCheckout={enableCheckout}
            useTestAccessFlow={useTestAccessFlow}
            checkoutUserId={checkoutUserId}
            checkoutRole={effectiveCheckoutRole}
            checkoutLoadingPlanId={checkoutLoadingPlanId}
            checkoutError={checkoutError}
            planConfigError={planCheckoutErrors?.[plan.id] ?? null}
            onChoosePlan={enableCheckout || useTestAccessFlow ? handleChoosePlan : undefined}
            activePlanEndDate={activePlanEndDate}
            activePlanEndDateLabel={activePlanEndDateLabel}
            cancelPlanLabel={cancelPlanLabel}
            cancelPlanLoading={cancelPlanLoading}
            onCancelPlan={onCancelPlan}
          />
        ))}
      </div>
    </>
  );
}
