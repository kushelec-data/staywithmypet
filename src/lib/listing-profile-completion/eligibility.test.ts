import { describe, expect, it } from "vitest";
import { LISTING_PROFILE_COMPLETION_CAMPAIGN_ID, listingCampaignCtaPath } from "./config";
import { decideListingCampaignAction } from "./eligibility";
import type { ListingCampaignConfig, ListingCampaignEventState, ListingCampaignUser } from "./types";

const NOW = new Date("2026-11-15T10:00:00.000Z");

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function config(overrides: Partial<ListingCampaignConfig> = {}): ListingCampaignConfig {
  return {
    campaignId: LISTING_PROFILE_COMPLETION_CAMPAIGN_ID,
    enabled: true,
    dryRun: false,
    historicalRolloutApproved: true,
    organicAfter: new Date("2026-11-15T12:00:00.000Z"),
    dailyCap: 50,
    excludedEmails: ["info@staywithmypet.ee", "kusheducation@gmail.com"],
    ...overrides,
  };
}

function parent(overrides: Partial<ListingCampaignUser> = {}): ListingCampaignUser {
  return {
    userId: "parent-1",
    email: "parent@example.com",
    registeredAt: daysAgo(20),
    role: "pet_parent",
    activeMode: "pet_parent",
    displayName: "Alex",
    givenName: "Alex",
    fullName: "Alex Example",
    metadataName: null,
    locale: "en",
    banned: false,
    hasAccount: true,
    hasProfile: true,
    rolePending: false,
    petCount: 0,
    petMarketplaceReady: false,
    friendListingComplete: false,
    needsParentListing: true,
    needsFriendListing: false,
    emailRole: "pet_parent",
    ...overrides,
  };
}

function event(status: ListingCampaignEventState["status"]): ListingCampaignEventState {
  return {
    userId: "parent-1",
    uniqueKey: `${LISTING_PROFILE_COMPLETION_CAMPAIGN_ID}_parent-1`,
    status,
    skipReason: null,
    emailRole: "pet_parent",
    claimedAt: NOW.toISOString(),
    sentAt: status === "sent" ? NOW.toISOString() : null,
    attemptCount: 1,
  };
}

describe("listing campaign eligibility", () => {
  it("sends to confirmed parents without a marketplace-ready pet after 5 days", () => {
    const decision = decideListingCampaignAction({
      now: NOW,
      config: config(),
      user: parent(),
      event: null,
    });
    expect(decision).toEqual({ action: "send", emailRole: "pet_parent", cohort: "historical" });
  });

  it("does not send when at least one pet is marketplace-ready", () => {
    const decision = decideListingCampaignAction({
      now: NOW,
      config: config(),
      user: parent({
        petCount: 2,
        petMarketplaceReady: true,
        needsParentListing: false,
        emailRole: "pet_parent",
      }),
      event: null,
    });
    expect(decision).toEqual({ action: "stop", reason: "listing_complete" });
  });

  it("prioritizes the Pet Parent template when both listings are incomplete", () => {
    const decision = decideListingCampaignAction({
      now: NOW,
      config: config(),
      user: parent({
        role: "both",
        needsParentListing: true,
        needsFriendListing: true,
        emailRole: "pet_parent",
      }),
      event: null,
    });
    expect(decision.action).toBe("send");
    if (decision.action === "send") expect(decision.emailRole).toBe("pet_parent");
  });

  it("sends the Pet Friend template when only friend fields are missing", () => {
    const decision = decideListingCampaignAction({
      now: NOW,
      config: config(),
      user: parent({
        userId: "friend-1",
        email: "friend@example.com",
        role: "pet_friend",
        activeMode: "pet_friend",
        needsParentListing: false,
        needsFriendListing: true,
        emailRole: "pet_friend",
      }),
      event: null,
    });
    expect(decision).toMatchObject({ action: "send", emailRole: "pet_friend" });
  });

  it("skips unconfirmed roles, banned users, and internal addresses", () => {
    expect(
      decideListingCampaignAction({
        now: NOW,
        config: config(),
        user: parent({ rolePending: true, emailRole: null, needsParentListing: false }),
        event: null,
      }).action,
    ).toBe("skip");
    expect(
      decideListingCampaignAction({
        now: NOW,
        config: config(),
        user: parent({ banned: true }),
        event: null,
      }),
    ).toEqual({ action: "skip", reason: "banned" });
    expect(
      decideListingCampaignAction({
        now: NOW,
        config: config(),
        user: parent({ email: "kusheducation@gmail.com" }),
        event: null,
      }),
    ).toEqual({ action: "skip", reason: "internal_address" });
  });

  it("requires five calendar days since registration and ignores Day 5 history", () => {
    expect(
      decideListingCampaignAction({
        now: NOW,
        config: config(),
        user: parent({ registeredAt: daysAgo(4) }),
        event: null,
      }),
    ).toEqual({ action: "skip", reason: "too_early" });
    expect(
      decideListingCampaignAction({
        now: NOW,
        config: config(),
        user: parent({ registeredAt: daysAgo(5) }),
        event: null,
      }).action,
    ).toBe("send");
  });

  it("does not resend or retry unknown SMTP outcomes", () => {
    expect(
      decideListingCampaignAction({
        now: NOW,
        config: config(),
        user: parent(),
        event: event("sent"),
      }),
    ).toEqual({ action: "skip", reason: "already_sent" });
    expect(
      decideListingCampaignAction({
        now: NOW,
        config: config(),
        user: parent(),
        event: event("outcome_unknown"),
      }),
    ).toEqual({ action: "skip", reason: "unresolved_delivery" });
  });

  it("blocks historical users until historical rollout is approved", () => {
    expect(
      decideListingCampaignAction({
        now: NOW,
        config: config({ historicalRolloutApproved: false }),
        user: parent({ registeredAt: daysAgo(40) }),
        event: null,
      }),
    ).toEqual({ action: "skip", reason: "historical_rollout_blocked" });
  });

  it("uses pet-listing destinations for parents and profile edit for friends", () => {
    expect(listingCampaignCtaPath("pet_parent", 0)).toBe("/pets/new");
    expect(listingCampaignCtaPath("pet_parent", 2)).toBe("/pets");
    expect(listingCampaignCtaPath("pet_friend", 0)).toBe("/profile/edit");
  });
});
