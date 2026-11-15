import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatAcceptedSmtpLastError,
  sanitizeSmtpLogValue,
  type ReminderSmtpAcceptedMeta,
} from "@/lib/profile-completion-reminders/smtp-outcome";
import type { ReminderEmailRole, ReminderLocale } from "@/lib/profile-completion-reminders/types";
import { LISTING_PROFILE_COMPLETION_CAMPAIGN_ID, listingCampaignUniqueKey } from "./config";
import type {
  ListingCampaignCohort,
  ListingCampaignEventState,
  ListingCampaignEventStatus,
} from "./types";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export type ListingWriteResult =
  | { ok: true }
  | { ok: false; reason: "missing_table" | "update_failed"; error?: string };

export const RETRYABLE_LISTING_EVENT_STATUS = "failed_before_acceptance" as const;

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

function writeError(error: { message?: string } | null): ListingWriteResult {
  return { ok: false, reason: "update_failed", error: error?.message ?? "update_failed" };
}

function mapEvent(row: Record<string, unknown>): ListingCampaignEventState {
  const emailRole = row.email_role === "pet_parent" || row.email_role === "pet_friend" ? row.email_role : null;
  return {
    userId: String(row.user_id),
    uniqueKey: String(row.unique_key),
    status: row.status as ListingCampaignEventStatus,
    skipReason: (row.skip_reason as string | null) ?? null,
    emailRole,
    claimedAt: (row.claimed_at as string | null) ?? null,
    sentAt: (row.sent_at as string | null) ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
  };
}

export async function loadListingCampaignEvents(
  admin: AdminClient,
  userIds: string[],
  campaignId: string = LISTING_PROFILE_COMPLETION_CAMPAIGN_ID,
): Promise<
  { ok: true; byUser: Map<string, ListingCampaignEventState | null> } | { ok: false; reason: "missing_table" }
> {
  const byUser = new Map<string, ListingCampaignEventState | null>();
  for (const id of userIds) byUser.set(id, null);
  if (userIds.length === 0) return { ok: true, byUser };

  for (let i = 0; i < userIds.length; i += 200) {
    const chunk = userIds.slice(i, i + 200);
    const events = await admin
      .from("listing_profile_completion_events")
      .select(
        "user_id, unique_key, status, skip_reason, email_role, claimed_at, sent_at, attempt_count, campaign_id",
      )
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
      byUser.set(mapped.userId, mapped);
    }
  }
  return { ok: true, byUser };
}

export async function countListingCampaignSentOnUtcDay(
  admin: AdminClient,
  now: Date,
  campaignId: string = LISTING_PROFILE_COMPLETION_CAMPAIGN_ID,
): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
  const { data, error } = await admin
    .from("listing_profile_completion_events")
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

export async function claimListingCampaignSend(input: {
  admin: AdminClient;
  userId: string;
  locale: ReminderLocale;
  emailRole: ReminderEmailRole;
  cohort: ListingCampaignCohort;
  now: Date;
  campaignId?: string;
}): Promise<"claimed" | "duplicate" | "missing_table"> {
  const campaignId = input.campaignId ?? LISTING_PROFILE_COMPLETION_CAMPAIGN_ID;
  const uniqueKey = listingCampaignUniqueKey(input.userId, campaignId);
  const at = input.now.toISOString();

  const retryFailed = await input.admin
    .from("listing_profile_completion_events")
    .update({
      status: "sending",
      claimed_at: at,
      last_error: null,
      locale: input.locale,
      email_role: input.emailRole,
      cohort: input.cohort,
      updated_at: at,
    })
    .eq("unique_key", uniqueKey)
    .eq("status", RETRYABLE_LISTING_EVENT_STATUS)
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
    .from("listing_profile_completion_events")
    .insert({
      user_id: input.userId,
      campaign_id: campaignId,
      unique_key: uniqueKey,
      status: "sending",
      locale: input.locale,
      email_role: input.emailRole,
      cohort: input.cohort,
      scheduled_for: at,
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

async function bumpAttempt(admin: AdminClient, uniqueKey: string): Promise<ListingWriteResult> {
  const { data, error } = await admin
    .from("listing_profile_completion_events")
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
    .from("listing_profile_completion_events")
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

export async function markListingCampaignSent(input: {
  admin: AdminClient;
  userId: string;
  now: Date;
  smtp?: ReminderSmtpAcceptedMeta | null;
  campaignId?: string;
}): Promise<ListingWriteResult> {
  const uniqueKey = listingCampaignUniqueKey(
    input.userId,
    input.campaignId ?? LISTING_PROFILE_COMPLETION_CAMPAIGN_ID,
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
    .from("listing_profile_completion_events")
    .update(withColumns)
    .eq("unique_key", uniqueKey)
    .eq("status", "sending")
    .select("id");
  if (eventUpdate.error && /smtp_message_id|smtp_response|smtp_accepted_count|smtp_rejected_count|schema cache/i.test(eventUpdate.error.message ?? "")) {
    eventUpdate = await input.admin
      .from("listing_profile_completion_events")
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

export async function markListingCampaignFailedBeforeAcceptance(input: {
  admin: AdminClient;
  userId: string;
  error: string;
  now: Date;
  campaignId?: string;
}): Promise<ListingWriteResult> {
  return updateSendingEvent(input, {
    status: "failed_before_acceptance",
    last_error: sanitizeSmtpLogValue(input.error, 500),
    updated_at: input.now.toISOString(),
  });
}

export async function markListingCampaignOutcomeUnknown(input: {
  admin: AdminClient;
  userId: string;
  error: string;
  now: Date;
  campaignId?: string;
}): Promise<ListingWriteResult> {
  return updateSendingEvent(input, {
    status: "outcome_unknown",
    last_error: sanitizeSmtpLogValue(input.error, 500),
    updated_at: input.now.toISOString(),
  });
}

export async function markListingCampaignSkippedComplete(input: {
  admin: AdminClient;
  userId: string;
  now: Date;
  campaignId?: string;
}): Promise<ListingWriteResult> {
  return updateSendingEvent(input, {
    status: "skipped",
    skip_reason: "listing_complete",
    updated_at: input.now.toISOString(),
  });
}

async function updateSendingEvent(
  input: { admin: AdminClient; userId: string; campaignId?: string },
  patch: Record<string, unknown>,
): Promise<ListingWriteResult> {
  const uniqueKey = listingCampaignUniqueKey(
    input.userId,
    input.campaignId ?? LISTING_PROFILE_COMPLETION_CAMPAIGN_ID,
  );
  const updated = await input.admin
    .from("listing_profile_completion_events")
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
