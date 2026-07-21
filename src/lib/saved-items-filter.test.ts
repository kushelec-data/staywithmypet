import { describe, expect, it } from "vitest";
import {
  filterVisibleSavedFriends,
  filterVisibleSavedPets,
  isSavedFriendVisible,
  isSavedPetVisible,
} from "@/lib/saved-items-filter";
import type { Pet } from "@/lib/pets";
import type { SearchProfile } from "@/lib/search-profiles";

const samplePet = { id: "pet-1", name: "Denny" } as Pet;
const sampleFriend = { id: "friend-1", displayName: "Alex" } as SearchProfile;

describe("saved items visibility without membership", () => {
  it("keeps public active saved pet when owner profile is public", () => {
    expect(
      isSavedPetVisible({
        pet: samplePet,
        isPublic: true,
        isActive: true,
        species: "dog",
        ownerIsPublic: true,
      }),
    ).toBe(true);
  });

  it("hides saved pet when pet is private", () => {
    expect(
      isSavedPetVisible({
        pet: samplePet,
        isPublic: false,
        isActive: true,
        species: "dog",
        ownerIsPublic: true,
      }),
    ).toBe(false);
  });

  it("hides saved pet when pet is inactive", () => {
    expect(
      isSavedPetVisible({
        pet: samplePet,
        isPublic: true,
        isActive: false,
        species: "dog",
        ownerIsPublic: true,
      }),
    ).toBe(false);
  });

  it("keeps public eligible saved friend without membership", () => {
    expect(
      isSavedFriendVisible({
        profile: sampleFriend,
        display_name: "Alex",
        bio: "Dog lover",
        location: "Tallinn",
        is_public: true,
        role: "pet_friend",
      }),
    ).toBe(true);
  });

  it("filters saved lists by eligibility only", () => {
    const pets = filterVisibleSavedPets([
      {
        pet: samplePet,
        isPublic: true,
        isActive: true,
        species: "dog",
        ownerIsPublic: true,
      },
      {
        pet: { ...samplePet, id: "pet-2" },
        isPublic: false,
        isActive: true,
        species: "dog",
        ownerIsPublic: true,
      },
    ]);
    expect(pets).toHaveLength(1);
    expect(pets[0]?.id).toBe("pet-1");

    const friends = filterVisibleSavedFriends([
      {
        profile: sampleFriend,
        display_name: "Alex",
        bio: "Dog lover",
        location: "Tallinn",
        is_public: true,
        role: "pet_friend",
      },
      {
        profile: { ...sampleFriend, id: "friend-2" },
        display_name: "Sam",
        bio: "",
        location: "Tallinn",
        is_public: true,
        role: "pet_friend",
      },
    ]);
    expect(friends).toHaveLength(1);
    expect(friends[0]?.id).toBe("friend-1");
  });
});
