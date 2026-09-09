/** Permanent public origin for links embedded in recipient-facing campaign emails. */
export const CANONICAL_CAMPAIGN_EMAIL_ORIGIN = "https://www.staywithmypet.ee";

const CANONICAL_HOSTS = new Set(["www.staywithmypet.ee", "staywithmypet.ee"]);

export type CampaignEmailOriginResult =
  | { ok: true; origin: string; source: "EMAIL_PUBLIC_BASE_URL" | "canonical_default" }
  | { ok: false; reason: string };

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function isEphemeralOrLocalEmailOrigin(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(normalizeOrigin(value).includes("://") ? normalizeOrigin(value) : `https://${normalizeOrigin(value)}`);
  } catch {
    return true;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".vercel.app") || host === "vercel.app" || host.endsWith(".vercel.live")) return true;
  if (process.env.VERCEL_URL?.trim() && host === process.env.VERCEL_URL.trim().toLowerCase().replace(/:\d+$/, "")) {
    return true;
  }
  return false;
}

export function isCanonicalCampaignEmailOrigin(value: string): boolean {
  try {
    const parsed = new URL(normalizeOrigin(value));
    if (parsed.protocol !== "https:") return false;
    if (isEphemeralOrLocalEmailOrigin(parsed.origin)) return false;
    return CANONICAL_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Always emit www so tracking URLs never mix apex and www. */
export function canonicalizeCampaignEmailOrigin(value: string): string | null {
  if (!isCanonicalCampaignEmailOrigin(value)) return null;
  return CANONICAL_CAMPAIGN_EMAIL_ORIGIN;
}

/**
 * Origin for campaign tracking pixels and click URLs.
 * Never uses the request host, VERCEL_URL, or preview deployments.
 */
export function resolveCampaignEmailOrigin(
  env: Record<string, string | undefined> = process.env,
): CampaignEmailOriginResult {
  const configured = env.EMAIL_PUBLIC_BASE_URL?.trim();
  if (configured) {
    if (isEphemeralOrLocalEmailOrigin(configured) || !isCanonicalCampaignEmailOrigin(configured)) {
      return {
        ok: false,
        reason: "invalid_email_public_base_url",
      };
    }
    return { ok: true, origin: CANONICAL_CAMPAIGN_EMAIL_ORIGIN, source: "EMAIL_PUBLIC_BASE_URL" };
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl && isCanonicalCampaignEmailOrigin(siteUrl) && !isEphemeralOrLocalEmailOrigin(siteUrl)) {
    return { ok: true, origin: CANONICAL_CAMPAIGN_EMAIL_ORIGIN, source: "canonical_default" };
  }

  return { ok: true, origin: CANONICAL_CAMPAIGN_EMAIL_ORIGIN, source: "canonical_default" };
}

export function requireCampaignEmailOrigin(
  env: Record<string, string | undefined> = process.env,
): CampaignEmailOriginResult {
  const resolved = resolveCampaignEmailOrigin(env);
  if (!resolved.ok) return resolved;
  if (isEphemeralOrLocalEmailOrigin(resolved.origin)) {
    return { ok: false, reason: "ephemeral_email_origin" };
  }
  if (resolved.origin !== CANONICAL_CAMPAIGN_EMAIL_ORIGIN) {
    return { ok: false, reason: "non_canonical_email_origin" };
  }
  return resolved;
}

export function campaignEmailAssetUrl(path: string, origin = CANONICAL_CAMPAIGN_EMAIL_ORIGIN): string {
  const base = origin.replace(/\/$/, "");
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function htmlContainsEphemeralTrackingHost(html: string): boolean {
  return /https?:\/\/[^"'>\s]*(localhost|127\.0\.0\.1|vercel\.app|vercel\.live)/i.test(html);
}
