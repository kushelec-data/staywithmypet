import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
  ROLE_SELECTION_STAGE2_DELAY_MS,
  readRoleSelectionCampaignConfig,
} from "./config";
import { ROLE_SELECTION_REMINDER_2_COPY } from "./copy";
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
  claimResult?: "claimed" | "duplicate";
}): RoleSelectionProcessorDeps & {
  claims: string[];
  sentKeys: string[];
  unknown: string[];
  classified: string[];
  subjects: string[];
} {
  const claims: string[] = [];
  const sentKeys: string[] = [];
  const unknown: string[] = [];
  const classified: string[] = [];
  const subjects: string[] = [];
  return {
    claims,
    sentKeys,
    unknown,
    classified,
    subjects,
    loadAudience: async () => input.users,
    loadEvents: async () => ({ ok: true, byUser: input.events ?? new Map() }),
    sentToday: async () => input.sentToday ?? 0,
    claim: async ({ userId }) => {
      claims.push(userId);
      return input.claimResult ?? "claimed";
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
    classifyInactive: async (userId) => {
      classified.push(userId);
      return { ok: true };
    },
    clearInactive: async () => ({ ok: true }),
    send:
      input.send ??
      (async (payload) => {
        subjects.push(payload.subject);
        return {
          outcome: "accepted" as const,
          messageId: "mid",
          response: "250",
          acceptedCount: 1,
          rejectedCount: 0,
        };
      }),
  };
}

function stage1SentEvent(userId: string): RoleSelectionEventState {
  return {
    userId,
    uniqueKey: `${ROLE_SELECTION_REMINDER_CAMPAIGN_ID}_1_${userId}`,
    stage: 1,
    status: "sent",
    skipReason: null,
    claimedAt: NOW.toISOString(),
    sentAt: new Date(NOW.getTime() - ROLE_SELECTION_STAGE2_DELAY_MS).toISOString(),
    attemptCount: 1,
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

  it("sends Reminder 2 copy after the stage-1 delay and classifies inactive", async () => {
    const deps = makeDeps({
      users: [pendingUser()],
      events: new Map([["user-1", [stage1SentEvent("user-1")]]]),
    });
    const result = await processRoleSelectionReminders({
      now: NOW,
      config: enabledConfig({ stage2Approved: true, historicalRolloutApproved: false }),
      deps,
    });
    expect(result.sent).toBe(1);
    expect(deps.subjects).toEqual([ROLE_SELECTION_REMINDER_2_COPY.en.subject]);
    expect(deps.classified).toEqual(["user-1"]);
  });

  it("prefers Reminder 1 over Reminder 2 when the daily cap is tight", async () => {
    const users = [
      pendingUser({ userId: "stage-2-user", email: "two@example.com" }),
      pendingUser({ userId: "stage-1-user", email: "one@example.com" }),
    ];
    const deps = makeDeps({
      users,
      events: new Map([["stage-2-user", [stage1SentEvent("stage-2-user")]]]),
    });
    const result = await processRoleSelectionReminders({
      now: NOW,
      config: enabledConfig({ stage2Approved: true, dailyCap: 1 }),
      deps,
    });
    expect(result.sent).toBe(1);
    expect(result.capped).toBe(1);
    expect(deps.sentKeys).toEqual(["stage-1-user"]);
    expect(deps.subjects[0]).not.toBe(ROLE_SELECTION_REMINDER_2_COPY.en.subject);
  });

  it("does not send again when a duplicate cron invocation cannot claim", async () => {
    const deps = makeDeps({
      users: [pendingUser()],
      claimResult: "duplicate",
    });
    const result = await processRoleSelectionReminders({
      now: NOW,
      config: enabledConfig(),
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
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
