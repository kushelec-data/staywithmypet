import type { ReminderConfig } from "./types";

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

export const DEFAULT_INTERNAL_REMINDER_EXCLUSIONS = ["info@staywithmypet.ee"];

export function parseExcludedReminderEmails(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const raw = env.PROFILE_COMPLETION_REMINDER_EXCLUDE_EMAILS?.trim() ?? "";
  const extra = raw
    ? raw
        .split(/[,;\n]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_INTERNAL_REMINDER_EXCLUSIONS, ...extra])];
}

export function isExcludedReminderEmail(
  email: string | null | undefined,
  excludedEmails: string[] = DEFAULT_INTERNAL_REMINDER_EXCLUSIONS,
): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return excludedEmails.includes(normalized);
}

/** Defaults keep production silent until every flag is explicitly approved. */
export function readProfileReminderConfig(
  env: NodeJS.ProcessEnv = process.env,
): ReminderConfig {
  return {
    enabled: envFlag(env, "PROFILE_COMPLETION_REMINDER_ENABLED", false),
    dryRun: envFlag(env, "PROFILE_COMPLETION_REMINDER_DRY_RUN", true),
    historicalRolloutApproved: envFlag(env, "PROFILE_COMPLETION_REMINDER_HISTORICAL_ROLLOUT", false),
    day10Approved: envFlag(env, "PROFILE_COMPLETION_REMINDER_DAY10_APPROVED", false),
    organicAfter: envDate(env, "PROFILE_COMPLETION_REMINDER_ORGANIC_AFTER"),
    dailyCap: envInt(env, "PROFILE_COMPLETION_REMINDER_DAILY_CAP", 50),
    excludedEmails: parseExcludedReminderEmails(env),
  };
}

export const PROFILE_REMINDER_FROM = "Stay With My Pet <info@staywithmypet.ee>";
export const PROFILE_REMINDER_CTA_PATH = "/profile/edit";
export const PROFILE_REMINDER_EVENT_PREFIX = "profile_completion_reminder";
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const HISTORICAL_SECOND_DELAY_DAYS = 5;
export const ORGANIC_FIRST_MIN_DAYS = 5;
export const ORGANIC_SECOND_MIN_DAYS = 10;

export function reminderUniqueKey(userId: string, stage: "first" | "second"): string {
  return `${PROFILE_REMINDER_EVENT_PREFIX}_${stage}_${userId}`;
}
