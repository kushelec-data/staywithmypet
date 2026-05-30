"use client";

import { PetPublicMobileCta } from "@/components/pets/PetPublicMobileCta";
import { PetPublicParentCard } from "@/components/pets/PetPublicParentCard";
import { PetPublicReviewsBlock } from "@/components/pets/PetPublicReviewsBlock";
import { PetPublicTopCard } from "@/components/pets/PetPublicTopCard";
import { PublicCareColumnsCard } from "@/components/public/PublicCareColumnsCard";
import { PublicCompactAvailabilityCard } from "@/components/public/PublicCompactAvailabilityCard";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PublicQuickInfoCard } from "@/components/public/PublicQuickInfoCard";
import { VetClinicNearbySection } from "@/components/vet/VetClinicNearbySection";
import { Button } from "@/components/ui/Button";
import { fetchPublicPetProfile } from "@/lib/public-pet";
import {
  buildPublicPetAboutText,
  buildPublicPetCareColumns,
  buildPublicPetChips,
  buildPublicPetQuickFacts,
  buildPublicPetQuickInfo,
  buildPublicPetShortBio,
  buildPublicPetSubtitle,
} from "@/lib/public-pet-display";
import { placeholderPetImage } from "@/lib/images";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import type { PublicSearchPet } from "@/lib/public-pet-search";

type PublicPetDetailPageContentProps = {
  petId: string;
};

export function PublicPetDetailPageContent({ petId }: PublicPetDetailPageContentProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
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
          setError(err instanceof Error ? err.message : "Could not load pet.");
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
        <p className="text-sm text-muted">Loading pet profile…</p>
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
  const isOwnPet = user?.id === pet.ownerId;
  const about = buildPublicPetAboutText(pet);

  return (
    <PublicPageShell className="pb-24 lg:pb-8">
      {notListedPublicly && isOwnerPreview ? (
        <p
          className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          Preview only — turn on public listing in pet settings so others can find this page.
        </p>
      ) : null}

      <div className="space-y-4">
        <PetPublicTopCard
          pet={pet}
          photoUrl={photoUrl}
          subtitle={buildPublicPetSubtitle(pet)}
          chips={buildPublicPetChips(pet)}
          shortBio={buildPublicPetShortBio(pet)}
          quickFacts={buildPublicPetQuickFacts(pet)}
          isOwnPet={isOwnPet}
        />

        <PublicCareColumnsCard columns={buildPublicPetCareColumns(pet)} />

        {about ? (
          <section className={PUBLIC_CARD}>
            <h2 className={PUBLIC_SECTION_TITLE}>About {pet.name}</h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-foreground/90">{about}</p>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0 space-y-4">
            <PetPublicReviewsBlock
              petId={pet.id}
              fallbackAvg={pet.ratingAvg}
              fallbackCount={pet.ratingCount}
            />
          </div>

          <aside className="space-y-4">
            <PublicCompactAvailabilityCard
              petId={pet.id}
              availableDates={pet.availabilityDates}
              availabilityNotes={pet.availabilityNotes}
              visibility={isOwnerPreview ? "full" : "public"}
            />
            <PetPublicParentCard pet={pet} />
            <VetClinicNearbySection
              location={pet.locationArea}
              title="Emergency care nearby"
              description="Veterinary clinics in this pet's area — verify hours before visiting."
              limit={2}
              emergencyOnly
            />
          </aside>
        </div>

        <PublicQuickInfoCard items={buildPublicPetQuickInfo(pet)} />
      </div>

      <PetPublicMobileCta pet={pet} hidden={isOwnPet} />
    </PublicPageShell>
  );
}
