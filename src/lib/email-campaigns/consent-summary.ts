import { classifyCampaignRecipientDelivery, normalizeMarketingEmail } from "@/lib/email-campaigns/marketing-consent";

export type CampaignConsentCounts = {
  eligible: number;
  blocked: number;
  warning: string | null;
  csvRecipients: number;
  explicitlyUnsubscribed: number;
  suppressed: number;
  invalid: number;
  duplicates: number;
};

export type CampaignEligibilityRow = {
  email: string;
  status?: string;
  unsubscribed?: boolean;
  suppressed?: boolean;
  newsletterSubscribed?: boolean;
  consented?: boolean;
};

export function campaignConsentWarning(input: {
  explicitlyUnsubscribed: number;
  suppressed: number;
  invalid: number;
}): string | null {
  const parts: string[] = [];
  if (input.explicitlyUnsubscribed > 0) {
    parts.push(
      `${input.explicitlyUnsubscribed} explicitly unsubscribed`,
    );
  }
  if (input.suppressed > 0) {
    parts.push(`${input.suppressed} suppressed/opted out`);
  }
  if (input.invalid > 0) {
    parts.push(`${input.invalid} invalid`);
  }
  if (parts.length === 0) return null;
  return `${parts.join("; ")}. These recipients will not be emailed.`;
}

export function campaignEligibilityBreakdown(rows: CampaignEligibilityRow[]): CampaignConsentCounts {
  const seen = new Set<string>();
  let duplicates = 0;
  let explicitlyUnsubscribed = 0;
  let suppressed = 0;
  let invalid = 0;
  let eligible = 0;

  for (const row of rows) {
    const email = normalizeMarketingEmail(row.email);
    if (seen.has(email)) {
      duplicates += 1;
      continue;
    }
    seen.add(email);
    const classified = classifyCampaignRecipientDelivery(email, {
      newsletterSubscribed: row.newsletterSubscribed === true,
      unsubscribed: row.unsubscribed === true,
      suppressed: row.suppressed === true,
    });
    if (classified.blockReason === "unsubscribed") explicitlyUnsubscribed += 1;
    else if (classified.blockReason === "suppressed") suppressed += 1;
    else if (classified.blockReason === "invalid_email") invalid += 1;
    if (row.status !== "sent" && classified.canDeliver) eligible += 1;
  }

  const blocked = explicitlyUnsubscribed + suppressed + invalid;
  return {
    csvRecipients: rows.length,
    explicitlyUnsubscribed,
    suppressed,
    invalid,
    duplicates,
    eligible,
    blocked,
    warning: campaignConsentWarning({ explicitlyUnsubscribed, suppressed, invalid }),
  };
}

export function campaignEligibilityLines(counts: CampaignConsentCounts): string[] {
  return [
    `CSV recipients: ${counts.csvRecipients}`,
    `Explicitly unsubscribed: ${counts.explicitlyUnsubscribed}`,
    `Suppressed/opted out: ${counts.suppressed}`,
    `Invalid: ${counts.invalid}`,
    `Duplicates: ${counts.duplicates}`,
    `Eligible to send: ${counts.eligible}`,
  ];
}

export function campaignConsentSummary(rows: CampaignEligibilityRow[]): CampaignConsentCounts {
  return campaignEligibilityBreakdown(rows);
}

export function canEnableCampaignSend(input: { eligible: number; pendingCount: number; recipientCount?: number }): boolean {
  void input.recipientCount;
  return input.eligible > 0 && input.pendingCount > 0;
}
