import {
  PROFILE_REMINDER_PILOT_USER_IDS,
  approvedPilotUserIds,
  isExcludedReminderEmail,
  readProfileReminderConfig,
} from "./config";
import { ageBucket, decideReminderAction, reminderCohort, utcCalendarDaysSince } from "./eligibility";
import { reminderFirstName } from "./first-name";
import { loadReminderAudience } from "./load-audience";
import { resolveReminderLocale } from "./locale";
import { loadReminderHistory } from "./store";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  HistoricalEligibilityReport,
  ReminderConfig,
  ReminderHistory,
  ReminderRecipientPreview,
  ReminderUserSnapshot,
  RoleLanguageCount,
} from "./types";

function emptyHistory(): ReminderHistory {
  return { sequence: null, first: null, second: null };
}

export function summarizeReminderAudience(input: {
  now: Date;
  users: ReminderUserSnapshot[];
  historyByUser: Map<string, ReminderHistory>;
  config?: ReminderConfig;
}): HistoricalEligibilityReport {
  const config =
    input.config ??
    ({
      enabled: true,
      dryRun: true,
      historicalRolloutApproved: true,
      day10Approved: false,
      organicAfter: null,
      dailyCap: 50,
      excludedEmails: ["info@staywithmypet.ee"],
      pilotOnly: false,
      pilotUserIds: [],
    } satisfies ReminderConfig);
  const organicConfig: ReminderConfig = {
    ...config,
    historicalRolloutApproved: false,
    organicAfter: config.organicAfter,
  };

  let completedProfiles = 0;
  let incompleteProfiles = 0;
  let petParentIncomplete = 0;
  let petFriendIncomplete = 0;
  let registered5to9Days = 0;
  let registered10to19Days = 0;
  let registered20to39Days = 0;
  let registered40to59Days = 0;
  let registered60PlusDays = 0;
  let incomplete60PlusDays = 0;
  let unknownRole = 0;
  let suppressedIneligible = 0;
  let excludedInternalAddresses = 0;
  let alreadyReminded = 0;
  const unknownRoleUsers: HistoricalEligibilityReport["unknownRoleUsers"] = [];
  const eligibleIfHistoricalApproved: ReminderRecipientPreview[] = [];
  const eligibleOrganicNow: ReminderRecipientPreview[] = [];
  const languageRole = new Map<string, RoleLanguageCount>();

  const seenEligible = new Set<string>();

  for (const user of input.users) {
    const days = utcCalendarDaysSince(user.registeredAt, input.now);
    const bucket = ageBucket(days);
    if (bucket === "5_9") registered5to9Days += 1;
    if (bucket === "10_19") registered10to19Days += 1;
    if (bucket === "20_39") registered20to39Days += 1;
    if (bucket === "40_59") registered40to59Days += 1;
    if (bucket === "60_plus") registered60PlusDays += 1;

    const history = input.historyByUser.get(user.userId) ?? emptyHistory();
    const reminded = Boolean(
      history.first?.status === "sent" ||
        (history.sequence?.firstSentAt &&
          history.first?.status !== "sending" &&
          history.first?.status !== "outcome_unknown"),
    );
    if (reminded) alreadyReminded += 1;

    if (user.rolePending || !user.emailRole) {
      unknownRole += 1;
      unknownRoleUsers.push({ userId: user.userId, email: user.email, role: user.role });
    }

    const locale = resolveReminderLocale(user.locale);
    const key = `${user.emailRole ?? "unknown"}:${user.locale ?? "missing"}`;
    const existing = languageRole.get(key);
    if (existing) existing.count += 1;
    else {
      languageRole.set(key, {
        role: user.emailRole ?? "unknown",
        locale: user.locale ?? "missing",
        count: 1,
      });
    }

    if (user.profileComplete) {
      completedProfiles += 1;
      continue;
    }
    incompleteProfiles += 1;
    if (bucket === "60_plus") incomplete60PlusDays += 1;
    if (user.emailRole === "pet_parent") petParentIncomplete += 1;
    if (user.emailRole === "pet_friend") petFriendIncomplete += 1;

    const internal = isExcludedReminderEmail(user.email, config.excludedEmails);
    if (internal) excludedInternalAddresses += 1;
    const ineligible =
      user.banned ||
      !user.email ||
      !user.hasAccount ||
      !user.emailRole ||
      days < 5 ||
      internal;
    if (ineligible) {
      suppressedIneligible += 1;
      continue;
    }

    const firstName = reminderFirstName({
      email: user.email,
      profileName: user.displayName,
      givenName: user.givenName,
      fullName: user.fullName,
      metadataName: user.metadataName,
    });

    const historicalDecision = decideReminderAction({
      now: input.now,
      config,
      user,
      history,
    });
    if (historicalDecision.action === "send" && historicalDecision.stage === "first" && user.email && user.emailRole) {
      const preview: ReminderRecipientPreview = {
        userId: user.userId,
        email: user.email,
        role: user.emailRole,
        locale,
        cohort: reminderCohort(user.registeredAt, config.organicAfter),
        stage: historicalDecision.stage,
        templateStage: historicalDecision.templateStage,
        daysSinceRegistration: days,
        firstName,
      };
      if (!seenEligible.has(user.userId)) {
        seenEligible.add(user.userId);
        eligibleIfHistoricalApproved.push(preview);
      }
    }

    const organicDecision = decideReminderAction({
      now: input.now,
      config: organicConfig,
      user,
      history,
    });
    if (organicDecision.action === "send" && user.email && user.emailRole) {
      eligibleOrganicNow.push({
        userId: user.userId,
        email: user.email,
        role: user.emailRole,
        locale,
        cohort: organicDecision.cohort,
        stage: organicDecision.stage,
        templateStage: organicDecision.templateStage,
        daysSinceRegistration: days,
        firstName,
      });
    }
  }

  return {
    generatedAt: input.now.toISOString(),
    totalUsers: input.users.length,
    completedProfiles,
    incompleteProfiles,
    petParentIncomplete,
    petFriendIncomplete,
    registered5to9Days,
    registered10to19Days,
    registered20to39Days,
    registered40to59Days,
    registered60PlusDays,
    incomplete60PlusDays,
    countsByLanguageAndRole: [...languageRole.values()].sort(
      (a, b) => a.role.localeCompare(b.role) || String(a.locale).localeCompare(String(b.locale)),
    ),
    unknownRole,
    suppressedIneligible,
    excludedInternalAddresses,
    alreadyReminded,
    eligibleParentEn: eligibleIfHistoricalApproved.filter(
      (row) => row.role === "pet_parent" && row.locale === "en",
    ).length,
    eligibleParentEt: eligibleIfHistoricalApproved.filter(
      (row) => row.role === "pet_parent" && row.locale === "et",
    ).length,
    eligibleFriendEn: eligibleIfHistoricalApproved.filter(
      (row) => row.role === "pet_friend" && row.locale === "en",
    ).length,
    eligibleFriendEt: eligibleIfHistoricalApproved.filter(
      (row) => row.role === "pet_friend" && row.locale === "et",
    ).length,
    eligibleIfHistoricalApproved,
    eligiblePilot: eligibleIfHistoricalApproved.filter((row) =>
      approvedPilotUserIds(PROFILE_REMINDER_PILOT_USER_IDS).includes(row.userId.toLowerCase()),
    ),
    eligibleOrganicNow,
    unknownRoleUsers,
  };
}

export async function buildHistoricalEligibilityReport(now = new Date()): Promise<HistoricalEligibilityReport> {
  const users = await loadReminderAudience();
  const admin = createAdminClient();
  let historyByUser = new Map<string, ReminderHistory>();
  if (admin) {
    const history = await loadReminderHistory(
      admin,
      users.map((user) => user.userId),
    );
    if (history.ok) historyByUser = history.byUser;
  }
  return summarizeReminderAudience({
    now,
    users,
    historyByUser,
    config: {
      ...readProfileReminderConfig(),
      enabled: true,
      dryRun: true,
      historicalRolloutApproved: true,
      day10Approved: false,
      pilotOnly: false,
      pilotUserIds: [],
    },
  });
}
