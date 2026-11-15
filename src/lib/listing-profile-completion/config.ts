import { isExcludedReminderEmail } from "@/lib/profile-completion-reminders/config";
import type { ListingCampaignConfig } from "./types";

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

export const LISTING_PROFILE_COMPLETION_CAMPAIGN_ID = "listing_profile_completion_v1";
export const LISTING_PROFILE_COMPLETION_FROM = "Stay With My Pet <info@staywithmypet.ee>";
export const LISTING_MIN_DAYS_AFTER_REGISTRATION = 5;
export const LISTING_INTERNAL_TEST_SUBJECT_PREFIX = "[SWMP INTERNAL TEST]";

export const DEFAULT_LISTING_CAMPAIGN_EXCLUSIONS = [
  "info@staywithmypet.ee",
  "kusheducation@gmail.com",
  "gerly.kullamaa@gmail.com",
  "gerlykullamaa@gmail.com",
  "drbridgeforce@gmail.com",
  "kushfrance2016@gmail.com",
  "gerly_4@hotmail.com",
];

export function listingCampaignUniqueKey(
  userId: string,
  campaignId: string = LISTING_PROFILE_COMPLETION_CAMPAIGN_ID,
): string {
  return `${campaignId}_${userId}`;
}

export function parseListingExcludedEmails(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.LISTING_PROFILE_COMPLETION_EXCLUDE_EMAILS?.trim() ?? "";
  const extra = raw
    ? raw
        .split(/[,;\n]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_LISTING_CAMPAIGN_EXCLUSIONS, ...extra])];
}

export function isExcludedListingEmail(
  email: string | null | undefined,
  excludedEmails: string[] = DEFAULT_LISTING_CAMPAIGN_EXCLUSIONS,
): boolean {
  return isExcludedReminderEmail(email, excludedEmails);
}

/** Fail closed until every send flag is explicit. */
export function readListingCampaignConfig(env: NodeJS.ProcessEnv = process.env): ListingCampaignConfig {
  return {
    campaignId: LISTING_PROFILE_COMPLETION_CAMPAIGN_ID,
    enabled: envFlag(env, "LISTING_PROFILE_COMPLETION_ENABLED", false),
    dryRun: envFlag(env, "LISTING_PROFILE_COMPLETION_DRY_RUN", true),
    historicalRolloutApproved: envFlag(env, "LISTING_PROFILE_COMPLETION_HISTORICAL_ROLLOUT", false),
    organicAfter: envDate(env, "LISTING_PROFILE_COMPLETION_ORGANIC_AFTER"),
    dailyCap: envInt(env, "LISTING_PROFILE_COMPLETION_DAILY_CAP", 50),
    excludedEmails: parseListingExcludedEmails(env),
  };
}

export function listingParentCtaPath(petCount: number): string {
  return petCount > 0 ? "/pets" : "/pets/new";
}

export function listingFriendCtaPath(): string {
  return "/profile/edit";
}

export function listingCampaignCtaPath(role: "pet_parent" | "pet_friend", petCount: number): string {
  return role === "pet_parent" ? listingParentCtaPath(petCount) : listingFriendCtaPath();
}
