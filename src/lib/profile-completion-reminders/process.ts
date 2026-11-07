import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isReminderPilotSendAllowed,
  readProfileReminderConfig,
  reminderUniqueKey,
} from "./config";
import { decideReminderAction, utcCalendarDaysSince } from "./eligibility";
import { reminderFirstName } from "./first-name";
import { loadReminderAudience } from "./load-audience";
import { resolveReminderLocale } from "./locale";
import { sendProfileReminderSmtp } from "./send";
import type { ReminderSmtpOutcome } from "./smtp-outcome";
import {
  claimReminderSend,
  countRemindersSentOnUtcDay,
  loadReminderHistory,
  markReminderFailedBeforeAcceptance,
  markReminderOutcomeUnknown,
  markReminderSent,
  markReminderSkippedComplete,
  type ReminderWriteResult,
} from "./store";
import { buildProfileCompletionReminderEmail } from "./templates";
import type {
  ReminderConfig,
  ReminderHistory,
  ReminderRecipientPreview,
  ReminderUserSnapshot,
} from "./types";

export type ProcessRemindersResult = {
  ok: true;
  disabled?: boolean;
  dryRun: boolean;
  migrationRequired?: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  failedBeforeAcceptance: number;
  outcomeUnknown: number;
  stoppedComplete: number;
  capped: number;
  unknownRole: number;
  preview: ReminderRecipientPreview[];
};

export type ReminderProcessorDeps = {
  loadAudience: () => Promise<ReminderUserSnapshot[]>;
  loadHistory: (userIds: string[]) => Promise<
    { ok: true; byUser: Map<string, ReminderHistory> } | { ok: false; reason: "missing_table" }
  >;
  sentToday: () => Promise<number>;
  claim: (input: {
    userId: string;
    stage: "first" | "second";
    cohort: "organic" | "historical";
    registeredAt: Date;
    locale: "en" | "et";
    emailRole: "pet_parent" | "pet_friend";
    now: Date;
  }) => Promise<"claimed" | "duplicate" | "missing_table">;
  markSent: (userId: string, stage: "first" | "second", now: Date) => Promise<ReminderWriteResult>;
  markFailedBeforeAcceptance: (
    userId: string,
    stage: "first" | "second",
    error: string,
    now: Date,
  ) => Promise<ReminderWriteResult>;
  markOutcomeUnknown: (
    userId: string,
    stage: "first" | "second",
    error: string,
    now: Date,
  ) => Promise<ReminderWriteResult>;
  markComplete: (userId: string, stage: "first" | "second", now: Date) => Promise<ReminderWriteResult>;
  recheckComplete: (user: ReminderUserSnapshot) => Promise<boolean>;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    uniqueKey: string;
  }) => Promise<ReminderSmtpOutcome>;
};

function emptyHistory(): ReminderHistory {
  return { sequence: null, first: null, second: null };
}

export function createProductionReminderDeps(now: Date): ReminderProcessorDeps | null {
  const admin = createAdminClient();
  if (!admin) return null;
  return {
    loadAudience: loadReminderAudience,
    loadHistory: (userIds) => loadReminderHistory(admin, userIds),
    sentToday: () => countRemindersSentOnUtcDay(admin, now),
    claim: (input) => claimReminderSend({ admin, ...input }),
    markSent: (userId, stage, at) => markReminderSent({ admin, userId, stage, now: at }),
    markFailedBeforeAcceptance: (userId, stage, error, at) =>
      markReminderFailedBeforeAcceptance({ admin, userId, stage, error, now: at }),
    markOutcomeUnknown: (userId, stage, error, at) =>
      markReminderOutcomeUnknown({ admin, userId, stage, error, now: at }),
    markComplete: (userId, stage, at) => markReminderSkippedComplete({ admin, userId, stage, now: at }),
    recheckComplete: async (user) => user.profileComplete,
    send: sendProfileReminderSmtp,
  };
}

export async function processProfileCompletionReminders(input?: {
  now?: Date;
  config?: ReminderConfig;
  deps?: ReminderProcessorDeps;
}): Promise<ProcessRemindersResult> {
  const now = input?.now ?? new Date();
  const config = input?.config ?? readProfileReminderConfig();
  const preview: ReminderRecipientPreview[] = [];
  const result: ProcessRemindersResult = {
    ok: true,
    dryRun: config.dryRun,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    failedBeforeAcceptance: 0,
    outcomeUnknown: 0,
    stoppedComplete: 0,
    capped: 0,
    unknownRole: 0,
    preview,
  };

  if (!config.enabled) {
    return { ...result, disabled: true };
  }

  const deps = input?.deps ?? createProductionReminderDeps(now);
  if (!deps) {
    return { ...result, skipped: 1 };
  }

  const audience = await deps.loadAudience();
  const historyResult = await deps.loadHistory(audience.map((user) => user.userId));
  if (!historyResult.ok) {
    return { ...result, migrationRequired: true };
  }

  let sentToday = await deps.sentToday();

  for (const user of audience) {
    if (user.rolePending || !user.emailRole) result.unknownRole += 1;
    const history = historyResult.byUser.get(user.userId) ?? emptyHistory();
    const decision = decideReminderAction({ now, config, user, history });
    if (decision.action === "stop") {
      result.stoppedComplete += 1;
      continue;
    }
    if (decision.action !== "send" || !user.email || !user.emailRole) {
      result.skipped += 1;
      continue;
    }
    if (!isReminderPilotSendAllowed(user.userId, config)) {
      result.skipped += 1;
      continue;
    }

    const locale = resolveReminderLocale(user.locale);
    const firstName = reminderFirstName({
      email: user.email,
      profileName: user.displayName,
      givenName: user.givenName,
      fullName: user.fullName,
      metadataName: user.metadataName,
    });
    preview.push({
      userId: user.userId,
      email: user.email,
      role: user.emailRole,
      locale,
      cohort: decision.cohort,
      stage: decision.stage,
      templateStage: decision.templateStage,
      daysSinceRegistration: utcCalendarDaysSince(user.registeredAt, now),
      firstName,
    });

    if (config.dryRun) {
      result.processed += 1;
      continue;
    }
    if (sentToday >= config.dailyCap) {
      result.capped += 1;
      continue;
    }

    const claimed = await deps.claim({
      userId: user.userId,
      stage: decision.stage,
      cohort: decision.cohort,
      registeredAt: user.registeredAt,
      locale,
      emailRole: user.emailRole,
      now,
    });
    if (claimed === "missing_table") {
      return { ...result, migrationRequired: true };
    }
    if (claimed !== "claimed") {
      result.skipped += 1;
      continue;
    }

    if (await deps.recheckComplete(user)) {
      await deps.markComplete(user.userId, decision.stage, now);
      result.stoppedComplete += 1;
      continue;
    }

    const template = buildProfileCompletionReminderEmail({
      stage: decision.templateStage,
      role: user.emailRole,
      locale,
      firstName,
    });
    const sent = await deps.send({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      uniqueKey: reminderUniqueKey(user.userId, decision.stage),
    });
    result.processed += 1;
    if (sent.outcome === "accepted") {
      const recorded = await deps.markSent(user.userId, decision.stage, now);
      if (recorded.ok) {
        sentToday += 1;
        result.sent += 1;
        continue;
      }
      await deps.markOutcomeUnknown(
        user.userId,
        decision.stage,
        recorded.error ?? "smtp_accepted_database_update_failed",
        now,
      );
      result.outcomeUnknown += 1;
      continue;
    }
    if (sent.outcome === "failed_before_acceptance") {
      await deps.markFailedBeforeAcceptance(
        user.userId,
        decision.stage,
        sent.error ?? sent.reason,
        now,
      );
      result.failed += 1;
      result.failedBeforeAcceptance += 1;
      continue;
    }
    await deps.markOutcomeUnknown(user.userId, decision.stage, sent.error ?? "smtp_outcome_unknown", now);
    result.outcomeUnknown += 1;
  }

  return result;
}
