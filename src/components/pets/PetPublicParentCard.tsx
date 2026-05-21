import { AppImage } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicSearchPet } from "@/lib/public-pet-search";
import Link from "next/link";

type PetPublicParentCardProps = {
  pet: PublicSearchPet;
};

export function PetPublicParentCard({ pet }: PetPublicParentCardProps) {
  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>Pet parent</h2>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-mint/30 ring-2 ring-mint/40">
          <AppImage
            src={pet.ownerAvatarUrl ?? ""}
            alt={pet.ownerName}
            seed={pet.ownerId}
            fallbackCaption={pet.ownerName}
            fallbackEmoji="🐾"
            sizes="48px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={pet.ownerProfileHref}
            className="font-semibold text-foreground hover:text-brand-teal"
          >
            {pet.ownerName}
          </Link>
          {pet.locationArea ? (
            <p className="text-xs text-muted">{pet.locationArea}</p>
          ) : null}
          {pet.ownerRatingCount > 0 ? (
            <p className="text-xs font-medium text-brand-teal">
              ★ {pet.ownerRatingAvg.toFixed(1)} ({pet.ownerRatingCount} review
              {pet.ownerRatingCount === 1 ? "" : "s"})
            </p>
          ) : null}
        </div>
      </div>
      <Button
        href={pet.ownerProfileHref}
        variant="outline"
        size="sm"
        className="mt-3 w-full justify-center"
      >
        View profile
      </Button>
    </section>
  );
}
