import { campaignLanguageFromPreferredLocale } from "@/lib/email-campaigns/locale";

export type CampaignOverviewStats = {
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  english: number;
  estonian: number;
};

export type LinkClickRow = {
  link: string;
  type: string;
  label: string;
  clicks: number;
  uniqueClicks: number;
};

export function percentRate(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function campaignOverviewStats(
  rows: Array<{
    language: string;
    status: string;
    openedAt?: string | null;
    clickedAt?: string | null;
    unsubscribed?: boolean;
  }>,
): CampaignOverviewStats {
  const sent = rows.filter((row) => row.status === "sent").length;
  const opened = rows.filter((row) => Boolean(row.openedAt)).length;
  const clicked = rows.filter((row) => Boolean(row.clickedAt)).length;
  const estonian = rows.filter((row) => campaignLanguageFromPreferredLocale(row.language) === "et").length;
  return {
    recipients: rows.length,
    sent,
    opened,
    clicked,
    failed: rows.filter((row) => row.status === "failed").length,
    unsubscribed: rows.filter((row) => row.unsubscribed).length,
    openRate: percentRate(opened, sent),
    clickRate: percentRate(clicked, sent),
    english: rows.length - estonian,
    estonian,
  };
}

export function topClickedLinks(
  events: Array<{ linkKey: string; recipientId: string }>,
  catalog: Array<{ key: string; type: string; label: string }>,
): LinkClickRow[] {
  const byKey = new Map<string, { clicks: number; recipients: Set<string> }>();
  for (const event of events) {
    const current = byKey.get(event.linkKey) ?? { clicks: 0, recipients: new Set<string>() };
    current.clicks += 1;
    current.recipients.add(event.recipientId);
    byKey.set(event.linkKey, current);
  }
  const rows = [...byKey.entries()].map(([key, stats]) => {
    const meta = catalog.find((item) => item.key === key);
    return {
      link: key,
      type: meta?.type === "sponsor" ? "Sponsor" : "Event",
      label: meta?.label ?? key,
      clicks: stats.clicks,
      uniqueClicks: stats.recipients.size,
    };
  });
  rows.sort((a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label));
  return rows;
}

export type RecipientTableFilter = "all" | "en" | "et" | "sent" | "opened" | "clicked" | "failed";

export function filterCampaignRecipients<
  T extends {
    name: string;
    email: string;
    language: string;
    status: string;
    openedAt?: string | null;
    clickedAt?: string | null;
  },
>(rows: T[], query: string, filter: RecipientTableFilter): T[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (q && !`${row.name} ${row.email}`.toLowerCase().includes(q)) return false;
    if (filter === "en") return campaignLanguageFromPreferredLocale(row.language) === "en";
    if (filter === "et") return campaignLanguageFromPreferredLocale(row.language) === "et";
    if (filter === "sent") return row.status === "sent";
    if (filter === "opened") return Boolean(row.openedAt);
    if (filter === "clicked") return Boolean(row.clickedAt);
    if (filter === "failed") return row.status === "failed";
    return true;
  });
}
