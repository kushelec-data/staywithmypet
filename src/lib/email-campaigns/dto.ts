import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { lastActivityAt, recipientDisplayStatus } from "@/lib/email-campaigns/tracking";

const SECRET_PATTERNS = [
  /smtp/i,
  /password/i,
  /service_role/i,
  /access_token/i,
  /refresh_token/i,
];

export function jsonLooksLikeSecretDump(value: unknown): boolean {
  const raw = JSON.stringify(value);
  return SECRET_PATTERNS.some((pattern) => pattern.test(raw) && /pass|secret|key|token/i.test(raw) && /smtp_password|service_role|SMTP_PASSWORD/i.test(raw));
}

export type CampaignListItemDto = {
  id: string;
  name: string;
  status: string;
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
  failed: number;
  createdAt: string;
};

export type CampaignRecipientDto = {
  id: string;
  name: string;
  email: string;
  language: string;
  sentAt: string | null;
  openedAt: string | null;
  clicked: boolean;
  clickedLinkKey: string | null;
  lastActivityAt: string | null;
  status: string;
  failureReason: string | null;
};

export type CampaignEventDto = {
  id?: string;
  type: string;
  at: string;
  linkKey: string | null;
};

export function toRecipientDto(row: {
  id: string;
  display_name: string;
  email: string;
  language: string;
  status: string;
  sent_at: string | null;
  first_opened_at: string | null;
  first_clicked_at: string | null;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  last_clicked_link_key: string | null;
  failure_reason: string | null;
}): CampaignRecipientDto {
  return {
    id: row.id,
    name: row.display_name,
    email: row.email,
    language: row.language,
    sentAt: row.sent_at,
    openedAt: row.first_opened_at,
    clicked: Boolean(row.first_clicked_at),
    clickedLinkKey: row.last_clicked_link_key,
    lastActivityAt: lastActivityAt(row),
    status: recipientDisplayStatus(row),
    failureReason: row.failure_reason,
  };
}

export function campaignFromForClient(): { from: string } {
  return { from: CAMPAIGN_FROM_HEADER };
}

export const OPEN_TRACKING_DISCLAIMER =
  "Open tracking is approximate. Many mail clients block, cache, or preload images, so opens can be missing or inflated.";
