import { defaultLocale } from "@/i18n/translations";
import { resolveActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ReminderEmailRole, ReminderLocale } from "./types";

function parseSupportedLocale(value: unknown): ReminderLocale | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return null;
  if (normalized === "et" || normalized === "et-ee") return "et";
  if (normalized === "en" || normalized === "en-us" || normalized === "en-gb") return "en";
  return null;
}

/**
 * Saved UI locale only: swmp_locale, then locale, else null (caller defaults to English).
 * Does not infer language from nationality, email, or name.
 */
export function reminderLocaleFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ReminderLocale | null {
  return parseSupportedLocale(metadata?.swmp_locale) ?? parseSupportedLocale(metadata?.locale);
}

/** Saved preference, else the platform default (English). */
export function resolveReminderLocale(stored: ReminderLocale | null | undefined): ReminderLocale {
  return stored === "et" || stored === "en" ? stored : defaultLocale;
}

export function knownEmailRole(
  role: ProfileRole | string | null | undefined,
  activeMode: string | null | undefined,
): ReminderEmailRole | null {
  if (role === "pet_parent" || role === "pet_friend") return role;
  if (role === "both") return resolveActiveMode("both", activeMode);
  return null;
}
