import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { CANONICAL_CAMPAIGN_EMAIL_ORIGIN } from "@/lib/email-campaigns/public-base";

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

export type CampaignContentFields = {
  subjectEn: string;
  subjectEt: string;
  htmlEn: string;
  htmlEt: string;
};

/** Shared by preview and SMTP. Send language comes from send mode + recipient row, never the campaign title or preview pane. */
export function selectCampaignContent(
  language: string | null | undefined,
  fields: CampaignContentFields,
): { language: CampaignLanguage; subject: string; html: string; template: "ET" | "EN" } {
  const selected = campaignLanguageFromPreferredLocale(language);
  if (selected === "et") {
    return { language: "et", subject: fields.subjectEt, html: fields.htmlEt, template: "ET" };
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
  template: "ET" | "EN";
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
  linkKeys: string[];
  destinationsOk: boolean;
}): RecipientSendPlan {
  const selected = selectCampaignContent(input.language, {
    subjectEn: input.subjectEn,
    subjectEt: input.subjectEt,
    htmlEn: input.htmlEn,
    htmlEt: input.htmlEt,
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
