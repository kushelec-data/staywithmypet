"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard, AdminTable } from "@/components/admin/AdminUi";
import { EmailCampaignOverview } from "@/components/admin/EmailCampaignOverview";
import type { CampaignEventDto, CampaignRecipientDto } from "@/lib/email-campaigns/dto";
import { CampaignCsvImport } from "@/components/admin/CampaignCsvImport";
import { EmailCampaignCopyFields, type CampaignCopyFormValue } from "@/components/admin/EmailCampaignCopyFields";
import { SEPTEMBER_EVENT_LINKS } from "@/lib/email-campaigns/events";
import { SEPTEMBER_SPONSOR_LINE } from "@/lib/email-campaigns/template-config";
import { formatSendCompletedMessage, storedLanguageCounts } from "@/lib/email-campaigns/send-language";
import { campaignConsentSummary, canEnableCampaignSend } from "@/lib/email-campaigns/consent-summary";
import {
  CAMPAIGN_SCHEDULE_TIMEZONE,
  campaignStatusLabel,
  formatScheduledFor,
  selectDateTimeParts,
} from "@/lib/email-campaigns/schedule";
import {
  campaignOverviewStats,
  filterCampaignRecipients,
  type LinkClickRow,
  type RecipientTableFilter,
} from "@/lib/email-campaigns/analytics";

type Summary = {
  recipients: number;
  sent: number;
  opened: number;
  uniqueClicks: number;
  failed: number;
};

const FILTERS: Array<{ id: RecipientTableFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "en", label: "English" },
  { id: "et", label: "Estonian" },
  { id: "sent", label: "Sent" },
  { id: "opened", label: "Opened" },
  { id: "clicked", label: "Clicked" },
  { id: "failed", label: "Failed" },
];

export function EmailCampaignDetailClient({
  campaignId,
  name,
  status,
  summary,
  recipients,
  htmlEn,
  htmlEt,
  version,
  contentLocked,
  copy: initialCopy,
  scheduledAt,
  scheduledTimezone,
  sentAt,
  links,
}: {
  campaignId: string;
  name: string;
  status: string;
  from: string;
  summary: Summary;
  recipients: CampaignRecipientDto[];
  htmlEn: string;
  htmlEt: string;
  version: string;
  language: string;
  contentLocked: boolean;
  copy: CampaignCopyFormValue;
  subjectEn: string;
  subjectEt: string;
  scheduledAt: string | null;
  scheduledTimezone: string | null;
  sentAt: string | null;
  links: LinkClickRow[];
}) {
  const router = useRouter();
  const [campaignName, setCampaignName] = useState(name);
  const [copy, setCopy] = useState<CampaignCopyFormValue>(initialCopy);
  const [previewLang, setPreviewLang] = useState<"en" | "et">("en");
  const [activity, setActivity] = useState<{ recipient: CampaignRecipientDto; events: CampaignEventDto[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<RecipientTableFilter>("all");
  const [csvBusy, setCsvBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "test" | "campaign" | "schedule">(null);
  const [sendMode, setSendMode] = useState<"pending" | "resume" | "failed">("pending");
  const scheduleParts = scheduledAt ? selectDateTimeParts(scheduledAt, scheduledTimezone || CAMPAIGN_SCHEDULE_TIMEZONE) : { date: "", time: "10:00" };
  const [scheduleDate, setScheduleDate] = useState(scheduleParts.date);
  const [scheduleTime, setScheduleTime] = useState(scheduleParts.time || "10:00");
  const [progress, setProgress] = useState<{
    status: string;
    recipients: number;
    sent: number;
    failed: number;
    remaining: number;
    pending: number;
    processed: number;
    estonian: number;
    english: number;
    opened: number;
    clicked: number;
    failures: Array<{ email: string; reason: string | null }>;
  } | null>(null);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [sendingLive, setSendingLive] = useState(false);

  const languageCounts = useMemo(() => storedLanguageCounts(recipients), [recipients]);
  const pending = recipients.filter((row) => row.status === "pending").length;
  const alreadySent = recipients.filter((row) => row.status === "sent").length;
  const failedCount = recipients.filter((row) => row.status === "failed").length;
  const consent = useMemo(
    () =>
      campaignConsentSummary(
        recipients.map((row) => ({ status: row.status, consented: row.consented === true })),
      ),
    [recipients],
  );
  const overview = useMemo(
    () =>
      campaignOverviewStats(
        recipients.map((row) => ({
          language: row.language,
          status: row.status,
          openedAt: row.openedAt,
          clickedAt: row.clickedAt,
          unsubscribed: row.unsubscribed === true,
        })),
      ),
    [recipients],
  );
  const filtered = useMemo(
    () =>
      filterCampaignRecipients(
        recipients.map((row) => ({
          ...row,
          clickedAt: row.clickedAt ?? (row.clicked ? row.sentAt : null),
        })),
        query,
        tableFilter,
      ),
    [recipients, query, tableFilter],
  );
  const canSendNow = canEnableCampaignSend({
    recipientCount: recipients.length,
    blockedCount: consent.blocked,
    pendingCount: pending,
  });

  async function loadActivity(recipientId: string) {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/recipients/${recipientId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Could not load activity");
      return;
    }
    setActivity(json);
  }

  async function refreshProgress() {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/progress`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json;
    setProgress({
      status: json.status,
      recipients: json.progress.recipients,
      sent: json.progress.sent,
      failed: json.progress.failed,
      remaining: json.progress.remaining,
      pending: json.progress.pending,
      processed: json.progress.processed,
      estonian: json.progress.estonian,
      english: json.progress.english,
      opened: json.progress.opened,
      clicked: json.progress.clicked,
      failures: json.failures ?? [],
    });
    return json;
  }

  useEffect(() => {
    void refreshProgress();
  }, [campaignId]);

  useEffect(() => {
    if (!sendingLive) return;
    const timer = window.setInterval(() => {
      void refreshProgress();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [sendingLive, campaignId]);

  async function duplicateVersion() {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/duplicate`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Could not duplicate campaign");
      return;
    }
    router.push(`/admin/email-campaigns/${json.id}`);
    router.refresh();
  }

  async function saveDraft() {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: campaignName,
        ...copy,
        templateConfig: {
          sponsors: SEPTEMBER_SPONSOR_LINE.map((item) => ({ ...item })),
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Could not save campaign");
      return;
    }
    setMessage("Draft saved.");
    router.refresh();
  }

  async function importCsv(csvText: string) {
    setCsvBusy(true);
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText }),
    });
    const json = await res.json().catch(() => ({}));
    setCsvBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not import recipients");
      return;
    }
    setMessage(`Imported ${json.added} people.`);
    router.refresh();
  }

  async function sendTest() {
    setConfirmKind(null);
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true, sendLanguageMode: "automatic" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const blocked = json.blocked ? ` ${json.blocked}` : "";
      const failures = Array.isArray(json.failures)
        ? json.failures.map((row: { email?: string; reason?: string }) => `${row.email ?? "recipient"}: ${row.reason ?? "failed"}`).join("; ")
        : "";
      setMessage(`${json.error ?? "Send test failed."}${blocked}${failures ? ` ${failures}` : ""}`);
      return;
    }
    setMessage(
      formatSendCompletedMessage("test", {
        sent: Number(json.sent ?? 0),
        failed: Number(json.failed ?? 0),
        sentEstonian: Number(json.sentEstonian ?? 0),
        sentEnglish: Number(json.sentEnglish ?? 0),
      }),
    );
    router.refresh();
  }

  async function removeRecipient(id: string) {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/recipients/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Could not remove recipient");
      return;
    }
    router.refresh();
  }

  async function runSendLoop(mode: "pending" | "resume" | "failed", existingLease?: string) {
    setConfirmKind(null);
    setSendingLive(true);
    let nextLease = existingLease;
    let continueExisting = Boolean(existingLease);
    for (;;) {
      const res = await fetch(`/api/admin/email-campaigns/${campaignId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          mode,
          continueExisting,
          leaseId: nextLease,
          sendLanguageMode: "automatic",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.blocked ?? json.error ?? "Could not send campaign");
        setSendingLive(false);
        await refreshProgress();
        router.refresh();
        return;
      }
      if (json.leaseId) {
        nextLease = json.leaseId;
        setLeaseId(json.leaseId);
      }
      await refreshProgress();
      if (json.done) {
        setSendingLive(false);
        setLeaseId(null);
        setMessage(
          formatSendCompletedMessage("campaign", {
            sent: Number(json.sent ?? 0) + (progress?.sent ?? 0),
            failed: Number(json.failed ?? 0) + (progress?.failed ?? 0),
            sentEstonian: languageCounts.estonian,
            sentEnglish: languageCounts.english,
          }),
        );
        router.refresh();
        return;
      }
      continueExisting = true;
      await new Promise((resolve) => setTimeout(resolve, Number(json.delayMs) || 80_000));
    }
  }

  async function saveSchedule() {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: scheduleDate, time: scheduleTime, timezone: CAMPAIGN_SCHEDULE_TIMEZONE }),
    });
    const json = await res.json().catch(() => ({}));
    setConfirmKind(null);
    if (!res.ok) {
      setMessage(json.error ?? "Could not schedule campaign");
      return;
    }
    setMessage("Campaign scheduled.");
    router.refresh();
  }

  async function cancelSchedule() {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/schedule`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Could not cancel schedule");
      return;
    }
    setMessage("Schedule cancelled.");
    router.refresh();
  }

  const live = progress;
  const percent = live && live.recipients > 0 ? Math.round((live.processed / live.recipients) * 100) : 0;
  const canRemove = status === "draft" || status === "test_sent";
  const remainingUnsent = pending + recipients.filter((row) => row.status === "sending").length;
  const peopleCount = languageCounts.recipients;
  const englishCount = languageCounts.english;
  const estonianCount = languageCounts.estonian;
  const isScheduled = (live?.status ?? status) === "scheduled";
  const scheduledLabel = formatScheduledFor(scheduledAt, scheduledTimezone || CAMPAIGN_SCHEDULE_TIMEZONE);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {version} · {campaignStatusLabel(live?.status ?? status)}
        {isScheduled && scheduledLabel ? ` · Scheduled for: ${scheduledLabel}` : null}
        {sentAt && !isScheduled ? ` · Sent ${formatScheduledFor(sentAt) ?? ""}` : null}
      </p>
      {contentLocked && !isScheduled ? (
        <p className="text-sm">This version has already been sent. Duplicate it to edit a new draft.</p>
      ) : null}
      <EmailCampaignOverview overview={overview.recipients ? overview : { ...overview, recipients: summary.recipients, sent: summary.sent, opened: summary.opened, clicked: summary.uniqueClicks, failed: summary.failed }} links={links} />
      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Email</h2>
        <label className="mt-3 block text-sm">
          Campaign name
          <input
            disabled={contentLocked}
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
          />
        </label>
        <div className="mt-4">
          <EmailCampaignCopyFields value={copy} onChange={setCopy} disabled={contentLocked} />
        </div>
        <h3 className="mt-6 font-heading text-base font-semibold">Event cards</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {SEPTEMBER_EVENT_LINKS.map((link) => (
            <li key={link.key}>
              <span className="font-medium">{link.label}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-6 font-heading text-base font-semibold">Sponsor links</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {SEPTEMBER_SPONSOR_LINE.map((item) => (
            <li key={item.key}>{item.label}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          {!contentLocked ? (
            <button type="button" onClick={() => void saveDraft()} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]">
              Save Draft
            </button>
          ) : null}
          <button type="button" onClick={() => void duplicateVersion()} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]">
            Duplicate / New Version
          </button>
        </div>
      </AdminCard>
      {sendingLive || (live?.status === "sending" && live.remaining > 0) ? (
        <AdminCard>
          <p className="font-semibold">Sending campaign...</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#E5E2D8]">
            <div className="h-full bg-[#2E6B3F]" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-sm">
            {live?.processed ?? 0} / {live?.recipients ?? 0} processed · Sent: {live?.sent ?? 0} · Failed: {live?.failed ?? 0}
          </p>
        </AdminCard>
      ) : null}
      {live && live.remaining === 0 && live.sent + live.failed > 0 && live.status !== "sending" ? (
        <AdminCard>
          <p className="whitespace-pre-line text-sm">
            {formatSendCompletedMessage("campaign", {
              sent: live.sent,
              failed: live.failed,
              sentEstonian: live.estonian,
              sentEnglish: live.english,
            })}
          </p>
        </AdminCard>
      ) : null}
      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Recipients</h2>
        <p className="mt-1 text-sm">
          {peopleCount} {peopleCount === 1 ? "person" : "people"}
        </p>
        <p className="text-sm">
          {englishCount} English · {estonianCount} Estonian
        </p>
        <p className="mt-1 text-sm text-muted">Languages are automatically selected from the CSV.</p>
        {!contentLocked ? (
          <div className="mt-3">
            <CampaignCsvImport busy={csvBusy} showSummary={false} onCsvReady={(text) => void importCsv(text)} />
          </div>
        ) : null}
      </AdminCard>
      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTableFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                tableFilter === item.id ? "bg-[#2E6B3F] text-white" : "border border-[#2E6B3F] text-[#2E6B3F]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <AdminTable
        headers={["Name", "Email", "Language", "Status", "Sent at", "Opened", "Opened at", "Clicked", "Clicked at", "Failure", ""]}
        empty="No recipients yet."
        rows={filtered.map((row) => [
          row.name,
          row.email,
          row.language.toUpperCase(),
          row.status,
          row.sentAt ? new Date(row.sentAt).toLocaleString() : "—",
          row.openedAt ? "Yes" : "—",
          row.openedAt ? new Date(row.openedAt).toLocaleString() : "—",
          row.clickedAt ? "Yes" : "—",
          row.clickedAt ? new Date(row.clickedAt).toLocaleString() : "—",
          row.failureReason ?? "—",
          <button key={row.id} type="button" className="font-semibold text-[#2E6B3F]" onClick={() => void loadActivity(row.id)}>
            Activity
          </button>,
        ])}
      />
      {activity ? (
        <AdminCard>
          <h3 className="font-heading text-lg font-semibold">Activity · {activity.recipient.name}</h3>
          <p className="text-sm text-muted">{activity.recipient.email}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {activity.events.length === 0 ? <li>No events yet.</li> : null}
            {activity.events.map((event, index) => (
              <li key={`${event.at}-${index}`}>
                {event.type === "sent"
                  ? "Email sent"
                  : event.type === "opened"
                    ? "Email opened"
                    : event.type === "clicked"
                      ? event.linkType === "sponsor"
                        ? `Sponsor clicked: ${event.linkLabel ?? event.linkKey}`
                        : `Event button clicked${event.linkLabel ? `: ${event.linkLabel}` : ""}`
                      : "Send failed"}
                {event.linkKey ? ` (${event.linkKey})` : ""} · {new Date(event.at).toLocaleString()}
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}
      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Send / Test</h2>
        <p className="mt-1 text-sm">Viewing: {previewLang === "et" ? "Estonian" : "English"}</p>
        <p className="mt-1 text-sm text-muted">Preview only changes what you see. Each person still receives their CSV language.</p>
        <p className="mt-3 text-sm">Eligible recipients: {consent.eligible}</p>
        <p className="text-sm">Blocked recipients: {consent.blocked}</p>
        {consent.warning ? <p className="mt-2 text-sm text-red-700">{consent.warning}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setPreviewLang("en")} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]">
            Preview English
          </button>
          <button type="button" onClick={() => setPreviewLang("et")} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]">
            Preview Estonian
          </button>
          <button
            type="button"
            disabled={peopleCount === 0}
            onClick={() => setConfirmKind("test")}
            className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50"
          >
            Send Test Email
          </button>
          <button
            type="button"
            disabled={!canSendNow}
            onClick={() => {
              setSendMode("pending");
              setConfirmKind("campaign");
            }}
            className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#E5E2D8] disabled:text-muted"
          >
            Send Now
          </button>
          <button
            type="button"
            disabled={peopleCount === 0 || (status !== "draft" && status !== "test_sent" && status !== "scheduled")}
            onClick={() => {
              if (!scheduleDate) {
                const parts = scheduledAt
                  ? selectDateTimeParts(scheduledAt)
                  : selectDateTimeParts(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
                setScheduleDate(parts.date);
                setScheduleTime(parts.time === "24:00" ? "10:00" : parts.time);
              }
              setConfirmKind("schedule");
            }}
            className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50"
          >
            Schedule
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Automatic scheduled sending currently runs once daily on the Hobby deployment. A campaign is sent on the next daily run after its scheduled time.
        </p>
        {isScheduled ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (scheduledAt) {
                  const parts = selectDateTimeParts(scheduledAt, scheduledTimezone || CAMPAIGN_SCHEDULE_TIMEZONE);
                  setScheduleDate(parts.date);
                  setScheduleTime(parts.time);
                }
                setConfirmKind("schedule");
              }}
              className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]"
            >
              Change schedule
            </button>
            <button type="button" onClick={() => void cancelSchedule()} className="rounded-full border px-4 py-2 text-sm font-semibold">
              Cancel schedule
            </button>
          </div>
        ) : null}
        {remainingUnsent > 0 && (status === "partially_sent" || status === "sending" || alreadySent > 0) ? (
          <button
            type="button"
            onClick={() => {
              setSendMode("resume");
              setConfirmKind("campaign");
            }}
            className="mt-3 rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]"
          >
            Continue sending
          </button>
        ) : null}
        {failedCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              setSendMode("failed");
              setConfirmKind("campaign");
            }}
            className="mt-3 ml-3 rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]"
          >
            Retry failed
          </button>
        ) : null}
        {message ? <p className="mt-3 whitespace-pre-line text-sm">{message}</p> : null}
        <iframe title="Campaign preview" className="mt-4 h-[480px] w-full rounded-xl border border-[#E5E2D8] bg-[#f7f5f0]" srcDoc={previewLang === "et" ? htmlEt : htmlEn} />
      </AdminCard>
      {confirmKind ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            {confirmKind === "test" ? (
              <>
                <p className="text-sm">Send test email to {peopleCount} {peopleCount === 1 ? "person" : "people"}?</p>
                <p className="mt-2 text-sm">{englishCount} will receive English</p>
                <p className="text-sm">{estonianCount} will receive Estonian</p>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setConfirmKind(null)} className="rounded-full border px-4 py-2 text-sm">
                    Cancel
                  </button>
                  <button type="button" onClick={() => void sendTest()} className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white">
                    Send Test
                  </button>
                </div>
              </>
            ) : confirmKind === "schedule" ? (
              <>
                <h3 className="font-heading text-lg font-semibold">Schedule campaign</h3>
                <label className="mt-3 block text-sm">
                  Date
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
                </label>
                <label className="mt-3 block text-sm">
                  Time
                  <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
                </label>
                <p className="mt-2 text-sm">Timezone: Europe/Tallinn</p>
                <p className="mt-2 text-sm text-muted">
                  Automatic scheduled sending currently runs once daily on the Hobby deployment. The email goes out on the next daily run after this time.
                </p>
                <div className="mt-4 text-sm">
                  <p className="font-semibold">Summary</p>
                  <p>{peopleCount} recipients</p>
                  <p>{englishCount} English</p>
                  <p>{estonianCount} Estonian</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setConfirmKind(null)} className="rounded-full border px-4 py-2 text-sm">
                    Cancel
                  </button>
                  <button type="button" onClick={() => void saveSchedule()} className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white">
                    Schedule Campaign
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  Send campaign to {sendMode === "failed" ? failedCount : sendMode === "resume" ? remainingUnsent : peopleCount} recipients?
                </p>
                <p className="mt-2 text-sm">{englishCount} English</p>
                <p className="text-sm">{estonianCount} Estonian</p>
                <p className="mt-2 text-sm">Each recipient will automatically receive the correct language.</p>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setConfirmKind(null)} className="rounded-full border px-4 py-2 text-sm">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sendingLive}
                    onClick={() => void runSendLoop(sendMode, leaseId ?? undefined)}
                    className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Send Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
