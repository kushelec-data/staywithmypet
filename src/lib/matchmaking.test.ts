import { describe, expect, it } from "vitest";
import { isPetFriendFindCareListingEligible } from "@/lib/profile-required-fields";
import {
  isEligibleMatchFriend,
  isEligibleMatchPet,
  isStoredMatchStillVisible,
} from "@/lib/matchmaking/eligibility";
import { locationAreaKey } from "@/lib/matchmaking/location";
import { scoreMatch, pairKey, utcIsoWeekKey, currentAvailabilityDates, evaluateAvailabilityMatch } from "@/lib/matchmaking/score";
import {
  collectBlockedRelationships,
  matchesForRecipient,
  selectWeeklyMatches,
  shouldSkipCooldown,
  shouldSkipRelationship,
  type RankedPair,
} from "@/lib/matchmaking/select";
import {
  filterVisibleMatchSuggestions,
  isMatchSuggestionVisibleToUser,
  type MatchSuggestionRow,
} from "@/lib/match-suggestions";
import { defaultUniqueKey } from "@/lib/emails";
import { MATCH_MIN_SCORE } from "@/lib/matchmaking/types";

const completeFriendDetails = {
  pet_care_preferences: {
    experience_level: "experienced",
    pet_types_willing_to_care_for: ["dog"],
    preferred_pet_sizes: ["5_10_kg"],
    available_care_types: ["Daycare"],
    preferred_care_location: "flexible",
    willing_seniors: true,
    willing_puppies_kittens: false,
    willing_behavioral_quirks: false,
    willing_special_medical_needs: false,
  },
  living_situation: { living_type: "Apartment" },
  availability: { selected_dates: ["2026-09-12"] },
};

const friendBase = {
  id: "friend-1",
  display_name: "Nora",
  location: "Tallinn",
  public_location: "Tallinn",
  city: "Tallinn",
  country: "Estonia",
  is_public: true as const,
  role: "pet_friend" as const,
  details: completeFriendDetails,
};

const ownerBase = {
  id: "parent-1",
  display_name: "Kush",
  bio: "I care for my dog every day and look after her closely.",
  location: "Tallinn",
  public_location: "Tallinn",
  city: "Tallinn",
  is_public: true as boolean | null,
  role: "pet_parent" as const,
};

const petBase = {
  id: "pet-1",
  ownerId: "parent-1",
  name: "Mimmu",
  species: "dog",
  is_public: true as boolean | null,
  is_active: true as boolean | null,
};

function scoredInput(overrides: Partial<Parameters<typeof scoreMatch>[0]> = {}) {
  return scoreMatch({
    parentAreaKey: "tallinn",
    friendAreaKey: "tallinn",
    parentCoords: { lat: 59.437, lng: 24.753 },
    friendCoords: { lat: 59.437, lng: 24.753 },
    petAvailabilityDates: ["2026-09-12", "2026-09-13"],
    friendAvailabilityDates: ["2026-09-12"],
    petSpecies: "dog",
    friendPetTypes: ["dog"],
    petSizeKey: "5_10_kg",
    friendPreferredSizes: ["5_10_kg"],
    petCareTypes: ["Daycare"],
    friendCareTypes: ["Daycare"],
    friendCompletenessPercent: 100,
    runDateIso: "2026-09-06",
    ...overrides,
  });
}

describe("weekly matchmaking", () => {
  it("excludes a private Pet Friend", () => {
    expect(
      isEligibleMatchFriend({ ...friendBase, is_public: false }, new Set(["friend-1"])),
    ).toBe(false);
    expect(isPetFriendFindCareListingEligible({ ...friendBase, is_public: false })).toBe(false);
  });

  it("excludes a private pet", () => {
    expect(
      isEligibleMatchPet({ ...petBase, is_public: false }, ownerBase, new Set(["parent-1"])),
    ).toBe(false);
  });

  it("excludes an inactive pet", () => {
    expect(
      isEligibleMatchPet({ ...petBase, is_active: false }, ownerBase, new Set(["parent-1"])),
    ).toBe(false);
  });

  it("excludes membership-ineligible candidates", () => {
    expect(isEligibleMatchFriend(friendBase, new Set())).toBe(false);
    expect(isEligibleMatchPet(petBase, ownerBase, new Set())).toBe(false);
    expect(isEligibleMatchFriend(friendBase, new Set(["friend-1"]))).toBe(true);
    expect(isEligibleMatchPet(petBase, ownerBase, new Set(["parent-1"]))).toBe(true);
  });

  it("does not block a pair that only has an old conversation", () => {
    const blocked = collectBlockedRelationships({
      requests: [],
      bookings: [],
    });
    expect(shouldSkipRelationship("parent-1", "friend-1", blocked)).toBe(false);
  });

  it("does not block a completed booking even if a conversation still exists", () => {
    const blocked = collectBlockedRelationships({
      requests: [{ pet_parent_id: "parent-1", pet_friend_id: "friend-1", status: "completed" }],
      bookings: [{ pet_parent_id: "parent-1", pet_friend_id: "friend-1", status: "completed" }],
    });
    expect(shouldSkipRelationship("parent-1", "friend-1", blocked)).toBe(false);
    const recent = new Set([pairKey("parent-1", "friend-1", "pet-1")]);
    expect(shouldSkipCooldown("parent-1", "friend-1", "pet-1", recent)).toBe(true);
    expect(shouldSkipCooldown("parent-1", "friend-1", "pet-1", new Set())).toBe(false);
  });

  it("does not block a cancelled request even if a conversation still exists", () => {
    const blocked = collectBlockedRelationships({
      requests: [{ pet_parent_id: "parent-1", pet_friend_id: "friend-1", status: "cancelled" }],
    });
    expect(shouldSkipRelationship("parent-1", "friend-1", blocked)).toBe(false);
  });

  it("does not block a declined request even if a conversation still exists", () => {
    const blocked = collectBlockedRelationships({
      requests: [{ pet_parent_id: "parent-1", pet_friend_id: "friend-1", status: "declined" }],
    });
    expect(shouldSkipRelationship("parent-1", "friend-1", blocked)).toBe(false);
  });

  it("blocks a pending request relationship", () => {
    const blocked = collectBlockedRelationships({
      requests: [{ pet_parent_id: "parent-1", pet_friend_id: "friend-1", status: "pending" }],
    });
    expect(shouldSkipRelationship("parent-1", "friend-1", blocked)).toBe(true);
    expect(shouldSkipRelationship("parent-1", "friend-2", blocked)).toBe(false);
  });

  it("blocks an accepted request relationship", () => {
    const blocked = collectBlockedRelationships({
      requests: [{ pet_parent_id: "parent-1", pet_friend_id: "friend-1", status: "accepted" }],
    });
    expect(shouldSkipRelationship("parent-1", "friend-1", blocked)).toBe(true);
  });

  it("blocks an upcoming booking relationship", () => {
    const blocked = collectBlockedRelationships({
      bookings: [{ pet_parent_id: "parent-1", pet_friend_id: "friend-1", status: "upcoming" }],
    });
    expect(shouldSkipRelationship("parent-1", "friend-1", blocked)).toBe(true);
  });

  it("blocks an active booking relationship", () => {
    const blocked = collectBlockedRelationships({
      bookings: [{ pet_parent_id: "parent-1", pet_friend_id: "friend-1", status: "active" }],
    });
    expect(shouldSkipRelationship("parent-1", "friend-1", blocked)).toBe(true);
  });

  it("skips the same recommendation inside the 21-day cooldown", () => {
    const recent = new Set([pairKey("parent-1", "friend-1", "pet-1")]);
    expect(shouldSkipCooldown("parent-1", "friend-1", "pet-1", recent)).toBe(true);
    expect(shouldSkipCooldown("parent-1", "friend-1", "pet-2", recent)).toBe(false);
  });

  it("calculates score from existing schema fields", () => {
    const scored = scoredInput();
    expect(scored.location).toBe(30);
    expect(scored.availability).toBe(25);
    expect(scored.species).toBe(20);
    expect(scored.size).toBe(10);
    expect(scored.careType).toBe(10);
    expect(scored.completeness).toBe(5);
    expect(scored.total).toBe(100);
    expect(scored.reasons[0]).toBe("Both in Tallinn");
    expect(locationAreaKey({ city: "Tallinn", location: "Estonia" })).toBe("tallinn");
  });

  it("excludes scores below 60", () => {
    const weak = scoredInput({
      parentAreaKey: "tartu",
      friendAreaKey: "tallinn",
      parentCoords: null,
      friendCoords: null,
      petAvailabilityDates: [],
      friendAvailabilityDates: [],
      friendPetTypes: ["cat"],
      friendPreferredSizes: ["over_15_kg"],
      friendCareTypes: ["Walks only"],
      friendCompletenessPercent: 0,
    });
    expect(weak.total).toBeLessThan(MATCH_MIN_SCORE);
    expect(selectWeeklyMatches([{ ...pair(weak.total), score: weak.total }])).toEqual([]);
  });

  it("awards 25 availability points when both future calendars overlap", () => {
    const scored = scoredInput({
      petAvailabilityDates: ["2026-09-12", "2026-09-13"],
      friendAvailabilityDates: ["2026-09-12"],
    });
    expect(scored.availability).toBe(25);
    expect(scored.availabilityConflict).toBe(false);
    expect(scored.availabilityStatus).toBe("overlap");
    expect(scored.reasons).toContain("Available on matching dates");
    expect(scored.total).toBe(100);
    expect(selectWeeklyMatches([{ ...pair(scored.total), score: scored.total }])).toHaveLength(1);
  });

  it("excludes pairs when both have current availability with no overlap", () => {
    const scored = scoredInput({
      petAvailabilityDates: ["2026-09-06", "2026-09-07", "2026-09-08"],
      friendAvailabilityDates: ["2026-10-12", "2026-10-13"],
    });
    expect(scored.availability).toBe(0);
    expect(scored.availabilityConflict).toBe(true);
    expect(scored.reasons).not.toContain("Available on matching dates");
    expect(
      selectWeeklyMatches([{ ...pair(scored.total), score: scored.total, availabilityConflict: true }]),
    ).toEqual([]);
  });

  it("keeps a candidate when pet availability is missing", () => {
    const scored = scoredInput({ petAvailabilityDates: [] });
    expect(scored.availability).toBe(0);
    expect(scored.availabilityConflict).toBe(false);
    expect(scored.availabilityStatus).toBe("unknown");
    expect(scored.total).toBe(75);
    expect(selectWeeklyMatches([{ ...pair(scored.total), score: scored.total }])).toHaveLength(1);
  });

  it("keeps a candidate when friend future availability is missing", () => {
    const scored = scoredInput({ friendAvailabilityDates: [] });
    expect(scored.availability).toBe(0);
    expect(scored.availabilityConflict).toBe(false);
    expect(scored.total).toBe(75);
    expect(selectWeeklyMatches([{ ...pair(scored.total), score: scored.total }])).toHaveLength(1);
  });

  it("keeps a candidate when both calendars are missing", () => {
    const scored = scoredInput({ petAvailabilityDates: [], friendAvailabilityDates: [] });
    expect(scored.availability).toBe(0);
    expect(scored.availabilityConflict).toBe(false);
    expect(scored.total).toBe(75);
    expect(selectWeeklyMatches([{ ...pair(scored.total), score: scored.total }])).toHaveLength(1);
  });

  it("treats friend dates that are all expired as missing current availability", () => {
    const scored = scoredInput({
      friendAvailabilityDates: ["2026-07-25", "2026-08-31"],
    });
    expect(scored.availability).toBe(0);
    expect(scored.availabilityConflict).toBe(false);
    expect(scored.availabilityStatus).toBe("unknown");
    expect(selectWeeklyMatches([{ ...pair(scored.total), score: scored.total }])).toHaveLength(1);
  });

  it("treats pet dates that are all expired as missing current availability", () => {
    const scored = scoredInput({
      petAvailabilityDates: ["2026-09-01", "2026-09-05"],
      friendAvailabilityDates: ["2026-09-12"],
    });
    expect(currentAvailabilityDates(["2026-09-01", "2026-09-05"], "2026-09-06")).toEqual([]);
    expect(scored.availability).toBe(0);
    expect(scored.availabilityConflict).toBe(false);
    expect(selectWeeklyMatches([{ ...pair(scored.total), score: scored.total }])).toHaveLength(1);
  });

  it("compares only current and future dates when mixed with expired dates", () => {
    const evaled = evaluateAvailabilityMatch(
      ["2026-09-01", "2026-09-12"],
      ["2026-08-31", "2026-09-12"],
      "2026-09-06",
    );
    expect(evaled.status).toBe("overlap");
    expect(evaled.points).toBe(25);
    const conflict = evaluateAvailabilityMatch(
      ["2026-09-01", "2026-09-12"],
      ["2026-08-31", "2026-10-12"],
      "2026-09-06",
    );
    expect(conflict.status).toBe("conflict");
  });

  it("counts today's date as valid availability", () => {
    const evaled = evaluateAvailabilityMatch(["2026-09-06"], ["2026-09-06"], "2026-09-06");
    expect(evaled.status).toBe("overlap");
    expect(evaled.points).toBe(25);
    expect(currentAvailabilityDates(["2026-09-06"], "2026-09-06")).toEqual(["2026-09-06"]);
  });

  it("excludes Bulma-style Sep 6–8 versus October dates", () => {
    const scored = scoredInput({
      petAvailabilityDates: ["2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08"],
      friendAvailabilityDates: ["2026-10-12", "2026-10-13"],
    });
    expect(scored.availabilityConflict).toBe(true);
    expect(selectWeeklyMatches([{ ...pair(90), availabilityConflict: true }])).toEqual([]);
  });

  it("awards 25 for Bulma-style Sep 6–8 versus Sep 6/7", () => {
    const scored = scoredInput({
      petAvailabilityDates: ["2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08"],
      friendAvailabilityDates: ["2026-08-30", "2026-09-06", "2026-09-07", "2026-09-21"],
    });
    expect(scored.availability).toBe(25);
    expect(scored.availabilityConflict).toBe(false);
    expect(scored.reasons).toContain("Available on matching dates");
  });

  it("keeps a maximum of 3 recommendations per user", () => {
    const pairs: RankedPair[] = Array.from({ length: 5 }, (_, i) => ({
      petParentId: "parent-1",
      petFriendId: `friend-${i}`,
      petId: "pet-1",
      score: 90 - i,
      reasons: ["Both in Tallinn"],
    }));
    const selected = selectWeeklyMatches(pairs);
    expect(selected).toHaveLength(3);
    expect(selected.map((row) => row.petFriendId)).toEqual(["friend-0", "friend-1", "friend-2"]);
    expect(matchesForRecipient(selected, "parent-1")).toHaveLength(3);

    const dualCap: RankedPair[] = [
      { petParentId: "parent-a", petFriendId: "friend-x", petId: "pet-a", score: 95, reasons: [] },
      { petParentId: "parent-b", petFriendId: "friend-x", petId: "pet-b", score: 94, reasons: [] },
      { petParentId: "parent-c", petFriendId: "friend-x", petId: "pet-c", score: 93, reasons: [] },
      { petParentId: "parent-d", petFriendId: "friend-x", petId: "pet-d", score: 92, reasons: [] },
    ];
    const dualSelected = selectWeeklyMatches(dualCap);
    expect(dualSelected).toHaveLength(3);
    expect(dualSelected.map((row) => row.petParentId)).toEqual(["parent-a", "parent-b", "parent-c"]);
  });

  it("does not create an email batch when there are no matches", () => {
    expect(selectWeeklyMatches([]).length).toBe(0);
  });

  it("uses one digest unique key per user per ISO week", () => {
    const week = utcIsoWeekKey(new Date("2026-09-08T07:00:00.000Z"));
    expect(defaultUniqueKey("match_digest", "user-1", { uniqueKey: `match_digest_user-1_${week}` })).toBe(
      `match_digest_user-1_${week}`,
    );
  });

  it("allows a user to access only their own recommendations", () => {
    const row = sampleRow();
    expect(isMatchSuggestionVisibleToUser(row, "parent-1")).toBe(true);
    expect(isMatchSuggestionVisibleToUser(row, "friend-1")).toBe(true);
    expect(isMatchSuggestionVisibleToUser(row, "stranger")).toBe(false);
  });

  it("hides dismissed recommendations from the active list", () => {
    const row = sampleRow({ status: "dismissed" });
    expect(filterVisibleMatchSuggestions([row])).toEqual([]);
  });

  it("keeps viewed recommendations visible until expired or dismissed", () => {
    const row = sampleRow({ status: "viewed", viewed_at: "2026-09-08T08:00:00.000Z" });
    expect(filterVisibleMatchSuggestions([row])).toHaveLength(1);
  });

  it("hides a stored recommendation when the friend profile is hidden", () => {
    const row = sampleRow();
    row.friend = { ...row.friend!, is_public: false };
    expect(filterVisibleMatchSuggestions([row])).toEqual([]);
    expect(isStoredMatchStillVisible({ friendIsPublic: false, ownerIsPublic: true, petIsPublic: true, petIsActive: true })).toBe(false);
  });

  it("hides a stored recommendation when the pet is hidden", () => {
    const row = sampleRow();
    row.pet = { ...row.pet!, is_public: false };
    expect(filterVisibleMatchSuggestions([row])).toEqual([]);
  });
});

function pair(score: number): RankedPair {
  return {
    petParentId: "parent-1",
    petFriendId: "friend-1",
    petId: "pet-1",
    score,
    reasons: [],
  };
}

function sampleRow(overrides: Partial<MatchSuggestionRow> = {}): MatchSuggestionRow {
  return {
    id: "match-1",
    batch_id: "batch-1",
    pet_parent_id: "parent-1",
    pet_friend_id: "friend-1",
    pet_id: "pet-1",
    score: 82,
    reasons: ["Both in Tallinn"],
    status: "active",
    created_at: "2026-09-08T07:00:00.000Z",
    expires_at: "2026-09-29T07:00:00.000Z",
    viewed_at: null,
    emailed_at: null,
    clicked_at: null,
    pet: {
      id: "pet-1",
      name: "Mimmu",
      species: "dog",
      size_label: "5_10_kg",
      location: "Tallinn",
      is_public: true,
      is_active: true,
    },
    parent: {
      id: "parent-1",
      display_name: "Kush",
      avatar_url: null,
      location: "Tallinn",
      public_location: "Tallinn",
      city: "Tallinn",
      is_public: true,
    },
    friend: {
      id: "friend-1",
      display_name: "Nora",
      avatar_url: null,
      location: "Tallinn",
      public_location: "Tallinn",
      city: "Tallinn",
      is_public: true,
    },
    ...overrides,
  };
}
