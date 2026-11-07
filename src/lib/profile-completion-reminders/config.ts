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

const REMINDER_USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Committed first-reminder production pilot.
 * While PILOT_ONLY is true, env cannot expand sending beyond this list.
 * Later 56-user rollout sets PILOT_ONLY=false and clears the env allowlist.
 */
export const PROFILE_REMINDER_PILOT_USER_IDS = [
  "555a435d-6fbf-465b-92e2-bfa085882970", // pet_parent EN — Ingrid Käo
  "24decdc2-d02c-46d4-a7cb-2aa2f16691a4", // pet_parent EN — Morris Moosus
  "7fe80afd-14aa-4c45-a828-34f9d9d0404d", // pet_parent ET — Heidi Kakko
  "6a9fd345-c026-4e3a-a721-48ccc8e70d2b", // pet_friend EN — Julia Korol
  "a39f5729-8041-45ea-98e7-4f08a4602890", // pet_friend ET — Jelizaveta Luik
] as const;

export function normalizeReminderUserId(userId: string): string {
  return userId.trim().toLowerCase();
}

export function approvedPilotUserIds(
  approved: readonly string[] = PROFILE_REMINDER_PILOT_USER_IDS,
): string[] {
  return [...new Set(approved.map(normalizeReminderUserId))];
}

export function parsePilotUserIds(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.PROFILE_COMPLETION_REMINDER_PILOT_USER_IDS?.trim() ?? "";
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map(normalizeReminderUserId)
        .filter((value) => REMINDER_USER_ID_RE.test(value)),
    ),
  ];
}

/** `null` means unrestricted (full historical/organic rollout). Otherwise only those IDs may be sent. */
export function resolvePilotSendAllowlist(
  config: Pick<ReminderConfig, "pilotOnly" | "pilotUserIds">,
  approved: readonly string[] = PROFILE_REMINDER_PILOT_USER_IDS,
): string[] | null {
  if (!config.pilotOnly && config.pilotUserIds.length === 0) return null;
  if (config.pilotUserIds.length === 0) return [];
  const requested = new Set(config.pilotUserIds.map(normalizeReminderUserId));
  if (!config.pilotOnly) return [...requested];
  return approvedPilotUserIds(approved).filter((id) => requested.has(id));
}

export function isReminderPilotSendAllowed(
  userId: string,
  config: Pick<ReminderConfig, "pilotOnly" | "pilotUserIds">,
  approved: readonly string[] = PROFILE_REMINDER_PILOT_USER_IDS,
): boolean {
  const allowlist = resolvePilotSendAllowlist(config, approved);
  if (allowlist === null) return true;
  return allowlist.includes(normalizeReminderUserId(userId));
}

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
    pilotOnly: envFlag(env, "PROFILE_COMPLETION_REMINDER_PILOT_ONLY", true),
    pilotUserIds: parsePilotUserIds(env),
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
