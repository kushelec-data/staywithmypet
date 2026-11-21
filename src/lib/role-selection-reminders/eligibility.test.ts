import { describe, expect, it } from "vitest";
import { ROLE_SELECTION_REMINDER_CAMPAIGN_ID } from "./config";
import { decideRoleSelectionAction } from "./eligibility";
import type {
  RoleSelectionCampaignConfig,
  RoleSelectionEventState,
  RoleSelectionUser,
} from "./types";

const NOW = new Date("2026-11-21T10:00:00.000Z");

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function config(overrides: Partial<RoleSelectionCampaignConfig> = {}): RoleSelectionCampaignConfig {
  return {
    campaignId: ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
    enabled: true,
    dryRun: false,
    historicalRolloutApproved: true,
    stage2Approved: false,
    organicAfter: new Date("2026-11-17T00:00:00.000Z"),
    dailyCap: 50,
    excludedEmails: ["info@staywithmypet.ee", "kusheducation@gmail.com"],
    ...overrides,
  };
}

function user(overrides: Partial<RoleSelectionUser> = {}): RoleSelectionUser {
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

function event(status: RoleSelectionEventState["status"]): RoleSelectionEventState {
  return {
    userId: "user-1",
    uniqueKey: `${ROLE_SELECTION_REMINDER_CAMPAIGN_ID}_1_user-1`,
    stage: 1,
    status,
    skipReason: null,
    claimedAt: NOW.toISOString(),
    sentAt: status === "sent" ? NOW.toISOString() : null,
    attemptCount: 1,
  };
}

describe("role selection eligibility", () => {
  it("sends Reminder 1 when role_chosen_at is missing after 5 days", () => {
    const decision = decideRoleSelectionAction({
      now: NOW,
      config: config(),
      user: user(),
      events: [],
    });
    expect(decision).toEqual({ action: "send", stage: 1, cohort: "historical" });
  });

  it("does not treat a default role column as a selection", () => {
    const decision = decideRoleSelectionAction({
      now: NOW,
      config: config(),
      user: user({ roleColumn: "pet_parent", rolePending: true }),
      events: [],
    });
    expect(decision.action).toBe("send");
  });

  it("stops when the user has confirmed a role", () => {
    const decision = decideRoleSelectionAction({
      now: NOW,
      config: config(),
      user: user({ rolePending: false, roleColumn: "pet_parent" }),
      events: [],
    });
    expect(decision).toEqual({ action: "stop", reason: "role_selected" });
  });

  it("skips internals, missing email, banned users, and too-early signups", () => {
    expect(
      decideRoleSelectionAction({
        now: NOW,
        config: config(),
        user: user({ email: "kusheducation@gmail.com" }),
        events: [],
      }),
    ).toEqual({ action: "skip", reason: "internal_address" });
    expect(
      decideRoleSelectionAction({
        now: NOW,
        config: config(),
        user: user({ email: null }),
        events: [],
      }),
    ).toEqual({ action: "skip", reason: "no_email" });
    expect(
      decideRoleSelectionAction({
        now: NOW,
        config: config(),
        user: user({ banned: true }),
        events: [],
      }),
    ).toEqual({ action: "skip", reason: "banned" });
    expect(
      decideRoleSelectionAction({
        now: NOW,
        config: config(),
        user: user({ registeredAt: daysAgo(4) }),
        events: [],
      }),
    ).toEqual({ action: "skip", reason: "too_early" });
  });

  it("blocks historical sends until rollout is approved", () => {
    const decision = decideRoleSelectionAction({
      now: NOW,
      config: config({ historicalRolloutApproved: false }),
      user: user(),
      events: [],
    });
    expect(decision).toEqual({ action: "skip", reason: "historical_rollout_blocked" });
  });

  it("never sends Reminder 2 even after Reminder 1 is sent", () => {
    const decision = decideRoleSelectionAction({
      now: NOW,
      config: config({ stage2Approved: true }),
      user: user(),
      events: [event("sent")],
    });
    expect(decision).toEqual({ action: "skip", reason: "stage2_not_approved" });
  });

  it("does not retry unresolved SMTP", () => {
    expect(
      decideRoleSelectionAction({
        now: NOW,
        config: config(),
        user: user(),
        events: [event("outcome_unknown")],
      }),
    ).toEqual({ action: "skip", reason: "unresolved_delivery" });
  });
});
