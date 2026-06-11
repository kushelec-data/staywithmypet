import {
  getListingSearchLabelEt,
  type ListingSearchScope,
} from "@/lib/listing-search-translations";
import type { Locale } from "@/i18n/translations";

export type LocalizedFilterOption = {
  value: string;
  labelEn: string;
  labelEt: string;
  aliases?: readonly string[];
};

function resolveLabelEt(
  value: string,
  labelEn: string,
  aliases: readonly string[] | undefined,
  scope: ListingSearchScope,
): string {
  const fromLabel = getListingSearchLabelEt(labelEn, scope);
  const fromValue = getListingSearchLabelEt(value, scope);
  const fromAliases = aliases
    ?.map((a) => getListingSearchLabelEt(a, scope))
    .find((et): et is string => Boolean(et));
  return fromLabel ?? fromValue ?? fromAliases ?? labelEn;
}

/** Build a filter option; labelEt from listing search translations.xlsx. */
export function buildLocalizedFilterOption(
  value: string,
  labelEn: string,
  aliases?: readonly string[],
  scope: ListingSearchScope = "pet",
): LocalizedFilterOption {
  return {
    value,
    labelEn,
    labelEt: resolveLabelEt(value, labelEn, aliases, scope),
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
