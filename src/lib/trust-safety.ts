import type { SupabaseClient } from "@supabase/supabase-js";
import { formatSupabaseError } from "@/lib/profile-load";
import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";

export const REPORT_REASONS = [
  "Harassment or abuse",
  "Spam or scam",
  "Inappropriate content",
  "Safety concern",
  "Fake profile",
  "Other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type EmergencyContact = {
  name: string;
  phone: string;
  relationship: string | null;
};

export type TrustFlags = {
  emailVerified: boolean;
  phoneVerified: boolean;
};

export function isProfileVerified(flags: TrustFlags): boolean {
  return flags.emailVerified && flags.phoneVerified;
}

/** Read `details.emergency_contact.relationship` without requiring name/phone in JSON. */
export function emergencyContactRelationshipFromDetails(detailsRaw: unknown): string | null {
  if (!detailsRaw || typeof detailsRaw !== "object" || Array.isArray(detailsRaw)) return null;
  const raw = (detailsRaw as Record<string, unknown>).emergency_contact;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rel = (raw as Record<string, unknown>).relationship;
  return typeof rel === "string" && rel.trim() ? rel.trim() : null;
}

/** Prefer structured columns; fall back to `details.emergency_contact`. */
export function parseEmergencyContactFromProfile(profile: {
  emergency_contact_name: string | null;
  emergency_contact_phone_e164: string | null;
  details: unknown;
}): EmergencyContact | null {
  const name = profile.emergency_contact_name?.trim();
  const e164 = profile.emergency_contact_phone_e164?.trim();
  const details = profile.details;
  const parsedRelationship =
    details && typeof details === "object" && !Array.isArray(details)
      ? (details as Record<string, unknown>).emergency_contact_relationship
      : null;
  const relationship =
    (typeof parsedRelationship === "string" && parsedRelationship.trim()
      ? parsedRelationship.trim()
      : null) ??
    emergencyContactRelationshipFromDetails(details) ??
    parseEmergencyContact(details)?.relationship ??
    null;

  if (name && e164) {
    return {
      name,
      phone: e164,
      relationship,
    };
  }
  return parseEmergencyContact(profile.details);
}

export function parseEmergencyContact(detailsRaw: unknown): EmergencyContact | null {
  if (!detailsRaw || typeof detailsRaw !== "object" || Array.isArray(detailsRaw)) return null;
  const raw = (detailsRaw as Record<string, unknown>).emergency_contact;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const phone = typeof o.phone === "string" ? o.phone.trim() : "";
  if (!name || !phone) return null;
  const relationship =
    typeof o.relationship === "string" && o.relationship.trim() ? o.relationship.trim() : null;
  return { name, phone, relationship };
}

export function parseTrustFlagsFromDetails(detailsRaw: unknown): TrustFlags {
  if (!detailsRaw || typeof detailsRaw !== "object" || Array.isArray(detailsRaw)) {
    return { emailVerified: false, phoneVerified: false };
  }
  const o = detailsRaw as Record<string, unknown>;
  return {
    emailVerified: o.email_verified === true,
    phoneVerified: o.phone_verified === true,
  };
}

export function emergencyContactToDetailsValue(
  contact: EmergencyContact | null,
): Record<string, unknown> | null {
  if (!contact?.name.trim() || !contact.phone.trim()) return null;
  return {
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    relationship: contact.relationship?.trim() || null,
  };
}

export async function fetchBlockedUserIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_user_id")
    .eq("blocker_id", userId);

  if (error) {
    if (isMissingRelationError(error)) return new Set();
    throw error;
  }

  return new Set((data ?? []).map((r) => r.blocked_user_id as string));
}

export async function isUserBlocked(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  if (userId === otherUserId) return false;

  const { data, error } = await supabase.rpc("users_are_blocked", {
    user_a: userId,
    user_b: otherUserId,
  });

  if (error) {
    if (isMissingRelationError(error)) {
      const blocked = await fetchBlockedUserIds(supabase, userId);
      return blocked.has(otherUserId);
    }
    throw error;
  }

  return Boolean(data);
}

export async function blockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedUserId: string,
): Promise<void> {
  if (blockerId === blockedUserId) {
    throw new Error("You cannot block yourself.");
  }

  const { error } = await supabase.from("blocked_users").insert({
    blocker_id: blockerId,
    blocked_user_id: blockedUserId,
  });

  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) return;
    throw error;
  }
}

export async function unblockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_user_id", blockedUserId);

  if (error) throw error;
}

export async function submitReport(
  supabase: SupabaseClient,
  reporterId: string,
  reportedUserId: string,
  reason: string,
  details: string | null,
): Promise<void> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new Error("Please select a reason.");
  if (reporterId === reportedUserId) throw new Error("You cannot report yourself.");

  const trimmedDetails = details?.trim() || null;

  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    reason: trimmedReason,
    details: trimmedDetails,
    status: "pending",
  });

  if (error) throw error;
}

export const BLOCKED_USER_MESSAGE =
  "You cannot interact with this member because one of you has blocked the other.";

export function formatTrustSafetyError(error: unknown): string {
  if (isPostgrestError(error)) {
    if (isMissingRelationError(error)) {
      return "Trust & safety is not set up yet. Run supabase/RUN_THIS_trust_safety.sql in the Supabase SQL Editor.";
    }
    const msg = formatSupabaseError(error);
    if (/users_are_blocked|blocked/i.test(msg)) return BLOCKED_USER_MESSAGE;
    if (/duplicate key|unique constraint/i.test(msg) && /report/i.test(msg)) {
      return "You have already submitted a report for this member recently.";
    }
    return msg;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Something went wrong. Please try again.";
}
