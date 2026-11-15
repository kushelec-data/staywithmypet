import { describe, expect, it } from "vitest";
import { buildListingCampaignUser } from "./load-audience";

describe("buildListingCampaignUser", () => {
  it("prioritizes the parent template when both listings are incomplete", () => {
    const user = buildListingCampaignUser({
      userId: "both-1",
      email: "both@example.com",
      createdAt: "2026-07-01T00:00:00.000Z",
      banned: false,
      metadata: { swmp_locale: "et" },
      profile: {
        id: "both-1",
        display_name: "Bret",
        role: "both",
        active_mode: "pet_friend",
        role_chosen_at: "2026-07-01T00:00:00.000Z",
        details: {},
      },
      pets: [],
    });
    expect(user.needsParentListing).toBe(true);
    expect(user.needsFriendListing).toBe(true);
    expect(user.emailRole).toBe("pet_parent");
    expect(user.locale).toBe("et");
  });
});
