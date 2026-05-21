"use client";

import { SendRequestButton } from "@/components/requests/SendRequestButton";
import type { PublicSearchPet } from "@/lib/public-pet-search";

type PetPublicMobileCtaProps = {
  pet: PublicSearchPet;
  hidden?: boolean;
};

export function PetPublicMobileCta({ pet, hidden }: PetPublicMobileCtaProps) {
  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm lg:hidden">
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
    </div>
  );
}
