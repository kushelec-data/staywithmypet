"use client";

import { PetIntroCard } from "@/components/pets/PetIntroCard";
import { useLanguage } from "@/context/LanguageContext";
import type { PetIntroDisplay } from "@/lib/pet-intro";
import { PUBLIC_OWNER_PETS_SECTION_ID } from "@/lib/public-profile";

type PublicPetSummaryProps = {
  pets: PetIntroDisplay[];
};

export function PublicPetSummary({ pets }: PublicPetSummaryProps) {
  const { t } = useLanguage();
  const ui = t.publicProfileUi;
  const petsT = t.account.petsPage;

  if (!pets.length) return null;

  return (
    <section
      id={PUBLIC_OWNER_PETS_SECTION_ID}
      className="card-elevated rounded-2xl p-4 sm:p-5 scroll-mt-24"
    >
      <header>
        <h2 className="font-heading text-base font-semibold text-foreground">{ui.petsHeading}</h2>
        <p className="mt-0.5 text-xs text-muted">
          {ui.listedGeneralArea.replace("{count}", String(pets.length))}
        </p>
      </header>

      <ul className="mt-3 space-y-2">
        {pets.map((pet) => (
          <li key={pet.id}>
            <PetIntroCard
              pet={pet}
              variant="public"
              detailsHref={`/pet/${pet.id}`}
              detailsLabel={petsT.publicProfile}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
