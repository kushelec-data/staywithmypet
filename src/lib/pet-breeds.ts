/** Dog breeds for search filter (multi-select when Dog is selected). */
export const dogBreedOptions = [
  "Labrador Retriever",
  "Golden Retriever",
  "Border Collie",
  "German Shepherd",
  "French Bulldog",
  "Chihuahua",
  "Husky",
  "Poodle",
  "Beagle",
  "Cocker Spaniel",
  "Dachshund",
  "Australian Shepherd",
  "Boxer",
  "Shih Tzu",
  "Yorkshire Terrier",
  "Rottweiler",
  "Maltese",
  "Mixed breed",
  "Other",
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
  "Mixed breed",
  "Other",
] as const;

export function breedsForSpecies(species: string): readonly string[] {
  if (species === "dog") return dogBreedOptions;
  if (species === "cat") return catBreedOptions;
  return [];
}
