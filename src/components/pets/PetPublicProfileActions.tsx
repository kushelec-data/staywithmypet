"use client";

import { SharePublicPetLinkButton } from "@/components/pets/SharePublicPetLinkButton";
import { SendRequestButton } from "@/components/requests/SendRequestButton";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import type { PublicSearchPet } from "@/lib/public-pet-search";

type PetPublicProfileActionsProps = {
  pet: PublicSearchPet;
  isOwner: boolean;
};

export function PetPublicProfileActions({ pet, isOwner }: PetPublicProfileActionsProps) {
  const { t } = useLanguage();
  const copy = t.petPublicProfile;

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 rounded-2xl border border-[#E5E2D8] bg-[#F8F6F1] p-4 lg:w-[220px]">
      {isOwner ? (
        <>
          <p className="text-center text-sm leading-snug text-muted">
            {copy.ownerViewingPublicListing}
          </p>
          <Button href={`/pets/${pet.id}/edit`} size="sm" className="w-full justify-center">
            {copy.editPet}
          </Button>
        </>
      ) : (
        <>
          <SendRequestButton
            variant="pet-care"
            target={{
              kind: "pet",
              petId: pet.id,
              petOwnerId: pet.ownerId,
              label: pet.name,
              availabilityDates: pet.availabilityDates,
            }}
            size="md"
            className="w-full justify-center"
          />
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#E5E2D8] bg-surface py-2.5">
            <FavoriteButton target={{ type: "pet", id: pet.id }} />
            <span className="text-sm font-medium text-foreground">{copy.savePet}</span>
          </div>
          <SharePublicPetLinkButton
            petId={pet.id}
            petName={pet.name}
            size="sm"
            className="w-full justify-center gap-2"
          />
        </>
      )}
      <p className="text-center text-[0.65rem] leading-snug text-muted">{copy.privacyNote}</p>
    </div>
  );
}
