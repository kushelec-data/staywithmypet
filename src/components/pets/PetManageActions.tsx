import { CopyPublicPetLinkButton } from "@/components/pets/CopyPublicPetLinkButton";
import { Button } from "@/components/ui/Button";
import { publicPetHref } from "@/lib/public-pet";

type PetManageActionsProps = {
  petId: string;
  editHref?: string;
};

export function PetManageActions({ petId, editHref }: PetManageActionsProps) {
  const edit = editHref ?? `/pets/${petId}/edit`;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button href={edit} variant="outline" size="sm">
        Edit pet
      </Button>
      <Button href={publicPetHref(petId)} variant="outline" size="sm">
        Public profile
      </Button>
      <CopyPublicPetLinkButton petId={petId} />
    </div>
  );
}
