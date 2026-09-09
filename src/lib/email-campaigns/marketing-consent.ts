export type MarketingConsentInput = {
  email: string;
  newsletterSubscribed: boolean;
  unsubscribed: boolean;
};

export function normalizeMarketingEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Newsletter signup is the only stored marketing-email consent today. Cookie marketing is not email consent. */
export function hasMarketingEmailConsent(input: MarketingConsentInput): boolean {
  const email = normalizeMarketingEmail(input.email);
  if (!email) return false;
  if (input.unsubscribed) return false;
  return input.newsletterSubscribed;
}

export function filterMarketingEligible<T extends { email: string }>(
  rows: T[],
  consentByEmail: Map<string, { newsletterSubscribed: boolean; unsubscribed: boolean }>,
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

export function bulkSendConsentGate(pending: Array<{ email: string; consented: boolean }>): {
  allowed: boolean;
  consented: number;
  missingConsent: number;
} {
  const consented = pending.filter((row) => row.consented).length;
  const missingConsent = pending.length - consented;
  return {
    allowed: pending.length > 0 && missingConsent === 0,
    consented,
    missingConsent,
  };
}
