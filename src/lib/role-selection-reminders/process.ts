import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { utcCalendarDaysSince } from "@/lib/profile-completion-reminders/eligibility";
import { reminderFirstName } from "@/lib/profile-completion-reminders/first-name";
import { resolveReminderLocale } from "@/lib/profile-completion-reminders/locale";
import {
  reminderSendShouldAbortBatch,
  type ReminderSmtpAcceptedMeta,
  type ReminderSmtpOutcome,
} from "@/lib/profile-completion-reminders/smtp-outcome";
import {
  ROLE_SELECTION_CTA_PATH,
  roleSelectionUniqueKey,
  readRoleSelectionCampaignConfig,
} from "./config";
import { decideRoleSelectionAction } from "./eligibility";
import { loadRoleSelectionAudience, recheckRoleSelected } from "./load-audience";
import { sendRoleSelectionReminderSmtp } from "./send";
import {
  claimRoleSelectionSend,
  countRoleSelectionSentOnUtcDay,
  loadRoleSelectionEvents,
  markRoleSelectionFailedBeforeAcceptance,
  markRoleSelectionOutcomeUnknown,
  markRoleSelectionSent,
  markRoleSelectionSkippedSelected,
  type RoleSelectionWriteResult,
} from "./store";
import { buildRoleSelectionReminder1Email } from "./templates";
import type {
  RoleSelectionCampaignConfig,
  RoleSelectionCohort,
  RoleSelectionEventState,
  RoleSelectionPreview,
  RoleSelectionStage,
  RoleSelectionUser,
} from "./types";

export type ProcessRoleSelectionResult = {
  ok: true;
  campaignId: string;
  disabled?: boolean;
  dryRun: boolean;
  stage2Approved: boolean;
  migrationRequired?: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  failedBeforeAcceptance: number;
  outcomeUnknown: number;
  stoppedComplete: number;
  capped: number;
  stoppedOnFailure: boolean;
  stopReason: string | null;
  preview: RoleSelectionPreview[];
};

export type RoleSelectionProcessorDeps = {
  loadAudience: () => Promise<RoleSelectionUser[]>;
  loadEvents: (
    userIds: string[],
  ) => Promise<
    { ok: true; byUser: Map<string, RoleSelectionEventState[]> } | { ok: false; reason: "missing_table" }
  >;
  sentToday: () => Promise<number>;
  claim: (input: {
    userId: string;
    locale: "en" | "et";
    stage: RoleSelectionStage;
    cohort: RoleSelectionCohort;
    now: Date;
  }) => Promise<"claimed" | "duplicate" | "missing_table">;
  markSent: (
    userId: string,
    stage: RoleSelectionStage,
    now: Date,
    smtp?: ReminderSmtpAcceptedMeta | null,
  ) => Promise<RoleSelectionWriteResult>;
  markFailedBeforeAcceptance: (
    userId: string,
    stage: RoleSelectionStage,
    error: string,
    now: Date,
  ) => Promise<RoleSelectionWriteResult>;
  markOutcomeUnknown: (
    userId: string,
    stage: RoleSelectionStage,
    error: string,
    now: Date,
  ) => Promise<RoleSelectionWriteResult>;
  markSelected: (userId: string, stage: RoleSelectionStage, now: Date) => Promise<RoleSelectionWriteResult>;
  recheckSelected: (userId: string) => Promise<boolean>;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    uniqueKey: string;
  }) => Promise<ReminderSmtpOutcome>;
};

export function createProductionRoleSelectionDeps(now: Date): RoleSelectionProcessorDeps | null {
  const admin = createAdminClient();
  if (!admin) return null;
  return {
    loadAudience: loadRoleSelectionAudience,
    loadEvents: (userIds) => loadRoleSelectionEvents(admin, userIds),
    sentToday: () => countRoleSelectionSentOnUtcDay(admin, now),
    claim: (input) => claimRoleSelectionSend({ admin, ...input }),
    markSent: (userId, stage, at, smtp) => markRoleSelectionSent({ admin, userId, stage, now: at, smtp }),
    markFailedBeforeAcceptance: (userId, stage, error, at) =>
      markRoleSelectionFailedBeforeAcceptance({ admin, userId, stage, error, now: at }),
    markOutcomeUnknown: (userId, stage, error, at) =>
      markRoleSelectionOutcomeUnknown({ admin, userId, stage, error, now: at }),
    markSelected: (userId, stage, at) =>
      markRoleSelectionSkippedSelected({ admin, userId, stage, now: at }),
    recheckSelected: (userId) => recheckRoleSelected(admin, userId),
    send: sendRoleSelectionReminderSmtp,
  };
}

export async function processRoleSelectionReminders(input?: {
  now?: Date;
  config?: RoleSelectionCampaignConfig;
  deps?: RoleSelectionProcessorDeps;
}): Promise<ProcessRoleSelectionResult> {
  const now = input?.now ?? new Date();
  const config = input?.config ?? readRoleSelectionCampaignConfig();
  const preview: RoleSelectionPreview[] = [];
  const result: ProcessRoleSelectionResult = {
    ok: true,
    campaignId: config.campaignId,
    dryRun: config.dryRun,
    stage2Approved: config.stage2Approved,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    failedBeforeAcceptance: 0,
    outcomeUnknown: 0,
    stoppedComplete: 0,
    capped: 0,
    stoppedOnFailure: false,
    stopReason: null,
    preview,
  };

  if (!config.enabled) {
    return { ...result, disabled: true };
  }

  const deps = input?.deps ?? createProductionRoleSelectionDeps(now);
  if (!deps) {
    return { ...result, skipped: 1 };
  }

  const audience = await deps.loadAudience();
  const eventsResult = await deps.loadEvents(audience.map((user) => user.userId));
  if (!eventsResult.ok) {
    return { ...result, migrationRequired: true };
  }

  let sentToday = await deps.sentToday();

  for (const user of audience) {
    const events = eventsResult.byUser.get(user.userId) ?? [];
    const decision = decideRoleSelectionAction({ now, config, user, events });
    if (decision.action === "stop") {
      result.stoppedComplete += 1;
      continue;
    }
    if (decision.action !== "send" || !user.email) {
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
      locale,
      cohort: decision.cohort,
      stage: decision.stage,
      daysSinceRegistration: utcCalendarDaysSince(user.registeredAt, now),
      firstName,
      ctaPath: ROLE_SELECTION_CTA_PATH,
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
      locale,
      stage: decision.stage,
      cohort: decision.cohort,
      now,
    });
    if (claimed === "missing_table") {
      return { ...result, migrationRequired: true };
    }
    if (claimed !== "claimed") {
      result.skipped += 1;
      continue;
    }

    let selectedOnRecheck = false;
    try {
      selectedOnRecheck = await deps.recheckSelected(user.userId);
    } catch {
      await deps.markOutcomeUnknown(user.userId, decision.stage, "eligibility_recheck_failed", now);
      result.outcomeUnknown += 1;
      result.stoppedOnFailure = true;
      result.stopReason = "eligibility_recheck_failed";
      break;
    }
    if (selectedOnRecheck) {
      await deps.markSelected(user.userId, decision.stage, now);
      result.stoppedComplete += 1;
      continue;
    }

    const template = buildRoleSelectionReminder1Email(locale);
    const uniqueKey = roleSelectionUniqueKey(user.userId, decision.stage, config.campaignId);
    const sent = await deps.send({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      uniqueKey,
    });
    result.processed += 1;
    if (sent.outcome === "accepted") {
      const recorded = await deps.markSent(user.userId, decision.stage, now, {
        messageId: sent.messageId ?? null,
        response: sent.response ?? null,
        acceptedCount: sent.acceptedCount ?? 0,
        rejectedCount: sent.rejectedCount ?? 0,
      });
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
      result.stoppedOnFailure = true;
      result.stopReason = "database_update_failed_after_smtp_accept";
      break;
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
      if (reminderSendShouldAbortBatch(sent)) {
        result.stoppedOnFailure = true;
        result.stopReason = sent.reason;
        break;
      }
      continue;
    }
    await deps.markOutcomeUnknown(user.userId, decision.stage, sent.error ?? "smtp_outcome_unknown", now);
    result.outcomeUnknown += 1;
    result.stoppedOnFailure = true;
    result.stopReason = "smtp_outcome_unknown";
    break;
  }

  return result;
}
