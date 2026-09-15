import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { publicMapPinFromAreaLabel } from "@/lib/estonia-city-coords";
import {
  MY_PROFILE_VIEW,
  PRIVATE_PROFILE_COLUMNS,
  PUBLIC_PROFILES_VIEW,
} from "@/lib/profile-relations";
import { fetchPetFriendSearchProfiles } from "@/lib/search-profiles";
import { fetchUserProfile } from "@/lib/profile-load";
import { fetchPublicProfile } from "@/lib/public-profile";
import { canViewerSeePublicMemberProfile } from "@/lib/profile-visibility";
import { friendMatchesLocation } from "@/lib/pet-friend-search-match";
import { emptyPetSearchFilters, filterPublicSearchPets } from "@/lib/public-pet-search";

vi.mock("@/lib/membership-load", () => ({
  NO_WELCOME_OFFER_ELIGIBLE: { pet_parent: false, pet_friend: false },
  resolveMembershipSnapshot: vi.fn(async () => ({
    memberships: { pet_parent: null, pet_friend: null },
    welcomeOfferEligibleByRole: { pet_parent: false, pet_friend: false },
  })),
}));

vi.mock("@/lib/pet-intro", () => ({
  fetchOwnerPetIntros: vi.fn(async () => []),
}));

vi.mock("@/lib/bookings-stats", () => ({
  countCompletedBookingsForUser: vi.fn(async () => 0),
  countReviewsAsReviewee: vi.fn(async () => 0),
}));

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const MIGRATION = "supabase/migrations/20260915120000_profiles_column_privacy.sql";

const completeFriendDetails = {
  pet_care_preferences: {
    experience_level: "experienced",
    pet_types_willing_to_care_for: ["dog"],
    preferred_pet_sizes: ["under_5_kg"],
    available_care_types: ["Daycare"],
    preferred_care_location: "flexible",
    willing_seniors: true,
    willing_puppies_kittens: false,
    willing_behavioral_quirks: false,
    willing_special_medical_needs: false,
  },
  living_situation: { living_type: "Apartment" },
  availability: { selected_dates: ["2026-08-01"] },
};

describe("profiles column privacy migration", () => {
  const sql = readSource(MIGRATION);

  it("revokes table-wide SELECT from anon and authenticated", () => {
    expect(sql).toMatch(/revoke select on table public\.profiles from anon, authenticated, public/i);
  });

  it("creates security-barrier owner-privileged views", () => {
    expect(sql).toContain("create view public.public_profiles");
    expect(sql).toContain("create view public.my_profile");
    expect(sql).toContain("security_barrier = true");
    expect(sql).toContain("security_invoker = false");
    expect(sql).toContain("p.is_public = true");
    expect(sql).toContain("where id = (select auth.uid())");
    expect(sql).toContain("grant select on public.public_profiles to anon, authenticated");
    expect(sql).toContain("grant select on public.my_profile to authenticated");
    expect(sql).toMatch(/revoke all on public\.my_profile from anon/i);
  });

  it("does not expose private columns or numeric coordinates on public_profiles", () => {
    expect(sql).not.toMatch(/create or replace function public\.approximate_public_coordinates/);
    expect(sql).not.toMatch(/create or replace function public\.int32_hash_unit/);
    expect(sql).not.toMatch(/coords\.latitude/);
    expect(sql).not.toMatch(/p\.latitude/);
    expect(sql).not.toMatch(/p\.longitude/);
    expect(sql).toContain("sanitize_profile_details_for_public");
    expect(sql).toContain("grant execute on function public.sanitize_profile_details_for_public");
    expect(sql).toContain("grant execute on function public.profile_public_area_label");
    for (const column of [
      "phone",
      "phone_e164",
      "address",
      "formatted_address",
      "postal_code",
      "google_place_id",
      "emergency_contact_name",
      "emergency_contact_phone_e164",
      "preferred_vet_phone",
    ]) {
      expect(sql).not.toMatch(new RegExp(`p\\.${column}\\s+as`, "i"));
    }
  });

  it("keeps booking contact on the existing security-definer RPC", () => {
    const bookingSql = readSource("supabase/migrations/20260720100000_booking_contact_sharing.sql");
    expect(bookingSql).toContain("get_booking_participant_contact");
    expect(bookingSql).toMatch(/security definer/i);
    const bookingApp = readSource("src/lib/booking-participant-details.ts");
    expect(bookingApp).toContain('rpc("get_booking_participant_contact"');
    expect(bookingApp).toContain("createAdminClient");
  });
});

describe("application reads use allowlisted profile interfaces", () => {
  it("owner profile load uses my_profile before profiles", () => {
    const source = readSource("src/lib/profile-load.ts");
    expect(source).toContain("selectOwnProfileMaybeSingle");
    expect(readSource("src/lib/profile-relations.ts")).toContain(MY_PROFILE_VIEW);
  });

  it("public profile and Find Care use public_profiles without numeric coordinates", () => {
    const search = readSource("src/lib/search-profiles.ts");
    expect(search).toContain("PUBLIC_PROFILES_VIEW");
    expect(search).toContain("PET_FRIEND_SEARCH_SELECT_PUBLIC_VIEW");
    expect(search).not.toMatch(
      /PET_FRIEND_SEARCH_SELECT_PUBLIC_VIEW\s*=\s*"[^"]*latitude/,
    );
    expect(readSource("src/lib/public-profile.ts")).toContain("PUBLIC_PROFILE_RELATIONS");
    expect(readSource("src/lib/security/sanitize-public-profile.ts")).not.toMatch(
      /PUBLIC_PROFILE_COLUMNS[\s\S]*latitude/,
    );
  });

  it("Find Pets does not select pet or owner coordinates", () => {
    const source = readSource("src/lib/public-pet-search.ts");
    expect(source).toContain("PUBLIC_PROFILES_VIEW");
    expect(source).not.toMatch(/profiles!pets_owner_id_fkey \([^)]*latitude/);
    expect(source).not.toMatch(/size_label, location, latitude, longitude, temperament/);
    expect(source).toContain("publicMapPinFromAreaLabel");
    expect(source).not.toContain("blurCoordinates");
  });

  it("hidden profiles remain hidden from other viewers", () => {
    expect(canViewerSeePublicMemberProfile(false, "owner-1", "other-2")).toBe(false);
    expect(canViewerSeePublicMemberProfile(false, "owner-1", null)).toBe(false);
    expect(canViewerSeePublicMemberProfile(false, "owner-1", "owner-1")).toBe(true);
    const sql = readSource(MIGRATION);
    expect(sql).toMatch(/where p\.is_public = true\s+or p\.id = \(select auth\.uid\(\)\)/);
  });

  it("lists the live-confirmed private columns as revoked from direct grants", () => {
    expect(PRIVATE_PROFILE_COLUMNS).toEqual(
      expect.arrayContaining([
        "phone",
        "phone_e164",
        "address",
        "formatted_address",
        "postal_code",
        "google_place_id",
        "latitude",
        "longitude",
        "emergency_contact_name",
        "emergency_contact_phone_e164",
        "preferred_vet_phone",
      ]),
    );
  });
});

describe("profile interface query routing", () => {
  it("Find Care reads public_profiles without private or coordinate columns", async () => {
    const from = vi.fn();
    const supabase = { from } as never;
    from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "friend-1",
                display_name: "Nora Raimo",
                location: "Tallinn",
                public_location: "Tallinn",
                bio: "I love dogs and have years of experience with boarding.",
                avatar_url: null,
                role: "pet_friend",
                active_mode: "pet_friend",
                rating_avg: 5,
                rating_count: 2,
                stay_count: 1,
                languages: ["en"],
                is_public: true,
                details: completeFriendDetails,
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    const rows = await fetchPetFriendSearchProfiles(supabase);
    expect(from).toHaveBeenCalledWith(PUBLIC_PROFILES_VIEW);
    const select = from.mock.results[0]?.value.select as ReturnType<typeof vi.fn>;
    const selectArg = String(select.mock.calls[0]?.[0] ?? "");
    expect(selectArg).not.toContain("phone");
    expect(selectArg).not.toContain("google_place_id");
    expect(selectArg).not.toContain("formatted_address");
    expect(selectArg).not.toContain("emergency_contact");
    expect(selectArg).not.toContain("latitude");
    expect(selectArg).not.toContain("longitude");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.displayName).toBe("Nora Raimo");
    expect(rows[0]?.mapPosition).toEqual(publicMapPinFromAreaLabel("Tallinn"));
  });

  it("owner profile load queries my_profile including private fields", async () => {
    const from = vi.fn();
    const supabase = { from } as never;
    from.mockReturnValue({
      select: vi.fn().mockImplementation((columns: string) => ({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data:
              columns.includes("display_name")
                ? {
                    id: "user-1",
                    display_name: "Owner",
                    avatar_url: null,
                    bio: "Hello",
                    location: "Tallinn",
                    phone: "+372555",
                    role: "pet_friend",
                    is_public: true,
                    details: {},
                  }
                : { phone_e164: "+372555" },
            error: null,
          }),
        }),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    });

    const profile = await fetchUserProfile(supabase, "user-1");
    expect(from).toHaveBeenCalledWith(MY_PROFILE_VIEW);
    expect(profile?.display_name).toBe("Owner");
    expect(profile?.phone).toBe("+372555");
  });

  it("public profile fetch uses public_profiles and city-center map pins only", async () => {
    const from = vi.fn((relation: string) => {
      if (relation === PUBLIC_PROFILES_VIEW || relation === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "pub-1",
                  display_name: "Public Friend",
                  avatar_url: null,
                  bio: "Bio text",
                  public_location: "Tallinn",
                  role: "pet_friend",
                  active_mode: "pet_friend",
                  languages: ["en", "et"],
                  is_public: true,
                  rating_avg: 5,
                  rating_count: 1,
                  created_at: "2026-01-01T00:00:00.000Z",
                  details: {},
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const profile = await fetchPublicProfile({ from } as never, "pub-1");
    expect(from).toHaveBeenCalledWith(PUBLIC_PROFILES_VIEW);
    expect(profile?.display_name).toBe("Public Friend");
    expect(profile?.nearbyLocation).toBe("Tallinn");
    expect(profile?.approximateMap).toEqual(publicMapPinFromAreaLabel("Tallinn"));
  });
});

describe("location filtering without member coordinates", () => {
  it("Find Care location filter matches public area text, not coordinates", () => {
    expect(
      friendMatchesLocation(
        {
          petTypesAccepted: [],
          careTypesOffered: [],
          experienceLevel: null,
          livingType: null,
          hasGarden: null,
          hasPetsAtHome: null,
          hasChildren: null,
          languages: [],
          emailVerified: false,
          availabilityDates: [],
          locationHaystack: "tallinn nora",
          bioHaystack: "",
          careLocationPreference: null,
        },
        "Tallinn",
      ),
    ).toBe(true);
    expect(
      friendMatchesLocation(
        {
          petTypesAccepted: [],
          careTypesOffered: [],
          experienceLevel: null,
          livingType: null,
          hasGarden: null,
          hasPetsAtHome: null,
          hasChildren: null,
          languages: [],
          emailVerified: false,
          availabilityDates: [],
          locationHaystack: "tartu",
          bioHaystack: "",
          careLocationPreference: null,
        },
        "Tallinn",
      ),
    ).toBe(false);
  });

  it("maps two members in the same city to the same published city center", () => {
    const a = publicMapPinFromAreaLabel("Tallinn");
    const b = publicMapPinFromAreaLabel("Tallinn, Estonia");
    expect(a).toEqual(b);
    expect(a).toEqual({ lat: 59.437, lng: 24.7536 });
  });

  it("Find Pets location filter uses locationArea text", () => {
    const pet = {
      locationArea: "Tallinn",
      species: "dog",
      speciesForm: null,
      breed: "mix",
      sizeLabel: null,
      energyLevel: null,
      temperamentTags: [],
      requiresMedication: false,
      walkNeeds: null,
      careLocation: null,
      ownerCareLocationPreference: null,
      careTypes: [],
      availabilityDates: [],
      ownerLanguages: [],
      ownerEmailVerified: false,
      mapPosition: publicMapPinFromAreaLabel("Tallinn"),
      ownerId: "o1",
      ownerName: "Parent",
      ownerAvatarUrl: null,
      ownerProfileHref: "/users/o1",
      ownerRatingAvg: 0,
      ownerRatingCount: 0,
      pricePerNight: 0,
      ratingAvg: 0,
      ratingCount: 0,
      availabilityNotes: null,
      personalityTags: [],
      gender: null,
      spayedNeutered: false,
      healthCharacteristics: null,
      positiveTraits: null,
      challengingTraits: null,
      feedingSchedule: null,
      eatingHabits: null,
      friendRequirements: [],
      additionalNotes: null,
      id: "pet-1",
      name: "Mimmu",
    } as unknown as Parameters<typeof filterPublicSearchPets>[0][number];

    const inTallinn = filterPublicSearchPets([pet], {
      ...emptyPetSearchFilters(),
      location: "Tallinn",
    });
    const inTartu = filterPublicSearchPets([pet], {
      ...emptyPetSearchFilters(),
      location: "Tartu",
    });
    expect(inTallinn).toHaveLength(1);
    expect(inTartu).toHaveLength(0);
  });
});
