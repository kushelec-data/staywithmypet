import type { ReminderLocale } from "@/lib/profile-completion-reminders/types";

export type RoleSelectionCohort = "organic" | "historical";
export type RoleSelectionStage = 1 | 2;

export type RoleSelectionEventStatus =
  | "pending"
  | "sending"
  | "sent"
  | "skipped"
  | "failed_before_acceptance"
  | "outcome_unknown";

export type RoleSelectionSkipReason =
  | "disabled"
  | "dry_run"
  | "too_early"
  | "role_selected"
  | "no_email"
  | "historical_rollout_blocked"
  | "already_sent"
  | "banned"
  | "no_account"
  | "internal_address"
  | "daily_cap"
  | "no_smtp"
  | "missing_table"
  | "outcome_unknown"
  | "unresolved_delivery"
  | "stage2_not_approved";

export type RoleSelectionCampaignConfig = {
  campaignId: string;
  enabled: boolean;
  dryRun: boolean;
  historicalRolloutApproved: boolean;
  stage2Approved: boolean;
  organicAfter: Date | null;
  dailyCap: number;
  excludedEmails: string[];
};

export type RoleSelectionEventState = {
  userId: string;
  uniqueKey: string;
  stage: RoleSelectionStage;
  status: RoleSelectionEventStatus;
  skipReason: string | null;
  claimedAt: string | null;
  sentAt: string | null;
  attemptCount: number;
};

export type RoleSelectionUser = {
  userId: string;
  email: string | null;
  registeredAt: Date;
  displayName: string | null;
  givenName: string | null;
  fullName: string | null;
  metadataName: string | null;
  locale: ReminderLocale | null;
  banned: boolean;
  hasAccount: boolean;
  hasProfile: boolean;
  rolePending: boolean;
  roleColumn: string | null;
};

export type RoleSelectionDecision =
  | { action: "send"; stage: RoleSelectionStage; cohort: RoleSelectionCohort }
  | { action: "skip"; reason: RoleSelectionSkipReason }
  | { action: "stop"; reason: "role_selected" };

export type RoleSelectionPreview = {
  userId: string;
  email: string;
  locale: ReminderLocale;
  cohort: RoleSelectionCohort;
  stage: RoleSelectionStage;
  daysSinceRegistration: number;
  firstName: string | null;
  ctaPath: string;
};
