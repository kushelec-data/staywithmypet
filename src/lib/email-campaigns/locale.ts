import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { CANONICAL_CAMPAIGN_EMAIL_ORIGIN } from "@/lib/email-campaigns/public-base";

export type CampaignLanguage = "en" | "et" | "ru";
export type StoredCampaignLanguage = "en" | "et";
export type CampaignTemplate = "EN" | "ET" | "RU";

/** Recipient rows can only store EN/ET. Combined campaigns still keep stored RU as EN. */
export function storedCampaignRecipientLanguage(locale: string | null | undefined): StoredCampaignLanguage {
  return campaignLanguageFromPreferredLocale(locale) === "et" ? "et" : "en";
}

/** ET/RU use that language's template; anything else (including unknown) uses English. */
export function campaignLanguageFromPreferredLocale(locale: string | null | undefined): CampaignLanguage {
  const normalized = locale?.trim().toLowerCase();
  if (normalized === "et" || normalized === "et-ee") return "et";
  if (
    normalized === "ru" ||
    normalized === "ru-ru" ||
    normalized === "russian" ||
    normalized === "русский" ||
    normalized === "vene"
  ) {
    return "ru";
  }
  return "en";
}

export function eventButtonLabel(language: CampaignLanguage): string {
  if (language === "et") return "VAATA SÜNDMUST →";
  if (language === "ru") return "СМОТРЕТЬ СОБЫТИЕ →";
  return "VIEW EVENT →";
}

export function htmlHasExpectedLanguageMarkers(html: string, language: CampaignLanguage): boolean {
  const hasEtCta = html.includes("VAATA SÜNDMUST") || html.includes("VAATA ÜRITUST");
  const hasRuCta = html.includes("ПОСМОТРЕТЬ СОБЫТИЕ") || html.includes("СМОТРЕТЬ СОБЫТИЕ");
  const hasEnCta = html.includes("VIEW EVENT") || html.includes("SEE EVENT");
  if (language === "et") return hasEtCta;
  if (language === "ru") return hasRuCta;
  return hasEnCta;
}

export type CampaignContentFields = {
  subjectEn: string;
  subjectEt: string;
  htmlEn: string;
  htmlEt: string;
  subjectRu?: string;
  htmlRu?: string;
};

/** Shared by preview and SMTP. Send language comes from send mode + recipient row, never the campaign title or preview pane. */
export function selectCampaignContent(
  language: string | null | undefined,
  fields: CampaignContentFields,
): { language: CampaignLanguage; subject: string; html: string; template: CampaignTemplate } {
  const selected = campaignLanguageFromPreferredLocale(language);
  if (selected === "et") {
    return { language: "et", subject: fields.subjectEt, html: fields.htmlEt, template: "ET" };
  }
  if (selected === "ru" && fields.htmlRu && fields.subjectRu) {
    return { language: "ru", subject: fields.subjectRu, html: fields.htmlRu, template: "RU" };
  }
  return { language: "en", subject: fields.subjectEn, html: fields.htmlEn, template: "EN" };
}

export function summarizeClickTokenKinds(linkKeys: string[]): { eventTokens: number; sponsorTokens: number } {
  return {
    eventTokens: linkKeys.filter((key) => key.startsWith("event_")).length,
    sponsorTokens: linkKeys.filter((key) => key.startsWith("sponsor_")).length,
  };
}

export type RecipientSendPlan = {
  email: string;
  language: CampaignLanguage;
  subject: string;
  template: CampaignTemplate;
  trackingBase: string;
  eventTokens: number;
  sponsorTokens: number;
  from: string;
  smtpReady: boolean;
  blockReason?: string;
};

export function planRecipientSend(input: {
  email: string;
  language: string | null | undefined;
  subjectEn: string;
  subjectEt: string;
  htmlEn: string;
  htmlEt: string;
  subjectRu?: string;
  htmlRu?: string;
  linkKeys: string[];
  destinationsOk: boolean;
}): RecipientSendPlan {
  const selected = selectCampaignContent(input.language, {
    subjectEn: input.subjectEn,
    subjectEt: input.subjectEt,
    htmlEn: input.htmlEn,
    htmlEt: input.htmlEt,
    subjectRu: input.subjectRu,
    htmlRu: input.htmlRu,
  });
  const kinds = summarizeClickTokenKinds(input.linkKeys);
  const smtpReady = input.destinationsOk && kinds.eventTokens > 0;
  return {
    email: input.email,
    language: selected.language,
    subject: selected.subject,
    template: selected.template,
    trackingBase: CANONICAL_CAMPAIGN_EMAIL_ORIGIN,
    eventTokens: kinds.eventTokens,
    sponsorTokens: kinds.sponsorTokens,
    from: CAMPAIGN_FROM_HEADER,
    smtpReady,
    blockReason: smtpReady ? undefined : "destination_mismatch",
  };
}

export function russianBodiesFromTemplateConfig(raw: unknown): { subjectRu: string; htmlRu: string } {
  if (!raw || typeof raw !== "object") return { subjectRu: "", htmlRu: "" };
  const record = raw as Record<string, unknown>;
  return {
    subjectRu: typeof record.subjectRu === "string" ? record.subjectRu : "",
    htmlRu: typeof record.htmlRu === "string" ? record.htmlRu : "",
  };
}
