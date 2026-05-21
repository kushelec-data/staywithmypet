/** European dial codes for StayWithMyPet phone inputs. */

export type EuPhoneCountry = {
  iso: string;
  name: string;
  dialCode: string;
};

export const EU_PHONE_COUNTRIES: readonly EuPhoneCountry[] = [
  { iso: "EE", name: "Estonia", dialCode: "+372" },
  { iso: "FI", name: "Finland", dialCode: "+358" },
  { iso: "LV", name: "Latvia", dialCode: "+371" },
  { iso: "LT", name: "Lithuania", dialCode: "+370" },
  { iso: "SE", name: "Sweden", dialCode: "+46" },
  { iso: "DK", name: "Denmark", dialCode: "+45" },
  { iso: "NO", name: "Norway", dialCode: "+47" },
  { iso: "DE", name: "Germany", dialCode: "+49" },
  { iso: "FR", name: "France", dialCode: "+33" },
  { iso: "NL", name: "Netherlands", dialCode: "+31" },
  { iso: "BE", name: "Belgium", dialCode: "+32" },
  { iso: "ES", name: "Spain", dialCode: "+34" },
  { iso: "IT", name: "Italy", dialCode: "+39" },
  { iso: "PL", name: "Poland", dialCode: "+48" },
  { iso: "CZ", name: "Czech Republic", dialCode: "+420" },
  { iso: "AT", name: "Austria", dialCode: "+43" },
  { iso: "IE", name: "Ireland", dialCode: "+353" },
  { iso: "PT", name: "Portugal", dialCode: "+351" },
  { iso: "GR", name: "Greece", dialCode: "+30" },
] as const;

export const DEFAULT_PHONE_DIAL_CODE = "+372";

export function normalizeDialCode(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return DEFAULT_PHONE_DIAL_CODE;
  return t.startsWith("+") ? t : `+${t.replace(/^\+/, "")}`;
}

/** Strip spaces, dashes, and common separators from the national part. */
export function normalizeNationalDigits(national: string): string {
  return national.replace(/[\s().-]/g, "").replace(/^0+/, "");
}

export function buildPhoneE164(dialCode: string, national: string): string {
  const code = normalizeDialCode(dialCode);
  const digits = normalizeNationalDigits(national);
  if (!digits) return "";
  return `${code}${digits}`;
}

export function isValidE164(e164: string): boolean {
  if (!e164.startsWith("+")) return false;
  const rest = e164.slice(1);
  if (!/^\d{6,14}$/.test(rest)) return false;
  return true;
}

export function parseDialCodeFromE164(e164: string | null | undefined): {
  dialCode: string;
  nationalDigits: string;
} {
  if (!e164?.trim()) {
    return { dialCode: DEFAULT_PHONE_DIAL_CODE, nationalDigits: "" };
  }
  const trimmed = e164.trim();
  const sorted = [...EU_PHONE_COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );
  for (const c of sorted) {
    if (trimmed.startsWith(c.dialCode)) {
      return {
        dialCode: c.dialCode,
        nationalDigits: trimmed.slice(c.dialCode.length),
      };
    }
  }
  const m = trimmed.match(/^\+(\d{1,3})(\d+)$/);
  if (m) {
    return { dialCode: `+${m[1]}`, nationalDigits: m[2] };
  }
  return { dialCode: DEFAULT_PHONE_DIAL_CODE, nationalDigits: "" };
}
