"use client";

import { STATUS_ALERT_WARNING_CLASS } from "@/lib/status-colors";
import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import {
  ACCOUNT_ALERT_SUCCESS_CLASS,
  ACCOUNT_BODY_TEXT,
  ACCOUNT_BODY_VALUE,
  ACCOUNT_CARD_PADDING_COMPACT,
  ACCOUNT_FIELD_LABEL_CLASS,
  ACCOUNT_SECTION_TITLE,
  ACCOUNT_STATUS_BADGE_CLASS,
} from "@/lib/account-ui";
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
  membershipPlanLabel,
  membershipRoleTitle,
  membershipPlansForRole,
  membershipStatusForMode,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";
import { cancelMembershipAction } from "@/app/actions/membership";
import { CancelMembershipConfirmModal } from "@/components/membership/CancelMembershipConfirmModal";
import { InvitedTestUserSection } from "@/components/membership/InvitedTestUserSection";
import { NewMemberPromotionBanner } from "@/components/membership/NewMemberPromotionBanner";
import { resolveActiveMode } from "@/lib/profile-mode";
import { resolveMembershipPlanCheckoutProps } from "@/lib/membership-invited-access";
import { buildMembershipPagePath, sanitizeReturnTo } from "@/lib/membership-return";
import { parseMembershipPageRole } from "@/lib/membership-upsell";
import { isWelcomeOfferEligibleForRole } from "@/lib/profile-utils";
import {
  welcomeOfferDisplayModeForUser,
} from "@/lib/new-member-promotion";
import { isStripeCheckoutEnabled } from "@/lib/stripe-feature";
import type { MembershipDeployDiagnostics } from "@/lib/membership-deploy-diagnostics";
import type { Dictionary } from "@/i18n/translations";

type StripeCheckoutReadiness = {
  ready: boolean;
  message: string | null;
};

type MembershipPageContentProps = {
  stripeCheckoutByRole?: Record<MembershipRole, StripeCheckoutReadiness>;
  stripePlanErrorsByRole?: Record<MembershipRole, Record<string, string | null>>;
  /** Server: STRIPE_WEBHOOK_SECRET + SUPABASE_SERVICE_ROLE_KEY configured. */
  membershipWebhookWritable?: boolean;
  deployDiagnostics?: MembershipDeployDiagnostics;
};

function parseCheckoutRole(value: string | null): MembershipRole | null {
  return parseMembershipPageRole(value);
}

function localizedMembershipPlanName(
  membership: UserMembership,
  t: Dictionary,
): string | null {
  const plans =
    membership.role === "pet_parent" ? t.pricing.petParentPlans : t.pricing.petFriendPlans;
  const fromI18n = plans.find((p) => p.id === membership.plan_id)?.name;
  if (fromI18n) return fromI18n;
  return membershipPlanLabel(membership);
}

function membershipRoleGenitive(role: MembershipRole, t: Dictionary): string {
  return role === "pet_parent" ? t.roles.petParent.labelGenitive : t.roles.petFriend.labelGenitive;
}

function cancelMembershipButtonLabel(
  role: MembershipRole,
  dualActive: boolean,
  mpage: Dictionary["account"]["membershipPage"],
): string {
  if (!dualActive) return mpage.cancelMembership;
  return role === "pet_parent" ? mpage.cancelMembershipPetParent : mpage.cancelMembershipPetFriend;
}

function RoleMembershipSummary({
  role,
  membership,
  isActive,
  t,
  cancelLabel,
  onCancel,
  cancelLoading,
}: {
  role: MembershipRole;
  membership: UserMembership | null;
  isActive: boolean;
  t: Dictionary;
  cancelLabel: string;
  onCancel: () => void;
  cancelLoading: boolean;
}) {
  const mpage = t.account.membershipPage;
  const pageTitle = role === "pet_parent" ? mpage.petParentTitle : mpage.petFriendTitle;
  const roleGenitive = membershipRoleGenitive(role, t);
  const planName = membership ? localizedMembershipPlanName(membership, t) : null;
  const headline =
    isActive && planName
      ? mpage.activeHeadline.replace("{role}", roleGenitive)
      : mpage.inactiveHeadline.replace("{role}", roleGenitive);

  return (
    <AccountCard className={ACCOUNT_CARD_PADDING_COMPACT}>
      <p className={ACCOUNT_FIELD_LABEL_CLASS}>{pageTitle}</p>
      <p className={`mt-2 ${ACCOUNT_SECTION_TITLE}`}>{headline}</p>
      {isActive && membership ? (
        <>
          {planName ? (
            <p className={`mt-1 ${ACCOUNT_BODY_VALUE} text-[#2E6B3F]`}>
              {mpage.activePlanSuffix.replace("{plan}", planName)}
            </p>
          ) : null}
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {membership.start_date ? (
              <div>
                <dt className={ACCOUNT_FIELD_LABEL_CLASS}>{mpage.startedLabel}</dt>
                <dd className={`mt-1 ${ACCOUNT_BODY_VALUE}`}>
                  {formatMembershipDate(membership.start_date)}
                </dd>
              </div>
            ) : null}
            {membership.end_date ? (
              <div>
                <dt className={ACCOUNT_FIELD_LABEL_CLASS}>{mpage.endsLabel}</dt>
                <dd className={`mt-1 ${ACCOUNT_BODY_VALUE}`}>
                  {formatMembershipDate(membership.end_date)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className={ACCOUNT_FIELD_LABEL_CLASS}>{mpage.autoRenewLabel}</dt>
              <dd className={`mt-1 ${ACCOUNT_BODY_VALUE}`}>
                {membership.auto_renew ? mpage.on : mpage.off}
              </dd>
            </div>
          </dl>
          <p className={`mt-3 ${ACCOUNT_BODY_TEXT}`}>
            {mpage.activeUnlocks.replace("{role}", roleGenitive)}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            disabled={cancelLoading}
            onClick={onCancel}
          >
            {cancelLoading ? t.common.loading : cancelLabel}
          </Button>
        </>
      ) : (
        <p className={`mt-2 ${ACCOUNT_BODY_TEXT}`}>{mpage.browseFreeUpgrade}</p>
      )}
    </AccountCard>
  );
}

export function MembershipPageContent({
  stripeCheckoutByRole,
  stripePlanErrorsByRole,
  membershipWebhookWritable = true,
  deployDiagnostics,
}: MembershipPageContentProps = {}) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelLoadingRole, setCancelLoadingRole] = useState<MembershipRole | null>(null);
  const [pendingCancelRole, setPendingCancelRole] = useState<MembershipRole | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const handledReturnRef = useRef<string | null>(null);

  const returnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo")),
    [searchParams],
  );

  useEffect(() => {
    if (!user?.id) return;
    void refreshProfile({ background: true });
  }, [user?.id, refreshProfile]);

  const replaceMembershipUrl = useCallback(
    (role: MembershipRole | null) => {
      router.replace(
        buildMembershipPagePath({
          role: role ?? undefined,
          returnTo,
        }),
        { scroll: false },
      );
    },
    [router, returnTo],
  );

  useEffect(() => {
    const success = searchParams.get("success") === "true";
    const cancelled = searchParams.get("cancelled") === "true";
    if (!success && !cancelled) return;

    const sessionId = searchParams.get("session_id")?.trim() ?? "";
    const returnKey = success
      ? `success:${searchParams.get("role") ?? ""}:${sessionId}`
      : "cancelled";
    if (handledReturnRef.current === returnKey) return;
    handledReturnRef.current = returnKey;

    let cancelledEffect = false;

    async function handleReturn() {
      if (cancelled) {
        if (!cancelledEffect) {
          setCheckoutBanner(t.membershipCheckout.checkoutCancelled);
        }
        replaceMembershipUrl(parseCheckoutRole(searchParams.get("role")));
        return;
      }

      const checkoutRole =
        parseCheckoutRole(searchParams.get("role")) ??
        (profile ? activeModeToMembershipRole(resolveActiveMode(profile.role, profile.active_mode)) : null);

      let activated = false;

      if (sessionId.startsWith("cs_")) {
        try {
          const res = await fetch("/api/stripe/confirm-membership", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const payload = (await res.json()) as {
            activated?: boolean;
            pending?: boolean;
            error?: string;
          };
          if (!cancelledEffect && res.ok && payload.activated) {
            activated = true;
          }
        } catch {
          // confirm-membership is best-effort; profile poll below still applies
        }
      } else if (!membershipWebhookWritable) {
        if (!cancelledEffect) {
          setCheckoutBanner(t.membershipCheckout.paymentWebhookPending);
        }
        replaceMembershipUrl(checkoutRole);
        return;
      }

      const pollDelaysMs = activated ? [0] : [0, 800, 1600, 3200, 5000];

      for (const delay of pollDelaysMs) {
        if (cancelledEffect) return;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        if (cancelledEffect) return;

        router.refresh();
        const row = await refreshProfile?.({ background: true });
        const memberships = row?.memberships ?? profile?.memberships ?? emptyMembershipsByRole();
        const roleToCheck = checkoutRole ?? activeModeToMembershipRole("pet_parent");
        if (hasActiveMembershipForRole(memberships, roleToCheck)) {
          activated = true;
          break;
        }
      }

      if (cancelledEffect) return;

      setCheckoutBanner(
        activated
          ? t.membershipCheckout.paymentSuccess
          : t.membershipCheckout.paymentPending,
      );
      replaceMembershipUrl(checkoutRole);
    }

    void handleReturn();

    return () => {
      cancelledEffect = true;
    };
  }, [
    searchParams,
    replaceMembershipUrl,
    refreshProfile,
    t.membershipCheckout,
    membershipWebhookWritable,
    profile,
  ]);

  const profileMode = profile
    ? resolveActiveMode(profile.role, profile.active_mode)
    : "pet_parent";
  const roleFromQuery = parseMembershipPageRole(searchParams.get("role"));
  const planMode =
    roleFromQuery === "pet_friend"
      ? "pet_friend"
      : roleFromQuery === "pet_parent"
        ? "pet_parent"
        : profileMode;
  const memberships = profile?.memberships ?? emptyMembershipsByRole();
  const activeMembershipRoles = useMemo(() => {
    const roles: MembershipRole[] = [];
    if (hasActiveMembershipForRole(memberships, "pet_parent")) roles.push("pet_parent");
    if (hasActiveMembershipForRole(memberships, "pet_friend")) roles.push("pet_friend");
    return roles;
  }, [memberships]);
  const dualActive = activeMembershipRoles.length === 2;
  const modeTab = activeModeToPricingTab(planMode);
  const status = profile
    ? membershipStatusForMode(memberships, planMode)
    : DEMO_MEMBERSHIP_LABEL;
  const isActive = profile ? hasActiveMembershipForMode(memberships, planMode) : false;
  const modeRole = activeModeToMembershipRole(planMode);
  const activeMembership = memberships[modeRole];
  const welcomeOfferEligible = isWelcomeOfferEligibleForRole(profile, modeRole);
  const welcomeOfferDisplayMode = welcomeOfferDisplayModeForUser({
    loggedIn: Boolean(user),
    confirmedEligible: welcomeOfferEligible,
  });

  const activePlanName = useMemo(() => {
    if (!profile || !isActive) return null;
    const row = memberships[modeRole];
    if (!row) return null;
    return localizedMembershipPlanName(row, t);
  }, [profile, isActive, memberships, modeRole, t]);

  const stripeCheckout = stripeCheckoutByRole?.[modeRole];
  const stripeCheckoutReady = stripeCheckout?.ready ?? false;
  const stripeConfigMessage = stripeCheckout?.message ?? null;
  const stripeEnabled = isStripeCheckoutEnabled();
  const stripePayEnabled = stripeEnabled && stripeCheckoutReady;
  const planCheckout = resolveMembershipPlanCheckoutProps({
    stripeEnabled,
    stripePayEnabled,
    isActive,
  });
  const stripeCheckoutBlocked =
    stripeEnabled && !stripeCheckoutReady && !isActive;

  const handleCancelSuccess = useCallback(() => {
    setCancelError(null);
    setCancelSuccess(t.account.membershipPage.membershipCancelled);
  }, [t.account.membershipPage.membershipCancelled]);

  const handleCancelError = useCallback(
    (message: string) => {
      setCancelSuccess(null);
      setCancelError(message);
    },
    [],
  );

  const handleCancelMembership = useCallback(
    async (role: MembershipRole) => {
      const membership = memberships[role];
      const page = t.account.membershipPage;
      if (!membership) return;

      setCancelLoadingRole(role);
      try {
        const result = await cancelMembershipAction(role);
        if (!result.ok) {
          handleCancelError(result.error ?? page.cancelFailed);
          return;
        }
        handleCancelSuccess();
        setCancelDialogOpen(false);
        setPendingCancelRole(null);
        router.refresh();
        await refreshProfile({ background: false });
      } catch {
        handleCancelError(page.cancelFailed);
      } finally {
        setCancelLoadingRole(null);
      }
    },
    [
      memberships,
      t.account.membershipPage,
      handleCancelError,
      handleCancelSuccess,
      refreshProfile,
      router,
    ],
  );

  const requestCancelMembership = useCallback((role: MembershipRole) => {
    if (!memberships[role]) return;
    setPendingCancelRole(role);
    setCancelDialogOpen(true);
  }, [memberships]);

  const closeCancelDialog = useCallback(() => {
    if (cancelLoadingRole) return;
    setCancelDialogOpen(false);
    setPendingCancelRole(null);
  }, [cancelLoadingRole]);

  const confirmCancelMembership = useCallback(() => {
    if (!pendingCancelRole) return;
    void handleCancelMembership(pendingCancelRole);
  }, [handleCancelMembership, pendingCancelRole]);

  const stripePlans = useMemo(() => {
    const parentFeatures = Object.fromEntries(
      t.pricing.petParentPlans.map((p) => [p.id, p.features]),
    );
    const friendFeatures = Object.fromEntries(
      t.pricing.petFriendPlans.map((p) => [p.id, p.features]),
    );
    const parentNames = Object.fromEntries(t.pricing.petParentPlans.map((p) => [p.id, p.name]));
    const friendNames = Object.fromEntries(t.pricing.petFriendPlans.map((p) => [p.id, p.name]));
    const namesById = modeRole === "pet_parent" ? parentNames : friendNames;
    return membershipPlansForRole(modeRole, {
      ...parentFeatures,
      ...friendFeatures,
    }).map((plan) => ({
      ...plan,
      plan_name: namesById[plan.plan_id] ?? plan.plan_name,
    }));
  }, [modeRole, t.pricing.petParentPlans, t.pricing.petFriendPlans]);

  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        {t.account.loading}
      </div>
    );
  }

  if (!user) {
    return <PricingSection />;
  }

  const mpage = t.account.membershipPage;
  const pageTitle = planMode === "pet_parent" ? mpage.petParentTitle : mpage.petFriendTitle;
  const pageSubtitle =
    planMode === "pet_parent" ? mpage.petParentSubtitle : mpage.petFriendSubtitle;

  return (
    <AccountLayout
      title={pageTitle}
      description={pageSubtitle}
      hideCompleteProfileBanner
    >
      <CancelMembershipConfirmModal
        open={cancelDialogOpen}
        submitting={cancelLoadingRole !== null}
        onClose={closeCancelDialog}
        onConfirm={confirmCancelMembership}
      />

      {deployDiagnostics?.showBanner ? (
        <div
          className="mb-4 rounded-2xl border border-dashed border-amber-500/60 bg-amber-50 px-4 py-3 text-xs text-amber-950"
          role="status"
          data-testid="membership-deploy-diagnostics"
        >
          <p className="font-semibold">{deployDiagnostics.bannerTitle}</p>
          <ul className="mt-2 space-y-1 font-mono">
            {deployDiagnostics.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {dualActive ? (
        <p className={`mb-4 inline-flex items-center gap-2 px-3 py-1 text-xs ${ACCOUNT_STATUS_BADGE_CLASS}`}>
          {mpage.dualMember}
        </p>
      ) : null}

      {activeMembershipRoles.length > 0 ? (
        <div
          className={`mb-6 ${activeMembershipRoles.length > 1 ? "grid gap-4 sm:grid-cols-2" : ""}`}
        >
          {activeMembershipRoles.map((role) => (
            <RoleMembershipSummary
              key={role}
              role={role}
              membership={memberships[role]}
              isActive
              t={t}
              cancelLabel={cancelMembershipButtonLabel(role, dualActive, mpage)}
              onCancel={() => requestCancelMembership(role)}
              cancelLoading={cancelLoadingRole === role}
            />
          ))}
        </div>
      ) : null}

      {planCheckout.useTestAccessFlowOnCards && !isActive ? (
        <p
          className="mb-4 rounded-2xl border border-[#2E6B3F]/25 bg-[#DDEEDF]/60 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {t.testAccess.membershipBanner}
        </p>
      ) : null}

      {returnTo ? (
        <p
          className="mb-4 rounded-2xl border border-[#2E6B3F]/25 bg-[#DDEEDF]/60 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {t.membershipCheckout.returnToHint}
        </p>
      ) : null}

      {checkoutBanner ? (
        <p className={`mb-4 px-4 py-3 text-sm text-foreground ${ACCOUNT_ALERT_SUCCESS_CLASS}`} role="status">
          {checkoutBanner}
        </p>
      ) : null}

      {cancelSuccess ? (
        <p className={`mb-4 px-4 py-3 text-sm text-foreground ${ACCOUNT_ALERT_SUCCESS_CLASS}`} role="status">
          {cancelSuccess}
        </p>
      ) : null}

      {isActive && returnTo ? (
        <div className="mb-6">
          <Button href={returnTo} variant="primary" size="md">
            {t.membershipCheckout.continueBooking}
          </Button>
        </div>
      ) : null}

      {cancelError ? (
        <p
          className={`mb-4 rounded-2xl px-4 py-3 ${STATUS_ALERT_WARNING_CLASS}`}
          role="alert"
        >
          {cancelError}
        </p>
      ) : null}

      {stripeCheckoutBlocked ? (
        <p
          className={`mb-4 rounded-2xl px-4 py-3 ${STATUS_ALERT_WARNING_CLASS}`}
          role="alert"
        >
          {deployDiagnostics?.showBanner
            ? `Stripe checkout is blocked for ${membershipRoleTitle(modeRole)}: ${stripeConfigMessage ?? "configuration incomplete"}. Platform access codes remain available below.`
            : (stripeConfigMessage ??
              "Stripe checkout is not configured yet. Use a platform access code if you have one.")}
        </p>
      ) : null}

      {stripeEnabled && stripeConfigMessage && !stripeCheckoutBlocked ? (
        <p
          className={`mb-4 rounded-2xl px-4 py-3 ${STATUS_ALERT_WARNING_CLASS}`}
          role="alert"
        >
          {stripeConfigMessage}
        </p>
      ) : null}

      <NewMemberPromotionBanner
        role={modeRole}
        displayMode={welcomeOfferDisplayMode}
        loggedIn
        returnTo={returnTo}
        className="mb-4"
      />

      <MembershipPlans
        variant="account"
        activePlanId={isActive ? activeMembership?.plan_id ?? null : null}
        currentPlanLabel={isActive ? status : null}
        activePlanEndDate={isActive ? activeMembership?.end_date ?? null : null}
        activePlanEndDateLabel={mpage.endsLabel}
        modeFilter={modeTab}
        plans={stripePlans}
        checkoutUserId={user.id}
        checkoutRole={modeRole}
        roleHasActiveMembership={hasActiveMembershipForRole(memberships, modeRole)}
        enableCheckout={planCheckout.enableStripeCheckout}
        useTestAccessFlow={planCheckout.useTestAccessFlowOnCards}
        activateMembershipLabel={t.membershipCheckout.activateMembership}
        promotionDisplayMode={welcomeOfferDisplayMode}
        promotionBadgeLabel={t.newMemberPromotion.planBadge}
        promotionDiscountHeadline={t.newMemberPromotion.discountHeadline}
        promotionCheckoutNote={t.newMemberPromotion.checkoutNote}
        planCheckoutErrors={stripeEnabled ? stripePlanErrorsByRole?.[modeRole] : undefined}
        checkoutReturnTo={returnTo}
        cancelPlanLabel={isActive ? mpage.cancelMembership : undefined}
        cancelPlanLoading={cancelLoadingRole === modeRole}
        onCancelPlan={
          isActive ? () => requestCancelMembership(modeRole) : undefined
        }
      />

      {planCheckout.showInvitedAccessSection ? (
        <InvitedTestUserSection role={modeRole} />
      ) : null}
    </AccountLayout>
  );
}
