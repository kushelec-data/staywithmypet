import { normalizePetTypeValue } from "@/lib/pet-type-options";

/** Sentinel value in breed dropdowns — saved as custom text from `breedOther`. */
export const BREED_OTHER_VALUE = "Other";

export const dogBreedOptions = [
  "Labrador Retriever",
  "Golden Retriever",
  "Border Collie",
  "German Shepherd",
  "French Bulldog",
  "Chihuahua",
  "Husky",
  "Poodle (Standard, Miniature, Toy)",
  "Beagle",
  "Cocker Spaniel",
  "Dachshund",
  "Australian Shepherd",
  "Boxer",
  "Shih Tzu",
  "Yorkshire Terrier",
  "Rottweiler",
  "Maltese",
  "Bichon Frisé",
  "Boston Terrier",
  "Cavalier King Charles Spaniel",
  "Havanese",
  "Miniature Schnauzer",
  "Papillon",
  "Shetland Sheepdog",
  "Whippet",
  "Mixed breed",
  BREED_OTHER_VALUE,
] as const;

export const catBreedOptions = [
  "Domestic Shorthair",
  "Domestic Longhair",
  "Siamese",
  "Maine Coon",
  "Persian",
  "Ragdoll",
  "Bengal",
  "British Shorthair",
  "Sphynx",
  "Norwegian Forest Cat",
  "Russian Blue",
  "Abyssinian",
  "Exotic Shorthair",
  "Turkish Angora",
  "Mixed breed",
  BREED_OTHER_VALUE,
] as const;

export const rabbitBreedOptions = [
  "American Fuzzy Lop",
  "English Lop",
  "Flemish Giant",
  "Holland Lop",
  "Lionhead",
  "Mini Lop",
  "Mini Rex",
  "Netherland Dwarf",
  "Polish Rabbit",
  BREED_OTHER_VALUE,
] as const;

export const birdBreedOptions = [
  "Budgie (Parakeet)",
  "Canary",
  "Cockatiel",
  "Cockatoo",
  "Conure",
  "Finch",
  "Lovebird",
  "Parrot (Amazon, African Grey, etc.)",
  BREED_OTHER_VALUE,
] as const;

export const rodentBreedOptions = [
  "Chinchilla",
  "Degu",
  "Gerbil",
  "Guinea Pig",
  "Hamster",
  "Mouse",
  "Rat",
  BREED_OTHER_VALUE,
] as const;

export const fishBreedOptions = [
  "Angelfish",
  "Betta",
  "Cichlid",
  "Discus",
  "Goldfish",
  "Guppy",
  "Molly",
  "Platy",
  "Saltwater Fish",
  "Tetra",
  BREED_OTHER_VALUE,
] as const;

export const reptileBreedOptions = [
  "Ball Python",
  "Bearded Dragon",
  "Blue Tongue Skink",
  "Chameleon",
  "Corn Snake",
  "Crested Gecko",
  "Leopard Gecko",
  "Red-Eared Slider",
  "Tortoise",
  BREED_OTHER_VALUE,
] as const;

const BREEDS_BY_SPECIES: Record<string, readonly string[]> = {
  dog: dogBreedOptions,
  cat: catBreedOptions,
  rabbit: rabbitBreedOptions,
  bird: birdBreedOptions,
  rodent: rodentBreedOptions,
  fish: fishBreedOptions,
  reptile: reptileBreedOptions,
};

export function breedsForSpeciesForm(speciesForm: string): readonly string[] {
  const key = normalizePetTypeValue(speciesForm);
  return BREEDS_BY_SPECIES[key] ?? [];
}

/** @deprecated use breedsForSpeciesForm — kept for search filters keyed by species value. */
export function breedsForSpecies(species: string): readonly string[] {
  return breedsForSpeciesForm(species);
}

export function isBreedOtherValue(value: string | null | undefined): boolean {
  return (value?.trim() ?? "") === BREED_OTHER_VALUE;
}

export function isStandardBreedForSpecies(
  speciesForm: string,
  breed: string | null | undefined,
): boolean {
  const trimmed = breed?.trim();
  if (!trimmed || isBreedOtherValue(trimmed)) return false;
  return breedsForSpeciesForm(speciesForm).includes(trimmed);
}

export function breedFormStateFromStored(
  speciesForm: string,
  storedBreed: string | null | undefined,
): { breedSelection: string; breedOther: string } {
  const stored = storedBreed?.trim() ?? "";
  if (!stored) return { breedSelection: "", breedOther: "" };

  const options = breedsForSpeciesForm(speciesForm);
  if (!options.length) {
    return { breedSelection: "", breedOther: stored };
  }

  if (options.includes(stored)) {
    return { breedSelection: stored, breedOther: "" };
  }

  return { breedSelection: BREED_OTHER_VALUE, breedOther: stored };
}

export function resolveBreedForSave(
  speciesForm: string,
  breedSelection: string,
  breedOther: string,
): string {
  if (normalizePetTypeValue(speciesForm) === "other") {
    return breedOther.trim();
  }
  if (isBreedOtherValue(breedSelection)) {
    return breedOther.trim();
  }
  return breedSelection.trim();
}

/** Options shown in search filters — excludes free-text Other sentinel. */
export function filterableBreedsForSpecies(species: string): readonly string[] {
  return breedsForSpeciesForm(species).filter((b) => !isBreedOtherValue(b));
}
