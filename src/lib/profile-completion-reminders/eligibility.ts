import {
  HISTORICAL_SECOND_DELAY_DAYS,
  MS_PER_DAY,
  ORGANIC_FIRST_MIN_DAYS,
  ORGANIC_SECOND_MIN_DAYS,
  isExcludedReminderEmail,
  isReminderPilotSendAllowed,
  reminderUniqueKey,
} from "./config";
import type {
  AgeBucket,
  ReminderCohort,
  ReminderConfig,
  ReminderDecision,
  ReminderEventState,
  ReminderHistory,
  ReminderUserSnapshot,
} from "./types";

export function utcCalendarDaysSince(registeredAt: Date, now: Date): number {
  const start = Date.UTC(registeredAt.getUTCFullYear(), registeredAt.getUTCMonth(), registeredAt.getUTCDate());
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((end - start) / MS_PER_DAY);
}

export function ageBucket(days: number): AgeBucket {
  if (days < 5) return "0_4";
  if (days < 10) return "5_9";
  if (days < 20) return "10_19";
  if (days < 40) return "20_39";
  if (days < 60) return "40_59";
  return "60_plus";
}

export function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function reminderCohort(registeredAt: Date, organicAfter: Date | null): ReminderCohort {
  if (!organicAfter) return "historical";
  return registeredAt.getTime() >= organicAfter.getTime() ? "organic" : "historical";
}

function deliveryUnresolved(event: ReminderEventState | null | undefined): boolean {
  return event?.status === "sending" || event?.status === "outcome_unknown";
}

function firstAlreadySent(history: ReminderHistory): boolean {
  if (deliveryUnresolved(history.first)) return false;
  return history.first?.status === "sent" || Boolean(history.sequence?.firstSentAt);
}

function secondAlreadySent(history: ReminderHistory): boolean {
  if (deliveryUnresolved(history.second)) return false;
  return history.second?.status === "sent" || Boolean(history.sequence?.secondSentAt);
}

function unresolvedSkipReason(
  status: NonNullable<ReminderHistory["first"]>["status"] | undefined,
): "outcome_unknown" | "unresolved_delivery" {
  return status === "outcome_unknown" ? "outcome_unknown" : "unresolved_delivery";
}

function sendIfAllowlisted(
  userId: string,
  config: ReminderConfig,
  decision: Extract<ReminderDecision, { action: "send" }>,
): ReminderDecision {
  if (!isReminderPilotSendAllowed(userId, config)) {
    return { action: "skip", reason: "pilot_not_allowlisted" };
  }
  return decision;
}

export function decideReminderAction(input: {
  now: Date;
  config: ReminderConfig;
  user: ReminderUserSnapshot;
  history: ReminderHistory;
}): ReminderDecision {
  const { now, config, user, history } = input;

  if (!config.enabled) return { action: "skip", reason: "disabled" };
  if (!user.hasAccount) return { action: "skip", reason: "no_account" };
  if (user.banned) return { action: "skip", reason: "banned" };
  if (!user.email?.trim()) return { action: "skip", reason: "no_email" };
  if (isExcludedReminderEmail(user.email, config.excludedEmails)) {
    return { action: "skip", reason: "internal_address" };
  }
  if (user.rolePending || !user.emailRole) return { action: "skip", reason: "unknown_role" };
  if (history.sequence?.status === "stopped_complete") {
    return { action: "skip", reason: "sequence_stopped" };
  }
  if (history.sequence?.status === "exhausted" || secondAlreadySent(history)) {
    return { action: "skip", reason: "exhausted" };
  }
  if (deliveryUnresolved(history.second)) {
    return { action: "skip", reason: unresolvedSkipReason(history.second?.status) };
  }
  if (user.profileComplete) return { action: "stop", reason: "profile_complete" };

  const days = utcCalendarDaysSince(user.registeredAt, now);
  if (days < ORGANIC_FIRST_MIN_DAYS) return { action: "skip", reason: "too_early" };

  const cohort = reminderCohort(user.registeredAt, config.organicAfter);
  const firstSent = firstAlreadySent(history);

  if (!firstSent) {
    if (deliveryUnresolved(history.first)) {
      return { action: "skip", reason: unresolvedSkipReason(history.first?.status) };
    }
    if (history.first?.status === "sent") return { action: "skip", reason: "already_sent_stage" };
    if (cohort === "historical" && !config.historicalRolloutApproved) {
      return { action: "skip", reason: "historical_rollout_blocked" };
    }
    return sendIfAllowlisted(user.userId, config, {
      action: "send",
      stage: "first",
      templateStage: "day_5",
      cohort,
    });
  }

  const firstSentAtRaw = history.sequence?.firstSentAt ?? history.first?.sentAt;
  const firstSentAt = firstSentAtRaw ? new Date(firstSentAtRaw) : null;
  if (firstSentAt && sameUtcDay(firstSentAt, now)) {
    return { action: "skip", reason: "same_day_as_first" };
  }
  if (!config.day10Approved) return { action: "skip", reason: "day10_not_approved" };

  if (cohort === "organic") {
    if (days < ORGANIC_SECOND_MIN_DAYS) return { action: "skip", reason: "second_not_due" };
    return sendIfAllowlisted(user.userId, config, {
      action: "send",
      stage: "second",
      templateStage: "day_10",
      cohort,
    });
  }

  if (!firstSentAt) return { action: "skip", reason: "second_not_due" };
  const elapsedDays = (now.getTime() - firstSentAt.getTime()) / MS_PER_DAY;
  if (elapsedDays < HISTORICAL_SECOND_DELAY_DAYS) {
    return { action: "skip", reason: "second_not_due" };
  }
  return sendIfAllowlisted(user.userId, config, {
    action: "send",
    stage: "second",
    templateStage: "day_10",
    cohort,
  });
}

export function uniqueKeyForDecision(userId: string, decision: ReminderDecision): string | null {
  if (decision.action !== "send") return null;
  return reminderUniqueKey(userId, decision.stage);
}
