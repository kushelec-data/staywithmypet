import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { processProfileCompletionReminders, type ReminderProcessorDeps } from "./process";
import { PROFILE_REMINDER_PILOT_USER_IDS, readProfileReminderConfig } from "./config";
import type { ReminderEventState, ReminderHistory, ReminderUserSnapshot } from "./types";
import type { ReminderWriteResult } from "./store";

const NOW = new Date("2026-11-07T09:15:00.000Z");

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function parent(overrides: Partial<ReminderUserSnapshot> = {}): ReminderUserSnapshot {
  return {
    userId: "parent-1",
    email: "parent@example.com",
    registeredAt: daysAgo(5),
    role: "pet_parent",
    activeMode: "pet_parent",
    displayName: "Alex Example",
    givenName: "Alex",
    fullName: "Alex Example",
    metadataName: null,
    locale: "en",
    banned: false,
    hasAccount: true,
    hasProfile: true,
    profileComplete: false,
    rolePending: false,
    emailRole: "pet_parent",
    ...overrides,
  };
}

function emptyHistory(): ReminderHistory {
  return { sequence: null, first: null, second: null };
}

function makeDeps(input: {
  users: ReminderUserSnapshot[];
  history?: Map<string, ReminderHistory>;
  sentToday?: number;
  completeOnRecheck?: Set<string>;
  claim?: ReminderProcessorDeps["claim"];
  send?: ReminderProcessorDeps["send"];
  markSent?: ReminderProcessorDeps["markSent"];
}): ReminderProcessorDeps & {
  claims: string[];
  sentKeys: string[];
  failed: string[];
  unknown: string[];
  completed: string[];
} {
  const claims: string[] = [];
  const sentKeys: string[] = [];
  const failed: string[] = [];
  const unknown: string[] = [];
  const completed: string[] = [];
  return {
    claims,
    sentKeys,
    failed,
    unknown,
    completed,
    loadAudience: async () => input.users,
    loadHistory: async () => ({ ok: true, byUser: input.history ?? new Map() }),
    sentToday: async () => input.sentToday ?? 0,
    claim:
      input.claim ??
      (async ({ userId, stage }) => {
        claims.push(`${stage}:${userId}`);
        return "claimed";
      }),
    markSent:
      input.markSent ??
      (async (userId, stage) => {
        sentKeys.push(`${stage}:${userId}`);
        return { ok: true };
      }),
    markFailedBeforeAcceptance: async (userId, stage) => {
      failed.push(`${stage}:${userId}`);
      return { ok: true };
    },
    markOutcomeUnknown: async (userId, stage) => {
      unknown.push(`${stage}:${userId}`);
      return { ok: true };
    },
    markComplete: async (userId, stage) => {
      completed.push(`${stage}:${userId}`);
      return { ok: true };
    },
    recheckComplete: async (user) => input.completeOnRecheck?.has(user.userId) ?? user.profileComplete,
    send:
      input.send ??
      (async () => {
        return { outcome: "accepted" as const };
      }),
  };
}

function trackedEvent(
  userId: string,
  stage: "first" | "second",
  status: ReminderEventState["status"],
): ReminderEventState {
  return {
    userId,
    stage,
    uniqueKey: `profile_completion_reminder_${stage}_${userId}`,
    status,
    skipReason: null,
    claimedAt: NOW.toISOString(),
    sentAt: status === "sent" ? NOW.toISOString() : null,
    attemptCount: 1,
  };
}

function makeTrackedDeps(input: {
  users: ReminderUserSnapshot[];
  send: ReminderProcessorDeps["send"];
  markSent?: ReminderProcessorDeps["markSent"];
  initial?: Map<string, ReminderHistory>;
}): ReminderProcessorDeps & { history: Map<string, ReminderHistory> } {
  const history = input.initial ?? new Map<string, ReminderHistory>();
  const ok = (): ReminderWriteResult => ({ ok: true });

  const setEvent = (userId: string, stage: "first" | "second", status: ReminderEventState["status"]) => {
    const current = history.get(userId) ?? emptyHistory();
    const event = trackedEvent(userId, stage, status);
    if (stage === "first") current.first = event;
    else current.second = event;
    if (status === "sent" && stage === "first") {
      current.sequence = {
        userId,
        status: "active",
        cohort: "organic",
        registeredAt: NOW.toISOString(),
        firstSentAt: NOW.toISOString(),
        secondSentAt: null,
        stopReason: null,
      };
    }
    history.set(userId, current);
  };

  return {
    history,
    loadAudience: async () => input.users,
    loadHistory: async () => ({ ok: true, byUser: history }),
    sentToday: async () => 0,
    claim: async ({ userId, stage }) => {
      const current = history.get(userId) ?? emptyHistory();
      const event = stage === "first" ? current.first : current.second;
      if (!event || event.status === "failed_before_acceptance") {
        setEvent(userId, stage, "sending");
        return "claimed";
      }
      return "duplicate";
    },
    markSent:
      input.markSent ??
      (async (userId, stage) => {
        setEvent(userId, stage, "sent");
        return ok();
      }),
    markFailedBeforeAcceptance: async (userId, stage) => {
      setEvent(userId, stage, "failed_before_acceptance");
      return ok();
    },
    markOutcomeUnknown: async (userId, stage) => {
      setEvent(userId, stage, "outcome_unknown");
      return ok();
    },
    markComplete: async (userId, stage) => {
      setEvent(userId, stage, "skipped");
      return ok();
    },
    recheckComplete: async (user) => user.profileComplete,
    send: input.send,
  };
}

const enabledConfig = {
  enabled: true,
  dryRun: false,
  historicalRolloutApproved: true,
  day10Approved: true,
  organicAfter: daysAgo(10),
  dailyCap: 50,
  excludedEmails: ["info@staywithmypet.ee"],
  pilotOnly: false,
  pilotUserIds: [] as string[],
};

describe("profile completion reminder processor", () => {
  it("sends Day 5 to a new incomplete user and keeps Day 10 gated until approved", async () => {
    const deps = makeDeps({ users: [parent()] });
    const result = await processProfileCompletionReminders({
      now: NOW,
      config: { ...enabledConfig, day10Approved: false },
      deps,
    });
    expect(result.sent).toBe(1);
    expect(result.preview[0]?.templateStage).toBe("day_5");
    expect(result.preview[0]?.locale).toBe("en");
  });

  it("sends Day 10 to a new user after the first reminder", async () => {
    const deps = makeDeps({
      users: [parent({ registeredAt: daysAgo(10) })],
      history: new Map([
        [
          "parent-1",
          {
            sequence: {
              userId: "parent-1",
              status: "active",
              cohort: "organic",
              registeredAt: daysAgo(10).toISOString(),
              firstSentAt: daysAgo(5).toISOString(),
              secondSentAt: null,
              stopReason: null,
            },
            first: {
              userId: "parent-1",
              stage: "first",
              uniqueKey: "profile_completion_reminder_first_parent-1",
              status: "sent",
              skipReason: null,
              claimedAt: daysAgo(5).toISOString(),
              sentAt: daysAgo(5).toISOString(),
              attemptCount: 1,
            },
            second: null,
          },
        ],
      ]),
    });
    const result = await processProfileCompletionReminders({
      now: NOW,
      config: enabledConfig,
      deps,
    });
    expect(result.sent).toBe(1);
    expect(result.preview[0]?.templateStage).toBe("day_10");
    expect(result.preview[0]?.stage).toBe("second");
  });

  it("skips sending when the profile is completed immediately before send", async () => {
    const deps = makeDeps({
      users: [parent()],
      completeOnRecheck: new Set(["parent-1"]),
    });
    const result = await processProfileCompletionReminders({
      now: NOW,
      config: enabledConfig,
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.stoppedComplete).toBe(1);
    expect(deps.completed).toEqual(["first:parent-1"]);
  });

  it("claims once across duplicate cron runs", async () => {
    const users = [parent()];
    const claimed = new Set<string>();
    const sharedClaim: ReminderProcessorDeps["claim"] = async ({ userId, stage }) => {
      const key = `${stage}:${userId}`;
      if (claimed.has(key)) return "duplicate";
      claimed.add(key);
      return "claimed";
    };
    const first = makeDeps({ users, claim: sharedClaim });
    const second = makeDeps({ users, claim: sharedClaim });
    const config = enabledConfig;
    const a = await processProfileCompletionReminders({ now: NOW, config, deps: first });
    const b = await processProfileCompletionReminders({ now: NOW, config, deps: second });
    expect(a.sent).toBe(1);
    expect(b.sent).toBe(0);
    expect(b.skipped).toBe(1);
  });

  it("retries only confirmed pre-acceptance failures", async () => {
    let attempts = 0;
    const deps = makeTrackedDeps({
      users: [parent()],
      send: async () => {
        attempts += 1;
        if (attempts === 1) {
          return { outcome: "failed_before_acceptance", reason: "connection", error: "ECONNREFUSED" };
        }
        return { outcome: "accepted" };
      },
    });
    const first = await processProfileCompletionReminders({ now: NOW, config: enabledConfig, deps });
    expect(first.failedBeforeAcceptance).toBe(1);
    expect(first.sent).toBe(0);
    const retry = await processProfileCompletionReminders({ now: NOW, config: enabledConfig, deps });
    expect(retry.sent).toBe(1);
    expect(attempts).toBe(2);
  });

  it("does not report sent when SMTP is accepted but the database update fails", async () => {
    const deps = makeTrackedDeps({
      users: [parent()],
      send: async () => ({ outcome: "accepted" }),
      markSent: async () => ({ ok: false, reason: "update_failed", error: "row update failed" }),
    });
    const first = await processProfileCompletionReminders({ now: NOW, config: enabledConfig, deps });
    expect(first.sent).toBe(0);
    expect(first.outcomeUnknown).toBe(1);
    expect(deps.history.get("parent-1")?.first?.status).toBe("outcome_unknown");

    const retry = await processProfileCompletionReminders({ now: NOW, config: enabledConfig, deps });
    expect(retry.sent).toBe(0);
    expect(retry.skipped).toBe(1);
  });

  it("does not automatically retry an SMTP timeout with unknown outcome", async () => {
    let attempts = 0;
    const deps = makeTrackedDeps({
      users: [parent()],
      send: async () => {
        attempts += 1;
        return { outcome: "outcome_unknown", error: "Connection timeout" };
      },
    });
    const first = await processProfileCompletionReminders({ now: NOW, config: enabledConfig, deps });
    expect(first.sent).toBe(0);
    expect(first.outcomeUnknown).toBe(1);
    const retry = await processProfileCompletionReminders({ now: NOW, config: enabledConfig, deps });
    expect(retry.sent).toBe(0);
    expect(attempts).toBe(1);
  });

  it("does not send Day 10 when Day 5 outcome is unknown", async () => {
    const deps = makeDeps({
      users: [parent({ registeredAt: daysAgo(10) })],
      history: new Map([
        [
          "parent-1",
          {
            sequence: null,
            first: trackedEvent("parent-1", "first", "outcome_unknown"),
            second: null,
          },
        ],
      ]),
    });
    const result = await processProfileCompletionReminders({
      now: NOW,
      config: enabledConfig,
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.preview).toHaveLength(0);
    expect(deps.claims).toHaveLength(0);
  });

  it("keeps a historical dry run from sending", async () => {
    const deps = makeDeps({
      users: [parent({ userId: "old-1", registeredAt: daysAgo(65), email: "old@example.com" })],
    });
    const result = await processProfileCompletionReminders({
      now: NOW,
      config: { ...enabledConfig, dryRun: true, organicAfter: NOW },
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.dryRun).toBe(true);
    expect(result.preview).toHaveLength(1);
    expect(result.preview[0]?.cohort).toBe("historical");
  });

  it("defaults to dry-run and disabled so production cannot send by accident", () => {
    const config = readProfileReminderConfig({});
    expect(config.enabled).toBe(false);
    expect(config.dryRun).toBe(true);
    expect(config.historicalRolloutApproved).toBe(false);
    expect(config.day10Approved).toBe(false);
    expect(config.pilotOnly).toBe(true);
    expect(config.pilotUserIds).toEqual([]);
    expect(config.excludedEmails).toEqual([
      "info@staywithmypet.ee",
      "kusheducation@gmail.com",
      "gerlykullamaa@gmail.com",
      "gerly.kullamaa@gmail.com",
    ]);
  });

  it("sends nobody when the pilot is on and the allowlist env is empty", async () => {
    const deps = makeDeps({
      users: [
        parent({
          userId: PROFILE_REMINDER_PILOT_USER_IDS[0],
          email: "pilot@example.com",
          registeredAt: daysAgo(80),
        }),
      ],
    });
    const result = await processProfileCompletionReminders({
      now: NOW,
      config: {
        ...enabledConfig,
        day10Approved: false,
        organicAfter: NOW,
        pilotOnly: true,
        pilotUserIds: [],
      },
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.preview).toHaveLength(0);
    expect(deps.claims).toHaveLength(0);
  });

  it("sends the first reminder only to the committed pilot allowlist", async () => {
    const allowedId = PROFILE_REMINDER_PILOT_USER_IDS[0];
    const blockedId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
    const deps = makeDeps({
      users: [
        parent({
          userId: allowedId,
          email: "pilot@example.com",
          registeredAt: daysAgo(80),
        }),
        parent({
          userId: blockedId,
          email: "other@example.com",
          registeredAt: daysAgo(80),
        }),
      ],
    });
    const result = await processProfileCompletionReminders({
      now: NOW,
      config: {
        ...enabledConfig,
        day10Approved: false,
        organicAfter: NOW,
        pilotOnly: true,
        pilotUserIds: [allowedId, blockedId],
      },
      deps,
    });
    expect(result.sent).toBe(1);
    expect(result.preview).toHaveLength(1);
    expect(result.preview[0]?.userId).toBe(allowedId);
    expect(result.preview[0]?.templateStage).toBe("day_5");
    expect(deps.claims).toEqual([`first:${allowedId}`]);
    expect(deps.sentKeys).toEqual([`first:${allowedId}`]);
  });

  it("does not enqueue the internal info address", async () => {
    const deps = makeDeps({
      users: [parent({ email: "info@staywithmypet.ee", registeredAt: daysAgo(65) })],
    });
    const result = await processProfileCompletionReminders({
      now: NOW,
      config: { ...enabledConfig, organicAfter: NOW },
      deps,
    });
    expect(result.sent).toBe(0);
    expect(result.preview).toHaveLength(0);
    expect(deps.claims).toHaveLength(0);
  });

  it("stops the batch after an unexpected SMTP or database failure", async () => {
    const first = parent({ userId: "parent-1", email: "one@example.com" });
    const second = parent({ userId: "parent-2", email: "two@example.com" });
    const timeoutDeps = makeTrackedDeps({
      users: [first, second],
      send: async () => ({ outcome: "outcome_unknown", error: "Connection timeout" }),
    });
    const timeoutResult = await processProfileCompletionReminders({
      now: NOW,
      config: enabledConfig,
      deps: timeoutDeps,
    });
    expect(timeoutResult.sent).toBe(0);
    expect(timeoutResult.outcomeUnknown).toBe(1);
    expect(timeoutResult.stoppedOnFailure).toBe(true);
    expect(timeoutResult.stopReason).toBe("smtp_outcome_unknown");
    expect(timeoutDeps.history.has("parent-2")).toBe(false);

    const dbFailDeps = makeTrackedDeps({
      users: [first, second],
      send: async () => ({
        outcome: "accepted",
        messageId: "<id@mail.spacemail.com>",
        response: "250 Ok",
        acceptedCount: 1,
        rejectedCount: 0,
      }),
      markSent: async () => ({ ok: false, reason: "update_failed", error: "row update failed" }),
    });
    const dbFailResult = await processProfileCompletionReminders({
      now: NOW,
      config: enabledConfig,
      deps: dbFailDeps,
    });
    expect(dbFailResult.sent).toBe(0);
    expect(dbFailResult.outcomeUnknown).toBe(1);
    expect(dbFailResult.stoppedOnFailure).toBe(true);
    expect(dbFailResult.stopReason).toBe("database_update_failed_after_smtp_accept");
    expect(dbFailDeps.history.has("parent-2")).toBe(false);
  });
});

describe("profile reminder isolation", () => {
  it("never processes marketing campaigns from the reminder workflow", () => {
    const files = [
      "src/lib/profile-completion-reminders/process.ts",
      "src/lib/profile-completion-reminders/send.ts",
      "src/lib/profile-completion-reminders/store.ts",
      "src/app/api/cron/profile-completion-reminders/route.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toContain("processDueScheduledCampaigns");
      expect(source).not.toContain("email-campaigns/scheduled-send");
      expect(source).not.toContain("processDueScheduledEmails");
    }
  });

  it("uses production onboarding completion and the profile edit deep link", () => {
    const completion = readFileSync(
      join(process.cwd(), "src/lib/profile-completion-reminders/completion.ts"),
      "utf8",
    );
    const loader = readFileSync(
      join(process.cwd(), "src/lib/profile-completion-reminders/load-audience.ts"),
      "utf8",
    );
    const templates = readFileSync(
      join(process.cwd(), "src/lib/profile-completion-reminders/templates.ts"),
      "utf8",
    );
    expect(completion).toContain("needsRoleOnboarding");
    expect(completion).toContain("isProfileIncomplete");
    expect(completion).not.toContain("evaluateProfileRequiredFields");
    expect(loader).not.toContain("PET_INTRO_SELECT");
    expect(loader).not.toContain("pet-intro");
    expect(templates).toContain("PROFILE_REMINDER_CTA_PATH");
    expect(readFileSync(join(process.cwd(), "src/lib/profile-completion-reminders/config.ts"), "utf8")).toContain(
      "/profile/edit",
    );
    expect(readFileSync(join(process.cwd(), "src/lib/profile-completion-reminders/process.ts"), "utf8")).toContain(
      "isReminderPilotSendAllowed",
    );
    expect(readFileSync(join(process.cwd(), "src/lib/profile-completion-reminders/eligibility.ts"), "utf8")).toContain(
      "pilot_not_allowlisted",
    );
  });
});
