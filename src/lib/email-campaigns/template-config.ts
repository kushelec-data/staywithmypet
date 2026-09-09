export type SponsorLineItem = {
  key: string;
  label: string;
  destinationUrl: string | null;
};

/** Display order for the partner line. Null destination = plain text, not tracked. */
export const SEPTEMBER_SPONSOR_LINE: SponsorLineItem[] = [
  { key: "sponsor_petcity", label: "PetCity", destinationUrl: "https://www.petcity.ee/" },
  { key: "sponsor_platinum", label: "Platinum", destinationUrl: "https://www.koeratoit.ee/" },
  { key: "sponsor_viwell", label: "ViWell", destinationUrl: "https://viwelldrinks.com/" },
  { key: "sponsor_semu", label: "Semu", destinationUrl: "https://semujuice.eu/en" },
  { key: "sponsor_yook", label: "YOOK", destinationUrl: "https://yook.eu/" },
  { key: "sponsor_gelato_ladies", label: "Gelato Ladies", destinationUrl: "https://www.gelatoladies.ee/" },
  { key: "sponsor_moon", label: "Moon", destinationUrl: "https://restoranmoon.ee/" },
];

export type CampaignTemplateConfig = {
  sponsors: SponsorLineItem[];
};

export type TrackedSponsorLink = {
  key: string;
  type: "sponsor";
  label: string;
  destinationUrl: string;
};

export function defaultSeptemberTemplateConfig(): CampaignTemplateConfig {
  return {
    sponsors: SEPTEMBER_SPONSOR_LINE.map((item) => ({ ...item })),
  };
}

export function parseTemplateConfig(raw: unknown): CampaignTemplateConfig {
  const fallback = defaultSeptemberTemplateConfig();
  if (!raw || typeof raw !== "object") return fallback;
  const sponsors = (raw as { sponsors?: unknown }).sponsors;
  if (!Array.isArray(sponsors)) return fallback;
  const parsed: SponsorLineItem[] = sponsors
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const key = String(item.key ?? "").trim();
      const label = String(item.label ?? "").trim();
      if (!key || !label) return null;
      const dest = typeof item.destinationUrl === "string" ? item.destinationUrl.trim() : "";
      return {
        key,
        label,
        destinationUrl: dest.length > 0 ? dest : null,
      };
    })
    .filter((row): row is SponsorLineItem => row !== null);
  return parsed.length > 0 ? { sponsors: parsed } : fallback;
}

/** Keep display order and labels; overlay URLs from composer/storage. */
export function mergeSeptemberTemplateConfig(raw: unknown): CampaignTemplateConfig {
  const parsed = parseTemplateConfig(raw);
  const byKey = new Map(parsed.sponsors.map((item) => [item.key, item]));
  return {
    sponsors: SEPTEMBER_SPONSOR_LINE.map((item) => {
      const overlay = byKey.get(item.key);
      return {
        key: item.key,
        label: item.label,
        destinationUrl: overlay ? overlay.destinationUrl : item.destinationUrl,
      };
    }),
  };
}

export function trackedSponsorsFromConfig(config: CampaignTemplateConfig): TrackedSponsorLink[] {
  return config.sponsors
    .filter((item): item is SponsorLineItem & { destinationUrl: string } => Boolean(item.destinationUrl))
    .map((item) => ({
      key: item.key,
      type: "sponsor" as const,
      label: item.label,
      destinationUrl: item.destinationUrl,
    }));
}

export function unlinkedSponsorLabels(config: CampaignTemplateConfig = defaultSeptemberTemplateConfig()): string[] {
  return config.sponsors.filter((item) => !item.destinationUrl).map((item) => item.label);
}
