/** Format E.164 phone numbers for display and tel: links. */

export function normalizeTelHref(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/[^\d+]/g, "");
  if (!digitsOnly) return null;
  if (digitsOnly.startsWith("+")) return `tel:${digitsOnly}`;
  if (digitsOnly.startsWith("00")) return `tel:+${digitsOnly.slice(2)}`;
  return `tel:+${digitsOnly.replace(/^\+/, "")}`;
}

export function formatPhoneForDisplay(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const compact = phone.trim().replace(/[^\d+]/g, "");
  if (!compact) return null;

  const e164 = compact.startsWith("+") ? compact : `+${compact}`;
  const estoniaMatch = /^\+372(\d{8})$/.exec(e164);
  if (estoniaMatch) {
    const local = estoniaMatch[1];
    return `+372 ${local.slice(0, 4)} ${local.slice(4)}`;
  }

  const genericMatch = /^\+(\d{1,3})(\d+)$/.exec(e164);
  if (genericMatch) {
    const [, country, rest] = genericMatch;
    if (rest.length <= 4) return `+${country} ${rest}`;
    return `+${country} ${rest.replace(/(\d{4})(?=\d)/g, "$1 ").trim()}`;
  }

  return phone.trim();
}

export function telHrefFromPhone(phone: string | null | undefined): string | null {
  const display = formatPhoneForDisplay(phone);
  if (!display) return null;
  return normalizeTelHref(display);
}
