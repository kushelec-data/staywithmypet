"use client";

import { CopyPublicPetLinkButton } from "@/components/pets/CopyPublicPetLinkButton";
import { useLanguage } from "@/context/LanguageContext";
import { countPetSaves } from "@/lib/favorites";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import type { PublicSearchPet } from "@/lib/public-pet-search";
import { countPetCareRequests } from "@/lib/requests";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

type PetPublicOwnerStatsCardProps = {
  pet: PublicSearchPet;
};

function StatCell({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-surface/80 px-2 py-2 text-center ring-1 ring-black/[0.04] dark:ring-white/10 ${className}`}
    >
      <dt className="truncate text-[0.625rem] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function PetPublicOwnerStatsCard({ pet }: PetPublicOwnerStatsCardProps) {
  const { t } = useLanguage();
  const copy = t.petPublicProfile;
  const supabase = useMemo(() => createClient(), []);
  const [savedCount, setSavedCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);

  const availableDatesCount = normalizeAvailabilityDates(pet.availabilityDates).length;
  const reviewsCount = pet.ratingCount ?? 0;

  useEffect(() => {
    let cancelled = false;
    void countPetSaves(supabase, pet.id).then((count) => {
      if (!cancelled) setSavedCount(count ?? 0);
    });
    void countPetCareRequests(supabase, pet.id).then((count) => {
      if (!cancelled) setRequestsCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, pet.id]);

  return (
    <div className="flex w-full min-w-0 max-w-full shrink-0 flex-col gap-2.5 rounded-2xl border border-[#E5E2D8] bg-[#F8F6F1] p-3 sm:p-3.5">
      <p className="text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
        {copy.ownerStatsTitle}
      </p>
      <dl className="grid min-w-0 grid-cols-2 gap-2">
        <StatCell label={copy.ownerStatSaved} value={savedCount} />
        <StatCell label={copy.ownerStatRequests} value={requestsCount} />
        <StatCell label={copy.ownerStatReviews} value={reviewsCount} />
        <StatCell label={copy.ownerStatAvailableDates} value={availableDatesCount} />
      </dl>
      <CopyPublicPetLinkButton
        petId={pet.id}
        label={copy.copyPublicLink}
        copiedLabel={copy.linkCopied}
        size="sm"
        className="w-full min-w-0 justify-center"
      />
    </div>
  );
}
