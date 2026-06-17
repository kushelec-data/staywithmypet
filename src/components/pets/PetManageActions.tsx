"use client";

import { CopyPublicPetLinkButton } from "@/components/pets/CopyPublicPetLinkButton";
import { DeletePetButton } from "@/components/pets/DeletePetButton";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { publicPetHref } from "@/lib/public-pet";

type PetManageActionsProps = {
  petId: string;
  ownerId: string;
  onDeleted?: () => void;
  editHref?: string;
};

export function PetManageActions({ petId, ownerId, onDeleted, editHref }: PetManageActionsProps) {
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
      {onDeleted ? <DeletePetButton petId={petId} ownerId={ownerId} onDeleted={onDeleted} /> : null}
    </div>
  );
}
