import { ROLE_ONBOARDING_PATH } from "@/lib/auth-routing";
import { isExcludedReminderEmail } from "@/lib/profile-completion-reminders/config";
import type { RoleSelectionCampaignConfig, RoleSelectionStage } from "./types";

function envFlag(env: NodeJS.ProcessEnv, name: string, defaultValue: boolean): boolean {
  const raw = env[name]?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return defaultValue;
}

function envDate(env: NodeJS.ProcessEnv, name: string): Date | null {
  const raw = env[name]?.trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function envInt(env: NodeJS.ProcessEnv, name: string, defaultValue: number): number {
  const raw = env[name]?.trim();
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(1000, Math.max(1, parsed));
}

export const ROLE_SELECTION_REMINDER_CAMPAIGN_ID = "role_selection_reminder_v1";
export const ROLE_SELECTION_REMINDER_FROM = "Stay With My Pet <info@staywithmypet.ee>";
export const ROLE_SELECTION_MIN_DAYS_AFTER_REGISTRATION = 5;
export const ROLE_SELECTION_STAGE2_DELAY_MS = 5 * 24 * 60 * 60 * 1000;
export const ROLE_SELECTION_CTA_PATH = ROLE_ONBOARDING_PATH;
export const ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX = "[SWMP INTERNAL TEST — ROLE REMINDER 1]";
export const ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX_STAGE2 =
  "[SWMP INTERNAL TEST — ROLE REMINDER 2]";

export const DEFAULT_ROLE_SELECTION_EXCLUSIONS = [
  "info@staywithmypet.ee",
  "kusheducation@gmail.com",
  "gerly.kullamaa@gmail.com",
  "gerlykullamaa@gmail.com",
  "drbridgeforce@gmail.com",
  "kushfrance2016@gmail.com",
  "gerly_4@hotmail.com",
];

export function roleSelectionUniqueKey(
  userId: string,
  stage: RoleSelectionStage,
  campaignId: string = ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
): string {
  return `${campaignId}_${stage}_${userId}`;
}

export function parseRoleSelectionExcludedEmails(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.ROLE_SELECTION_REMINDER_EXCLUDE_EMAILS?.trim() ?? "";
  const extra = raw
    ? raw
        .split(/[,;\n]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_ROLE_SELECTION_EXCLUSIONS, ...extra])];
}

export function isExcludedRoleSelectionEmail(
  email: string | null | undefined,
  excludedEmails: string[] = DEFAULT_ROLE_SELECTION_EXCLUSIONS,
): boolean {
  return isExcludedReminderEmail(email, excludedEmails);
}

export function roleSelectionInternalTestPrefix(stage: RoleSelectionStage): string {
  return stage === 2
    ? ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX_STAGE2
    : ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX;
}

export function roleSelectionStage2DueAt(sentAt: string | Date): Date | null {
  const timestamp = typeof sentAt === "string" ? Date.parse(sentAt) : sentAt.getTime();
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp + ROLE_SELECTION_STAGE2_DELAY_MS);
}

export function isRoleSelectionStage2Due(sentAt: string | Date, now: Date): boolean {
  const dueAt = roleSelectionStage2DueAt(sentAt);
  return Boolean(dueAt && now.getTime() >= dueAt.getTime());
}

/** Fail closed until every send flag is explicit. Reminder 2 stays off unless STAGE2_APPROVED. */
export function readRoleSelectionCampaignConfig(
  env: NodeJS.ProcessEnv = process.env,
): RoleSelectionCampaignConfig {
  return {
    campaignId: ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
    enabled: envFlag(env, "ROLE_SELECTION_REMINDER_ENABLED", false),
    dryRun: envFlag(env, "ROLE_SELECTION_REMINDER_DRY_RUN", true),
    historicalRolloutApproved: envFlag(env, "ROLE_SELECTION_REMINDER_HISTORICAL_ROLLOUT", false),
    stage2Approved: envFlag(env, "ROLE_SELECTION_REMINDER_STAGE2_APPROVED", false),
    organicAfter: envDate(env, "ROLE_SELECTION_REMINDER_ORGANIC_AFTER"),
    dailyCap: envInt(env, "ROLE_SELECTION_REMINDER_DAILY_CAP", 50),
    excludedEmails: parseRoleSelectionExcludedEmails(env),
  };
}
