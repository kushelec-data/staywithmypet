"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard, AdminTable } from "@/components/admin/AdminUi";
import type { CampaignEventDto, CampaignRecipientDto } from "@/lib/email-campaigns/dto";
import { CampaignCsvImport } from "@/components/admin/CampaignCsvImport";
import { EmailCampaignCopyFields, type CampaignCopyFormValue } from "@/components/admin/EmailCampaignCopyFields";
import { bulkSendConsentGate } from "@/lib/email-campaigns/marketing-consent";
import { SEPTEMBER_EVENT_LINKS } from "@/lib/email-campaigns/events";
import { SEPTEMBER_SPONSOR_LINE } from "@/lib/email-campaigns/template-config";
import { formatSendCompletedMessage, storedLanguageCounts } from "@/lib/email-campaigns/send-language";

type Summary = {
  recipients: number;
  sent: number;
  opened: number;
  uniqueClicks: number;
  failed: number;
};

export function EmailCampaignDetailClient({
  campaignId,
  name,
  status,
  summary,
  recipients,
  htmlEn,
  htmlEt,
  version,
  language,
  contentLocked,
  copy: initialCopy,
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
}) {
  const router = useRouter();
  const [campaignName, setCampaignName] = useState(name);
  const [copy, setCopy] = useState<CampaignCopyFormValue>(initialCopy);
  const [previewLang, setPreviewLang] = useState<"en" | "et">("en");
  const [activity, setActivity] = useState<{ recipient: CampaignRecipientDto; events: CampaignEventDto[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<"all" | "et" | "en">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "sending" | "sent" | "failed">("all");
  const [csvBusy, setCsvBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "test" | "campaign">(null);
  const [sendMode, setSendMode] = useState<"pending" | "resume" | "failed">("pending");
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
    bulkSendEnabled: boolean;
    missingConsent: number;
    failures: Array<{ email: string; reason: string | null }>;
  } | null>(null);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [sendingLive, setSendingLive] = useState(false);

  const languageCounts = useMemo(() => storedLanguageCounts(recipients), [recipients]);
  const pending = recipients.filter((row) => row.status === "pending").length;
  const alreadySent = recipients.filter((row) => row.status === "sent").length;
  const failedCount = recipients.filter((row) => row.status === "failed").length;
  const consentGate = bulkSendConsentGate(
    recipients
      .filter((row) => row.status === "pending" || row.status === "sending")
      .map((row) => ({ email: row.email, consented: row.consented === true })),
  );

  const filtered = recipients.filter((row) => {
    const q = query.trim().toLowerCase();
    if (q && !`${row.name} ${row.email}`.toLowerCase().includes(q)) return false;
    if (languageFilter !== "all" && row.language.toLowerCase() !== languageFilter) return false;
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    return true;
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
      bulkSendEnabled: json.bulkSendEnabled,
      missingConsent: json.consent?.missingConsent ?? 0,
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

  const live = progress;
  const percent = live && live.recipients > 0 ? Math.round((live.processed / live.recipients) * 100) : 0;
  const canRemove = status === "draft" || status === "test_sent";
  const remainingUnsent = pending + recipients.filter((row) => row.status === "sending").length;
  const bulkLocked = !consentGate.allowed;
  const peopleCount = languageCounts.recipients;
  const englishCount = languageCounts.english;
  const estonianCount = languageCounts.estonian;

  const cards: Array<[string, number]> = [
    ["Recipients", live?.recipients ?? summary.recipients],
    ["Sent", live?.sent ?? summary.sent],
    ["Opened", live?.opened ?? summary.opened],
    ["Unique clicks", live?.clicked ?? summary.uniqueClicks],
    ["Failed", live?.failed ?? summary.failed],
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {version} · {language} · {live?.status ?? status}
      </p>
      {contentLocked ? (
        <p className="text-sm">This version has already been sent. Duplicate it to edit a new draft.</p>
      ) : null}
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <AdminCard key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2E6B3F]">{label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
          </AdminCard>
        ))}
      </div>
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
          {live.failures.length > 0 ? (
            <ul className="mt-2 text-sm">
              {live.failures.map((row) => (
                <li key={row.email}>
                  {row.email} — {row.reason ?? "failed"}
                </li>
              ))}
            </ul>
          ) : null}
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
        <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value as "all" | "et" | "en")} className="rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm">
          <option value="all">All languages</option>
          <option value="et">Estonian</option>
          <option value="en">English</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">pending</option>
          <option value="sending">sending</option>
          <option value="sent">sent</option>
          <option value="failed">failed</option>
        </select>
      </div>
      <AdminTable
        headers={["Name", "Email", "Language", "Status", "Sent at", "Opened", "Clicked", "Failure", ""]}
        empty="No recipients yet."
        rows={filtered.map((row) => [
          row.name,
          row.email,
          row.language.toUpperCase(),
          row.status,
          row.sentAt ? new Date(row.sentAt).toLocaleString() : "—",
          row.openedAt ? "✓" : "—",
          row.clicked ? "✓" : "—",
          row.failureReason ?? "—",
          <span key={row.id} className="flex gap-2">
            <button type="button" className="font-semibold text-[#2E6B3F]" onClick={() => void loadActivity(row.id)}>
              Activity
            </button>
            {canRemove ? (
              <button type="button" className="font-semibold text-red-700" onClick={() => void removeRecipient(row.id)}>
                Remove
              </button>
            ) : null}
          </span>,
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
            disabled={bulkLocked || pending === 0}
            onClick={() => {
              setSendMode("pending");
              setConfirmKind("campaign");
            }}
            className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#E5E2D8] disabled:text-muted"
          >
            Send Campaign
          </button>
        </div>
        {bulkLocked ? (
          <p className="mt-3 text-sm text-red-700">
            This campaign cannot be sent yet. {consentGate.missingConsent} {consentGate.missingConsent === 1 ? "person is" : "people are"} not on the
            newsletter, or have unsubscribed.
          </p>
        ) : null}
        {remainingUnsent > 0 && (status === "partially_sent" || status === "sending" || alreadySent > 0) ? (
          <button
            type="button"
            disabled={bulkLocked}
            onClick={() => {
              setSendMode("resume");
              setConfirmKind("campaign");
            }}
            className="mt-3 rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50"
          >
            Continue sending
          </button>
        ) : null}
        {failedCount > 0 ? (
          <button
            type="button"
            disabled={bulkLocked}
            onClick={() => {
              setSendMode("failed");
              setConfirmKind("campaign");
            }}
            className="mt-3 ml-3 rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50"
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
                    Send Campaign
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
