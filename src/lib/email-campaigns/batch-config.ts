export type CampaignBatchConfig = {
  size: number;
  delayMs: number;
};

function intEnv(env: Record<string, string | undefined>, key: string, fallback: number): number {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Conservative defaults. Not a provider billing limit. */
export function campaignBatchConfig(env: Record<string, string | undefined> = process.env): CampaignBatchConfig {
  const size = Math.min(50, Math.max(1, intEnv(env, "EMAIL_CAMPAIGN_BATCH_SIZE", 10)));
  const delayMs = Math.min(10 * 60_000, Math.max(0, intEnv(env, "EMAIL_CAMPAIGN_BATCH_DELAY_MS", 80_000)));
  return { size, delayMs };
}

export function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
