import { getExcelLabelEt } from "@/lib/excel-translations";
import type { Locale } from "@/i18n/translations";

export type LocalizedFilterOption = {
  value: string;
  labelEn: string;
  labelEt: string;
  aliases?: readonly string[];
};

/** Build a filter option; labelEt from Excel or English fallback when missing. */
export function buildLocalizedFilterOption(
  value: string,
  labelEn: string,
  aliases?: readonly string[],
): LocalizedFilterOption {
  const fromLabel = getExcelLabelEt(labelEn);
  const fromValue = getExcelLabelEt(value);
  const fromAliases = aliases
    ?.map((a) => getExcelLabelEt(a))
    .find((et): et is string => Boolean(et));
  return {
    value,
    labelEn,
    labelEt: fromLabel ?? fromValue ?? fromAliases ?? labelEn,
    aliases,
  };
}

export function filterOptionDisplayLabel(
  option: LocalizedFilterOption,
  locale: Locale,
): string {
  return locale === "et" ? option.labelEt : option.labelEn;
}

export function toFilterChipOptions(
  options: readonly LocalizedFilterOption[],
  locale: Locale,
): { value: string; label: string }[] {
  return options.map((o) => ({
    value: o.value,
    label: filterOptionDisplayLabel(o, locale),
  }));
}

export function localizedLabelForValue(
  options: readonly LocalizedFilterOption[],
  value: string,
  locale: Locale,
): string {
  const opt = options.find((o) => o.value === value);
  if (opt) return filterOptionDisplayLabel(opt, locale);
  return value;
}
