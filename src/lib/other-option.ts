/** Shared helpers for "Other" chip/select options in profile and pet forms. */

export const OTHER_OPTION_VALUE = "other";
export const OTHER_OPTION_LABEL = "Other";

export function isOtherOptionValue(value: string): boolean {
  return value.trim().toLowerCase() === OTHER_OPTION_VALUE;
}

export function resolveOtherDisplay(
  value: string,
  customText: string | null | undefined,
  fallback = OTHER_OPTION_LABEL,
): string {
  if (!isOtherOptionValue(value)) return value;
  return customText?.trim() || fallback;
}

export function formatListWithOtherDisplay(
  values: string[],
  customOtherText: string | null | undefined,
  formatItem: (value: string) => string = (v) => v,
): string[] {
  const custom = customOtherText?.trim();
  return values
    .map((v) => (isOtherOptionValue(v) ? custom || OTHER_OPTION_LABEL : formatItem(v)))
    .filter(Boolean);
}

export type OtherFieldCheck = {
  selected: readonly string[];
  otherText: string;
  fieldLabel: string;
};

export function missingOtherOptionText({ selected, otherText, fieldLabel }: OtherFieldCheck): string | null {
  if (selected.some(isOtherOptionValue) && !otherText.trim()) {
    return `Please specify ${fieldLabel.toLowerCase()}.`;
  }
  return null;
}

export function validateOtherOptionFields(checks: OtherFieldCheck[]): string | null {
  for (const check of checks) {
    const message = missingOtherOptionText(check);
    if (message) return message;
  }
  return null;
}

export function strFromOtherField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const OTHER_FIELD_COPY = {
  petType: {
    label: "What animal?",
    placeholder: "e.g. horse, turtle, ferret",
  },
  careType: {
    label: "What care type?",
    placeholder: "e.g. grooming help, training support",
  },
  petSpecies: {
    label: "What species is your pet?",
    placeholder: "e.g. guinea pig, ferret",
  },
  gender: {
    label: "Please specify gender",
    placeholder: "e.g. unknown, intersex",
  },
  livingType: {
    label: "What type of home?",
    placeholder: "e.g. farmhouse, studio",
  },
} as const;
