import { isStandardBreedForSpecies, resolvePetBreedDisplay } from "@/lib/pet-breeds";
import { careTypeFilterMatchVariants } from "@/lib/care-type-options";
import { petSearchTemperamentOptions } from "@/lib/pet-search-filter-config";
import { matchesSearchAvailabilityDates } from "@/lib/search-availability-match";
import { normalizePetWeightStorageValue } from "@/lib/pet-weight";

export type PetSearchFilterable = {
  species: string;
  speciesForm: string | null;
  /** Display breed for cards — use storedBreed/otherBreed for filter matching. */
  breed: string | null;
  storedBreed?: string | null;
  otherBreed?: string | null;
  sizeLabel: string | null;
  energyLevel: string | null;
  temperamentTags: string[];
  requiresMedication: boolean | null;
  walkNeeds: string | null;
  careLocation: string | null;
  careTypes: string[];
  availabilityDates: string[];
  locationArea: string | null;
  ownerLanguages: string[];
  ownerEmailVerified: boolean;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function petMatchesSpeciesKeys(pet: PetSearchFilterable, selected: string[]): boolean {
  if (!selected.length) return true;
  const keys = new Set<string>();
  keys.add(norm(pet.species));
  if (pet.speciesForm) keys.add(norm(pet.speciesForm));
  return selected.some((s) => keys.has(norm(s)));
}

export function petMatchesBreeds(pet: PetSearchFilterable, breeds: string[]): boolean {
  if (!breeds.length) return true;
  const speciesKey = pet.speciesForm ?? pet.species;
  const storedBreed = pet.storedBreed ?? pet.breed;
  const displayBreed = resolvePetBreedDisplay(speciesKey, storedBreed, pet.otherBreed);
  const petBreed = norm(displayBreed ?? "");
  if (!petBreed) return false;

  if (!isStandardBreedForSpecies(speciesKey, storedBreed, pet.otherBreed)) {
    return false;
  }

  return breeds.some((wanted) => {
    const w = norm(wanted);
    return petBreed === w || petBreed.includes(w) || w.includes(petBreed);
  });
}

export function petMatchesSizes(pet: PetSearchFilterable, sizes: string[]): boolean {
  if (!sizes.length) return true;
  const petKey = normalizePetWeightStorageValue(pet.sizeLabel ?? "") ?? norm(pet.sizeLabel ?? "");
  return sizes.some((s) => {
    const want = normalizePetWeightStorageValue(s) ?? norm(s);
    return petKey === want;
  });
}

export function petMatchesEnergy(pet: PetSearchFilterable, levels: string[]): boolean {
  if (!levels.length) return true;
  const e = norm(pet.energyLevel ?? "");
  return levels.some((l) => e === norm(l));
}

function temperamentAliases(selected: string): string[] {
  const opt = petSearchTemperamentOptions.find((o) => o.value === selected);
  if (!opt) return [selected];
  const aliases = "aliases" in opt ? (opt.aliases ?? []) : [];
  return [opt.value, ...aliases];
}

function careTypeAliases(selected: string): string[] {
  return careTypeFilterMatchVariants(selected);
}

export function petMatchesTemperament(pet: PetSearchFilterable, wanted: string[]): boolean {
  if (!wanted.length) return true;
  const tags = pet.temperamentTags.map(norm);
  return wanted.some((w) => {
    const variants = temperamentAliases(w).map(norm);
    return variants.some((v) => tags.some((t) => t.includes(v) || v.includes(t)));
  });
}


export function petMatchesActivity(pet: PetSearchFilterable, activities: string[]): boolean {
  if (!activities.length) return true;
  const w = norm(pet.walkNeeds ?? "");
  return activities.some((a) => {
    switch (a) {
      case "None":
        return w === "none" || w === "";
      case "Short walks":
        return w.includes("1x") || w.includes("short") || w.includes("once");
      case "Long walks":
        return w.includes("2x") || w.includes("long") || w.includes("more");
      case "High activity":
        return w.includes("more") || w.includes("2x");
      case "Outdoor play":
        return w.includes("more") || w.includes("outdoor") || w.includes("play");
      default:
        return w.includes(norm(a));
    }
  });
}

export function petMatchesCareLocation(pet: PetSearchFilterable, locations: string[]): boolean {
  if (!locations.length) return true;
  const loc = norm(pet.careLocation ?? "");
  if (!loc) return false;
  return locations.some((l) => {
    const n = norm(l);
    if (n.includes("flexible") || n.includes("either")) {
      return loc.includes("flexible") || loc.includes("either");
    }
    if (n.includes("friend")) return loc.includes("friend");
    if (n.includes("parent") || n.includes("owner")) {
      return loc.includes("owner") || loc.includes("parent");
    }
    return loc.includes(n);
  });
}

export function petMatchesCareTypes(pet: PetSearchFilterable, types: string[]): boolean {
  if (!types.length) return true;
  const petTypes = pet.careTypes.map(norm);
  return types.some((t) => {
    const variants = careTypeAliases(t).map(norm);
    return variants.some((v) =>
      petTypes.some((pt) => pt.includes(v) || v.includes(pt)),
    );
  });
}

export function petMatchesLanguages(pet: PetSearchFilterable, langs: string[]): boolean {
  if (!langs.length) return true;
  const owner = pet.ownerLanguages.map(norm);
  return langs.some((l) => {
    if (norm(l) === "other") {
      return owner.some((o) => !["english", "estonian", "russian"].includes(o));
    }
    return owner.includes(norm(l));
  });
}

export function petMatchesVerified(pet: PetSearchFilterable, verifiedOnly: boolean): boolean {
  if (!verifiedOnly) return true;
  return pet.ownerEmailVerified;
}

export function petMatchesAvailability(
  pet: PetSearchFilterable,
  selectedDates: string[],
): boolean {
  return matchesSearchAvailabilityDates(pet.availabilityDates, selectedDates);
}
