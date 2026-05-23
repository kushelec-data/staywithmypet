import { AppImage } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicSearchPet } from "@/lib/public-pet-search";
import Link from "next/link";

function LocationIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

type PetPublicParentCardProps = {
  pet: PublicSearchPet;
};

export function PetPublicParentCard({ pet }: PetPublicParentCardProps) {
  const hasReviews = pet.ownerRatingCount > 0;

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>Pet parent</h2>

      <div className="mt-3 rounded-2xl border border-black/[0.05] bg-gradient-to-br from-mint/20 via-surface to-cream/30 p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-mint/30 ring-2 ring-white shadow-sm">
            <AppImage
              src={pet.ownerAvatarUrl ?? ""}
              alt={pet.ownerName}
              seed={pet.ownerId}
              fallbackCaption={pet.ownerName}
              fallbackEmoji="🐾"
              sizes="56px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={pet.ownerProfileHref}
              className="font-heading text-base font-semibold text-foreground hover:text-brand-teal"
            >
              {pet.ownerName}
            </Link>
            {pet.locationArea ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <LocationIcon />
                <span className="truncate">{pet.locationArea}</span>
              </p>
            ) : null}
            {hasReviews ? (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-0.5 text-xs font-semibold text-brand-teal shadow-sm ring-1 ring-brand-teal/15">
                <span aria-hidden>★</span>
                {pet.ownerRatingAvg.toFixed(1)}
                <span className="font-medium text-muted">
                  · {pet.ownerRatingCount} review{pet.ownerRatingCount === 1 ? "" : "s"}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <Button
          href={pet.ownerProfileHref}
          variant="secondary"
          size="sm"
          className="mt-4 w-full justify-center gap-1.5 border-2 border-brand-teal/25 font-semibold text-brand-teal"
        >
          View profile
        </Button>
      </div>
    </section>
  );
}
