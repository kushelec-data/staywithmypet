import {
  petFriendSearchCareTypeOptions,
  petFriendSearchExperienceOptions,
  petFriendSearchTypeOptions,
} from "@/lib/pet-friend-search-filter-config";
import { matchesSearchAvailabilityDates } from "@/lib/search-availability-match";

export type PetFriendSearchFilterable = {
  petTypesAccepted: string[];
  careTypesOffered: string[];
  experienceLevel: string | null;
  livingType: string | null;
  hasGarden: boolean | null;
  hasPetsAtHome: boolean | null;
  hasChildren: boolean | null;
  languages: string[];
  emailVerified: boolean;
  availabilityDates: string[];
  locationHaystack: string;
  bioHaystack: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function optionAliases<T extends { value: string; aliases?: readonly string[] }>(
  options: readonly T[],
  selected: string,
): string[] {
  const opt = options.find((o) => o.value === selected);
  if (!opt) return [selected];
  const aliases = "aliases" in opt ? (opt.aliases ?? []) : [];
  return [opt.value, ...aliases];
}

export function friendMatchesPetTypes(
  profile: PetFriendSearchFilterable,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  const accepted = profile.petTypesAccepted.map(norm);
  return selected.some((s) => {
    const variants = optionAliases(petFriendSearchTypeOptions, s).map(norm);
    return variants.some((v) =>
      accepted.some((a) => a === v || a.includes(v) || v.includes(a)),
    );
  });
}

export function friendMatchesCareTypes(
  profile: PetFriendSearchFilterable,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  const offered = profile.careTypesOffered.map(norm);
  return selected.some((s) => {
    const variants = optionAliases(petFriendSearchCareTypeOptions, s).map(norm);
    return variants.some((v) =>
      offered.some((o) => o.includes(v) || v.includes(o)),
    );
  });
}

export function friendMatchesExperience(
  profile: PetFriendSearchFilterable,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  const level = norm(profile.experienceLevel ?? "");
  const bio = profile.bioHaystack;
  return selected.some((s) => {
    const variants = optionAliases(petFriendSearchExperienceOptions, s).map(norm);
    return variants.some(
      (v) => level.includes(v) || v.includes(level) || bio.includes(v),
    );
  });
}

export function friendMatchesHomeSuitability(
  profile: PetFriendSearchFilterable,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  return selected.every((key) => {
    switch (key) {
      case "has_garden":
        return profile.hasGarden === true;
      case "apartment_ok":
        return /apartment/i.test(profile.livingType ?? "");
      case "no_other_pets":
        return profile.hasPetsAtHome === false;
      case "has_other_pets":
        return profile.hasPetsAtHome === true;
      case "children_at_home":
        return profile.hasChildren === true;
      case "smoke_free":
        return (
          profile.bioHaystack.includes("smoke-free") ||
          profile.bioHaystack.includes("non-smoker") ||
          profile.bioHaystack.includes("no smoking") ||
          profile.bioHaystack.includes("non smoker")
        );
      default:
        return true;
    }
  });
}

export function friendMatchesLanguages(
  profile: PetFriendSearchFilterable,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  const langs = profile.languages.map(norm);
  return selected.some((l) => {
    if (norm(l) === "other") {
      return langs.some((o) => !["english", "estonian", "russian"].includes(o));
    }
    return langs.includes(norm(l));
  });
}

export function friendMatchesVerified(
  profile: PetFriendSearchFilterable,
  verifiedOnly: boolean,
): boolean {
  if (!verifiedOnly) return true;
  return profile.emailVerified;
}

export function friendMatchesAvailability(
  profile: PetFriendSearchFilterable,
  selectedDates: string[],
): boolean {
  return matchesSearchAvailabilityDates(profile.availabilityDates, selectedDates);
}

export function friendMatchesLocation(
  profile: PetFriendSearchFilterable,
  location: string,
): boolean {
  const loc = location.trim().toLowerCase();
  if (!loc) return true;
  return profile.locationHaystack.includes(loc);
}
