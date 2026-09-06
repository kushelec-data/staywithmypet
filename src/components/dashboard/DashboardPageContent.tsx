"use client";

import { PetIntroCard } from "@/components/pets/PetIntroCard";
import { DashboardAccountSummaryCard } from "@/components/dashboard/DashboardAccountSummaryCard";
import { DashboardContactCard } from "@/components/dashboard/DashboardContactCard";
import { DashboardProfileCompletenessCard } from "@/components/dashboard/DashboardProfileCompletenessCard";
import { DashboardTrustCard } from "@/components/dashboard/DashboardTrustCard";
import {
  DashboardEmptyState,
  DashboardInfoCard,
} from "@/components/dashboard/DashboardInfoCard";
import { DashboardProfileHero } from "@/components/dashboard/DashboardProfileHero";
import { ExpandableBioText } from "@/components/profile/public/ExpandableBioText";
import { DashboardReviewPromptBanner } from "@/components/dashboard/DashboardReviewPromptBanner";
import { DashboardMatchBanner } from "@/components/dashboard/DashboardMatchBanner";
import { NewMemberPromotionBanner } from "@/components/membership/NewMemberPromotionBanner";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  computeProfileCompleteness,
  publicProfileHref,
  type ProfileCompletenessLabels,
} from "@/lib/profile-completeness";
import { useLanguage } from "@/context/LanguageContext";
import type { Dictionary } from "@/i18n/translations";
import { availabilityUxForProfile } from "@/lib/availability-ux";
import { AvailabilityDateChips } from "@/components/ui/AvailabilityDateChips";
import { hasCarePreferences, profileCalendarSelectedDates } from "@/lib/profile-details";
import {
  buildAvailabilitySummary,
  buildLivingSituationSummary,
  buildPetCarePreferencesSummary,
} from "@/lib/profile-summaries";
import { ProfileSummaryCard } from "@/components/profile/summary/ProfileSummaryCard";
import { resolveActiveMode } from "@/lib/profile-mode";
import { activeModeToMembershipRole } from "@/lib/membership";
import { isWelcomeOfferEligibleForRole } from "@/lib/profile-utils";
import { welcomeOfferDisplayModeForUser } from "@/lib/new-member-promotion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { DASHBOARD_CALLOUT_CLASS, DASHBOARD_LINK_CLASS } from "@/lib/dashboard-theme";

const DashboardAvailabilityMiniCalendar = dynamic(
  () =>
    import("@/components/dashboard/DashboardAvailabilityMiniCalendar").then((mod) => ({
      default: mod.DashboardAvailabilityMiniCalendar,
    })),
  { ssr: false },
);

const DashboardVetClinicsCard = dynamic(
  () =>
    import("@/components/dashboard/DashboardVetClinicsCard").then((mod) => ({
      default: mod.DashboardVetClinicsCard,
    })),
  { ssr: false },
);

function ProfileCompleteEmailEffect({ percent }: { percent: number }) {
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (percent < 100) {
      notifiedRef.current = false;
      return;
    }
    if (notifiedRef.current) return;
    notifiedRef.current = true;

    const timer = window.setTimeout(() => {
      void import("@/app/actions/email-events").then(({ sendProfileCompletedEmailAction }) =>
        sendProfileCompletedEmailAction(),
      );
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [percent]);

  return null;
}

function completenessLabelsFromDictionary(
  pc: Dictionary["profileCompleteness"],
): ProfileCompletenessLabels {
  const {
    sectionTitle: _a,
    scoreTitle: _b,
    scoreHelper: _c,
    profileComplete: _d,
    ...labels
  } = pc;
  return labels as ProfileCompletenessLabels;
}

export function DashboardPageContent() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const {
    profile,
    displayName,
    loading: profileLoading,
    profileResolved,
    needsRoleOnboarding: rolePending,
  } = useProfile();
  const { snapshot, waitingForProfile, loadSnapshot } = useDashboardData();

  const dh = t.dashboardHome;
  const acc = t.account;

  if (rolePending || waitingForProfile) {
    return (
      <div className="py-12 text-center text-sm text-muted">{dh.loadingDashboard}</div>
    );
  }

  if (!user) {
    if (!authLoading) router.replace("/login");
    return null;
  }

  if (profileResolved && !profile && !rolePending) {
    router.replace("/profile/setup");
    return null;
  }

  if (!profile) {
    return (
      <div className="py-12 text-center text-sm text-muted">
        <p>{dh.profileLoadError}</p>
        <Link href="/profile/edit" className={`${DASHBOARD_LINK_CLASS} mt-2 inline-block`}>
          {acc.completeProfileCta}
        </Link>
      </div>
    );
  }

  const details = profile.details ?? {};
  const activeMode = resolveActiveMode(profile.role, profile.active_mode);
  const availabilityUx = availabilityUxForProfile(profile.role, activeMode);
  const profileCalDates = profileCalendarSelectedDates(details);
  const careSummary = buildPetCarePreferencesSummary(details, { locale });
  const livingSummary = buildLivingSituationSummary(details, { locale });
  const availabilitySummary = buildAvailabilitySummary(details, { locale });

  const reviewsCount = profile.rating_count;
  const reviewsAvg = profile.rating_avg;

  const completeness = computeProfileCompleteness(profile, {
    petsCount: snapshot.petsOwned,
    activeMode,
    petIntros: snapshot.petIntros,
    labels: completenessLabelsFromDictionary(t.profileCompleteness),
  });

  const showFriendPreferenceCards = activeMode === "pet_friend";

  const showPetCareSection = activeMode === "pet_parent";

  const showParentNoPetsBanner =
    activeMode === "pet_parent" && snapshot.petsOwned === 0;
  const showFriendSetupBanner =
    activeMode === "pet_friend" && !hasCarePreferences(details);

  const emailVerified = Boolean(user.email_confirmed_at);
  const publicHref = publicProfileHref(profile.id);

  const membershipRole = activeModeToMembershipRole(activeMode);
  const welcomeOfferEligible = isWelcomeOfferEligibleForRole(profile, membershipRole);
  const welcomeOfferDisplayMode = welcomeOfferDisplayModeForUser({
    loggedIn: true,
    confirmedEligible: welcomeOfferEligible,
  });

  const needsMyAvailability =
    availabilityUx.showMyAvailability && profileCalDates.length === 0;

  const locationPetTitle = showPetCareSection
    ? dh.locationPetCare
    : availabilityUx.showMyAvailability
      ? dh.locationAvailability
      : dh.yourLocation;

  const locationPetCard = showPetCareSection ? (
    <DashboardInfoCard title={locationPetTitle} editHref="/profile/edit">
      <div className="space-y-3 text-sm">
        <p className="text-xs text-muted">
          <span className="font-medium text-foreground">
            {profile.location?.trim() || acc.locationNotSet}
          </span>
          {profile.address?.trim() ? (
            <span className="mt-0.5 block text-muted">{profile.address.trim()}</span>
          ) : null}
        </p>

        {availabilityUx.showMyAvailability ? (
          <AvailabilityDateChips
            dates={profileCalDates}
            label={dh.myAvailability}
            locale={locale}
            emptyLabel={acc.notSet}
            tone="dashboard"
          />
        ) : null}

        {snapshot.petIntros.length === 0 ? (
          <DashboardEmptyState
            message={dh.addPetForCareNeeds}
            actionHref="/pets/new"
            actionLabel={acc.nav.addPet}
          />
        ) : (
          <ul className="space-y-2">
            {snapshot.petIntros.map((pet) => (
              <li key={pet.id}>
                <PetIntroCard
                  pet={pet}
                  variant="dashboard"
                  editHref={`/pets/${pet.id}/edit`}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 border-t border-[#E5E2D8] pt-3">
          <Button href="/pets" variant="ghost" size="sm">
            {dh.managePets}
          </Button>
          {needsMyAvailability ? (
            <Button href="/profile/edit" variant="outline" size="sm">
              {dh.addAvailability}
            </Button>
          ) : null}
        </div>
      </div>
    </DashboardInfoCard>
  ) : (
    <DashboardInfoCard title={locationPetTitle} editHref="/profile/edit">
      <div className="space-y-3 text-sm">
        {availabilityUx.showMyAvailability && user ? (
          <DashboardAvailabilityMiniCalendar
            availabilityDates={profileCalDates}
            petFriendId={user.id}
            emptyLabel={acc.notSet}
          />
        ) : null}
      </div>
    </DashboardInfoCard>
  );

  const dashboardRightAside = (
    <>
      <DashboardProfileCompletenessCard profile={profile} completeness={completeness} />
      <DashboardTrustCard
        profile={profile}
        emailVerified={emailVerified}
        snapshot={{
          reviewsCount: profile.rating_count,
          completedBookingsCount: snapshot.completedBookingsCount,
        }}
      />
      <DashboardAccountSummaryCard profile={profile} snapshot={snapshot} />
    </>
  );

  return (
    <AccountLayout
      title={dh.pageTitle}
      description={dh.pageDescription}
      hideCompleteProfileBanner
      rightAside={dashboardRightAside}
    >
      <ProfileCompleteEmailEffect percent={completeness.percent} />
      <DashboardMatchBanner />
      <div className="mx-auto flex w-full min-w-0 flex-1 flex-col gap-4 sm:gap-5 lg:max-w-3xl xl:max-w-none">
        <section aria-label="Profile summary">
          <DashboardProfileHero
            profile={profile}
            displayName={displayName}
            email={user.email}
            publicProfileHref={publicHref}
            activeMode={activeMode}
            completeness={completeness}
            reviewsAvg={reviewsAvg}
            reviewsCount={reviewsCount}
          />
        </section>

        {snapshot.pendingReviewBooking ? (
          <section aria-label="Review prompt">
            <DashboardReviewPromptBanner
              booking={snapshot.pendingReviewBooking}
              onReviewDone={() => void loadSnapshot()}
            />
          </section>
        ) : null}

        {welcomeOfferDisplayMode === "confirmed" ? (
          <section aria-label="Membership offer">
            <NewMemberPromotionBanner
              role={membershipRole}
              displayMode="confirmed"
              loggedIn
              variant="compact"
            />
          </section>
        ) : null}

        {showParentNoPetsBanner || showFriendSetupBanner ? (
          <section aria-label="Setup reminders" className="space-y-3">
            {showParentNoPetsBanner ? (
              <div className={`${DASHBOARD_CALLOUT_CLASS} p-4 sm:p-5`}>
                <p className="text-sm text-foreground">
                  {dh.noPetsYet}
                </p>
                <Button href="/pets/new" size="sm" className="mt-3">
                  {acc.nav.addPet}
                </Button>
              </div>
            ) : null}

            {showFriendSetupBanner ? (
              <div className={`${DASHBOARD_CALLOUT_CLASS} p-4 sm:p-5`}>
                <p className="text-sm text-muted">
                  {dh.completeFriendSetup}
                </p>
                <Button href="/profile/edit#pet-care-preferences" size="sm" className="mt-3">
                  {dh.completeSetup}
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-label="Location and pet care" className="space-y-4 sm:space-y-5">
          {locationPetCard}
        </section>

        <section aria-label="Contact">
          <DashboardContactCard profile={profile} />
        </section>

        <section aria-label="Profile details" className="space-y-4 sm:space-y-5">
          <DashboardInfoCard title={dh.aboutMe} editHref="/profile/edit" editLabel={acc.edit}>
            {profile.bio?.trim() ? (
              <ExpandableBioText bio={profile.bio.trim()} />
            ) : (
              <DashboardEmptyState
                message={dh.noBioYet}
                actionHref="/profile/edit"
                actionLabel={dh.addBio}
              />
            )}
          </DashboardInfoCard>

          {showFriendPreferenceCards ? (
            <>
              <ProfileSummaryCard summary={livingSummary} editHref="/profile/edit#living-situation" />
              <ProfileSummaryCard summary={careSummary} editHref="/profile/edit#pet-care-preferences" />
              <ProfileSummaryCard summary={availabilitySummary} editHref="/profile/edit#availability" />
            </>
          ) : null}
        </section>

        <section aria-label="Emergency clinics">
          <DashboardVetClinicsCard profile={profile} />
        </section>
      </div>
    </AccountLayout>
  );
}
