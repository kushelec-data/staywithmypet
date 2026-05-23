"use client";

import { AppImage } from "@/components/ui/AppImage";
import { CopyPublicProfileLinkButton } from "@/components/profile/CopyPublicProfileLinkButton";
import { placeholderProfileImage } from "@/lib/images";
import { PublicProfileChips } from "@/components/public/PublicProfileChips";
import { ProfileRatingSummary } from "@/components/reviews/ProfileRatingSummary";
import { SendRequestButton } from "@/components/requests/SendRequestButton";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";
import { Button } from "@/components/ui/Button";
import { formatProfileRoleBadge } from "@/lib/profile-mode";
import { PUBLIC_CARD_MINT } from "@/lib/public-layout";
import type { PublicProfileView } from "@/lib/public-profile";
import { resolvedAvailability } from "@/lib/profile-details";
import { profileInitials } from "@/lib/profile-utils";
import { useAuth } from "@/context/AuthContext";

type MemberPublicTopCardProps = {
  profile: PublicProfileView;
  reviewsAvg: number;
  reviewsCount: number;
  initialSelectedDates?: string[];
};

export function MemberPublicTopCard({
  profile,
  reviewsAvg,
  reviewsCount,
  initialSelectedDates = [],
}: MemberPublicTopCardProps) {
  const { user } = useAuth();
  const isSelf = user?.id === profile.id;
  const initials = profileInitials(profile.display_name, null);
  const chips = [
    formatProfileRoleBadge(profile.role),
    ...(profile.nearbyLocation ? [profile.nearbyLocation] : []),
    ...(profile.languages.slice(0, 2).map((l) => l.trim()).filter(Boolean)),
  ];
  const friendAvailability = resolvedAvailability(profile.details).selected_dates ?? [];
  const isFriend =
    profile.role === "pet_friend" ||
    profile.active_mode === "pet_friend" ||
    profile.role === "both";
  const avatarSrc = profile.avatar_url?.trim()
    ? profile.avatar_url
    : placeholderProfileImage(profile.id);

  return (
    <section className={PUBLIC_CARD_MINT}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="mx-auto shrink-0 lg:mx-0">
          <div className="relative h-[180px] w-[180px] overflow-hidden rounded-2xl ring-2 ring-white/80 shadow-sm sm:h-[200px] sm:w-[200px]">
            <AppImage
              src={avatarSrc}
              alt={profile.display_name}
              seed={profile.id}
              fallbackCaption={profile.display_name}
              fallbackEmoji={initials}
              sizes="200px"
              className="object-cover object-top"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {profile.is_verified ? (
            <div className="flex flex-wrap items-center gap-2">
              <VerifiedBadge />
            </div>
          ) : null}
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
            <p className="line-clamp-3 max-w-prose text-sm leading-relaxed text-foreground/90">
              {profile.bio}
            </p>
          ) : null}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 rounded-2xl border border-brand-teal/10 bg-surface/80 p-4 lg:w-[220px]">
          {isSelf ? (
            <>
              <Button href="/dashboard" size="sm" className="w-full justify-center">
                Dashboard
              </Button>
              <Button href="/profile/edit" variant="outline" size="sm" className="w-full justify-center">
                Edit profile
              </Button>
            </>
          ) : isFriend ? (
            <SendRequestButton
              target={{
                kind: "profile",
                friendId: profile.id,
                label: profile.display_name,
                availabilityDates: friendAvailability,
              }}
              size="md"
              className="w-full justify-center"
              initialSelectedDates={initialSelectedDates}
            />
          ) : (
            <Button href="/find-care" size="sm" className="w-full justify-center">
              Find Pet Friends
            </Button>
          )}
          <CopyPublicProfileLinkButton
            profileId={profile.id}
            size="sm"
            variant="outline"
            className="w-full justify-center"
          />
          {!isSelf ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-black/5 bg-cream/50 py-2">
              <FavoriteButton target={{ type: "friend", id: profile.id }} />
              <span className="text-sm font-medium text-foreground">Save profile</span>
            </div>
          ) : null}
          <p className="text-center text-[0.65rem] leading-snug text-muted">
            Exact address, phone, and email stay private.
          </p>
        </div>
      </div>
    </section>
  );
}
