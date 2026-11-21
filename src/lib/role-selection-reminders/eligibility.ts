import { utcCalendarDaysSince } from "@/lib/profile-completion-reminders/eligibility";
import {
  ROLE_SELECTION_MIN_DAYS_AFTER_REGISTRATION,
  isExcludedRoleSelectionEmail,
  isRoleSelectionStage2Due,
  roleSelectionStage2DueAt,
} from "./config";
import type {
  RoleSelectionCampaignConfig,
  RoleSelectionCohort,
  RoleSelectionDecision,
  RoleSelectionEventState,
  RoleSelectionLifecycleStatus,
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

function deliveryUnresolved(event: RoleSelectionEventState | null): boolean {
  return event?.status === "sending" || event?.status === "outcome_unknown";
}

export function deriveRoleSelectionLifecycle(input: {
  rolePending: boolean;
  stage2Sent: boolean;
}): RoleSelectionLifecycleStatus {
  if (!input.rolePending) return "cleared";
  if (input.stage2Sent) return "inactive_role_unselected";
  return "in_sequence";
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
  const second = eventForStage(events, 2);
  const cohort = roleSelectionCohort(user.registeredAt, config.organicAfter);

  if (second?.status === "sent") return { action: "skip", reason: "already_sent" };
  if (deliveryUnresolved(second)) return { action: "skip", reason: "unresolved_delivery" };
  if (second?.status === "skipped") return { action: "skip", reason: "role_selected" };

  if (deliveryUnresolved(first)) return { action: "skip", reason: "unresolved_delivery" };
  if (first?.status === "skipped") return { action: "skip", reason: "role_selected" };

  if (first?.status === "sent") {
    if (!config.stage2Approved) return { action: "skip", reason: "stage2_not_approved" };
    if (!first.sentAt || !isRoleSelectionStage2Due(first.sentAt, now)) {
      return { action: "skip", reason: "too_early" };
    }
    const dueAt = roleSelectionStage2DueAt(first.sentAt) ?? now;
    return { action: "send", stage: 2, cohort, dueAt };
  }

  const days = utcCalendarDaysSince(user.registeredAt, now);
  if (days < ROLE_SELECTION_MIN_DAYS_AFTER_REGISTRATION) return { action: "skip", reason: "too_early" };

  if (cohort === "historical" && !config.historicalRolloutApproved) {
    return { action: "skip", reason: "historical_rollout_blocked" };
  }

  return { action: "send", stage: 1, cohort };
}
