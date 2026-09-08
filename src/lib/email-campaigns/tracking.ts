export type RecipientTrackingState = {
  first_opened_at: string | null;
  last_opened_at: string | null;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
  click_count: number;
  last_clicked_link_key: string | null;
};

export function applyOpenTracking(
  recipient: RecipientTrackingState,
  nowIso: string,
): Pick<RecipientTrackingState, "first_opened_at" | "last_opened_at"> {
  return {
    first_opened_at: recipient.first_opened_at ?? nowIso,
    last_opened_at: nowIso,
  };
}

export function applyClickTracking(
  recipient: RecipientTrackingState,
  nowIso: string,
  linkKey: string,
): Pick<
  RecipientTrackingState,
  "first_clicked_at" | "last_clicked_at" | "click_count" | "last_clicked_link_key"
> {
  return {
    first_clicked_at: recipient.first_clicked_at ?? nowIso,
    last_clicked_at: nowIso,
    click_count: recipient.click_count + 1,
    last_clicked_link_key: linkKey,
  };
}

export function summarizeCampaignRecipients(
  rows: Array<{
    status: string;
    first_opened_at: string | null;
    first_clicked_at: string | null;
  }>,
): { recipients: number; sent: number; opened: number; uniqueClicks: number; failed: number } {
  return {
    recipients: rows.length,
    sent: rows.filter((row) => row.status === "sent").length,
    opened: rows.filter((row) => row.first_opened_at).length,
    uniqueClicks: rows.filter((row) => row.first_clicked_at).length,
    failed: rows.filter((row) => row.status === "failed").length,
  };
}

export function recipientDisplayStatus(row: {
  status: string;
  first_opened_at: string | null;
  first_clicked_at: string | null;
}): string {
  if (row.status === "failed") return "Failed";
  if (row.first_clicked_at) return "Clicked";
  if (row.first_opened_at) return "Opened";
  if (row.status === "sent") return "Sent";
  return "Pending";
}

export function lastActivityAt(row: {
  sent_at: string | null;
  last_opened_at: string | null;
  last_clicked_at: string | null;
}): string | null {
  return [row.last_clicked_at, row.last_opened_at, row.sent_at]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

export function sendOutcomeUpdate(ok: boolean, reason?: string): {
  status: "sent" | "failed";
  sent_at?: string;
  failure_reason: string | null;
} {
  if (ok) {
    return { status: "sent", sent_at: new Date().toISOString(), failure_reason: null };
  }
  return { status: "failed", failure_reason: reason ?? "send_failed" };
}
