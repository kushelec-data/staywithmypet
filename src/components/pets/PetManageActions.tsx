"use client";

import { CopyPublicPetLinkButton } from "@/components/pets/CopyPublicPetLinkButton";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { publicPetHref } from "@/lib/public-pet";

type PetManageActionsProps = {
  petId: string;
  editHref?: string;
};

export function PetManageActions({ petId, editHref }: PetManageActionsProps) {
  const { t } = useLanguage();
  const petsT = t.account.petsPage;
  const edit = editHref ?? `/pets/${petId}/edit`;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button href={edit} variant="outline" size="sm">
        {petsT.editPet}
      </Button>
      <Button href={publicPetHref(petId)} variant="outline" size="sm">
        {petsT.publicProfile}
      </Button>
      <CopyPublicPetLinkButton petId={petId} iconOnly />
    </div>
  );
}
