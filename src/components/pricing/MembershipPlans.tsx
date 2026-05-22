"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";
import { MEMBERSHIP_PATH } from "@/lib/auth-routing";
import type { MembershipPlanDefinition, MembershipRole } from "@/lib/membership";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { CheckoutPlanDebugMeta } from "@/lib/membership";

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
  /** Server-computed env var + mode per plan (temporary production debug). */
  debugCheckoutMeta?: CheckoutPlanDebugMeta[];
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
  checkoutUnavailableLabel,
  popularBadge,
  enableCheckout,
  checkoutUserId,
  checkoutRole,
  checkoutLoadingPlanId,
  checkoutError,
  planConfigError,
  planDebugMeta,
  onChoosePlan,
}: {
  plan: PricingPlan;
  variant: "marketing" | "account";
  activePlanId?: string | null;
  currentPlanLabel?: string | null;
  getStartedLabel: string;
  choosePlanLabel: string;
  activePlanLabel: string;
  checkoutUnavailableLabel: string;
  popularBadge: string;
  enableCheckout?: boolean;
  checkoutUserId?: string;
  checkoutRole?: MembershipRole;
  checkoutLoadingPlanId?: string | null;
  checkoutError?: string | null;
  planConfigError?: string | null;
  planDebugMeta?: CheckoutPlanDebugMeta;
  onChoosePlan?: (plan: PricingPlan) => void;
}) {
  const isCurrent =
    variant === "account" &&
    (Boolean(activePlanId) || Boolean(currentPlanLabel)) &&
    planMatchesActive(plan, activePlanId, currentPlanLabel);

  const isLoading = checkoutLoadingPlanId === plan.id;
  const canCheckout =
    variant === "account" &&
    enableCheckout &&
    !isCurrent &&
    !planConfigError &&
    Boolean(checkoutUserId) &&
    Boolean(checkoutRole) &&
    Boolean(onChoosePlan);

  return (
    <article
      className={`card-elevated relative mx-auto flex h-full w-full max-w-md flex-col rounded-3xl bg-surface p-5 sm:max-w-none sm:p-6 lg:p-8 ${
        plan.popular || isCurrent ? "ring-2 ring-brand-teal/40 shadow-lg shadow-brand-teal/10" : ""
      }`}
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
        className={`font-heading text-lg font-semibold capitalize text-foreground sm:text-xl ${plan.popular || isCurrent ? "pt-1 sm:pt-2" : ""}`}
      >
        {plan.name}
      </h3>
      <p className="mt-2 font-heading text-3xl font-bold text-brand-teal sm:mt-3 sm:text-4xl">{plan.price}</p>
      <ul className="mt-4 flex-1 space-y-2.5 text-sm leading-relaxed text-muted sm:mt-6 sm:space-y-3">
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
        <Button
          href={`/login?next=${encodeURIComponent(MEMBERSHIP_PATH)}`}
          variant={plan.popular ? "primary" : "secondary"}
          className="mt-6 w-full sm:mt-8"
          size="lg"
        >
          {choosePlanLabel}
        </Button>
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
            variant={plan.popular ? "primary" : "secondary"}
            className="mt-6 w-full sm:mt-8"
            size="lg"
            disabled={isCurrent || (!canCheckout && !isCurrent)}
            onClick={() => {
              if (canCheckout && onChoosePlan) onChoosePlan(plan);
            }}
          >
            {isLoading
              ? "Redirecting…"
              : isCurrent
                ? activePlanLabel
                : canCheckout
                  ? choosePlanLabel
                  : planConfigError ?? checkoutUnavailableLabel}
          </Button>
          {planDebugMeta ? (
            <pre
              className="mt-2 whitespace-pre-wrap font-mono text-[0.65rem] leading-snug text-muted"
              aria-label="Checkout debug"
            >
              {`planId: ${planDebugMeta.planId}\nenvVar: ${planDebugMeta.envVar}\nmode: ${planDebugMeta.mode}`}
            </pre>
          ) : null}
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
  debugCheckoutMeta,
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

  const debugMetaByPlanId = useMemo(() => {
    if (!debugCheckoutMeta?.length) return null;
    return Object.fromEntries(debugCheckoutMeta.map((row) => [row.planId, row]));
  }, [debugCheckoutMeta]);

  async function handleChoosePlan(plan: PricingPlan) {
    if (!checkoutUserId || !effectiveCheckoutRole) return;
    setCheckoutError(null);
    setCheckoutLoadingPlanId(plan.id);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: effectiveCheckoutRole,
          planId: planId(plan),
          userId: checkoutUserId,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      if (!data.url) {
        throw new Error(data.error ?? "Checkout session missing URL.");
      }
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Could not start checkout.");
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
        className={`grid grid-cols-1 items-stretch gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 ${
          showRoleTabs ? "mt-8 sm:mt-10 lg:mt-10" : "mt-0"
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
            activePlanLabel="Active plan"
            checkoutUnavailableLabel={t.pricing.comingSoon}
            popularBadge={t.pricing.mostPopular}
            enableCheckout={enableCheckout}
            checkoutUserId={checkoutUserId}
            checkoutRole={effectiveCheckoutRole}
            checkoutLoadingPlanId={checkoutLoadingPlanId}
            checkoutError={checkoutError}
            planConfigError={planCheckoutErrors?.[plan.id] ?? null}
            planDebugMeta={debugMetaByPlanId?.[plan.id]}
            onChoosePlan={enableCheckout ? handleChoosePlan : undefined}
          />
        ))}
      </div>
    </>
  );
}
