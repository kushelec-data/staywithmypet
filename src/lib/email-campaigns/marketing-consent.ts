import { isValidCampaignEmail } from "@/lib/email-campaigns/csv-import";

export type MarketingConsentInput = {
  email: string;
  newsletterSubscribed: boolean;
  unsubscribed: boolean;
  suppressed?: boolean;
};

export type CampaignConsentFlags = {
  newsletterSubscribed: boolean;
  unsubscribed: boolean;
  suppressed?: boolean;
};

export type CampaignDeliveryBlockReason = "invalid_email" | "unsubscribed" | "suppressed";

export type CampaignDeliveryClassification = {
  email: string;
  newsletterSubscribed: boolean;
  unsubscribed: boolean;
  suppressed: boolean;
  missingNewsletter: boolean;
  validEmail: boolean;
  canDeliver: boolean;
  blockReason: CampaignDeliveryBlockReason | null;
};

export function normalizeMarketingEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Newsletter signup is used for registered-audience display only. Cookie marketing is not email consent. */
export function hasMarketingEmailConsent(input: MarketingConsentInput): boolean {
  const email = normalizeMarketingEmail(input.email);
  if (!email) return false;
  if (input.unsubscribed || input.suppressed) return false;
  return input.newsletterSubscribed;
}

/** CSV/campaign-list delivery: explicit unsubscribe/suppression always blocks. Missing newsletter does not. */
export function classifyCampaignRecipientDelivery(
  email: string,
  flags: CampaignConsentFlags,
): CampaignDeliveryClassification {
  const normalized = normalizeMarketingEmail(email);
  const validEmail = isValidCampaignEmail(normalized);
  const unsubscribed = flags.unsubscribed === true;
  const suppressed = flags.suppressed === true;
  const newsletterSubscribed = flags.newsletterSubscribed === true;
  let blockReason: CampaignDeliveryBlockReason | null = null;
  if (!validEmail) blockReason = "invalid_email";
  else if (unsubscribed) blockReason = "unsubscribed";
  else if (suppressed) blockReason = "suppressed";
  return {
    email: normalized,
    newsletterSubscribed,
    unsubscribed,
    suppressed,
    missingNewsletter: validEmail && !newsletterSubscribed,
    validEmail,
    canDeliver: blockReason === null,
    blockReason,
  };
}

export function canDeliverCampaignRecipient(email: string, flags: CampaignConsentFlags): boolean {
  return classifyCampaignRecipientDelivery(email, flags).canDeliver;
}

export function filterMarketingEligible<T extends { email: string }>(
  rows: T[],
  consentByEmail: Map<string, CampaignConsentFlags>,
): { eligible: T[]; excluded: T[] } {
  const eligible: T[] = [];
  const excluded: T[] = [];
  for (const row of rows) {
    const key = normalizeMarketingEmail(row.email);
    const consent = consentByEmail.get(key) ?? { newsletterSubscribed: false, unsubscribed: false };
    if (hasMarketingEmailConsent({ email: key, ...consent })) eligible.push(row);
    else excluded.push(row);
  }
  return { eligible, excluded };
}

export function filterDeliverableCampaignRecipients<T extends { email: string }>(
  rows: T[],
  consentByEmail: Map<string, CampaignConsentFlags>,
): { eligible: T[]; excluded: T[] } {
  const eligible: T[] = [];
  const excluded: T[] = [];
  for (const row of rows) {
    const key = normalizeMarketingEmail(row.email);
    const consent = consentByEmail.get(key) ?? { newsletterSubscribed: false, unsubscribed: false };
    if (canDeliverCampaignRecipient(key, consent)) eligible.push(row);
    else excluded.push(row);
  }
  return { eligible, excluded };
}

export function bulkSendConsentGate(pending: Array<{ email: string; consented: boolean }>): {
  allowed: boolean;
  consented: number;
  missingConsent: number;
} {
  const consented = pending.filter((row) => row.consented).length;
  const missingConsent = pending.length - consented;
  return {
    allowed: missingConsent === 0,
    consented,
    missingConsent,
  };
}
