import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ReminderEmailRole, ReminderLocale } from "@/lib/profile-completion-reminders/types";

export type ListingCampaignCohort = "organic" | "historical";

export type ListingCampaignEventStatus =
  | "pending"
  | "sending"
  | "sent"
  | "skipped"
  | "failed_before_acceptance"
  | "outcome_unknown";

export type ListingCampaignSkipReason =
  | "disabled"
  | "dry_run"
  | "too_early"
  | "unknown_role"
  | "no_email"
  | "historical_rollout_blocked"
  | "already_sent"
  | "banned"
  | "no_account"
  | "internal_address"
  | "listing_complete"
  | "daily_cap"
  | "no_smtp"
  | "missing_table"
  | "outcome_unknown"
  | "unresolved_delivery";

export type ListingCampaignConfig = {
  campaignId: string;
  enabled: boolean;
  dryRun: boolean;
  historicalRolloutApproved: boolean;
  organicAfter: Date | null;
  dailyCap: number;
  excludedEmails: string[];
};

export type ListingCampaignEventState = {
  userId: string;
  uniqueKey: string;
  status: ListingCampaignEventStatus;
  skipReason: string | null;
  emailRole: ReminderEmailRole | null;
  claimedAt: string | null;
  sentAt: string | null;
  attemptCount: number;
};

export type ListingCampaignUser = {
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
  rolePending: boolean;
  petCount: number;
  petMarketplaceReady: boolean;
  friendListingComplete: boolean;
  needsParentListing: boolean;
  needsFriendListing: boolean;
  emailRole: ReminderEmailRole | null;
};

export type ListingCampaignDecision =
  | {
      action: "send";
      emailRole: ReminderEmailRole;
      cohort: ListingCampaignCohort;
    }
  | { action: "skip"; reason: ListingCampaignSkipReason }
  | { action: "stop"; reason: "listing_complete" };

export type ListingCampaignPreview = {
  userId: string;
  email: string;
  role: ReminderEmailRole;
  locale: ReminderLocale;
  cohort: ListingCampaignCohort;
  daysSinceRegistration: number;
  firstName: string | null;
  petCount: number;
  ctaPath: string;
};
