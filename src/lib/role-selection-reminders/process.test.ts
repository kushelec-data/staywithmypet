import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLE_SELECTION_REMINDER_CAMPAIGN_ID, readRoleSelectionCampaignConfig } from "./config";
import { processRoleSelectionReminders, type RoleSelectionProcessorDeps } from "./process";
import type { RoleSelectionCampaignConfig, RoleSelectionEventState, RoleSelectionUser } from "./types";
import type { RoleSelectionWriteResult } from "./store";

const NOW = new Date("2026-11-21T10:00:00.000Z");

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function enabledConfig(overrides: Partial<RoleSelectionCampaignConfig> = {}): RoleSelectionCampaignConfig {
  return {
    campaignId: ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
    enabled: true,
    dryRun: false,
    historicalRolloutApproved: true,
    stage2Approved: false,
    organicAfter: new Date("2026-11-17T00:00:00.000Z"),
    dailyCap: 50,
    excludedEmails: ["info@staywithmypet.ee"],
    ...overrides,
  };
}

function pendingUser(overrides: Partial<RoleSelectionUser> = {}): RoleSelectionUser {
  return {
    userId: "user-1",
    email: "user@example.com",
    registeredAt: daysAgo(20),
    displayName: "Alex",
    givenName: "Alex",
    fullName: "Alex Example",
    metadataName: null,
    locale: "en",
    banned: false,
    hasAccount: true,
    hasProfile: true,
    rolePending: true,
    roleColumn: "pet_friend",
    ...overrides,
  };
}

function makeDeps(input: {
  users: RoleSelectionUser[];
  events?: Map<string, RoleSelectionEventState[]>;
  sentToday?: number;
  selectedOnRecheck?: Set<string>;
  send?: RoleSelectionProcessorDeps["send"];
  markSent?: RoleSelectionProcessorDeps["markSent"];
}): RoleSelectionProcessorDeps & { claims: string[]; sentKeys: string[]; unknown: string[] } {
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
    markSelected: async () => ({ ok: true }),
    recheckSelected: async (userId) => input.selectedOnRecheck?.has(userId) ?? false,
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

describe("role selection processor", () => {
  it("stays disabled by default and keeps Reminder 2 off", () => {
    const parsed = readRoleSelectionCampaignConfig({});
    expect(parsed.enabled).toBe(false);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.historicalRolloutApproved).toBe(false);
    expect(parsed.stage2Approved).toBe(false);
  });

  it("does not send while dry-run is on", async () => {
    const deps = makeDeps({ users: [pendingUser()] });
    const result = await processRoleSelectionReminders({
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
      pendingUser({ userId: "user-0", email: "user-0@example.com" }),
      pendingUser({ userId: "user-1", email: "user-1@example.com" }),
    ];
    const deps = makeDeps({ users, sentToday: 50 });
    const result = await processRoleSelectionReminders({
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
      pendingUser({ userId: "user-0", email: "user-0@example.com" }),
      pendingUser({ userId: "user-1", email: "user-1@example.com" }),
    ];
    const deps = makeDeps({
      users,
      send: async () => ({ outcome: "outcome_unknown" as const, error: "timeout" }),
    });
    const result = await processRoleSelectionReminders({
      now: NOW,
      config: enabledConfig(),
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.outcomeUnknown).toBe(1);
    expect(result.stoppedOnFailure).toBe(true);
    expect(deps.claims).toEqual(["user-0"]);
  });

  it("does not send after a live recheck shows the role was selected", async () => {
    const deps = makeDeps({
      users: [pendingUser()],
      selectedOnRecheck: new Set(["user-1"]),
    });
    const result = await processRoleSelectionReminders({
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
      users: [pendingUser(), pendingUser({ userId: "user-2", email: "user-2@example.com" })],
      markSent: async (): Promise<RoleSelectionWriteResult> => ({
        ok: false,
        reason: "update_failed",
        error: "sent_update_matched_no_sending_row",
      }),
    });
    const result = await processRoleSelectionReminders({
      now: NOW,
      config: enabledConfig(),
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.outcomeUnknown).toBe(1);
    expect(result.stoppedOnFailure).toBe(true);
    expect(deps.unknown).toEqual(["user-1"]);
  });
});

describe("role selection isolation", () => {
  it("never processes marketing, Day 5, Day 10, or listing campaign tables", () => {
    const files = [
      "src/lib/role-selection-reminders/process.ts",
      "src/lib/role-selection-reminders/send.ts",
      "src/lib/role-selection-reminders/store.ts",
      "src/app/api/cron/role-selection-reminders/route.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toContain("processDueScheduledCampaigns");
      expect(source).not.toContain("email-campaigns/scheduled-send");
      expect(source).not.toContain("processDueScheduledEmails");
      expect(source).not.toContain("profile_completion_reminder_events");
      expect(source).not.toContain("profile_completion_reminder_sequences");
      expect(source).not.toContain("listing_profile_completion_events");
      expect(source).not.toContain("PROFILE_COMPLETION_REMINDER_DAY10");
    }
  });
});
