"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  activeModeToPricingTab,
  MembershipPlans,
} from "@/components/pricing/MembershipPlans";
import { PricingSection } from "@/sections/PricingSection";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  activeModeToMembershipRole,
  DEMO_MEMBERSHIP_LABEL,
  emptyMembershipsByRole,
  formatMembershipDate,
  hasActiveMembershipForMode,
  hasActiveMembershipForRole,
  hasDualActiveMemberships,
  membershipActiveHeadline,
  membershipInactiveHeadline,
  membershipPageSubtitle,
  membershipPageTitle,
  membershipPlanLabel,
  membershipPlansForRole,
  membershipRoleTitle,
  membershipStatusForMode,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";
import { resolveActiveMode } from "@/lib/profile-mode";

type StripeCheckoutReadiness = {
  ready: boolean;
  message: string | null;
};

type MembershipPageContentProps = {
  stripeCheckoutByRole?: Record<MembershipRole, StripeCheckoutReadiness>;
  stripePlanErrorsByRole?: Record<MembershipRole, Record<string, string | null>>;
};

function RoleMembershipSummary({
  role,
  membership,
  isActive,
}: {
  role: MembershipRole;
  membership: UserMembership | null;
  isActive: boolean;
}) {
  const planName = membership ? membershipPlanLabel(membership) : null;
  const title = membershipRoleTitle(role);

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-teal">{title}</p>
      <p className="font-heading mt-1 text-lg font-semibold text-foreground">
        {isActive && planName
          ? `Your ${title} membership is active`
          : `No active ${title} membership`}
      </p>
      {isActive && membership ? (
        <dl className="mt-2 space-y-1 text-sm text-muted">
          {planName ? (
            <div className="flex justify-between gap-2">
              <dt>Plan</dt>
              <dd className="font-medium text-foreground">{planName}</dd>
            </div>
          ) : null}
          {membership.start_date ? (
            <div className="flex justify-between gap-2">
              <dt>Started</dt>
              <dd>{formatMembershipDate(membership.start_date)}</dd>
            </div>
          ) : null}
          {membership.end_date ? (
            <div className="flex justify-between gap-2">
              <dt>Ends</dt>
              <dd>{formatMembershipDate(membership.end_date)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt>Auto-renew</dt>
            <dd>{membership.auto_renew ? "On" : "Off"}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-1 text-sm text-muted">Browse for free; upgrade to unlock paid features.</p>
      )}
    </div>
  );
}

export function MembershipPageContent({
  stripeCheckoutByRole,
  stripePlanErrorsByRole,
}: MembershipPageContentProps = {}) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setCheckoutBanner("Payment received — your membership will activate shortly.");
      void refreshProfile?.();
      router.replace("/membership", { scroll: false });
    } else if (searchParams.get("cancelled") === "true") {
      setCheckoutBanner("Checkout was cancelled. You can choose a plan when you are ready.");
      router.replace("/membership", { scroll: false });
    }
  }, [searchParams, router, refreshProfile]);

  const activeMode = profile
    ? resolveActiveMode(profile.role, profile.active_mode)
    : "pet_parent";
  const memberships = profile?.memberships ?? emptyMembershipsByRole();
  const modeTab = activeModeToPricingTab(activeMode);
  const status = profile
    ? membershipStatusForMode(memberships, activeMode)
    : DEMO_MEMBERSHIP_LABEL;
  const isActive = profile ? hasActiveMembershipForMode(memberships, activeMode) : false;
  const dualActive = hasDualActiveMemberships(memberships);
  const modeRole = activeModeToMembershipRole(activeMode);
  const activeMembership = memberships[modeRole];

  const activePlanName = useMemo(() => {
    if (!profile || !isActive) return null;
    return membershipPlanLabel(memberships[modeRole]);
  }, [profile, isActive, memberships, modeRole]);

  const stripeCheckout = stripeCheckoutByRole?.[modeRole];
  const stripeCheckoutReady = stripeCheckout?.ready ?? false;
  const stripeConfigMessage = stripeCheckout?.message ?? null;

  const stripePlans = useMemo(() => {
    const parentFeatures = Object.fromEntries(
      t.pricing.petParentPlans.map((p) => [p.id, p.features]),
    );
    const friendFeatures = Object.fromEntries(
      t.pricing.petFriendPlans.map((p) => [p.id, p.features]),
    );
    return membershipPlansForRole(modeRole, {
      ...parentFeatures,
      ...friendFeatures,
    });
  }, [modeRole, t.pricing.petParentPlans, t.pricing.petFriendPlans]);

  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <PricingSection />;
  }

  const loading = profileLoading;
  const pageTitle = membershipPageTitle(activeMode);
  const pageSubtitle = membershipPageSubtitle(activeMode);
  const statusHeadline = isActive && activePlanName
    ? membershipActiveHeadline(activeMode, activePlanName)
    : membershipInactiveHeadline(activeMode);

  return (
    <DashboardShell
      title={pageTitle}
      description={pageSubtitle}
      hideCompleteProfileBanner
    >
      {dualActive ? (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-teal/15 px-3 py-1 text-xs font-semibold text-brand-teal">
          Dual member — both roles active
        </p>
      ) : null}

      {dualActive ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <RoleMembershipSummary
            role="pet_parent"
            membership={memberships.pet_parent}
            isActive={hasActiveMembershipForRole(memberships, "pet_parent")}
          />
          <RoleMembershipSummary
            role="pet_friend"
            membership={memberships.pet_friend}
            isActive={hasActiveMembershipForRole(memberships, "pet_friend")}
          />
        </div>
      ) : null}

      <div className="card-elevated mb-6 rounded-3xl border border-brand-teal/20 bg-mint/30 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
          {pageTitle}
        </p>
        <p className="font-heading mt-2 text-2xl font-semibold text-foreground">
          {loading ? "Loading…" : statusHeadline}
        </p>
        {!loading && isActive && activePlanName ? (
          <p className="mt-1 text-sm font-medium text-brand-teal">{activePlanName} plan</p>
        ) : null}
        {!loading && isActive && activeMembership ? (
          <dl className="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-3">
            {activeMembership.start_date ? (
              <div>
                <dt className="text-xs uppercase tracking-wide">Started</dt>
                <dd className="font-medium text-foreground">
                  {formatMembershipDate(activeMembership.start_date)}
                </dd>
              </div>
            ) : null}
            {activeMembership.end_date ? (
              <div>
                <dt className="text-xs uppercase tracking-wide">Ends</dt>
                <dd className="font-medium text-foreground">
                  {formatMembershipDate(activeMembership.end_date)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs uppercase tracking-wide">Auto-renew</dt>
              <dd className="font-medium text-foreground">
                {activeMembership.auto_renew ? "On" : "Off"}
              </dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-2 text-sm text-muted">
          {isActive
            ? `Your ${activeMode === "pet_parent" ? "Pet Parent" : "Pet Friend"} membership unlocks messaging and bookings in this mode.`
            : `Choose a ${activeMode === "pet_parent" ? "Pet Parent" : "Pet Friend"} plan below to pay securely with Stripe (TEST mode). Browse for free until you upgrade.`}
        </p>
      </div>

      {checkoutBanner ? (
        <p
          className="mb-4 rounded-2xl border border-brand-teal/30 bg-mint/40 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {checkoutBanner}
        </p>
      ) : null}

      {stripeConfigMessage ? (
        <p
          className="mb-4 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {stripeConfigMessage}
        </p>
      ) : null}

      <MembershipPlans
        variant="account"
        activePlanId={isActive ? activeMembership?.plan_id ?? null : null}
        currentPlanLabel={isActive ? status : null}
        modeFilter={modeTab}
        plans={stripePlans}
        checkoutUserId={user.id}
        checkoutRole={modeRole}
        enableCheckout={!isActive && stripeCheckoutReady}
        planCheckoutErrors={stripePlanErrorsByRole?.[modeRole]}
      />
    </DashboardShell>
  );
}
