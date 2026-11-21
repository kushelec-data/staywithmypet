import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatAcceptedSmtpLastError,
  sanitizeSmtpLogValue,
  type ReminderSmtpAcceptedMeta,
} from "@/lib/profile-completion-reminders/smtp-outcome";
import type { ReminderLocale } from "@/lib/profile-completion-reminders/types";
import { ROLE_SELECTION_REMINDER_CAMPAIGN_ID, roleSelectionUniqueKey } from "./config";
import type {
  RoleSelectionCohort,
  RoleSelectionEventState,
  RoleSelectionEventStatus,
  RoleSelectionStage,
} from "./types";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export type RoleSelectionWriteResult =
  | { ok: true }
  | { ok: false; reason: "missing_table" | "update_failed"; error?: string };

export const RETRYABLE_ROLE_SELECTION_EVENT_STATUS = "failed_before_acceptance" as const;

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

function writeError(error: { message?: string } | null): RoleSelectionWriteResult {
  return { ok: false, reason: "update_failed", error: error?.message ?? "update_failed" };
}

function mapEvent(row: Record<string, unknown>): RoleSelectionEventState {
  const stage = row.stage === 2 || row.stage === "2" ? 2 : 1;
  return {
    userId: String(row.user_id),
    uniqueKey: String(row.unique_key),
    stage,
    status: row.status as RoleSelectionEventStatus,
    skipReason: (row.skip_reason as string | null) ?? null,
    claimedAt: (row.claimed_at as string | null) ?? null,
    sentAt: (row.sent_at as string | null) ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
  };
}

export async function loadRoleSelectionEvents(
  admin: AdminClient,
  userIds: string[],
  campaignId: string = ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
): Promise<
  { ok: true; byUser: Map<string, RoleSelectionEventState[]> } | { ok: false; reason: "missing_table" }
> {
  const byUser = new Map<string, RoleSelectionEventState[]>();
  for (const id of userIds) byUser.set(id, []);
  if (userIds.length === 0) return { ok: true, byUser };

  for (let i = 0; i < userIds.length; i += 200) {
    const chunk = userIds.slice(i, i + 200);
    const events = await admin
      .from("role_selection_reminder_events")
      .select("user_id, unique_key, stage, status, skip_reason, claimed_at, sent_at, attempt_count, campaign_id")
      .eq("campaign_id", campaignId)
      .in("user_id", chunk);
    if (events.error) {
      if (isPostgrestError(events.error) && isMissingRelationError(events.error)) {
        return { ok: false, reason: "missing_table" };
      }
      throw events.error;
    }
    for (const row of (events.data ?? []) as unknown as Record<string, unknown>[]) {
      const mapped = mapEvent(row);
      const list = byUser.get(mapped.userId) ?? [];
      list.push(mapped);
      byUser.set(mapped.userId, list);
    }
  }
  return { ok: true, byUser };
}

export async function countRoleSelectionSentOnUtcDay(
  admin: AdminClient,
  now: Date,
  campaignId: string = ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
  const { data, error } = await admin
    .from("role_selection_reminder_events")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "sent")
    .gte("sent_at", start)
    .lt("sent_at", end);
  if (error) {
    if (isPostgrestError(error) && isMissingRelationError(error)) return 0;
    throw error;
  }
  return data?.length ?? 0;
}

export async function claimRoleSelectionSend(input: {
  admin: AdminClient;
  userId: string;
  locale: ReminderLocale;
  stage: RoleSelectionStage;
  cohort: RoleSelectionCohort;
  now: Date;
  scheduledFor?: Date;
  campaignId?: string;
}): Promise<"claimed" | "duplicate" | "missing_table"> {
  const campaignId = input.campaignId ?? ROLE_SELECTION_REMINDER_CAMPAIGN_ID;
  const uniqueKey = roleSelectionUniqueKey(input.userId, input.stage, campaignId);
  const at = input.now.toISOString();
  const scheduledFor = (input.scheduledFor ?? input.now).toISOString();

  const retryFailed = await input.admin
    .from("role_selection_reminder_events")
    .update({
      status: "sending",
      claimed_at: at,
      last_error: null,
      locale: input.locale,
      cohort: input.cohort,
      updated_at: at,
    })
    .eq("unique_key", uniqueKey)
    .eq("status", RETRYABLE_ROLE_SELECTION_EVENT_STATUS)
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
    .from("role_selection_reminder_events")
    .insert({
      user_id: input.userId,
      campaign_id: campaignId,
      stage: input.stage,
      unique_key: uniqueKey,
      status: "sending",
      locale: input.locale,
      cohort: input.cohort,
      scheduled_for: scheduledFor,
      claimed_at: at,
      attempt_count: 1,
      updated_at: at,
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

async function bumpAttempt(admin: AdminClient, uniqueKey: string): Promise<RoleSelectionWriteResult> {
  const { data, error } = await admin
    .from("role_selection_reminder_events")
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
    .from("role_selection_reminder_events")
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

function smtpColumnPatch(smtp?: ReminderSmtpAcceptedMeta | null): Record<string, unknown> {
  if (!smtp) return {};
  return {
    smtp_message_id: smtp.messageId,
    smtp_response: smtp.response,
    smtp_accepted_count: smtp.acceptedCount,
    smtp_rejected_count: smtp.rejectedCount,
  };
}

export async function markRoleSelectionSent(input: {
  admin: AdminClient;
  userId: string;
  stage: RoleSelectionStage;
  now: Date;
  smtp?: ReminderSmtpAcceptedMeta | null;
  campaignId?: string;
}): Promise<RoleSelectionWriteResult> {
  const uniqueKey = roleSelectionUniqueKey(
    input.userId,
    input.stage,
    input.campaignId ?? ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
  );
  const sentAt = input.now.toISOString();
  const withColumns = {
    status: "sent",
    sent_at: sentAt,
    last_error: null,
    updated_at: sentAt,
    ...smtpColumnPatch(input.smtp),
  };
  let eventUpdate = await input.admin
    .from("role_selection_reminder_events")
    .update(withColumns)
    .eq("unique_key", uniqueKey)
    .eq("status", "sending")
    .select("id");
  if (
    eventUpdate.error &&
    /smtp_message_id|smtp_response|smtp_accepted_count|smtp_rejected_count|schema cache/i.test(
      eventUpdate.error.message ?? "",
    )
  ) {
    eventUpdate = await input.admin
      .from("role_selection_reminder_events")
      .update({
        status: "sent",
        sent_at: sentAt,
        last_error: input.smtp ? formatAcceptedSmtpLastError(input.smtp) : null,
        updated_at: sentAt,
      })
      .eq("unique_key", uniqueKey)
      .eq("status", "sending")
      .select("id");
  }
  if (eventUpdate.error) {
    if (isPostgrestError(eventUpdate.error) && isMissingRelationError(eventUpdate.error)) {
      return { ok: false, reason: "missing_table" };
    }
    return writeError(eventUpdate.error);
  }
  if (!Array.isArray(eventUpdate.data) || eventUpdate.data.length === 0) {
    return { ok: false, reason: "update_failed", error: "sent_update_matched_no_sending_row" };
  }
  return { ok: true };
}

export async function markRoleSelectionFailedBeforeAcceptance(input: {
  admin: AdminClient;
  userId: string;
  stage: RoleSelectionStage;
  error: string;
  now: Date;
  campaignId?: string;
}): Promise<RoleSelectionWriteResult> {
  return updateSendingEvent(input, {
    status: "failed_before_acceptance",
    last_error: sanitizeSmtpLogValue(input.error, 500),
    updated_at: input.now.toISOString(),
  });
}

export async function markRoleSelectionOutcomeUnknown(input: {
  admin: AdminClient;
  userId: string;
  stage: RoleSelectionStage;
  error: string;
  now: Date;
  campaignId?: string;
}): Promise<RoleSelectionWriteResult> {
  return updateSendingEvent(input, {
    status: "outcome_unknown",
    last_error: sanitizeSmtpLogValue(input.error, 500),
    updated_at: input.now.toISOString(),
  });
}

export async function markRoleSelectionSkippedSelected(input: {
  admin: AdminClient;
  userId: string;
  stage: RoleSelectionStage;
  now: Date;
  campaignId?: string;
}): Promise<RoleSelectionWriteResult> {
  return updateSendingEvent(input, {
    status: "skipped",
    skip_reason: "role_selected",
    updated_at: input.now.toISOString(),
  });
}

async function updateSendingEvent(
  input: { admin: AdminClient; userId: string; stage: RoleSelectionStage; campaignId?: string },
  patch: Record<string, unknown>,
): Promise<RoleSelectionWriteResult> {
  const uniqueKey = roleSelectionUniqueKey(
    input.userId,
    input.stage,
    input.campaignId ?? ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
  );
  const updated = await input.admin
    .from("role_selection_reminder_events")
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

function lifecycleWriteError(error: { code?: string; message?: string } | null): RoleSelectionWriteResult {
  if (error && isPostgrestError(error) && isMissingRelationError(error)) {
    return { ok: false, reason: "missing_table" };
  }
  return writeError(error);
}

export async function classifyRoleSelectionInactive(input: {
  admin: AdminClient;
  userId: string;
  now: Date;
  campaignId?: string;
}): Promise<RoleSelectionWriteResult> {
  const at = input.now.toISOString();
  const campaignId = input.campaignId ?? ROLE_SELECTION_REMINDER_CAMPAIGN_ID;
  const upserted = await input.admin.from("role_selection_lifecycle").upsert(
    {
      user_id: input.userId,
      status: "inactive_role_unselected",
      campaign_id: campaignId,
      classified_at: at,
      cleared_at: null,
      updated_at: at,
    },
    { onConflict: "user_id" },
  );
  if (upserted.error) return lifecycleWriteError(upserted.error);
  return { ok: true };
}

export async function clearRoleSelectionInactive(input: {
  admin: AdminClient;
  userId: string;
  now: Date;
}): Promise<RoleSelectionWriteResult> {
  const at = input.now.toISOString();
  const updated = await input.admin
    .from("role_selection_lifecycle")
    .update({
      status: "cleared",
      cleared_at: at,
      updated_at: at,
    })
    .eq("user_id", input.userId)
    .eq("status", "inactive_role_unselected");
  if (updated.error) return lifecycleWriteError(updated.error);
  return { ok: true };
}
