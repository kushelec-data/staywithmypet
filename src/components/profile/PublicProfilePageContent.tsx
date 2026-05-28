"use client";

import { PublicCompactAvailabilityCard } from "@/components/public/PublicCompactAvailabilityCard";
import { PublicCompactReviewsCard } from "@/components/public/PublicCompactReviewsCard";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PublicApproximateMapCard } from "@/components/profile/public/PublicApproximateMapCard";
import { MemberPublicTopCard } from "@/components/profile/public/MemberPublicTopCard";
import { PublicMemberCareCard } from "@/components/profile/public/PublicMemberCareCard";
import { PublicMemberLivingCard } from "@/components/profile/public/PublicMemberLivingCard";
import { PublicPetSummary } from "@/components/profile/public/PublicPetSummary";
import { PublicProfileGallery } from "@/components/profile/public/PublicProfileGallery";
import { PublicTrustCard } from "@/components/profile/public/PublicTrustCard";
import { UserSafetyActions } from "@/components/trust/UserSafetyActions";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfileReviews } from "@/hooks/useProfileReviews";
import { REVIEWS_SECTION_ID } from "@/components/reviews/ProfileRatingSummary";
import {
  fetchPublicPetsForOwner,
  fetchPublicProfile,
  showPublicCareSection,
  showPublicPetsSection,
  type PublicPetSummary as PublicPet,
  type PublicProfileView,
} from "@/lib/public-profile";
import { resolvedAvailability } from "@/lib/profile-details";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

type PublicProfilePageContentProps = {
  profileId: string;
};

export function PublicProfilePageContent({ profileId }: PublicProfilePageContentProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<PublicProfileView | null>(null);
  const [pets, setPets] = useState<PublicPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchPublicProfile(supabase, profileId);
        if (cancelled) return;

        if (!row) {
          setError("This profile could not be found.");
          setProfile(null);
          setPets([]);
          return;
        }

        if (!row.is_public && user?.id !== profileId) {
          setError("This profile is not public.");
          setProfile(null);
          setPets([]);
          return;
        }

        setProfile(row);

        if (showPublicPetsSection(row)) {
          const petRows = await fetchPublicPetsForOwner(supabase, profileId);
          if (!cancelled) setPets(petRows);
        } else {
          setPets([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load profile.");
          setProfile(null);
          setPets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, profileId, user?.id]);

  const { reviews, loading: reviewsLoading, ratingAvg, ratingCount } = useProfileReviews(
    profile?.id ?? null,
  );

  useEffect(() => {
    if (loading || reviewsLoading || !profile) return;
    if (typeof window === "undefined" || window.location.hash !== `#${REVIEWS_SECTION_ID}`) return;
    document.getElementById(REVIEWS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, reviewsLoading, profile]);

  if (loading) {
    return (
      <PublicPageShell backHref="/find-care" backLabel="Browse Pet Friends">
        <p className="text-sm text-muted">Loading profile…</p>
      </PublicPageShell>
    );
  }

  if (error || !profile) {
    return (
      <PublicPageShell backHref="/find-care" backLabel="Browse Pet Friends">
        <div className="card-elevated rounded-2xl p-4 sm:p-5">
          <p className="text-sm text-brand-pink" role="alert">
            {error ?? "Profile not found."}
          </p>
          <Button href="/" variant="outline" size="sm" className="mt-3">
            Back home
          </Button>
        </div>
      </PublicPageShell>
    );
  }

  const friendDates = resolvedAvailability(profile.details).selected_dates ?? [];
  const showFriendSections = showPublicCareSection(profile);

  return (
    <PublicPageShell backHref="/find-care" backLabel="Browse Pet Friends">
      <div className="space-y-4">
        <MemberPublicTopCard
          profile={profile}
          reviewsAvg={ratingAvg}
          reviewsCount={ratingCount}
        />

        {profile.profilePhotos.length > 0 ? (
          <PublicProfileGallery photos={profile.profilePhotos} displayName={profile.display_name} />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0 space-y-4">
            {showPublicPetsSection(profile) ? <PublicPetSummary pets={pets} /> : null}
            {showFriendSections ? <PublicMemberCareCard profile={profile} /> : null}
            {showFriendSections ? <PublicMemberLivingCard profile={profile} /> : null}
            <PublicCompactReviewsCard
              reviews={reviews}
              loading={reviewsLoading}
              ratingAvg={ratingAvg}
              ratingCount={ratingCount}
              noteLabel="review"
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            {showFriendSections ? (
              <PublicCompactAvailabilityCard
                petFriendId={profile.id}
                availableDates={friendDates}
                availabilityNotes={resolvedAvailability(profile.details).notes}
                visibility={user?.id === profile.id ? "full" : "public"}
              />
            ) : null}
            <PublicApproximateMapCard profile={profile} />
            <PublicTrustCard profile={profile} reviewsAvg={ratingAvg} reviewsCount={ratingCount} />
            {user && user.id !== profile.id ? (
              <section className="card-elevated rounded-2xl border border-black/[0.06] p-4 sm:p-5">
                <h2 className="font-heading text-base font-semibold text-foreground">
                  {t.trustSafety.safetySectionTitle}
                </h2>
                <UserSafetyActions
                  className="mt-3"
                  layout="stack"
                  currentUserId={user.id}
                  targetUserId={profile.id}
                  targetUserName={profile.display_name}
                />
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </PublicPageShell>
  );
}
