import { CAMPAIGN_TRACKED_LINKS, catalogLinkByKey, type CampaignTrackedLink } from "@/lib/email-campaigns/events";
import { defaultSeptemberTemplateConfig } from "@/lib/email-campaigns/template-config";

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isFacebookHost(host: string): boolean {
  return host === "facebook.com" || host === "www.facebook.com" || host === "m.facebook.com" || host === "fb.me" || host === "www.fb.me";
}

function isBlockedPublicHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".vercel.app") ||
    host === "127.0.0.1" ||
    host === "::1"
  );
}

/** Destinations come only from the click-token row, never from recipient/profile data. */
export function clickRedirectFromTokenRow(
  tokenRow: { destination_url: string; link_key?: string } | null,
  _recipient?: { email?: string | null; user_id?: string | null; display_name?: string | null } | null,
): string | null {
  void _recipient;
  if (!tokenRow?.destination_url) return null;
  if (!isSafeCampaignDestination(tokenRow.destination_url)) return null;
  return tokenRow.destination_url;
}

export function isSafeCampaignDestination(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  if (isBlockedPublicHost(host) || !host.includes(".")) return false;
  if (isFacebookHost(host)) {
    return parsed.pathname.includes("/events/") || parsed.pathname.startsWith("/e/") || parsed.pathname.startsWith("/event_invite/");
  }
  return true;
}

export function clickTokensMatchCatalog(
  rows: Array<{ link_key: string; destination_url: string; token: string }>,
  catalog: CampaignTrackedLink[] = CAMPAIGN_TRACKED_LINKS,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const byKey = new Map(rows.map((row) => [row.link_key, row]));
  for (const link of catalog) {
    const row = byKey.get(link.key);
    if (!row) {
      errors.push(`missing token for ${link.key}`);
      continue;
    }
    if (row.destination_url !== link.destinationUrl) {
      errors.push(`destination mismatch for ${link.key}`);
    }
    if (!isSafeCampaignDestination(row.destination_url)) {
      errors.push(`unsafe destination for ${link.key}`);
    }
    if (!row.token || row.token.length < 40) {
      errors.push(`weak token for ${link.key}`);
    }
  }
  for (const row of rows) {
    if (!catalog.some((link) => link.key === row.link_key)) {
      errors.push(`unexpected token for ${row.link_key}`);
    }
  }
  if (catalog.length === 0) {
    errors.push("empty catalog");
  }
  if (rows.length === 0) {
    errors.push("no click tokens");
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function describeClickLink(linkKey: string | null): { type: string; label: string } {
  if (!linkKey) return { type: "unknown", label: "Unknown link" };
  const catalog = catalogLinkByKey(linkKey);
  if (catalog) return { type: catalog.type, label: catalog.label };
  const fromConfig = defaultSeptemberTemplateConfig().sponsors.find((item) => item.key === linkKey);
  if (fromConfig) return { type: "sponsor", label: fromConfig.label };
  if (linkKey.startsWith("sponsor_")) return { type: "sponsor", label: linkKey };
  return { type: "event", label: linkKey };
}

export { hostnameOf };
