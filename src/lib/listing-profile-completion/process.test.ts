import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LISTING_PROFILE_COMPLETION_CAMPAIGN_ID, readListingCampaignConfig } from "./config";
import { processListingProfileCompletion, type ListingCampaignProcessorDeps } from "./process";
import type { ListingCampaignConfig, ListingCampaignEventState, ListingCampaignUser } from "./types";
import type { ListingWriteResult } from "./store";

const NOW = new Date("2026-11-15T10:00:00.000Z");

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function enabledConfig(overrides: Partial<ListingCampaignConfig> = {}): ListingCampaignConfig {
  return {
    campaignId: LISTING_PROFILE_COMPLETION_CAMPAIGN_ID,
    enabled: true,
    dryRun: false,
    historicalRolloutApproved: true,
    organicAfter: new Date("2026-11-15T12:00:00.000Z"),
    dailyCap: 50,
    excludedEmails: ["info@staywithmypet.ee"],
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

function makeDeps(input: {
  users: ListingCampaignUser[];
  events?: Map<string, ListingCampaignEventState | null>;
  sentToday?: number;
  completeOnRecheck?: Set<string>;
  send?: ListingCampaignProcessorDeps["send"];
  markSent?: ListingCampaignProcessorDeps["markSent"];
}): ListingCampaignProcessorDeps & { claims: string[]; sentKeys: string[]; unknown: string[] } {
  const claims: string[] = [];
  const sentKeys: string[] = [];
  const unknown: string[] = [];
  return {
    claims,
    sentKeys,
    unknown,
    loadAudience: async () => input.users,
    loadEvents: async () => ({ ok: true, byUser: input.events ?? new Map() }),
    sentToday: async () => input.sentToday ?? 0,
    claim: async ({ userId }) => {
      claims.push(userId);
      return "claimed";
    },
    markSent:
      input.markSent ??
      (async (userId) => {
        sentKeys.push(userId);
        return { ok: true };
      }),
    markFailedBeforeAcceptance: async () => ({ ok: true }),
    markOutcomeUnknown: async (userId) => {
      unknown.push(userId);
      return { ok: true };
    },
    markComplete: async () => ({ ok: true }),
    recheckComplete: async (user) => input.completeOnRecheck?.has(user.userId) ?? false,
    send:
      input.send ??
      (async () => ({
        outcome: "accepted" as const,
        messageId: "mid",
        response: "250",
        acceptedCount: 1,
        rejectedCount: 0,
      })),
  };
}

describe("listing profile completion processor", () => {
  it("stays disabled by default", () => {
    const parsed = readListingCampaignConfig({});
    expect(parsed.enabled).toBe(false);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.historicalRolloutApproved).toBe(false);
  });

  it("does not send while dry-run is on", async () => {
    const deps = makeDeps({ users: [parent()] });
    const result = await processListingProfileCompletion({
      now: NOW,
      config: enabledConfig({ dryRun: true }),
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.processed).toBe(1);
    expect(deps.claims).toHaveLength(0);
  });

  it("respects the 50-customer daily cap", async () => {
    const users = [
      parent({ userId: "user-0", email: "user-0@example.com" }),
      parent({ userId: "user-1", email: "user-1@example.com" }),
    ];
    const deps = makeDeps({ users, sentToday: 50 });
    const result = await processListingProfileCompletion({
      now: NOW,
      config: enabledConfig(),
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.capped).toBe(2);
    expect(deps.claims).toHaveLength(0);
  });

  it("stops the batch on unknown SMTP and does not continue", async () => {
    const users = [
      parent({ userId: "user-0", email: "user-0@example.com" }),
      parent({ userId: "user-1", email: "user-1@example.com" }),
    ];
    const deps = makeDeps({
      users,
      send: async () => ({ outcome: "outcome_unknown" as const, error: "timeout" }),
    });
    const result = await processListingProfileCompletion({
      now: NOW,
      config: enabledConfig(),
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.outcomeUnknown).toBe(1);
    expect(result.stoppedOnFailure).toBe(true);
    expect(deps.claims).toEqual(["user-0"]);
  });

  it("does not send after a live recheck shows the listing is complete", async () => {
    const deps = makeDeps({
      users: [parent()],
      completeOnRecheck: new Set(["parent-1"]),
    });
    const result = await processListingProfileCompletion({
      now: NOW,
      config: enabledConfig(),
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.stoppedComplete).toBe(1);
    expect(deps.sentKeys).toHaveLength(0);
  });

  it("records outcome_unknown when SMTP is accepted but the database update fails", async () => {
    const deps = makeDeps({
      users: [parent(), parent({ userId: "parent-2", email: "parent-2@example.com" })],
      markSent: async (): Promise<ListingWriteResult> => ({
        ok: false,
        reason: "update_failed",
        error: "sent_update_matched_no_sending_row",
      }),
    });
    const result = await processListingProfileCompletion({
      now: NOW,
      config: enabledConfig(),
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.outcomeUnknown).toBe(1);
    expect(result.stoppedOnFailure).toBe(true);
    expect(deps.unknown).toEqual(["parent-1"]);
  });
});

describe("listing campaign isolation", () => {
  it("never processes marketing campaigns or Day 5 reminder tables", () => {
    const files = [
      "src/lib/listing-profile-completion/process.ts",
      "src/lib/listing-profile-completion/send.ts",
      "src/lib/listing-profile-completion/store.ts",
      "src/app/api/cron/listing-profile-completion/route.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toContain("processDueScheduledCampaigns");
      expect(source).not.toContain("email-campaigns/scheduled-send");
      expect(source).not.toContain("processDueScheduledEmails");
      expect(source).not.toContain("profile_completion_reminder_events");
      expect(source).not.toContain("profile_completion_reminder_sequences");
      expect(source).not.toContain("PROFILE_COMPLETION_REMINDER_DAY10");
    }
  });
});
