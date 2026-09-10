import { campaignLanguageFromPreferredLocale, type CampaignLanguage } from "@/lib/email-campaigns/locale";

export type SendLanguageMode = "automatic" | "en" | "et";

export function parseSendLanguageMode(value: unknown): SendLanguageMode {
  if (value === "en" || value === "et" || value === "automatic") return value;
  return "automatic";
}

/** Campaign title is never used. Preview language is never used. */
export function resolveSendLanguage(mode: SendLanguageMode, recipientLanguage: string | null | undefined): CampaignLanguage {
  if (mode === "en") return "en";
  if (mode === "et") return "et";
  return campaignLanguageFromPreferredLocale(recipientLanguage);
}

export function sendLanguageModeLabel(mode: SendLanguageMode): string {
  if (mode === "en") return "English";
  if (mode === "et") return "Estonian";
  return "mixed EN/ET";
}

export function sendActionLabel(kind: "test" | "campaign", mode: SendLanguageMode): string {
  const suffix = sendLanguageModeLabel(mode);
  return kind === "test" ? `Send test — ${suffix}` : `Send campaign — ${suffix}`;
}

export function languageWord(language: CampaignLanguage): "Estonian" | "English" {
  return language === "et" ? "Estonian" : "English";
}

export type RecipientRoutingRow = {
  name: string;
  email: string;
  storedLanguage: CampaignLanguage;
  sendLanguage: CampaignLanguage;
  sendLabel: "Estonian" | "English";
};

export function recipientSendRouting(
  rows: Array<{ name: string; email: string; language: string }>,
  mode: SendLanguageMode,
): RecipientRoutingRow[] {
  return rows.map((row) => {
    const storedLanguage = campaignLanguageFromPreferredLocale(row.language);
    const sendLanguage = resolveSendLanguage(mode, row.language);
    return {
      name: row.name,
      email: row.email,
      storedLanguage,
      sendLanguage,
      sendLabel: languageWord(sendLanguage),
    };
  });
}

export function storedLanguageCounts(rows: Array<{ language: string }>): { recipients: number; estonian: number; english: number } {
  const estonian = rows.filter((row) => campaignLanguageFromPreferredLocale(row.language) === "et").length;
  return { recipients: rows.length, estonian, english: rows.length - estonian };
}

export function routingHeading(mode: SendLanguageMode): string {
  if (mode === "en") return "English only routing:";
  if (mode === "et") return "Estonian only routing:";
  return "Automatic language routing:";
}

export function formatSendCompletedMessage(
  kind: "test" | "campaign",
  stats: { sent: number; failed: number; sentEstonian: number; sentEnglish: number },
): string {
  const title = kind === "test" ? "Send test completed" : "Campaign send completed";
  return `${title}\n${stats.sent} sent\n- ${stats.sentEstonian} Estonian\n- ${stats.sentEnglish} English\n${stats.failed} failed`;
}

export function bilingualCampaignDisplayName(name: string): string {
  return name.replace(/\s*\((Estonian|English)\)\s*$/i, "").trim() || name;
}

export function countSentByTemplate(templates: Array<"ET" | "EN" | undefined>): { sentEstonian: number; sentEnglish: number } {
  return {
    sentEstonian: templates.filter((value) => value === "ET").length,
    sentEnglish: templates.filter((value) => value === "EN").length,
  };
}
