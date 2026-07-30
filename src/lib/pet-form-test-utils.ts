import type { PetProfileFormInput } from "@/lib/pet-data";

/** Test helper mirroring NewPetForm empty state without importing the client component. */
export function emptyForm(): PetProfileFormInput {
  return {
    name: "",
    speciesForm: "dog",
    species: "dog",
    breedSelection: "",
    breedOther: "",
    dateOfBirth: "",
    gender: "",
    size: "",
    energyLevel: "",
    temperament: [],
    requiresMedication: null,
    healthCharacteristics: "",
    feedingSchedule: "",
    walkNeeds: "",
    eatingHabits: "",
    positiveTraits: "",
    challengingTraits: "",
    additionalNotes: "",
    friendRequirements: [],
    availability: "",
    careLocation: "",
    careTypes: [],
    careTypesOther: "",
    genderOther: "",
    location: "",
    availabilityDates: [],
    address: "",
    latitude: null,
    longitude: null,
    googlePlaceId: null,
  };
}
