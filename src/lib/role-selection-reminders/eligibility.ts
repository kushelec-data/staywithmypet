import { utcCalendarDaysSince } from "@/lib/profile-completion-reminders/eligibility";
import {
  ROLE_SELECTION_MIN_DAYS_AFTER_REGISTRATION,
  isExcludedRoleSelectionEmail,
} from "./config";
import type {
  RoleSelectionCampaignConfig,
  RoleSelectionCohort,
  RoleSelectionDecision,
  RoleSelectionEventState,
  RoleSelectionStage,
  RoleSelectionUser,
} from "./types";

export function roleSelectionCohort(
  registeredAt: Date,
  organicAfter: Date | null,
): RoleSelectionCohort {
  if (organicAfter && registeredAt.getTime() >= organicAfter.getTime()) return "organic";
  return "historical";
}

function eventForStage(
  events: RoleSelectionEventState[],
  stage: RoleSelectionStage,
): RoleSelectionEventState | null {
  return events.find((event) => event.stage === stage) ?? null;
}

export function decideRoleSelectionAction(input: {
  now: Date;
  config: RoleSelectionCampaignConfig;
  user: RoleSelectionUser;
  events: RoleSelectionEventState[];
}): RoleSelectionDecision {
  const { now, config, user, events } = input;
  if (user.banned) return { action: "skip", reason: "banned" };
  if (!user.hasAccount) return { action: "skip", reason: "no_account" };
  if (!user.email) return { action: "skip", reason: "no_email" };
  if (isExcludedRoleSelectionEmail(user.email, config.excludedEmails)) {
    return { action: "skip", reason: "internal_address" };
  }
  if (!user.rolePending) return { action: "stop", reason: "role_selected" };

  const first = eventForStage(events, 1);
  if (first?.status === "sent") {
    return { action: "skip", reason: "stage2_not_approved" };
  }
  if (first?.status === "outcome_unknown" || first?.status === "sending") {
    return { action: "skip", reason: "unresolved_delivery" };
  }
  if (first?.status === "skipped") return { action: "skip", reason: "role_selected" };

  const days = utcCalendarDaysSince(user.registeredAt, now);
  if (days < ROLE_SELECTION_MIN_DAYS_AFTER_REGISTRATION) return { action: "skip", reason: "too_early" };

  const cohort = roleSelectionCohort(user.registeredAt, config.organicAfter);
  if (cohort === "historical" && !config.historicalRolloutApproved) {
    return { action: "skip", reason: "historical_rollout_blocked" };
  }

  return { action: "send", stage: 1, cohort };
}
