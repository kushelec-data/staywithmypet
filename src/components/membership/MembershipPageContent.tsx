"use client";

import { useMemo, useEffect, useRef, useState } from "react";
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
import type { CheckoutPlanDebugMeta } from "@/lib/membership";
import type { MembershipActivationDebug } from "@/lib/membership-page-debug";
import { parseMembershipPageRole } from "@/lib/membership-upsell";

type StripeCheckoutReadiness = {
  ready: boolean;
  message: string | null;
};

type MembershipPageContentProps = {
  stripeCheckoutByRole?: Record<MembershipRole, StripeCheckoutReadiness>;
  stripePlanErrorsByRole?: Record<MembershipRole, Record<string, string | null>>;
  debugCheckoutMetaByRole?: Record<MembershipRole, CheckoutPlanDebugMeta[]>;
  /** Server: STRIPE_WEBHOOK_SECRET + SUPABASE_SERVICE_ROLE_KEY configured. */
  membershipWebhookWritable?: boolean;
  /** Temporary production debug — server-loaded membership snapshot. */
  activationDebug?: MembershipActivationDebug | null;
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
  debugCheckoutMetaByRole,
  membershipWebhookWritable = true,
  activationDebug = null,
}: MembershipPageContentProps = {}) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const handledReturnRef = useRef<string | null>(null);

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
        router.replace("/membership", { scroll: false });
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
          if (!cancelledEffect) {
            if (res.ok && payload.activated) {
              activated = true;
              setConfirmStatus("confirmed via Stripe session");
            } else if (res.ok && payload.pending) {
              setConfirmStatus("payment still processing");
            } else if (!res.ok) {
              setConfirmStatus(payload.error ?? `confirm failed (${res.status})`);
            }
          }
        } catch (err) {
          if (!cancelledEffect) {
            setConfirmStatus(
              err instanceof Error ? err.message : "confirm-membership request failed",
            );
          }
        }
      } else if (!membershipWebhookWritable) {
        if (!cancelledEffect) {
          setCheckoutBanner(t.membershipCheckout.paymentWebhookPending);
          setConfirmStatus("no session_id; webhook not writable");
        }
        router.replace("/membership", { scroll: false });
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
      router.replace("/membership", { scroll: false });
    }

    void handleReturn();

    return () => {
      cancelledEffect = true;
    };
  }, [
    searchParams,
    router,
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
  const modeActivationDebug = activationDebug?.[modeRole];

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
  const pageTitle = membershipPageTitle(planMode);
  const pageSubtitle = membershipPageSubtitle(planMode);
  const statusHeadline = isActive && activePlanName
    ? membershipActiveHeadline(planMode, activePlanName)
    : membershipInactiveHeadline(planMode);

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
            ? `Your ${planMode === "pet_parent" ? "Pet Parent" : "Pet Friend"} membership unlocks messaging and bookings in this mode.`
            : `Choose a ${planMode === "pet_parent" ? "Pet Parent" : "Pet Friend"} plan below to pay securely with Stripe (TEST mode). Browse for free until you upgrade.`}
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

      {activationDebug ? (
        <div
          className="mb-4 rounded-2xl border border-dashed border-amber-400/70 bg-amber-50/80 px-4 py-3 font-mono text-xs text-amber-950"
          aria-label="Membership activation debug"
        >
          <p className="mb-2 font-sans text-sm font-semibold text-amber-950">
            Activation debug (temporary)
          </p>
          <dl className="grid gap-1 sm:grid-cols-2">
            <div>
              <dt className="text-amber-800">User id</dt>
              <dd className="break-all">{activationDebug.userId}</dd>
            </div>
            <div>
              <dt className="text-amber-800">Webhook writable</dt>
              <dd>{activationDebug.webhookWritable ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt className="text-amber-800">Confirm API writable</dt>
              <dd>{activationDebug.confirmWritable ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt className="text-amber-800">
                {membershipRoleTitle(modeRole)} row found
              </dt>
              <dd>{modeActivationDebug?.rowFound ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt className="text-amber-800">
                {membershipRoleTitle(modeRole)} active (DB rules)
              </dt>
              <dd>{modeActivationDebug?.isActive ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt className="text-amber-800">Status</dt>
              <dd>{modeActivationDebug?.status ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-amber-800">Expires</dt>
              <dd>
                {modeActivationDebug?.endDate
                  ? formatMembershipDate(modeActivationDebug.endDate)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-amber-800">Plan id (DB)</dt>
              <dd>{modeActivationDebug?.planId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-amber-800">UI mode / role checked</dt>
              <dd>
                {planMode} → {modeRole}
              </dd>
            </div>
            <div>
              <dt className="text-amber-800">Parent active</dt>
              <dd>{activationDebug.pet_parent.isActive ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt className="text-amber-800">Friend active</dt>
              <dd>{activationDebug.pet_friend.isActive ? "yes" : "no"}</dd>
            </div>
            {confirmStatus ? (
              <div className="sm:col-span-2">
                <dt className="text-amber-800">Confirm API</dt>
                <dd>{confirmStatus}</dd>
              </div>
            ) : null}
          </dl>
          {!activationDebug.confirmWritable ? (
            <p className="mt-2 font-sans text-xs text-amber-900">
              Confirm API cannot write memberships: check STRIPE_SECRET_KEY and
              SUPABASE_SERVICE_ROLE_KEY on the server.
            </p>
          ) : null}
          {!activationDebug.webhookWritable ? (
            <p className="mt-2 font-sans text-xs text-amber-900">
              Webhook cannot write memberships: check STRIPE_WEBHOOK_SECRET and
              SUPABASE_SERVICE_ROLE_KEY on the server.
            </p>
          ) : null}
        </div>
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
        debugCheckoutMeta={debugCheckoutMetaByRole?.[modeRole]}
      />
    </DashboardShell>
  );
}
