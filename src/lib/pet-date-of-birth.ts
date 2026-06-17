import { parseISODateLocal } from "@/lib/pet-availability";
import { isIsoDateString } from "@/lib/pet-age";

const EUROPEAN_DOB = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export type PetDobValidationReason = "invalid_format" | "invalid_date" | "future";

export type PetDobValidationResult =
  | { ok: true; iso: string }
  | { ok: false; reason: PetDobValidationReason };

/** ISO YYYY-MM-DD → DD.MM.YYYY for display. */
export function formatIsoDateToEuropean(iso: string | null | undefined): string {
  if (!iso?.trim() || !isIsoDateString(iso)) return "";
  const [year, month, day] = iso.trim().split("-");
  return `${day}.${month}.${year}`;
}

/** DD.MM.YYYY → ISO YYYY-MM-DD, or null if invalid. Empty string → "". */
export function parseEuropeanDateToIso(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return "";

  if (isIsoDateString(trimmed)) return trimmed;

  const match = EUROPEAN_DOB.exec(trimmed);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm}-${dd}`;
  const parsed = parseISODateLocal(iso);
  if (!parsed) return null;

  if (
    parsed.getFullYear() !== Number(yyyy) ||
    parsed.getMonth() + 1 !== Number(mm) ||
    parsed.getDate() !== Number(dd)
  ) {
    return null;
  }

  return iso;
}

export function isPetDateOfBirthInFuture(iso: string): boolean {
  const birth = parseISODateLocal(iso);
  if (!birth) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  birth.setHours(0, 0, 0, 0);
  return birth > today;
}

/** Validate user-facing DD.MM.YYYY (or stored ISO). Empty input is allowed. */
export function validatePetDateOfBirthDisplay(display: string): PetDobValidationResult {
  const trimmed = display.trim();
  if (!trimmed) return { ok: true, iso: "" };

  const iso = parseEuropeanDateToIso(trimmed);
  if (iso === null) {
    if (isIsoDateString(trimmed)) {
      return isPetDateOfBirthInFuture(trimmed)
        ? { ok: false, reason: "future" }
        : { ok: true, iso: trimmed };
    }
    return EUROPEAN_DOB.test(trimmed)
      ? { ok: false, reason: "invalid_date" }
      : { ok: false, reason: "invalid_format" };
  }

  if (iso && isPetDateOfBirthInFuture(iso)) {
    return { ok: false, reason: "future" };
  }

  return { ok: true, iso };
}

/** Normalize stored/raw value to ISO for form state and database. */
export function normalizePetDobToIso(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  const trimmed = stored.trim();
  if (isIsoDateString(trimmed)) return trimmed;
  const fromEuropean = parseEuropeanDateToIso(trimmed);
  return fromEuropean ?? "";
}

/** Format stored ISO (or legacy text) for the DOB text field. */
export function formatPetDobForDisplay(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  const trimmed = stored.trim();
  if (isIsoDateString(trimmed)) return formatIsoDateToEuropean(trimmed);
  return trimmed;
}
