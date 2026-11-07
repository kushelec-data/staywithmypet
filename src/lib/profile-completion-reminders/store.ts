import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { reminderUniqueKey } from "./config";
import type {
  ReminderCohort,
  ReminderEmailRole,
  ReminderEventState,
  ReminderHistory,
  ReminderLocale,
  ReminderSequenceState,
  ReminderStage,
} from "./types";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export type ReminderWriteResult =
  | { ok: true }
  | { ok: false; reason: "missing_table" | "update_failed"; error?: string };

export const RETRYABLE_REMINDER_EVENT_STATUS = "failed_before_acceptance" as const;

/**
 * Manual reconciliation when an event is `sending` or `outcome_unknown`.
 * Do not insert another row for the same user_id+stage. Do not send Day 10
 * until the first event is `sent` or confirmed `failed_before_acceptance`.
 */
export const REMINDER_DELIVERY_RECONCILIATION_STEPS = [
  "Find the row in profile_completion_reminder_events by unique_key (profile_completion_reminder_{first|second}_{userId}).",
  "Compare claimed_at with SpaceMail / SMTP logs for that recipient.",
  "If the provider accepted or delivered the message: UPDATE profile_completion_reminder_events SET status='sent', sent_at=<accepted_at>, last_error=null WHERE unique_key=<key> AND status IN ('sending','outcome_unknown'); then set profile_completion_reminder_sequences.first_sent_at or second_sent_at if still null (and exhausted after second).",
  "If the provider never accepted the message: UPDATE profile_completion_reminder_events SET status='failed_before_acceptance' WHERE unique_key=<key> AND status IN ('sending','outcome_unknown'); the next approved cron may retry that stage only.",
  "Leave outcome_unknown in place when logs are inconclusive. Cron will not resend and will not send the next reminder.",
] as const;

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

function writeError(error: { message?: string } | null): ReminderWriteResult {
  return { ok: false, reason: "update_failed", error: error?.message ?? "update_failed" };
}

function mapSequence(row: Record<string, unknown>): ReminderSequenceState {
  return {
    userId: String(row.user_id),
    status: row.status as ReminderSequenceState["status"],
    cohort: row.cohort as ReminderCohort,
    registeredAt: String(row.registered_at),
    firstSentAt: (row.first_sent_at as string | null) ?? null,
    secondSentAt: (row.second_sent_at as string | null) ?? null,
    stopReason: (row.stop_reason as string | null) ?? null,
  };
}

function mapEvent(row: Record<string, unknown>): ReminderEventState {
  return {
    userId: String(row.user_id),
    stage: row.stage as ReminderStage,
    uniqueKey: String(row.unique_key),
    status: row.status as ReminderEventState["status"],
    skipReason: (row.skip_reason as string | null) ?? null,
    claimedAt: (row.claimed_at as string | null) ?? null,
    sentAt: (row.sent_at as string | null) ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
  };
}

export async function loadReminderHistory(
  admin: AdminClient,
  userIds: string[],
): Promise<{ ok: true; byUser: Map<string, ReminderHistory> } | { ok: false; reason: "missing_table" }> {
  const empty = new Map<string, ReminderHistory>();
  if (userIds.length === 0) return { ok: true, byUser: empty };

  const sequenceRows: Record<string, unknown>[] = [];
  const eventRows: Record<string, unknown>[] = [];
  for (let i = 0; i < userIds.length; i += 200) {
    const chunk = userIds.slice(i, i + 200);
    const sequences = await admin
      .from("profile_completion_reminder_sequences")
      .select("user_id, status, cohort, registered_at, first_sent_at, second_sent_at, stop_reason")
      .in("user_id", chunk);
    if (sequences.error) {
      if (isPostgrestError(sequences.error) && isMissingRelationError(sequences.error)) {
        return { ok: false, reason: "missing_table" };
      }
      throw sequences.error;
    }
    sequenceRows.push(...((sequences.data ?? []) as unknown as Record<string, unknown>[]));

    const events = await admin
      .from("profile_completion_reminder_events")
      .select("user_id, stage, unique_key, status, skip_reason, claimed_at, sent_at, attempt_count")
      .in("user_id", chunk);
    if (events.error) {
      if (isPostgrestError(events.error) && isMissingRelationError(events.error)) {
        return { ok: false, reason: "missing_table" };
      }
      throw events.error;
    }
    eventRows.push(...((events.data ?? []) as unknown as Record<string, unknown>[]));
  }

  const byUser = new Map<string, ReminderHistory>();
  for (const id of userIds) {
    byUser.set(id, { sequence: null, first: null, second: null });
  }
  for (const row of sequenceRows) {
    const mapped = mapSequence(row);
    const current = byUser.get(mapped.userId) ?? { sequence: null, first: null, second: null };
    current.sequence = mapped;
    byUser.set(mapped.userId, current);
  }
  for (const row of eventRows) {
    const mapped = mapEvent(row);
    const current = byUser.get(mapped.userId) ?? { sequence: null, first: null, second: null };
    if (mapped.stage === "first") current.first = mapped;
    else current.second = mapped;
    byUser.set(mapped.userId, current);
  }
  return { ok: true, byUser };
}

export async function countRemindersSentOnUtcDay(admin: AdminClient, now: Date): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
  const { data, error } = await admin
    .from("profile_completion_reminder_events")
    .select("id")
    .eq("status", "sent")
    .gte("sent_at", start)
    .lt("sent_at", end);
  if (error) {
    if (isPostgrestError(error) && isMissingRelationError(error)) return 0;
    throw error;
  }
  return data?.length ?? 0;
}

export async function claimReminderSend(input: {
  admin: AdminClient;
  userId: string;
  stage: ReminderStage;
  cohort: ReminderCohort;
  registeredAt: Date;
  locale: ReminderLocale;
  emailRole: ReminderEmailRole;
  now: Date;
}): Promise<"claimed" | "duplicate" | "missing_table"> {
  const uniqueKey = reminderUniqueKey(input.userId, input.stage);
  const scheduledFor = input.now.toISOString();

  const sequenceInsert = await input.admin.from("profile_completion_reminder_sequences").upsert(
    {
      user_id: input.userId,
      status: "active",
      cohort: input.cohort,
      registered_at: input.registeredAt.toISOString(),
      updated_at: scheduledFor,
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (sequenceInsert.error) {
    if (isPostgrestError(sequenceInsert.error) && isMissingRelationError(sequenceInsert.error)) {
      return "missing_table";
    }
    if (!isUniqueViolation(sequenceInsert.error)) throw sequenceInsert.error;
  }

  const retryFailed = await input.admin
    .from("profile_completion_reminder_events")
    .update({
      status: "sending",
      claimed_at: scheduledFor,
      last_error: null,
      locale: input.locale,
      email_role: input.emailRole,
      updated_at: scheduledFor,
    })
    .eq("unique_key", uniqueKey)
    .eq("status", RETRYABLE_REMINDER_EVENT_STATUS)
    .select("id");

  if (retryFailed.error) {
    if (isPostgrestError(retryFailed.error) && isMissingRelationError(retryFailed.error)) {
      return "missing_table";
    }
    throw retryFailed.error;
  }
  if (Array.isArray(retryFailed.data) && retryFailed.data.length > 0) {
    const bumped = await bumpAttempt(input.admin, uniqueKey);
    if (!bumped.ok && bumped.reason === "missing_table") return "missing_table";
    return "claimed";
  }

  const inserted = await input.admin
    .from("profile_completion_reminder_events")
    .insert({
      user_id: input.userId,
      stage: input.stage,
      unique_key: uniqueKey,
      status: "sending",
      locale: input.locale,
      email_role: input.emailRole,
      scheduled_for: scheduledFor,
      claimed_at: scheduledFor,
      attempt_count: 1,
      updated_at: scheduledFor,
    })
    .select("id")
    .maybeSingle();

  if (inserted.error) {
    if (isPostgrestError(inserted.error) && isMissingRelationError(inserted.error)) {
      return "missing_table";
    }
    if (isUniqueViolation(inserted.error)) return "duplicate";
    throw inserted.error;
  }
  return inserted.data?.id ? "claimed" : "duplicate";
}

async function bumpAttempt(admin: AdminClient, uniqueKey: string): Promise<ReminderWriteResult> {
  const { data, error } = await admin
    .from("profile_completion_reminder_events")
    .select("attempt_count")
    .eq("unique_key", uniqueKey)
    .maybeSingle();
  if (error) {
    if (isPostgrestError(error) && isMissingRelationError(error)) {
      return { ok: false, reason: "missing_table" };
    }
    return writeError(error);
  }
  const next = Number(data?.attempt_count ?? 0) + 1;
  const updated = await admin
    .from("profile_completion_reminder_events")
    .update({ attempt_count: next })
    .eq("unique_key", uniqueKey)
    .select("id");
  if (updated.error) {
    if (isPostgrestError(updated.error) && isMissingRelationError(updated.error)) {
      return { ok: false, reason: "missing_table" };
    }
    return writeError(updated.error);
  }
  return { ok: true };
}

export async function markReminderSent(input: {
  admin: AdminClient;
  userId: string;
  stage: ReminderStage;
  now: Date;
}): Promise<ReminderWriteResult> {
  const uniqueKey = reminderUniqueKey(input.userId, input.stage);
  const sentAt = input.now.toISOString();
  const eventUpdate = await input.admin
    .from("profile_completion_reminder_events")
    .update({ status: "sent", sent_at: sentAt, last_error: null, updated_at: sentAt })
    .eq("unique_key", uniqueKey)
    .eq("status", "sending")
    .select("id");
  if (eventUpdate.error) {
    if (isPostgrestError(eventUpdate.error) && isMissingRelationError(eventUpdate.error)) {
      return { ok: false, reason: "missing_table" };
    }
    return writeError(eventUpdate.error);
  }
  if (!Array.isArray(eventUpdate.data) || eventUpdate.data.length === 0) {
    return { ok: false, reason: "update_failed", error: "sent_update_matched_no_sending_row" };
  }

  const patch: Record<string, unknown> = { updated_at: sentAt };
  if (input.stage === "first") {
    patch.first_sent_at = sentAt;
  } else {
    patch.second_sent_at = sentAt;
    patch.status = "exhausted";
    patch.stopped_at = sentAt;
    patch.stop_reason = "second_sent";
  }
  const sequenceUpdate = await input.admin
    .from("profile_completion_reminder_sequences")
    .update(patch)
    .eq("user_id", input.userId)
    .select("user_id");
  if (sequenceUpdate.error) {
    if (isPostgrestError(sequenceUpdate.error) && isMissingRelationError(sequenceUpdate.error)) {
      return { ok: false, reason: "missing_table" };
    }
    // Event row already records the accepted send; sequence timestamps can be reconciled later.
  }
  return { ok: true };
}

export async function markReminderFailedBeforeAcceptance(input: {
  admin: AdminClient;
  userId: string;
  stage: ReminderStage;
  error: string;
  now: Date;
}): Promise<ReminderWriteResult> {
  return updateSendingEvent(input, {
    status: "failed_before_acceptance",
    last_error: input.error.slice(0, 500),
    updated_at: input.now.toISOString(),
  });
}

export async function markReminderOutcomeUnknown(input: {
  admin: AdminClient;
  userId: string;
  stage: ReminderStage;
  error: string;
  now: Date;
}): Promise<ReminderWriteResult> {
  return updateSendingEvent(input, {
    status: "outcome_unknown",
    last_error: input.error.slice(0, 500),
    updated_at: input.now.toISOString(),
  });
}

async function updateSendingEvent(
  input: {
    admin: AdminClient;
    userId: string;
    stage: ReminderStage;
  },
  patch: Record<string, unknown>,
): Promise<ReminderWriteResult> {
  const uniqueKey = reminderUniqueKey(input.userId, input.stage);
  const updated = await input.admin
    .from("profile_completion_reminder_events")
    .update(patch)
    .eq("unique_key", uniqueKey)
    .eq("status", "sending")
    .select("id");
  if (updated.error) {
    if (isPostgrestError(updated.error) && isMissingRelationError(updated.error)) {
      return { ok: false, reason: "missing_table" };
    }
    return writeError(updated.error);
  }
  if (!Array.isArray(updated.data) || updated.data.length === 0) {
    return { ok: false, reason: "update_failed", error: "status_update_matched_no_sending_row" };
  }
  return { ok: true };
}

export async function markReminderSkippedComplete(input: {
  admin: AdminClient;
  userId: string;
  stage: ReminderStage;
  now: Date;
}): Promise<ReminderWriteResult> {
  const uniqueKey = reminderUniqueKey(input.userId, input.stage);
  const at = input.now.toISOString();
  const eventUpdate = await input.admin
    .from("profile_completion_reminder_events")
    .update({
      status: "skipped",
      skip_reason: "profile_complete",
      updated_at: at,
    })
    .eq("unique_key", uniqueKey)
    .eq("status", "sending")
    .select("id");
  if (eventUpdate.error) {
    if (isPostgrestError(eventUpdate.error) && isMissingRelationError(eventUpdate.error)) {
      return { ok: false, reason: "missing_table" };
    }
    return writeError(eventUpdate.error);
  }

  const sequenceUpdate = await input.admin
    .from("profile_completion_reminder_sequences")
    .update({
      status: "stopped_complete",
      stopped_at: at,
      stop_reason: "profile_complete",
      updated_at: at,
    })
    .eq("user_id", input.userId)
    .select("user_id");
  if (sequenceUpdate.error) {
    if (isPostgrestError(sequenceUpdate.error) && isMissingRelationError(sequenceUpdate.error)) {
      return { ok: false, reason: "missing_table" };
    }
    return writeError(sequenceUpdate.error);
  }
  return { ok: true };
}
