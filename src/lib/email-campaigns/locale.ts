export type CampaignLanguage = "en" | "et";

/** ET uses Estonian template; anything else (including unknown) uses English. */
export function campaignLanguageFromPreferredLocale(locale: string | null | undefined): CampaignLanguage {
  const normalized = locale?.trim().toLowerCase();
  if (normalized === "et" || normalized === "et-ee") return "et";
  return "en";
}

export function eventButtonLabel(language: CampaignLanguage): string {
  return language === "et" ? "VAATA SÜNDMUST →" : "VIEW EVENT →";
}
