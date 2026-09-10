export type CampaignConsentCounts = {
  eligible: number;
  blocked: number;
  warning: string | null;
};

export function campaignConsentWarning(blockedCount: number): string | null {
  if (blockedCount <= 0) return null;
  return `${blockedCount} recipients cannot receive this campaign because they are not subscribed to marketing emails or have unsubscribed.`;
}

export function campaignConsentSummary(
  rows: Array<{ status?: string; consented: boolean }>,
): CampaignConsentCounts {
  const unsent = rows.filter((row) => row.status !== "sent");
  const eligible = unsent.filter((row) => row.consented).length;
  const blocked = unsent.filter((row) => !row.consented).length;
  return {
    eligible,
    blocked,
    warning: campaignConsentWarning(blocked),
  };
}

export function canEnableCampaignSend(input: { recipientCount: number; blockedCount: number; pendingCount: number }): boolean {
  void input.blockedCount;
  return input.recipientCount > 0 && input.pendingCount > 0;
}
