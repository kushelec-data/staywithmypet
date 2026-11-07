import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";

export type ReminderLocale = "en" | "et";
export type ReminderEmailRole = "pet_parent" | "pet_friend";
export type ReminderStage = "first" | "second";
export type ReminderTemplateStage = "day_5" | "day_10";
export type ReminderCohort = "organic" | "historical";

export type ReminderSequenceStatus = "active" | "stopped_complete" | "exhausted" | "ineligible";
export type ReminderEventStatus =
  | "pending"
  | "sending"
  | "sent"
  | "skipped"
  | "failed_before_acceptance"
  | "outcome_unknown";

export type ReminderSkipReason =
  | "disabled"
  | "dry_run"
  | "too_early"
  | "unknown_role"
  | "no_email"
  | "historical_rollout_blocked"
  | "day10_not_approved"
  | "already_sent_stage"
  | "sequence_stopped"
  | "same_day_as_first"
  | "second_not_due"
  | "exhausted"
  | "banned"
  | "no_account"
  | "internal_address"
  | "profile_complete"
  | "daily_cap"
  | "no_smtp"
  | "missing_table"
  | "outcome_unknown"
  | "unresolved_delivery";

export type ReminderConfig = {
  enabled: boolean;
  dryRun: boolean;
  historicalRolloutApproved: boolean;
  day10Approved: boolean;
  organicAfter: Date | null;
  dailyCap: number;
  excludedEmails: string[];
};

export type ReminderSequenceState = {
  userId: string;
  status: ReminderSequenceStatus;
  cohort: ReminderCohort;
  registeredAt: string;
  firstSentAt: string | null;
  secondSentAt: string | null;
  stopReason: string | null;
};

export type ReminderEventState = {
  userId: string;
  stage: ReminderStage;
  uniqueKey: string;
  status: ReminderEventStatus;
  skipReason: string | null;
  claimedAt: string | null;
  sentAt: string | null;
  attemptCount: number;
};

export type ReminderUserSnapshot = {
  userId: string;
  email: string | null;
  registeredAt: Date;
  role: ProfileRole | null;
  activeMode: ProfileActiveMode | null;
  displayName: string | null;
  givenName: string | null;
  fullName: string | null;
  metadataName: string | null;
  locale: ReminderLocale | null;
  banned: boolean;
  hasAccount: boolean;
  hasProfile: boolean;
  profileComplete: boolean;
  rolePending: boolean;
  emailRole: ReminderEmailRole | null;
};

export type ReminderHistory = {
  sequence: ReminderSequenceState | null;
  first: ReminderEventState | null;
  second: ReminderEventState | null;
};

export type ReminderDecision =
  | {
      action: "send";
      stage: ReminderStage;
      templateStage: ReminderTemplateStage;
      cohort: ReminderCohort;
    }
  | { action: "skip"; reason: ReminderSkipReason }
  | { action: "stop"; reason: "profile_complete" };

export type ReminderRecipientPreview = {
  userId: string;
  email: string;
  role: ReminderEmailRole;
  locale: ReminderLocale;
  cohort: ReminderCohort;
  stage: ReminderStage;
  templateStage: ReminderTemplateStage;
  daysSinceRegistration: number;
  firstName: string | null;
};

export type AgeBucket = "0_4" | "5_9" | "10_19" | "20_39" | "40_59" | "60_plus";

export type RoleLanguageCount = {
  role: ReminderEmailRole | "unknown";
  locale: ReminderLocale | "missing";
  count: number;
};

export type HistoricalEligibilityReport = {
  generatedAt: string;
  totalUsers: number;
  completedProfiles: number;
  incompleteProfiles: number;
  petParentIncomplete: number;
  petFriendIncomplete: number;
  registered5to9Days: number;
  registered10to19Days: number;
  registered20to39Days: number;
  registered40to59Days: number;
  registered60PlusDays: number;
  incomplete60PlusDays: number;
  countsByLanguageAndRole: RoleLanguageCount[];
  unknownRole: number;
  suppressedIneligible: number;
  excludedInternalAddresses: number;
  alreadyReminded: number;
  eligibleParentEn: number;
  eligibleParentEt: number;
  eligibleFriendEn: number;
  eligibleFriendEt: number;
  eligibleIfHistoricalApproved: ReminderRecipientPreview[];
  eligibleOrganicNow: ReminderRecipientPreview[];
  unknownRoleUsers: Array<{ userId: string; email: string | null; role: string | null }>;
};
