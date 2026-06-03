"use client";

import { CopyPublicPetLinkButton } from "@/components/pets/CopyPublicPetLinkButton";
import { useLanguage } from "@/context/LanguageContext";
import { countPetSaves } from "@/lib/favorites";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import type { PublicSearchPet } from "@/lib/public-pet-search";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

type PetPublicOwnerStatsCardProps = {
  pet: PublicSearchPet;
};

function StatCell({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div
      className={`rounded-xl bg-surface/80 px-2 py-2 text-center ring-1 ring-black/[0.04] dark:ring-white/10 ${className}`}
    >
      <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function PetPublicOwnerStatsCard({ pet }: PetPublicOwnerStatsCardProps) {
  const { t } = useLanguage();
  const copy = t.petPublicProfile;
  const supabase = useMemo(() => createClient(), []);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const availableDatesCount = normalizeAvailabilityDates(pet.availabilityDates).length;
  const reviewsCount = pet.ratingCount ?? 0;
  const showSavedStat = savedCount !== null;

  useEffect(() => {
    let cancelled = false;
    void countPetSaves(supabase, pet.id).then((count) => {
      if (!cancelled) setSavedCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, pet.id]);

  return (
    <div className="flex w-full shrink-0 flex-col gap-2.5 rounded-2xl border border-[#E5E2D8] bg-[#F8F6F1] p-3 lg:w-[200px]">
      <p className="text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
        {copy.ownerStatsTitle}
      </p>
      <dl className="grid grid-cols-2 gap-2">
        <StatCell label={copy.ownerStatReviews} value={reviewsCount} />
        {showSavedStat ? (
          <StatCell label={copy.ownerStatSaved} value={savedCount} />
        ) : (
          <StatCell label={copy.ownerStatAvailableDates} value={availableDatesCount} />
        )}
        {showSavedStat ? (
          <StatCell
            label={copy.ownerStatAvailableDates}
            value={availableDatesCount}
            className="col-span-2"
          />
        ) : null}
      </dl>
      <CopyPublicPetLinkButton
        petId={pet.id}
        label={copy.copyPublicLink}
        copiedLabel={copy.linkCopied}
        size="sm"
        className="w-full justify-center"
      />
    </div>
  );
}
