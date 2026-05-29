"use client";

import { AppImage } from "@/components/ui/AppImage";
import { PetPublicProfileActions } from "@/components/pets/PetPublicProfileActions";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { PublicProfileChips } from "@/components/public/PublicProfileChips";
import type { PublicPetQuickFact } from "@/lib/public-pet-display";
import { PUBLIC_CARD_MINT } from "@/lib/public-layout";
import { speciesEmoji } from "@/lib/pet-data";
import type { PublicSearchPet } from "@/lib/public-pet-search";

type PetPublicTopCardProps = {
  pet: PublicSearchPet;
  photoUrl: string;
  subtitle: string;
  chips: string[];
  shortBio: string | null;
  quickFacts: PublicPetQuickFact[];
  isOwnPet: boolean;
  notListedPublicly?: boolean;
};

function QuickFactIcon({ type }: { type: PublicPetQuickFact["icon"] }) {
  const className = "h-3.5 w-3.5 text-brand-teal";
  if (type === "age") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === "gender") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a5 5 0 015 5c0 2.2-1.4 4.1-3.5 4.8V14h2.5v2h-4v4h-2v-4H6v-2h2.5V11.8A5 5 0 0112 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function PetPublicTopCard({
  pet,
  photoUrl,
  subtitle,
  chips,
  shortBio,
  quickFacts,
  isOwnPet,
  notListedPublicly = false,
}: PetPublicTopCardProps) {
  return (
    <section className={PUBLIC_CARD_MINT}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="relative mx-auto w-full max-w-[240px] shrink-0 lg:mx-0">
          <div className="relative aspect-square max-h-[220px] w-full overflow-hidden rounded-2xl bg-mint/20 lg:max-h-[240px] lg:w-[240px]">
            <AppImage
              src={photoUrl}
              alt={pet.name}
              seed={pet.id}
              fallbackEmoji={speciesEmoji(pet.species)}
              fallbackCaption={pet.name}
              sizes="(max-width: 1024px) 100vw, 240px"
              className="h-full w-full object-cover"
            />
            {!isOwnPet ? (
              <FavoriteButton
                target={{ type: "pet", id: pet.id }}
                className="absolute right-2 top-2"
                compact
              />
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            {pet.name}
          </h1>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          <PublicProfileChips chips={chips} />
          {shortBio ? (
            <p className="line-clamp-3 max-w-prose text-sm leading-relaxed text-foreground/90">
              {shortBio}
            </p>
          ) : null}
          {quickFacts.length ? (
            <ul className="flex flex-wrap gap-3 pt-1">
              {quickFacts.map((fact) => (
                <li key={fact.label} className="flex items-center gap-1.5 text-xs text-muted">
                  <QuickFactIcon type={fact.icon} />
                  <span>{fact.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <PetPublicProfileActions
          pet={pet}
          isOwner={isOwnPet}
          notListedPublicly={notListedPublicly}
        />
      </div>
    </section>
  );
}
