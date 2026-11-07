import { describe, expect, it } from "vitest";
import { decideReminderAction, utcCalendarDaysSince } from "./eligibility";
import { reminderFirstName, reminderGreeting } from "./first-name";
import { knownEmailRole, reminderLocaleFromMetadata, resolveReminderLocale } from "./locale";
import { parseExcludedReminderEmails } from "./config";
import { isCanonicalProfileComplete } from "./completion";
import { buildReminderUserSnapshot } from "./load-audience";
import { summarizeReminderAudience } from "./report";
import type { ReminderConfig, ReminderHistory, ReminderUserSnapshot } from "./types";

const NOW = new Date("2026-11-07T09:15:00.000Z");

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function history(overrides: Partial<ReminderHistory> = {}): ReminderHistory {
  return { sequence: null, first: null, second: null, ...overrides };
}

function user(overrides: Partial<ReminderUserSnapshot> = {}): ReminderUserSnapshot {
  return {
    userId: "user-1",
    email: "alex@example.com",
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

function finishedOnboardingProfile(overrides: Record<string, unknown> = {}) {
  return {
    display_name: "Gerly Kullamaa",
    bio: "I love pets",
    location: "Tallinn",
    languages: ["et", "en"],
    role: "pet_parent",
    active_mode: "pet_parent",
    role_chosen_at: "2026-01-15T10:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function sendingConfig(overrides: Partial<ReminderConfig> = {}): ReminderConfig {
  return {
    enabled: true,
    dryRun: false,
    historicalRolloutApproved: true,
    day10Approved: true,
    organicAfter: daysAgo(3),
    dailyCap: 50,
    excludedEmails: ["info@staywithmypet.ee"],
    ...overrides,
  };
}

describe("profile completion reminder eligibility", () => {
  it("sends the Day 5 template to a new user on day 5", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: daysAgo(10) }),
      user: user({ registeredAt: daysAgo(5) }),
      history: history(),
    });
    expect(decision).toEqual({
      action: "send",
      stage: "first",
      templateStage: "day_5",
      cohort: "organic",
    });
  });

  it("sends the Day 10 template to a new user on day 10 after the first send", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: daysAgo(20) }),
      user: user({ registeredAt: daysAgo(10) }),
      history: history({
        sequence: {
          userId: "user-1",
          status: "active",
          cohort: "organic",
          registeredAt: daysAgo(10).toISOString(),
          firstSentAt: daysAgo(5).toISOString(),
          secondSentAt: null,
          stopReason: null,
        },
        first: {
          userId: "user-1",
          stage: "first",
          uniqueKey: "profile_completion_reminder_first_user-1",
          status: "sent",
          skipReason: null,
          claimedAt: daysAgo(5).toISOString(),
          sentAt: daysAgo(5).toISOString(),
          attemptCount: 1,
        },
      }),
    });
    expect(decision).toMatchObject({ action: "send", stage: "second", templateStage: "day_10" });
  });

  it("includes existing incomplete users 40+ and 60+ days old in a historical rollout", () => {
    for (const days of [40, 61]) {
      const decision = decideReminderAction({
        now: NOW,
        config: sendingConfig({ organicAfter: NOW }),
        user: user({ registeredAt: daysAgo(days) }),
        history: history(),
      });
      expect(decision).toMatchObject({
        action: "send",
        stage: "first",
        templateStage: "day_5",
        cohort: "historical",
      });
    }
  });

  it("does not send historical backlog until rollout is approved", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ historicalRolloutApproved: false, organicAfter: NOW }),
      user: user({ registeredAt: daysAgo(60) }),
      history: history(),
    });
    expect(decision).toEqual({ action: "skip", reason: "historical_rollout_blocked" });
  });

  it("stops before Day 5 when the profile is already complete", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: daysAgo(10) }),
      user: user({ registeredAt: daysAgo(3), profileComplete: true }),
      history: history(),
    });
    expect(decision).toEqual({ action: "stop", reason: "profile_complete" });
  });

  it("stops between reminders when the profile is completed after the first send", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: daysAgo(20) }),
      user: user({ registeredAt: daysAgo(10), profileComplete: true }),
      history: history({
        sequence: {
          userId: "user-1",
          status: "active",
          cohort: "organic",
          registeredAt: daysAgo(10).toISOString(),
          firstSentAt: daysAgo(5).toISOString(),
          secondSentAt: null,
          stopReason: null,
        },
      }),
    });
    expect(decision).toEqual({ action: "stop", reason: "profile_complete" });
  });

  it("never sends both reminders on the same UTC day", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: daysAgo(20) }),
      user: user({ registeredAt: daysAgo(10) }),
      history: history({
        sequence: {
          userId: "user-1",
          status: "active",
          cohort: "organic",
          registeredAt: daysAgo(10).toISOString(),
          firstSentAt: NOW.toISOString(),
          secondSentAt: null,
          stopReason: null,
        },
      }),
    });
    expect(decision).toEqual({ action: "skip", reason: "same_day_as_first" });
  });

  it("waits 5 days after the actual first send for historical users", () => {
    const tooSoon = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: NOW }),
      user: user({ registeredAt: daysAgo(80) }),
      history: history({
        sequence: {
          userId: "user-1",
          status: "active",
          cohort: "historical",
          registeredAt: daysAgo(80).toISOString(),
          firstSentAt: new Date("2026-11-04T09:15:00.000Z").toISOString(),
          secondSentAt: null,
          stopReason: null,
        },
      }),
    });
    expect(tooSoon).toEqual({ action: "skip", reason: "second_not_due" });

    const due = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: NOW }),
      user: user({ registeredAt: daysAgo(80) }),
      history: history({
        sequence: {
          userId: "user-1",
          status: "active",
          cohort: "historical",
          registeredAt: daysAgo(80).toISOString(),
          firstSentAt: new Date("2026-11-02T09:15:00.000Z").toISOString(),
          secondSentAt: null,
          stopReason: null,
        },
      }),
    });
    expect(due).toMatchObject({ action: "send", stage: "second", templateStage: "day_10" });
  });

  it("does not send the second reminder until Day 10 copy is approved", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ day10Approved: false, organicAfter: daysAgo(20) }),
      user: user({ registeredAt: daysAgo(10) }),
      history: history({
        sequence: {
          userId: "user-1",
          status: "active",
          cohort: "organic",
          registeredAt: daysAgo(10).toISOString(),
          firstSentAt: daysAgo(5).toISOString(),
          secondSentAt: null,
          stopReason: null,
        },
      }),
    });
    expect(decision).toEqual({ action: "skip", reason: "day10_not_approved" });
  });

  it("excludes the internal info address and extra configured internal emails", () => {
    expect(
      decideReminderAction({
        now: NOW,
        config: sendingConfig({ organicAfter: NOW }),
        user: user({ email: "info@staywithmypet.ee", registeredAt: daysAgo(80) }),
        history: history(),
      }),
    ).toEqual({ action: "skip", reason: "internal_address" });

    expect(
      decideReminderAction({
        now: NOW,
        config: sendingConfig({
          organicAfter: NOW,
          excludedEmails: parseExcludedReminderEmails({
            PROFILE_COMPLETION_REMINDER_EXCLUDE_EMAILS: "ops@staywithmypet.ee",
          }),
        }),
        user: user({ email: "OPS@staywithmypet.ee", registeredAt: daysAgo(80) }),
        history: history(),
      }),
    ).toEqual({ action: "skip", reason: "internal_address" });

    expect(parseExcludedReminderEmails({})).toEqual(["info@staywithmypet.ee"]);
  });

  it("skips unknown roles and reports them separately", () => {
    expect(knownEmailRole(null, null)).toBeNull();
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig(),
      user: user({ role: null, emailRole: null }),
      history: history(),
    });
    expect(decision).toEqual({ action: "skip", reason: "unknown_role" });
  });

  it("uses saved language preference and English as the documented default", () => {
    expect(resolveReminderLocale("et")).toBe("et");
    expect(resolveReminderLocale(null)).toBe("en");
  });

  it("preserves an existing Estonian locale before English fallback", () => {
    expect(reminderLocaleFromMetadata({ swmp_locale: "et", locale: "en" })).toBe("et");
    expect(resolveReminderLocale(reminderLocaleFromMetadata({ swmp_locale: "et" }))).toBe("et");
  });

  it("normalizes uppercase locale values without inferring from email or name", () => {
    expect(reminderLocaleFromMetadata({ swmp_locale: "ET" })).toBe("et");
    expect(reminderLocaleFromMetadata({ swmp_locale: "ET-EE" })).toBe("et");
    expect(reminderLocaleFromMetadata({ locale: "EN-GB" })).toBe("en");
    expect(reminderLocaleFromMetadata({ swmp_locale: "et_EE" })).toBe("et");
    expect(
      reminderLocaleFromMetadata({
        email: "gerly@something.ee",
        name: "Gerly Kullamaa",
        nationality: "EE",
      }),
    ).toBeNull();
    expect(resolveReminderLocale(null)).toBe("en");
  });

  it("does not send Day 10 when Day 5 outcome is unknown", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: daysAgo(20) }),
      user: user({ registeredAt: daysAgo(10) }),
      history: history({
        first: {
          userId: "user-1",
          stage: "first",
          uniqueKey: "profile_completion_reminder_first_user-1",
          status: "outcome_unknown",
          skipReason: null,
          claimedAt: daysAgo(5).toISOString(),
          sentAt: null,
          attemptCount: 1,
        },
      }),
    });
    expect(decision).toEqual({ action: "skip", reason: "outcome_unknown" });
  });

  it("does not send Day 10 while Day 5 is still sending", () => {
    const decision = decideReminderAction({
      now: NOW,
      config: sendingConfig({ organicAfter: daysAgo(20) }),
      user: user({ registeredAt: daysAgo(10) }),
      history: history({
        sequence: {
          userId: "user-1",
          status: "active",
          cohort: "organic",
          registeredAt: daysAgo(10).toISOString(),
          firstSentAt: daysAgo(5).toISOString(),
          secondSentAt: null,
          stopReason: null,
        },
        first: {
          userId: "user-1",
          stage: "first",
          uniqueKey: "profile_completion_reminder_first_user-1",
          status: "sending",
          skipReason: null,
          claimedAt: daysAgo(5).toISOString(),
          sentAt: null,
          attemptCount: 1,
        },
      }),
    });
    expect(decision).toEqual({ action: "skip", reason: "unresolved_delivery" });
  });

  it("uses a verified first name and never infers one from the email", () => {
    expect(
      reminderFirstName({
        email: "mariekolosova@gmail.com",
        profileName: "mariekolosova",
        metadataName: "mariekolosova@gmail.com",
      }),
    ).toBeNull();
    expect(
      reminderFirstName({
        email: "alex@example.com",
        profileName: "Alex Example",
        givenName: "Alex",
      }),
    ).toBe("Alex");
    expect(reminderGreeting("et", null)).toBe("Tere!");
    expect(reminderGreeting("en", null)).toBe("Hi there!");
    expect(reminderGreeting("et", "Gerly")).toBe("Tere, Gerly!");
    expect(reminderGreeting("en", "Alex")).toBe("Hi Alex!");
  });

  it("counts 60+ incomplete users in a historical dry run without duplicates", () => {
    const report = summarizeReminderAudience({
      now: NOW,
      users: [
        user({ userId: "a", registeredAt: daysAgo(70), email: "a@example.com" }),
        user({ userId: "a", registeredAt: daysAgo(70), email: "a@example.com" }),
        user({
          userId: "b",
          registeredAt: daysAgo(70),
          email: "b@example.com",
          role: "pet_friend",
          emailRole: "pet_friend",
          locale: "et",
        }),
      ],
      historyByUser: new Map(),
      config: sendingConfig({ organicAfter: NOW }),
    });
    expect(report.incomplete60PlusDays).toBe(3);
    expect(report.eligibleIfHistoricalApproved).toHaveLength(2);
    expect(report.eligibleIfHistoricalApproved.map((row) => row.userId).sort()).toEqual(["a", "b"]);
  });

  it("matches production onboarding and ignores dashboard extras", () => {
    const finished = {
      display_name: "Gerly Kullamaa",
      bio: "I love pets",
      location: "Tallinn",
      languages: ["et"],
      role_chosen_at: "2026-01-15T10:00:00.000Z",
    };
    expect(isCanonicalProfileComplete(finished, "gerly.kullamaa@gmail.com")).toBe(true);
    expect(
      isCanonicalProfileComplete(
        { ...finished, display_name: "Alex", bio: "", location: "", languages: [] },
        "alex@example.com",
      ),
    ).toBe(false);
    expect(utcCalendarDaysSince(daysAgo(5), NOW)).toBe(5);
  });

  it("excludes finished onboarding even when pet photo, listing, or availability is missing", () => {
    const photo = buildReminderUserSnapshot({
      userId: "gerly",
      email: "gerly.kullamaa@gmail.com",
      createdAt: daysAgo(80).toISOString(),
      banned: false,
      metadata: { swmp_locale: "en" },
      profile: finishedOnboardingProfile(),
    });
    const listing = buildReminderUserSnapshot({
      userId: "turedi",
      email: "a.k.turedi@gmail.com",
      createdAt: daysAgo(80).toISOString(),
      banned: false,
      metadata: {},
      profile: finishedOnboardingProfile({
        display_name: "Ali Turedi",
        role: "pet_parent",
      }),
    });
    const availability = buildReminderUserSnapshot({
      userId: "friend",
      email: "jheintz177@gmail.com",
      createdAt: daysAgo(80).toISOString(),
      banned: false,
      metadata: {},
      profile: finishedOnboardingProfile({
        display_name: "Jan Heintz",
        role: "pet_friend",
        active_mode: "pet_friend",
      }),
    });
    expect(photo.profileComplete).toBe(true);
    expect(listing.profileComplete).toBe(true);
    expect(availability.profileComplete).toBe(true);
    expect(
      decideReminderAction({
        now: NOW,
        config: sendingConfig({ organicAfter: NOW }),
        user: photo,
        history: history(),
      }),
    ).toEqual({ action: "stop", reason: "profile_complete" });
    expect(
      decideReminderAction({
        now: NOW,
        config: sendingConfig({ organicAfter: NOW }),
        user: listing,
        history: history(),
      }),
    ).toEqual({ action: "stop", reason: "profile_complete" });
    expect(
      decideReminderAction({
        now: NOW,
        config: sendingConfig({ organicAfter: NOW }),
        user: availability,
        history: history(),
      }),
    ).toEqual({ action: "stop", reason: "profile_complete" });
  });

  it("sends to incomplete onboarding users who already chose a role", () => {
    const snapshot = buildReminderUserSnapshot({
      userId: "setup",
      email: "parent@example.com",
      createdAt: daysAgo(12).toISOString(),
      banned: false,
      metadata: { swmp_locale: "et" },
      profile: {
        display_name: "parent",
        bio: null,
        location: null,
        languages: [],
        role: "pet_parent",
        active_mode: "pet_parent",
        role_chosen_at: "2026-10-01T00:00:00.000Z",
        created_at: daysAgo(12).toISOString(),
      },
    });
    expect(snapshot.rolePending).toBe(false);
    expect(snapshot.profileComplete).toBe(false);
    expect(snapshot.emailRole).toBe("pet_parent");
    expect(snapshot.locale).toBe("et");
    expect(
      decideReminderAction({
        now: NOW,
        config: sendingConfig({ organicAfter: NOW }),
        user: snapshot,
        history: history(),
      }),
    ).toMatchObject({ action: "send", stage: "first", templateStage: "day_5", cohort: "historical" });
  });

  it("excludes users with no chosen role from role-specific emails", () => {
    const snapshot = buildReminderUserSnapshot({
      userId: "pending",
      email: "pending@example.com",
      createdAt: daysAgo(20).toISOString(),
      banned: false,
      metadata: {},
      profile: {
        display_name: "Pending User",
        bio: "Hello there",
        location: "Tallinn",
        languages: ["en"],
        role: "pet_parent",
        active_mode: "pet_parent",
        role_chosen_at: null,
        created_at: daysAgo(20).toISOString(),
      },
    });
    expect(snapshot.rolePending).toBe(true);
    expect(snapshot.emailRole).toBeNull();
    expect(snapshot.profileComplete).toBe(false);
    expect(
      decideReminderAction({
        now: NOW,
        config: sendingConfig(),
        user: snapshot,
        history: history(),
      }),
    ).toEqual({ action: "skip", reason: "unknown_role" });
  });
});
