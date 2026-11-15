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
import { listingCampaignCtaPath, listingCampaignUniqueKey, readListingCampaignConfig } from "./config";
import { decideListingCampaignAction } from "./eligibility";
import { loadListingCampaignAudience, recheckListingComplete } from "./load-audience";
import { sendListingCampaignSmtp } from "./send";
import {
  claimListingCampaignSend,
  countListingCampaignSentOnUtcDay,
  loadListingCampaignEvents,
  markListingCampaignFailedBeforeAcceptance,
  markListingCampaignOutcomeUnknown,
  markListingCampaignSent,
  markListingCampaignSkippedComplete,
  type ListingWriteResult,
} from "./store";
import { buildListingProfileCompletionEmail } from "./templates";
import type {
  ListingCampaignConfig,
  ListingCampaignEventState,
  ListingCampaignPreview,
  ListingCampaignUser,
} from "./types";

export type ProcessListingCampaignResult = {
  ok: true;
  campaignId: string;
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
  stoppedOnFailure: boolean;
  stopReason: string | null;
  preview: ListingCampaignPreview[];
};

export type ListingCampaignProcessorDeps = {
  loadAudience: () => Promise<ListingCampaignUser[]>;
  loadEvents: (
    userIds: string[],
  ) => Promise<
    { ok: true; byUser: Map<string, ListingCampaignEventState | null> } | { ok: false; reason: "missing_table" }
  >;
  sentToday: () => Promise<number>;
  claim: (input: {
    userId: string;
    locale: "en" | "et";
    emailRole: "pet_parent" | "pet_friend";
    cohort: "organic" | "historical";
    now: Date;
  }) => Promise<"claimed" | "duplicate" | "missing_table">;
  markSent: (
    userId: string,
    now: Date,
    smtp?: ReminderSmtpAcceptedMeta | null,
  ) => Promise<ListingWriteResult>;
  markFailedBeforeAcceptance: (userId: string, error: string, now: Date) => Promise<ListingWriteResult>;
  markOutcomeUnknown: (userId: string, error: string, now: Date) => Promise<ListingWriteResult>;
  markComplete: (userId: string, now: Date) => Promise<ListingWriteResult>;
  recheckComplete: (user: ListingCampaignUser) => Promise<boolean>;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    uniqueKey: string;
  }) => Promise<ReminderSmtpOutcome>;
};

export function createProductionListingCampaignDeps(now: Date): ListingCampaignProcessorDeps | null {
  const admin = createAdminClient();
  if (!admin) return null;
  return {
    loadAudience: loadListingCampaignAudience,
    loadEvents: (userIds) => loadListingCampaignEvents(admin, userIds),
    sentToday: () => countListingCampaignSentOnUtcDay(admin, now),
    claim: (input) => claimListingCampaignSend({ admin, ...input }),
    markSent: (userId, at, smtp) => markListingCampaignSent({ admin, userId, now: at, smtp }),
    markFailedBeforeAcceptance: (userId, error, at) =>
      markListingCampaignFailedBeforeAcceptance({ admin, userId, error, now: at }),
    markOutcomeUnknown: (userId, error, at) =>
      markListingCampaignOutcomeUnknown({ admin, userId, error, now: at }),
    markComplete: (userId, at) => markListingCampaignSkippedComplete({ admin, userId, now: at }),
    recheckComplete: (user) => recheckListingComplete(admin, user),
    send: sendListingCampaignSmtp,
  };
}

export async function processListingProfileCompletion(input?: {
  now?: Date;
  config?: ListingCampaignConfig;
  deps?: ListingCampaignProcessorDeps;
}): Promise<ProcessListingCampaignResult> {
  const now = input?.now ?? new Date();
  const config = input?.config ?? readListingCampaignConfig();
  const preview: ListingCampaignPreview[] = [];
  const result: ProcessListingCampaignResult = {
    ok: true,
    campaignId: config.campaignId,
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
    stoppedOnFailure: false,
    stopReason: null,
    preview,
  };

  if (!config.enabled) {
    return { ...result, disabled: true };
  }

  const deps = input?.deps ?? createProductionListingCampaignDeps(now);
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
    if (user.rolePending || !user.emailRole) result.unknownRole += 1;
    const event = eventsResult.byUser.get(user.userId) ?? null;
    const decision = decideListingCampaignAction({ now, config, user, event });
    if (decision.action === "stop") {
      result.stoppedComplete += 1;
      continue;
    }
    if (decision.action !== "send" || !user.email || !user.emailRole) {
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
      role: decision.emailRole,
      locale,
      cohort: decision.cohort,
      daysSinceRegistration: utcCalendarDaysSince(user.registeredAt, now),
      firstName,
      petCount: user.petCount,
      ctaPath: listingCampaignCtaPath(decision.emailRole, user.petCount),
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
      emailRole: decision.emailRole,
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

    let completeOnRecheck = false;
    try {
      completeOnRecheck = await deps.recheckComplete(user);
    } catch {
      await deps.markOutcomeUnknown(user.userId, "eligibility_recheck_failed", now);
      result.outcomeUnknown += 1;
      result.stoppedOnFailure = true;
      result.stopReason = "eligibility_recheck_failed";
      break;
    }
    if (completeOnRecheck) {
      await deps.markComplete(user.userId, now);
      result.stoppedComplete += 1;
      continue;
    }

    const template = buildListingProfileCompletionEmail({
      role: decision.emailRole,
      locale,
      firstName,
      petCount: user.petCount,
    });
    const uniqueKey = listingCampaignUniqueKey(user.userId, config.campaignId);
    const sent = await deps.send({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      uniqueKey,
    });
    result.processed += 1;
    if (sent.outcome === "accepted") {
      const recorded = await deps.markSent(user.userId, now, {
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
        recorded.error ?? "smtp_accepted_database_update_failed",
        now,
      );
      result.outcomeUnknown += 1;
      result.stoppedOnFailure = true;
      result.stopReason = "database_update_failed_after_smtp_accept";
      break;
    }
    if (sent.outcome === "failed_before_acceptance") {
      await deps.markFailedBeforeAcceptance(user.userId, sent.error ?? sent.reason, now);
      result.failed += 1;
      result.failedBeforeAcceptance += 1;
      if (reminderSendShouldAbortBatch(sent)) {
        result.stoppedOnFailure = true;
        result.stopReason = sent.reason;
        break;
      }
      continue;
    }
    await deps.markOutcomeUnknown(user.userId, sent.error ?? "smtp_outcome_unknown", now);
    result.outcomeUnknown += 1;
    result.stoppedOnFailure = true;
    result.stopReason = "smtp_outcome_unknown";
    break;
  }

  return result;
}
