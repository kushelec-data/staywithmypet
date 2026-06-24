"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ExpandableBioText } from "@/components/profile/public/ExpandableBioText";
import { BrowserTranslationNotice } from "@/components/public/BrowserTranslationNotice";
import { PublicProfileChips } from "@/components/public/PublicProfileChips";
import { ProfileRatingSummary } from "@/components/reviews/ProfileRatingSummary";
import { SendRequestButton } from "@/components/requests/SendRequestButton";
import { ProfileVerificationBadges } from "@/components/trust/ProfileVerificationBadges";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { formatProfileLanguagesForDisplay } from "@/lib/profile-languages";
import { formatProfileRoleBadge, resolveActiveMode } from "@/lib/profile-mode";
import { PUBLIC_CARD_MINT } from "@/lib/public-layout";
import type { PetIntroDisplay } from "@/lib/pet-intro";
import {
  isProfileShownAsPetParent,
  profileCanReceiveCareRequests,
  PUBLIC_OWNER_PETS_SECTION_ID,
  type PublicProfileView,
} from "@/lib/public-profile";
import { avatarPositionFromDetails } from "@/lib/photo-position";
import { resolvedAvailability } from "@/lib/profile-details";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

type MemberPublicTopCardProps = {
  profile: PublicProfileView;
  reviewsAvg: number;
  reviewsCount: number;
  /** Public pet listings for Pet Parent profiles (drives "View pets" CTA). */
  ownerPets?: PetIntroDisplay[];
};

export function MemberPublicTopCard({
  profile,
  reviewsAvg,
  reviewsCount,
  ownerPets = [],
}: MemberPublicTopCardProps) {
  const { t, locale } = useLanguage();
  const pathname = usePathname();
  const { user } = useAuth();
  const { profile: viewerProfile } = useProfile();
  const isSelf = user?.id === profile.id;
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;
  const viewerMode = viewerProfile
    ? resolveActiveMode(viewerProfile.role, viewerProfile.active_mode)
    : null;
  const chips = [
    formatProfileRoleBadge(profile.role, t.roles),
    ...(profile.nearbyLocation ? [profile.nearbyLocation] : []),
    ...formatProfileLanguagesForDisplay(
      profile.languages,
      profile.details?.languages_other,
      locale,
    ).slice(0, 2),
  ];
  const friendAvailability = resolvedAvailability(profile.details).selected_dates ?? [];
  const canReceiveRequest = profileCanReceiveCareRequests(profile);
  const shownAsParent = isProfileShownAsPetParent(profile);

  const viewPetsHref =
    ownerPets.length === 1
      ? `/pet/${ownerPets[0]!.id}`
      : `#${PUBLIC_OWNER_PETS_SECTION_ID}`;

  let mainCta: ReactNode = null;

  if (isSelf) {
    mainCta = (
      <>
        <Button href="/dashboard" size="sm" className="w-full justify-center">
          {t.navbar.dashboard}
        </Button>
        <Button href="/profile/edit" variant="outline" size="sm" className="w-full justify-center">
          {t.dashboardHome.editProfile}
        </Button>
        <p className="text-center text-[0.65rem] leading-snug text-muted">
          {t.publicProfileUi.thisIsYourProfile}
        </p>
      </>
    );
  } else if (canReceiveRequest) {
    mainCta = user ? (
      <SendRequestButton
        target={{
          kind: "profile",
          friendId: profile.id,
          label: profile.display_name,
          availabilityDates: friendAvailability,
        }}
        size="md"
        className="w-full justify-center"
      />
    ) : (
      <Button href={loginHref} size="md" className="w-full justify-center">
        {t.publicProfileUi.logInToSendRequest}
      </Button>
    );
  } else if (shownAsParent && viewerMode === "pet_friend" && ownerPets.length > 0) {
    mainCta = (
      <Button href={viewPetsHref} size="sm" className="w-full justify-center">
        {ownerPets.length === 1 ? t.requests.viewPet : t.requests.viewPets}
      </Button>
    );
  }

  return (
    <section className={PUBLIC_CARD_MINT}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="mx-auto shrink-0 lg:mx-0">
          <ProfileAvatar
            userId={profile.id}
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            avatarPosition={avatarPositionFromDetails(profile.details)}
            size="xl"
            shape="rounded"
            sizes="200px"
            className="h-[180px] w-[180px] text-3xl ring-2 ring-white/80 shadow-sm sm:h-[200px] sm:w-[200px]"
            imageClassName="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {profile.is_verified ? <VerifiedBadge /> : null}
            <ProfileVerificationBadges trustBadges={profile.trust_badges} />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-[1.65rem]">
            {profile.display_name}
          </h1>
          <ProfileRatingSummary
            ratingAvg={reviewsAvg}
            reviewCount={reviewsCount}
            scrollToSection
            className="!text-sm"
          />
          <PublicProfileChips chips={chips} />
          {profile.bio ? (
            <>
              <BrowserTranslationNotice className="max-w-prose" />
              <ExpandableBioText bio={profile.bio} className="max-w-prose" />
            </>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 max-w-full shrink-0 flex-col gap-2 rounded-2xl border border-brand-teal/10 bg-surface/80 p-4 lg:w-[220px]">
          {mainCta}
          <p className="text-center text-[0.65rem] leading-snug text-muted">
            Exact address, phone, and email stay private.
          </p>
        </div>
      </div>
    </section>
  );
}
