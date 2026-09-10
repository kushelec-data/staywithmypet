export function isCampaignContentLocked(status: string): boolean {
  return ["test_sent", "sending", "partially_sent", "sent", "cancelled"].includes(status);
}

export function campaignLanguageLabel(input: { subjectEn?: string | null; subjectEt?: string | null }): string {
  const en = Boolean(input.subjectEn?.trim());
  const et = Boolean(input.subjectEt?.trim());
  if (en && et) return "EN + ET";
  if (et) return "ET";
  return "EN";
}

export function nextCampaignVersion(existingVersions: number[]): number {
  return Math.max(0, ...existingVersions) + 1;
}

export function versionLabel(versionNumber: number | null | undefined): string {
  return `v${versionNumber && versionNumber > 0 ? versionNumber : 1}`;
}
