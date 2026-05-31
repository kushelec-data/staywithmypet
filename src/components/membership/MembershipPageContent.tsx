"use client";

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import {
  ACCOUNT_ALERT_SUCCESS_CLASS,
  ACCOUNT_BODY_TEXT,
  ACCOUNT_BODY_VALUE,
  ACCOUNT_CARD_CLASS,
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
import { buildMembershipPagePath, sanitizeReturnTo } from "@/lib/membership-return";
import { parseMembershipPageRole } from "@/lib/membership-upsell";

type StripeCheckoutReadiness = {
  ready: boolean;
  message: string | null;
};

type MembershipPageContentProps = {
  stripeCheckoutByRole?: Record<MembershipRole, StripeCheckoutReadiness>;
  stripePlanErrorsByRole?: Record<MembershipRole, Record<string, string | null>>;
  /** Server: STRIPE_WEBHOOK_SECRET + SUPABASE_SERVICE_ROLE_KEY configured. */
  membershipWebhookWritable?: boolean;
};

function parseCheckoutRole(value: string | null): MembershipRole | null {
  return parseMembershipPageRole(value);
}

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
    <div className={`${ACCOUNT_CARD_CLASS} ${ACCOUNT_CARD_PADDING_COMPACT}`}>
      <p className={ACCOUNT_FIELD_LABEL_CLASS}>{title}</p>
      <p className={`mt-1 ${ACCOUNT_SECTION_TITLE}`}>
        {isActive && planName
          ? `Your ${title} membership is active`
          : `No active ${title} membership`}
      </p>
      {isActive && membership ? (
        <dl className="mt-3 space-y-2">
          {planName ? (
            <div className="flex justify-between gap-2">
              <dt className={ACCOUNT_FIELD_LABEL_CLASS}>Plan</dt>
              <dd className={ACCOUNT_BODY_VALUE}>{planName}</dd>
            </div>
          ) : null}
          {membership.start_date ? (
            <div className="flex justify-between gap-2">
              <dt className={ACCOUNT_FIELD_LABEL_CLASS}>Started</dt>
              <dd className={ACCOUNT_BODY_VALUE}>{formatMembershipDate(membership.start_date)}</dd>
            </div>
          ) : null}
          {membership.end_date ? (
            <div className="flex justify-between gap-2">
              <dt className={ACCOUNT_FIELD_LABEL_CLASS}>Ends</dt>
              <dd className={ACCOUNT_BODY_VALUE}>{formatMembershipDate(membership.end_date)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt className={ACCOUNT_FIELD_LABEL_CLASS}>Auto-renew</dt>
            <dd className={ACCOUNT_BODY_VALUE}>{membership.auto_renew ? "On" : "Off"}</dd>
          </div>
        </dl>
      ) : (
        <p className={`mt-2 ${ACCOUNT_BODY_TEXT}`}>Browse for free; upgrade to unlock paid features.</p>
      )}
    </div>
  );
}

export function MembershipPageContent({
  stripeCheckoutByRole,
  stripePlanErrorsByRole,
  membershipWebhookWritable = true,
}: MembershipPageContentProps = {}) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const handledReturnRef = useRef<string | null>(null);

  const returnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo")),
    [searchParams],
  );

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
  const modeTab = activeModeToPricingTab(planMode);
  const status = profile
    ? membershipStatusForMode(memberships, planMode)
    : DEMO_MEMBERSHIP_LABEL;
  const isActive = profile ? hasActiveMembershipForMode(memberships, planMode) : false;
  const dualActive = hasDualActiveMemberships(memberships);
  const modeRole = activeModeToMembershipRole(planMode);
  const activeMembership = memberships[modeRole];

  const activePlanName = useMemo(() => {
    if (!profile || !isActive) return null;
    return membershipPlanLabel(memberships[modeRole]);
  }, [profile, isActive, memberships, modeRole]);

  const stripeCheckout = stripeCheckoutByRole?.[modeRole];
  const stripeCheckoutReady = stripeCheckout?.ready ?? false;
  const stripeConfigMessage = stripeCheckout?.message ?? null;

  const handleCancelPlan = useCallback(async () => {
    setCancelError(null);
    setCancelLoading(true);
    try {
      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: modeRole, returnTo }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setCancelError(data.error ?? t.membershipCheckout.cancelUnavailable);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCancelError(t.membershipCheckout.cancelUnavailable);
    } finally {
      setCancelLoading(false);
    }
  }, [modeRole, returnTo, t.membershipCheckout.cancelUnavailable]);

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
  const pageTitle = membershipPageTitle(planMode);
  const pageSubtitle = membershipPageSubtitle(planMode);
  const statusHeadline = isActive && activePlanName
    ? membershipActiveHeadline(planMode, activePlanName)
    : membershipInactiveHeadline(planMode);

  return (
    <AccountLayout
      title={pageTitle}
      description={pageSubtitle}
      hideCompleteProfileBanner
    >
      {dualActive ? (
        <p className={`mb-4 inline-flex items-center gap-2 px-3 py-1 text-xs ${ACCOUNT_STATUS_BADGE_CLASS}`}>
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

      <AccountCard className={`mb-6 ${ACCOUNT_CARD_PADDING_COMPACT}`}>
        <p className={ACCOUNT_FIELD_LABEL_CLASS}>{pageTitle}</p>
        <p className={`mt-2 ${ACCOUNT_SECTION_TITLE}`}>
          {loading ? "Loading…" : statusHeadline}
        </p>
        {!loading && isActive && activePlanName ? (
          <p className={`mt-1 ${ACCOUNT_BODY_VALUE} text-[#2E6B3F]`}>{activePlanName} plan</p>
        ) : null}
        {!loading && isActive && activeMembership ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {activeMembership.start_date ? (
              <div>
                <dt className={ACCOUNT_FIELD_LABEL_CLASS}>Started</dt>
                <dd className={`mt-1 ${ACCOUNT_BODY_VALUE}`}>
                  {formatMembershipDate(activeMembership.start_date)}
                </dd>
              </div>
            ) : null}
            {activeMembership.end_date ? (
              <div>
                <dt className={ACCOUNT_FIELD_LABEL_CLASS}>Ends</dt>
                <dd className={`mt-1 ${ACCOUNT_BODY_VALUE}`}>
                  {formatMembershipDate(activeMembership.end_date)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className={ACCOUNT_FIELD_LABEL_CLASS}>Auto-renew</dt>
              <dd className={`mt-1 ${ACCOUNT_BODY_VALUE}`}>
                {activeMembership.auto_renew ? "On" : "Off"}
              </dd>
            </div>
          </dl>
        ) : null}
        <p className={`mt-3 ${ACCOUNT_BODY_TEXT}`}>
          {isActive
            ? `Your ${planMode === "pet_parent" ? "Pet Parent" : "Pet Friend"} membership unlocks messaging and bookings in this mode.`
            : `Choose a ${planMode === "pet_parent" ? "Pet Parent" : "Pet Friend"} plan below to pay securely with Stripe (TEST mode). Browse for free until you upgrade.`}
        </p>
      </AccountCard>

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

      {isActive && returnTo ? (
        <div className="mb-6">
          <Button href={returnTo} variant="primary" size="md">
            {t.membershipCheckout.continueBooking}
          </Button>
        </div>
      ) : null}

      {cancelError ? (
        <p
          className="mb-4 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {cancelError}
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
        checkoutReturnTo={returnTo}
        cancelPlanLabel={t.membershipCheckout.cancelPlan}
        cancelPlanLoading={cancelLoading}
        onCancelPlan={isActive ? handleCancelPlan : undefined}
      />
    </AccountLayout>
  );
}
