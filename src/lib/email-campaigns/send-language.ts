import { campaignLanguageFromPreferredLocale, type CampaignLanguage } from "@/lib/email-campaigns/locale";
import { LIVING_WELL_20_SEP_EN_TEMPLATE_KEY } from "@/lib/email-campaigns/events";

export type SendLanguageMode = "automatic" | "en" | "et";
export type CampaignLanguageMode = "automatic" | "english_only";

export function parseSendLanguageMode(value: unknown): SendLanguageMode {
  if (value === "en" || value === "et" || value === "automatic") return value;
  return "automatic";
}

export function parseCampaignLanguageMode(value: unknown): CampaignLanguageMode {
  return value === "english_only" ? "english_only" : "automatic";
}

export function campaignLanguageModeFromRecord(input: {
  languageMode?: unknown;
  templateKey?: string | null;
}): CampaignLanguageMode {
  if (parseCampaignLanguageMode(input.languageMode) === "english_only") return "english_only";
  if (input.templateKey === LIVING_WELL_20_SEP_EN_TEMPLATE_KEY) return "english_only";
  return "automatic";
}

/** Campaign english_only overrides send-mode and recipient locale for BODY selection only. */
export function resolveRecipientSendLanguage(input: {
  campaignLanguageMode: CampaignLanguageMode;
  sendLanguageMode: SendLanguageMode;
  recipientLanguage: string | null | undefined;
}): CampaignLanguage {
  if (input.campaignLanguageMode === "english_only") return "en";
  return resolveSendLanguage(input.sendLanguageMode, input.recipientLanguage);
}

export function campaignRecipientSummary(
  recipientCount: number,
  languageMode: CampaignLanguageMode,
  stored?: { english: number; estonian: number },
): string {
  if (languageMode === "english_only") {
    return `${recipientCount} recipient${recipientCount === 1 ? "" : "s"} · English email`;
  }
  return `${stored?.english ?? 0} English · ${stored?.estonian ?? 0} Estonian`;
}

function safeFailureLine(row: { email?: string; reason?: string }): string {
  const reason = String(row.reason ?? "send_failed")
    .replace(/\b(?:SMTP_)?PASS(?:WORD)?[=:][^\s,;]+/gi, "[redacted]")
    .replace(/\bSMTP_PASSWORD\b/gi, "[redacted]");
  return row.email ? `${row.email}: ${reason}` : reason;
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
  campaignLanguageMode: CampaignLanguageMode = "automatic",
): RecipientRoutingRow[] {
  return rows.map((row) => {
    const storedLanguage = campaignLanguageFromPreferredLocale(row.language);
    const sendLanguage = resolveRecipientSendLanguage({
      campaignLanguageMode,
      sendLanguageMode: mode,
      recipientLanguage: row.language,
    });
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
  _kind: "test" | "campaign",
  stats: {
    sent: number;
    failed: number;
    sentEstonian?: number;
    sentEnglish?: number;
    languageMode?: CampaignLanguageMode;
    failures?: Array<{ email?: string; reason?: string }>;
  },
): string {
  const sent = Number(stats.sent) || 0;
  const failed = Number(stats.failed) || 0;
  const failureLines = (stats.failures ?? []).slice(0, 8).map(safeFailureLine);

  if (sent === 0 && failed === 0) {
    return "No eligible recipients were found";
  }
  if (sent === 0) {
    return ["No emails were sent", ...failureLines].join("\n");
  }
  if (failed === 0) {
    return sent === 1 ? "1 email sent successfully" : `${sent} emails sent successfully`;
  }
  return [`${sent} sent · ${failed} failed`, ...failureLines].join("\n");
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
