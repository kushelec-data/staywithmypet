import { normalizePetTypeValue } from "@/lib/pet-type-options";

/** Sentinel value in breed dropdowns — stored in `breed`; custom text in `other_breed`. */
export const BREED_OTHER_VALUE = "Other";

export const OTHER_BREED_MIN_LENGTH = 2;
export const OTHER_BREED_MAX_LENGTH = 80;

export type OtherBreedValidationError = "required" | "too_short" | "too_long";

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
  "Samoyed",
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

export function validateOtherBreedText(text: string): OtherBreedValidationError | null {
  const trimmed = text.trim();
  if (!trimmed) return "required";
  if (trimmed.length < OTHER_BREED_MIN_LENGTH) return "too_short";
  if (trimmed.length > OTHER_BREED_MAX_LENGTH) return "too_long";
  return null;
}

export function isStandardBreedForSpecies(
  speciesForm: string,
  breed: string | null | undefined,
  otherBreed?: string | null | undefined,
): boolean {
  const display = resolvePetBreedDisplay(speciesForm, breed, otherBreed);
  if (!display || isBreedOtherValue(breed)) return false;
  return breedsForSpeciesForm(speciesForm).includes(display);
}

/** User-facing breed label — resolves Other + legacy custom values. */
export function resolvePetBreedDisplay(
  speciesForm: string,
  breed: string | null | undefined,
  otherBreed?: string | null | undefined,
): string | null {
  const stored = breed?.trim() ?? "";
  const other = otherBreed?.trim() ?? "";

  if (isBreedOtherValue(stored)) {
    return other || null;
  }

  if (stored) return stored;

  if (normalizePetTypeValue(speciesForm) === "other") {
    return other || null;
  }

  return null;
}

export function breedFormStateFromStored(
  speciesForm: string,
  storedBreed: string | null | undefined,
  storedOtherBreed?: string | null | undefined,
): { breedSelection: string; breedOther: string } {
  const other = storedOtherBreed?.trim() ?? "";
  const stored = storedBreed?.trim() ?? "";
  if (!stored && !other) return { breedSelection: "", breedOther: "" };

  if (isBreedOtherValue(stored)) {
    return { breedSelection: BREED_OTHER_VALUE, breedOther: other };
  }

  const options = breedsForSpeciesForm(speciesForm);
  if (!options.length) {
    return { breedSelection: "", breedOther: stored || other };
  }

  if (options.includes(stored)) {
    return { breedSelection: stored, breedOther: "" };
  }

  return { breedSelection: BREED_OTHER_VALUE, breedOther: stored };
}

export function resolveBreedFieldsForSave(
  speciesForm: string,
  breedSelection: string,
  breedOther: string,
): { breed: string | null; other_breed: string | null } {
  if (normalizePetTypeValue(speciesForm) === "other") {
    const custom = breedOther.trim();
    return { breed: custom || null, other_breed: null };
  }

  if (isBreedOtherValue(breedSelection)) {
    const custom = breedOther.trim();
    return { breed: BREED_OTHER_VALUE, other_breed: custom || null };
  }

  const standard = breedSelection.trim();
  return { breed: standard || null, other_breed: null };
}

/** @deprecated Prefer resolveBreedFieldsForSave — returns display breed for legacy callers. */
export function resolveBreedForSave(
  speciesForm: string,
  breedSelection: string,
  breedOther: string,
): string {
  const { breed, other_breed } = resolveBreedFieldsForSave(speciesForm, breedSelection, breedOther);
  return resolvePetBreedDisplay(speciesForm, breed, other_breed) ?? "";
}

/** Options shown in search filters — excludes free-text Other sentinel. */
export function filterableBreedsForSpecies(species: string): readonly string[] {
  return breedsForSpeciesForm(species).filter((b) => !isBreedOtherValue(b));
}
