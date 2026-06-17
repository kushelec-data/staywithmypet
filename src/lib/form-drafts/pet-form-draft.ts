import type { PetProfileFormInput } from "@/lib/pet-data";

export type PetFormDraftData = {
  form: PetProfileFormInput;
  dobDisplay: string;
};

export function buildPetFormDraft(form: PetProfileFormInput, dobDisplay: string): PetFormDraftData {
  return {
    form: { ...form },
    dobDisplay,
  };
}
