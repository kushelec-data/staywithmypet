import { utcCalendarDaysSince } from "@/lib/profile-completion-reminders/eligibility";
import { LISTING_MIN_DAYS_AFTER_REGISTRATION, isExcludedListingEmail } from "./config";
import type {
  ListingCampaignCohort,
  ListingCampaignConfig,
  ListingCampaignDecision,
  ListingCampaignEventState,
  ListingCampaignUser,
} from "./types";

export function listingCampaignCohort(
  registeredAt: Date,
  organicAfter: Date | null,
): ListingCampaignCohort {
  if (organicAfter && registeredAt.getTime() >= organicAfter.getTime()) return "organic";
  return "historical";
}

export function decideListingCampaignAction(input: {
  now: Date;
  config: ListingCampaignConfig;
  user: ListingCampaignUser;
  event: ListingCampaignEventState | null;
}): ListingCampaignDecision {
  const { now, config, user, event } = input;
  if (user.banned) return { action: "skip", reason: "banned" };
  if (!user.hasAccount) return { action: "skip", reason: "no_account" };
  if (!user.email) return { action: "skip", reason: "no_email" };
  if (isExcludedListingEmail(user.email, config.excludedEmails)) {
    return { action: "skip", reason: "internal_address" };
  }
  if (user.rolePending || !user.emailRole) return { action: "skip", reason: "unknown_role" };
  if (!user.needsParentListing && !user.needsFriendListing) {
    return { action: "stop", reason: "listing_complete" };
  }

  if (event?.status === "sent") return { action: "skip", reason: "already_sent" };
  if (event?.status === "outcome_unknown" || event?.status === "sending") {
    return { action: "skip", reason: "unresolved_delivery" };
  }
  if (event?.status === "skipped") return { action: "skip", reason: "listing_complete" };

  const days = utcCalendarDaysSince(user.registeredAt, now);
  if (days < LISTING_MIN_DAYS_AFTER_REGISTRATION) return { action: "skip", reason: "too_early" };

  const cohort = listingCampaignCohort(user.registeredAt, config.organicAfter);
  if (cohort === "historical" && !config.historicalRolloutApproved) {
    return { action: "skip", reason: "historical_rollout_blocked" };
  }

  return {
    action: "send",
    emailRole: user.emailRole,
    cohort,
  };
}
