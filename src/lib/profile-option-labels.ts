/**
 * Localized labels for profile form chips and selects.
 * Estonian copy from C:\Users\kush\staywithmypet\Profile translations.xlsx (sheet Profile translations).
 */

import { translateProfileLabel } from "@/lib/profile-translations";
import type { Locale } from "@/i18n/translations";

export function profileOptionLabel(labelEn: string, locale: Locale): string {
  return translateProfileLabel(labelEn, locale);
}

export function toProfileStringChipOptions(
  values: readonly string[],
  locale: Locale,
): { value: string; label: string }[] {
  return values.map((value) => ({
    value,
    label: profileOptionLabel(value, locale),
  }));
}

export function toProfileLabeledChipOptions(
  options: readonly { value: string; label: string }[],
  locale: Locale,
): { value: string; label: string }[] {
  return options.map((opt) => ({
    value: opt.value,
    label: profileOptionLabel(opt.label, locale),
  }));
}
