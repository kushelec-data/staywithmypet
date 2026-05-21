/** Normalize pets.care_type (array, string, or missing) for UI. */
export function normalizeCareTypes(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") {
          return item
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const parsed = JSON.parse(t) as unknown;
        return normalizeCareTypes(parsed);
      } catch {
        /* fall through */
      }
    }
    if (t.includes(",")) {
      return t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [t];
  }

  return [];
}

export function pickCareTypesFromRow(
  row: Record<string, unknown>,
  details: Record<string, unknown> = {},
): string[] {
  const fromCol = normalizeCareTypes(row.care_type);
  if (fromCol.length) return fromCol;

  const fromLegacyCol = normalizeCareTypes(row.care_types);
  if (fromLegacyCol.length) return fromLegacyCol;

  const fromDetails = normalizeCareTypes(details.care_type);
  if (fromDetails.length) return fromDetails;

  return normalizeCareTypes(details.care_types);
}
