import type { ReminderLocale } from "./types";

const JUNK = /^(null|undefined|none|n\/a|na|user|test|unknown|-)$/i;

function firstTokenFromReliableName(
  raw: string | null | undefined,
  email: string,
  options: { rejectEmailLocalPart?: boolean } = {},
): string | null {
  const value = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!value) return null;
  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0] ?? "";
  if (value.toLowerCase() === normalizedEmail) return null;
  if (value.includes("@")) return null;
  if (JUNK.test(value)) return null;
  if (options.rejectEmailLocalPart !== false && localPart && value.toLowerCase() === localPart) {
    return null;
  }
  const token = value.split(" ")[0]?.trim() ?? "";
  const cleaned = token.replace(/^[^0-9A-Za-zÀ-ÿĀ-žА-яЁё]+|[^0-9A-Za-zÀ-ÿĀ-žА-яЁё'-]+$/g, "");
  if (cleaned.length < 2 || cleaned.length > 40) return null;
  if (JUNK.test(cleaned)) return null;
  return cleaned;
}

/** Verified first name from profile/auth only. Never inferred from the email address. */
export function reminderFirstName(input: {
  email?: string | null;
  profileName?: string | null;
  givenName?: string | null;
  fullName?: string | null;
  metadataName?: string | null;
}): string | null {
  const email = String(input.email ?? "").trim();
  return (
    firstTokenFromReliableName(input.givenName, email, { rejectEmailLocalPart: false }) ??
    firstTokenFromReliableName(input.profileName, email) ??
    firstTokenFromReliableName(input.fullName, email, { rejectEmailLocalPart: false }) ??
    firstTokenFromReliableName(input.metadataName, email)
  );
}

export function reminderGreeting(locale: ReminderLocale, firstName: string | null): string {
  if (locale === "et") return firstName ? `Tere, ${firstName}!` : "Tere!";
  return firstName ? `Hi ${firstName}!` : "Hi there!";
}
