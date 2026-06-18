"use client";

import { STATUS_ALERT_WARNING_CLASS } from "@/lib/status-colors";
import { PetPublicMobileCta } from "@/components/pets/PetPublicMobileCta";
import { PetPublicParentCard } from "@/components/pets/PetPublicParentCard";
import { PetPublicReviewsBlock } from "@/components/pets/PetPublicReviewsBlock";
import { PetPublicTopCard } from "@/components/pets/PetPublicTopCard";
import { PublicCareColumnsCard } from "@/components/public/PublicCareColumnsCard";
import { PublicPetCareDetailsCard } from "@/components/public/PublicPetCareDetailsCard";
import { BrowserTranslationNotice } from "@/components/public/BrowserTranslationNotice";
import { PublicCompactAvailabilityCard } from "@/components/public/PublicCompactAvailabilityCard";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PublicQuickInfoCard } from "@/components/public/PublicQuickInfoCard";
import { VetClinicNearbySection } from "@/components/vet/VetClinicNearbySection";
import { Button } from "@/components/ui/Button";
import { fetchPublicPetProfile } from "@/lib/public-pet";
import {
  buildPublicPetCareColumns,
  buildPublicPetCareDetails,
  buildPublicPetChips,
  buildPublicPetQuickFacts,
  buildPublicPetQuickInfo,
  buildPublicPetSubtitle,
  resolvePublicPetContent,
} from "@/lib/public-pet-display";
import { placeholderPetImage } from "@/lib/images";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useMemo, useState } from "react";
import type { PublicSearchPet } from "@/lib/public-pet-search";

type PublicPetDetailPageContentProps = {
  petId: string;
};

export function PublicPetDetailPageContent({ petId }: PublicPetDetailPageContentProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const { locale, t } = useLanguage();
  const detail = t.petPublicDetail;
  const [pet, setPet] = useState<PublicSearchPet | null>(null);
  const [isOwnerPreview, setIsOwnerPreview] = useState(false);
  const [notListedPublicly, setNotListedPublicly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPublicPetProfile(supabase, petId, user?.id ?? null);
        if (!cancelled) {
          setPet(result.pet);
          setIsOwnerPreview(result.isOwnerPreview);
          setNotListedPublicly(result.notListedPublicly);
        }
      } catch (err) {
        if (!cancelled) {
          setPet(null);
          setError(err instanceof Error ? err.message : t.account.petsPage.loadPetError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, petId, user?.id]);

  if (loading) {
    return (
      <PublicPageShell>
        <p className="text-sm text-muted">{t.account.petsPage.loadingPetProfile}</p>
      </PublicPageShell>
    );
  }

  if (error || !pet) {
    return (
      <PublicPageShell>
        <div className={PUBLIC_CARD}>
          <p className="text-sm text-brand-pink" role="alert">
            {error ?? "This pet is not available."}
          </p>
          <Button href="/find-pets" variant="outline" size="sm" className="mt-3">
            Back to search
          </Button>
        </div>
      </PublicPageShell>
    );
  }

  const photos =
    pet.photoUrls.length > 0
      ? pet.photoUrls
      : pet.primaryPhotoUrl
        ? [pet.primaryPhotoUrl]
        : [];
  const photoUrl = photos[0] ?? placeholderPetImage(pet.id);
  const isOwnPet = isOwnerPreview || user?.id === pet.ownerId;
  const { shortBio, about } = resolvePublicPetContent(pet);

  const careColumns = buildPublicPetCareColumns(pet, locale);
  const careDetails = buildPublicPetCareDetails(
    pet,
    locale,
    {
      healthDetails: detail.healthDetails,
      feedingSchedule: detail.feedingSchedule,
      feedingHabits: detail.feedingHabits,
      positiveTraits: detail.positiveTraits,
      behaviourNotes: detail.behaviourNotes,
      additionalInfo: detail.additionalInfo,
      friendRequirements: detail.friendRequirements,
    },
    {
      excludeTexts: [about, shortBio, pet.additionalNotes].filter(
        (value): value is string => Boolean(value?.trim()),
      ),
    },
  );

  const hasUserWrittenContent =
    Boolean(shortBio?.trim()) || Boolean(about?.trim()) || careDetails.length > 0;

  return (
    <PublicPageShell
      backLabel={detail.backToSearchPets}
      className={isOwnPet ? "pb-8" : "pb-24 lg:pb-8"}
    >
      {notListedPublicly && isOwnerPreview ? (
        <p
          className={`mb-4 ${STATUS_ALERT_WARNING_CLASS}`}
          role="status"
        >
          Preview only — turn on public listing in pet settings so others can find this page.
        </p>
      ) : null}

      <div className="min-w-0 space-y-3 sm:space-y-4">
        <PetPublicTopCard
          pet={pet}
          photoUrl={photoUrl}
          photoUrls={photos}
          subtitle={buildPublicPetSubtitle(pet, locale)}
          chips={buildPublicPetChips(pet, locale)}
          shortBio={shortBio}
          quickFacts={buildPublicPetQuickFacts(pet, locale)}
          isOwnPet={isOwnPet}
        />

        {hasUserWrittenContent ? <BrowserTranslationNotice /> : null}

        <PublicCareColumnsCard columns={careColumns} />

        <PublicPetCareDetailsCard items={careDetails} title={detail.careDetails} />

        {isOwnPet ? (
          <div className="flex justify-start">
            <Button href={`/pets/${pet.id}/edit`} variant="outline" size="sm">
              {detail.backToEditPet}
            </Button>
          </div>
        ) : null}

        {about ? (
          <section className={PUBLIC_CARD}>
            <h2 className={PUBLIC_SECTION_TITLE}>{detail.aboutPet.replace("{name}", pet.name)}</h2>
            <p className="mt-3 w-full text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem] sm:leading-7">
              {about}
            </p>
          </section>
        ) : null}

        <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start">
          <div className="min-w-0 space-y-3 sm:space-y-4">
            <PetPublicReviewsBlock
              petId={pet.id}
              fallbackAvg={pet.ratingAvg}
              fallbackCount={pet.ratingCount}
            />
          </div>

          <aside className="min-w-0 space-y-3 sm:space-y-4">
            <PublicCompactAvailabilityCard
              petId={pet.id}
              availableDates={pet.availabilityDates}
              availabilityNotes={pet.availabilityNotes}
              visibility={isOwnerPreview ? "full" : "public"}
            />
            <PetPublicParentCard pet={pet} />
            <VetClinicNearbySection
              location={pet.locationArea}
              title={detail.emergencyCareNearby}
              description={detail.vetClinicsDescription}
              limit={2}
              emergencyOnly
            />
          </aside>
        </div>

        <PublicQuickInfoCard items={buildPublicPetQuickInfo(pet, locale)} />
      </div>

      <PetPublicMobileCta pet={pet} hidden={isOwnPet} />
    </PublicPageShell>
  );
}
