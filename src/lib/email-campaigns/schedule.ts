export const CAMPAIGN_SCHEDULE_TIMEZONE = "Europe/Tallinn";

export type ScheduleInput = {
  date: string;
  time: string;
  timezone?: string;
};

export type ClaimableCampaign = {
  id: string;
  status: string;
  scheduledAt: string | null;
  leaseId: string | null;
  leaseUntil: string | null;
};

export function parseScheduleDateTime(input: ScheduleInput): { ok: true; scheduledAt: string; timezone: string } | { ok: false; error: string } {
  const timezone = input.timezone?.trim() || CAMPAIGN_SCHEDULE_TIMEZONE;
  if (timezone !== CAMPAIGN_SCHEDULE_TIMEZONE) {
    return { ok: false, error: "Use Europe/Tallinn." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    return { ok: false, error: "Choose a date and time." };
  }
  const scheduledAt = wallTimeInTimeZoneToUtc(input.date, input.time, timezone);
  if (Number.isNaN(Date.parse(scheduledAt))) {
    return { ok: false, error: "Choose a valid date and time." };
  }
  return { ok: true, scheduledAt, timezone };
}

export function wallTimeInTimeZoneToUtc(date: string, time: string, timeZone: string): string {
  const asUtc = new Date(`${date}T${time}:00.000Z`);
  const shown = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(asUtc);
  const part = (type: string) => shown.find((row) => row.type === type)?.value ?? "";
  const shownAsUtc = Date.parse(`${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:00.000Z`);
  return new Date(asUtc.getTime() - (shownAsUtc - asUtc.getTime())).toISOString();
}

export function formatScheduledFor(iso: string | null | undefined, timeZone = CAMPAIGN_SCHEDULE_TIMEZONE): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return formatted;
}

export function campaignStatusLabel(status: string): string {
  if (status === "scheduled") return "Scheduled";
  if (status === "sending") return "Sending";
  if (status === "sent") return "Sent";
  if (status === "partially_sent") return "Partially sent";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  return "Draft";
}

export function campaignWhenLabel(input: {
  status: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  timezone?: string | null;
}): string {
  if (input.status === "scheduled") {
    const formatted = formatScheduledFor(input.scheduledAt, input.timezone || CAMPAIGN_SCHEDULE_TIMEZONE);
    return formatted ? `Scheduled for: ${formatted}` : "Scheduled";
  }
  const sent = formatScheduledFor(input.sentAt, input.timezone || CAMPAIGN_SCHEDULE_TIMEZONE);
  return sent ?? "—";
}

export function canScheduleCampaign(status: string, recipientCount: number): boolean {
  if (recipientCount <= 0) return false;
  return status === "draft" || status === "test_sent" || status === "scheduled";
}

export function isScheduleDue(scheduledAt: string | null | undefined, nowIso: string): boolean {
  if (!scheduledAt) return false;
  return Date.parse(scheduledAt) <= Date.parse(nowIso);
}

export function tryClaimScheduledCampaign(
  campaign: ClaimableCampaign,
  nowIso: string,
  leaseId: string,
): { ok: true; status: "sending"; leaseId: string } | { ok: false; reason: "not_due" | "not_scheduled" | "already_claimed" } {
  if (campaign.status !== "scheduled") return { ok: false, reason: "not_scheduled" };
  if (!isScheduleDue(campaign.scheduledAt, nowIso)) return { ok: false, reason: "not_due" };
  if (campaign.leaseId && campaign.leaseUntil && Date.parse(campaign.leaseUntil) > Date.parse(nowIso) && campaign.leaseId !== leaseId) {
    return { ok: false, reason: "already_claimed" };
  }
  return { ok: true, status: "sending", leaseId };
}

export function recipientsForScheduledDelivery<T extends { status: string; consented?: boolean }>(rows: T[]): T[] {
  return rows.filter((row) => row.status !== "sent" && row.consented !== false);
}

export function skipUnconsentedAtSendTime<T extends { consented: boolean; status: string }>(rows: T[]): {
  toSend: T[];
  skipped: T[];
} {
  const unsent = rows.filter((row) => row.status !== "sent");
  return {
    toSend: unsent.filter((row) => row.consented),
    skipped: unsent.filter((row) => !row.consented),
  };
}

export function applyScheduledSendOnce<T extends { id: string; status: string; consented: boolean }>(
  campaign: { status: string; scheduledAt: string; sentIds: string[] },
  recipients: T[],
  nowIso: string,
  claim: ReturnType<typeof tryClaimScheduledCampaign>,
): { sentIds: string[]; skippedIds: string[]; status: string } {
  if (!claim.ok) {
    return { sentIds: [...campaign.sentIds], skippedIds: [], status: campaign.status };
  }
  const { toSend, skipped } = skipUnconsentedAtSendTime(recipients);
  const fresh = toSend.filter((row) => !campaign.sentIds.includes(row.id) && row.status !== "sent");
  return {
    sentIds: [...campaign.sentIds, ...fresh.map((row) => row.id)],
    skippedIds: skipped.map((row) => row.id),
    status: "sent",
  };
}

export function selectDateTimeParts(iso: string, timeZone = CAMPAIGN_SCHEDULE_TIMEZONE): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((row) => row.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}
