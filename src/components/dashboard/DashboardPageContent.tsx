"use client";

import { PetIntroCard } from "@/components/pets/PetIntroCard";
import { DashboardAccountSummaryCard } from "@/components/dashboard/DashboardAccountSummaryCard";
import { DashboardContactCard } from "@/components/dashboard/DashboardContactCard";
import { DashboardVetClinicsCard } from "@/components/dashboard/DashboardVetClinicsCard";
import { DashboardProfileCompletenessCard } from "@/components/dashboard/DashboardProfileCompletenessCard";
import { DashboardTrustCard } from "@/components/dashboard/DashboardTrustCard";
import {
  DashboardEmptyState,
  DashboardInfoCard,
} from "@/components/dashboard/DashboardInfoCard";
import { DashboardProfileHero } from "@/components/dashboard/DashboardProfileHero";
import { DashboardShell } from "@/components/layout/DashboardShell";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { DASHBOARD_CALLOUT_CLASS, DASHBOARD_LINK_CLASS } from "@/lib/dashboard-theme";

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
    profilePhoto,
    bioCompleted,
    location,
    phone,
    atLeastOnePet,
    petCareDetails,
    petAvailability,
    carePreferences,
    availability,
    livingSituation,
    emergencyContact,
  } = pc;
  return {
    profilePhoto,
    bioCompleted,
    location,
    phone,
    atLeastOnePet,
    petCareDetails,
    petAvailability,
    carePreferences,
    availability,
    livingSituation,
    emergencyContact,
  };
}

export function DashboardPageContent() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { profile, displayName, loading: profileLoading, needsRoleOnboarding: rolePending } =
    useProfile();
  const { snapshot, waitingForProfile } = useDashboardData();

  if (rolePending || waitingForProfile) {
    return (
      <div className="py-12 text-center text-sm text-muted">Loading your dashboard…</div>
    );
  }

  if (!user) {
    if (!authLoading) router.replace("/login");
    return null;
  }

  if (!profile) {
    return (
      <div className="py-12 text-center text-sm text-muted">
        <p>We couldn&apos;t load your profile.</p>
        <Link href="/profile/edit" className={`${DASHBOARD_LINK_CLASS} mt-2 inline-block`}>
          Complete your profile
        </Link>
      </div>
    );
  }

  const details = profile.details ?? {};
  const activeMode = resolveActiveMode(profile.role, profile.active_mode);
  const availabilityUx = availabilityUxForProfile(profile.role, activeMode);
  const profileCalDates = profileCalendarSelectedDates(details);
  const careSummary = buildPetCarePreferencesSummary(details);
  const livingSummary = buildLivingSituationSummary(details);
  const availabilitySummary = buildAvailabilitySummary(details, { locale });

  const reviewsCount = snapshot.reviewsCount || profile.rating_count;
  const reviewsAvg =
    snapshot.reviewsCount > 0 ? snapshot.reviewsAvg : profile.rating_avg;

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

  const needsMyAvailability =
    availabilityUx.showMyAvailability && profileCalDates.length === 0;

  const locationPetTitle = showPetCareSection
    ? "Location & pet care"
    : availabilityUx.showMyAvailability
      ? "Location & availability"
      : "Your location";

  const locationPetCard = showPetCareSection ? (
    <DashboardInfoCard title={locationPetTitle} editHref="/profile/edit">
      <div className="space-y-3 text-sm">
        <p className="text-xs text-muted">
          <span className="font-medium text-foreground">
            {profile.location?.trim() || "Location not set"}
          </span>
          {profile.address?.trim() ? (
            <span className="mt-0.5 block text-muted">{profile.address.trim()}</span>
          ) : null}
        </p>

        {availabilityUx.showMyAvailability ? (
          <AvailabilityDateChips
            dates={profileCalDates}
            label="My availability"
            locale={locale}
            emptyLabel="Not set"
            tone="dashboard"
          />
        ) : null}

        {snapshot.petIntros.length === 0 ? (
          <DashboardEmptyState
            message="Add a pet so Pet Friends can see care needs."
            actionHref="/pets/new"
            actionLabel="Add pet"
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
            Manage pets
          </Button>
          {needsMyAvailability ? (
            <Button href="/profile/edit" variant="outline" size="sm">
              Add availability
            </Button>
          ) : null}
        </div>
      </div>
    </DashboardInfoCard>
  ) : (
    <DashboardInfoCard title={locationPetTitle} editHref="/profile/edit">
      <div className="space-y-2 text-sm">
        <p className="text-foreground">{profile.location?.trim() || "Not set"}</p>
        {availabilityUx.showMyAvailability ? (
          <AvailabilityDateChips
            dates={profileCalDates}
            locale={locale}
            emptyLabel="Not set"
            tone="dashboard"
          />
        ) : null}
        {needsMyAvailability ? (
          <Button href="/profile/edit" variant="outline" size="sm">
            Add availability
          </Button>
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
          reviewsCount: snapshot.reviewsCount,
          completedBookingsCount: snapshot.completedBookingsCount,
        }}
      />
      <DashboardAccountSummaryCard profile={profile} snapshot={snapshot} />
    </>
  );

  return (
    <DashboardShell
      title="Dashboard"
      description="Your account at a glance."
      hideCompleteProfileBanner
      rightAside={dashboardRightAside}
    >
      <ProfileCompleteEmailEffect percent={completeness.percent} />
      <div className="mx-auto flex w-full min-w-0 flex-1 flex-col gap-4 sm:gap-5 lg:max-w-3xl xl:max-w-none">
        <section aria-label="Profile summary">
          <DashboardProfileHero
            profile={profile}
            displayName={displayName}
            email={user.email}
            publicProfileHref={publicHref}
            isPublic={profile.is_public}
            reviewsAvg={reviewsAvg}
            reviewsCount={reviewsCount}
          />
        </section>

        {showParentNoPetsBanner || showFriendSetupBanner ? (
          <section aria-label="Setup reminders" className="space-y-3">
            {showParentNoPetsBanner ? (
              <div className={`${DASHBOARD_CALLOUT_CLASS} p-4 sm:p-5`}>
                <p className="text-sm text-foreground">
                  You haven&apos;t added any pets yet. Add your first pet so Pet Friends can find you.
                </p>
                <Button href="/pets/new" size="sm" className="mt-3">
                  Add pet
                </Button>
              </div>
            ) : null}

            {showFriendSetupBanner ? (
              <div className={`${DASHBOARD_CALLOUT_CLASS} p-4 sm:p-5`}>
                <p className="text-sm text-muted">
                  Complete your Pet Friend setup so Pet Parents can request you.
                </p>
                <Button href="/profile/edit#pet-care-preferences" size="sm" className="mt-3">
                  Complete setup
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
          <DashboardInfoCard title="About me" editHref="/profile/edit">
            {profile.bio?.trim() ? (
              <>
                <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">
                  {profile.bio}
                </p>
                <Link
                  href="/profile/edit"
                  className={`${DASHBOARD_LINK_CLASS} mt-2 inline-block text-xs`}
                >
                  View more →
                </Link>
              </>
            ) : (
              <DashboardEmptyState
                message="You haven't added a bio yet."
                actionHref="/profile/edit"
                actionLabel="Add bio"
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
    </DashboardShell>
  );
}
