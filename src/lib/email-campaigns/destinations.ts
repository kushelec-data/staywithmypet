import { catalogLinkByKey, CAMPAIGN_TRACKED_LINKS } from "@/lib/email-campaigns/events";

const ALLOWED_SPONSOR_HOSTS = new Set(["petcity.ee", "www.petcity.ee", "gelatoladies.ee", "www.gelatoladies.ee", "restoranmoon.ee", "www.restoranmoon.ee"]);

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
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
  const host = parsed.hostname.toLowerCase();
  if (host === "facebook.com" || host === "www.facebook.com" || host === "m.facebook.com" || host === "fb.me" || host === "www.fb.me") {
    return parsed.pathname.includes("/events/") || parsed.pathname.startsWith("/e/") || parsed.pathname.startsWith("/event_invite/");
  }
  return ALLOWED_SPONSOR_HOSTS.has(host);
}

export function clickTokensMatchCatalog(
  rows: Array<{ link_key: string; destination_url: string; token: string }>,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const byKey = new Map(rows.map((row) => [row.link_key, row]));
  for (const link of CAMPAIGN_TRACKED_LINKS) {
    const row = byKey.get(link.key);
    if (!row) {
      errors.push(`missing token for ${link.key}`);
      continue;
    }
    if (row.destination_url !== link.destinationUrl) {
      errors.push(`destination mismatch for ${link.key}`);
    }
    if (!row.token || row.token.length < 40) {
      errors.push(`weak token for ${link.key}`);
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function describeClickLink(linkKey: string | null): { type: string; label: string } {
  if (!linkKey) return { type: "unknown", label: "Unknown link" };
  const catalog = catalogLinkByKey(linkKey);
  if (catalog) return { type: catalog.type, label: catalog.label };
  if (linkKey.startsWith("sponsor_")) return { type: "sponsor", label: linkKey };
  return { type: "event", label: linkKey };
}
