import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatIncomingSenderHeadline,
  mapProfileRowToRequestSenderPreview,
  resolveRequestSenderPublicLocation,
} from "@/lib/request-sender-preview";
import { REQUEST_SELECT_WITH_RELATIONS, REQUEST_SENDER_PROFILE_SELECT } from "@/types/database";

describe("request sender preview mapping", () => {
  it("maps public sender profile fields for incoming request cards", () => {
    const preview = mapProfileRowToRequestSenderPreview({
      id: "sender-1",
      display_name: "Anna Peterson",
      avatar_url: "https://cdn.example/anna.jpg",
      bio: "I've owned dogs for over 10 years.",
      public_location: "Tallinn",
      rating_avg: 4.9,
      rating_count: 18,
      stay_count: 6,
    });

    expect(preview).toMatchObject({
      id: "sender-1",
      displayName: "Anna Peterson",
      avatarUrl: "https://cdn.example/anna.jpg",
      bio: "I've owned dogs for over 10 years.",
      cityLocation: "Tallinn",
      ratingAvg: 4.9,
      ratingCount: 18,
      completedBookingsCount: 6,
      profileHref: "/users/sender-1",
    });
  });

  it("uses public location helpers and never raw address fields", () => {
    expect(
      resolveRequestSenderPublicLocation({
        public_location: "Tallinn",
        city: "Hidden Street City",
        country: "EE",
        google_place_id: "place-1",
      }),
    ).toBe("Tallinn");

    const preview = mapProfileRowToRequestSenderPreview({
      id: "sender-2",
      display_name: "Alex",
      formatted_address: "123 Private Street",
      phone: "+3725555555",
      email: "hidden@example.com",
    } as never);

    expect(preview?.cityLocation).toBeNull();
    expect(preview).not.toHaveProperty("phone");
    expect(preview).not.toHaveProperty("email");
    expect(preview).not.toHaveProperty("address");
  });

  it("formats incoming sender headline with pet name", () => {
    expect(
      formatIncomingSenderHeadline(
        {
          withPet: "{senderName} has sent you a request to care for {petName}.",
          generic: "{senderName} has sent you a care request.",
        },
        "Anna Peterson",
        "Denny",
      ),
    ).toBe("Anna Peterson has sent you a request to care for Denny.");
  });
});

describe("request query includes sender preview fields", () => {
  it("extends REQUEST_SELECT_WITH_RELATIONS with public sender columns", () => {
    expect(REQUEST_SENDER_PROFILE_SELECT).toContain("avatar_url");
    expect(REQUEST_SENDER_PROFILE_SELECT).toContain("rating_avg");
    expect(REQUEST_SENDER_PROFILE_SELECT).toContain("stay_count");
    expect(REQUEST_SENDER_PROFILE_SELECT).not.toContain("phone");
    expect(REQUEST_SENDER_PROFILE_SELECT).not.toContain("email");
    expect(REQUEST_SELECT_WITH_RELATIONS).toContain(REQUEST_SENDER_PROFILE_SELECT);
  });
});

describe("incoming request sender UI", () => {
  it("renders sender preview on incoming requests regardless of membership", () => {
    const listItem = readFileSync(
      join(process.cwd(), "src/components/requests/RequestListItem.tsx"),
      "utf8",
    );
    const preview = readFileSync(
      join(process.cwd(), "src/components/requests/IncomingRequestSenderPreview.tsx"),
      "utf8",
    );
    const cardActions = readFileSync(
      join(process.cwd(), "src/components/requests/RequestCardActions.tsx"),
      "utf8",
    );

    expect(listItem).toMatch(/IncomingRequestSenderPreview/);
    expect(listItem).toMatch(/showIncomingSenderPreview/);
    expect(listItem).toMatch(/request\.senderPreview/);
    expect(preview).toMatch(/ProfileAvatar/);
    expect(preview).toMatch(/sender\.displayName/);
    expect(preview).toMatch(/sender\.ratingCount/);
    expect(preview).toMatch(/completedBookingsCount/);
    expect(preview).toMatch(/sender\.bio/);
    expect(preview).toMatch(/sender\.cityLocation/);
    expect(preview).toMatch(/sender\.profileHref/);
    expect(preview).not.toMatch(/phone|email|address/i);
    expect(cardActions).toMatch(/!\s*needsMembershipToAccept/);
    expect(cardActions).toMatch(/needsMembershipToAccept && membershipUpsell/);
  });
});
