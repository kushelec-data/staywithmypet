import { PetIntroCard } from "@/components/pets/PetIntroCard";
import type { PetIntroDisplay } from "@/lib/pet-intro";
import { PUBLIC_OWNER_PETS_SECTION_ID } from "@/lib/public-profile";

type PublicPetSummaryProps = {
  pets: PetIntroDisplay[];
};

export function PublicPetSummary({ pets }: PublicPetSummaryProps) {
  if (!pets.length) return null;

  return (
    <section
      id={PUBLIC_OWNER_PETS_SECTION_ID}
      className="card-elevated rounded-2xl p-4 sm:p-5 scroll-mt-24"
    >
      <header>
        <h2 className="font-heading text-base font-semibold text-foreground">Pets</h2>
        <p className="mt-0.5 text-xs text-muted">
          {pets.length} listed · general area only
        </p>
      </header>

      <ul className="mt-3 space-y-2">
        {pets.map((pet) => (
          <li key={pet.id}>
            <PetIntroCard
              pet={pet}
              variant="public"
              detailsHref={`/pet/${pet.id}`}
              detailsLabel="Public profile"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
