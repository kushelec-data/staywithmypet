export type DeliveryStatus = "pending" | "sending" | "sent" | "failed";

export type SendMode = "pending" | "failed" | "resume";

export function isRetryableDeliveryStatus(status: string, mode: SendMode): boolean {
  if (status === "sent") return false;
  if (mode === "failed") return status === "failed";
  if (mode === "pending") return status === "pending";
  return status === "pending" || status === "failed" || status === "sending";
}

export function selectSendableRecipientIds(
  rows: Array<{ id: string; status: string }>,
  mode: SendMode,
): string[] {
  return rows.filter((row) => isRetryableDeliveryStatus(row.status, mode)).map((row) => row.id);
}

export function deriveBulkCampaignStatus(counts: {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  leaseActive: boolean;
}): "draft" | "sending" | "partially_sent" | "sent" | "failed" {
  const total = counts.pending + counts.sending + counts.sent + counts.failed;
  if (counts.leaseActive || counts.sending > 0) return "sending";
  if (total === 0) return "draft";
  if (counts.pending > 0 && counts.sent === 0 && counts.failed === 0) return "draft";
  if (counts.pending > 0) return "partially_sent";
  if (counts.sent > 0 && counts.failed > 0) return "sent";
  if (counts.sent > 0) return "sent";
  if (counts.failed > 0) return "failed";
  return "draft";
}

export function canStartBulkSend(status: string, leaseActive: boolean): { ok: true } | { ok: false; reason: string } {
  if (leaseActive || status === "sending") {
    return { ok: false, reason: "Campaign is already sending. Use progress or wait for the lease to expire." };
  }
  return { ok: true };
}

export type CampaignLockState = {
  status: string;
  leaseId: string | null;
  leaseUntil: string | null;
  nowIso: string;
};

export function isSendLeaseActive(lock: CampaignLockState): boolean {
  if (!lock.leaseId || !lock.leaseUntil) return false;
  return Date.parse(lock.leaseUntil) > Date.parse(lock.nowIso);
}

export function anotherAdminHoldsLease(lock: CampaignLockState, attemptedLeaseId: string): boolean {
  return isSendLeaseActive(lock) && lock.leaseId !== attemptedLeaseId;
}

export async function runSequentialSends(
  ids: string[],
  sendOne: (id: string) => Promise<"sent" | "failed" | "skipped">,
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const id of ids) {
    const result = await sendOne(id);
    if (result === "sent") sent += 1;
    else if (result === "failed") failed += 1;
    else skipped += 1;
  }
  return { sent, failed, skipped };
}

export function progressFromRecipientRows(
  rows: Array<{ language?: string; status: string; first_opened_at?: string | null; first_clicked_at?: string | null }>,
) {
  const pending = rows.filter((row) => row.status === "pending").length;
  const sending = rows.filter((row) => row.status === "sending").length;
  const sent = rows.filter((row) => row.status === "sent").length;
  const failed = rows.filter((row) => row.status === "failed").length;
  const estonian = rows.filter((row) => String(row.language ?? "").toLowerCase() === "et").length;
  return {
    recipients: rows.length,
    pending,
    sending,
    sent,
    failed,
    remaining: pending + sending,
    processed: sent + failed,
    estonian,
    english: rows.length - estonian,
    opened: rows.filter((row) => row.first_opened_at).length,
    clicked: rows.filter((row) => row.first_clicked_at).length,
  };
}
