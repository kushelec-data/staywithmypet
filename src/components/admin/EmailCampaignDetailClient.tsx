"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard, AdminTable } from "@/components/admin/AdminUi";
import { OPEN_TRACKING_DISCLAIMER } from "@/lib/email-campaigns/dto";
import type { CampaignEventDto, CampaignRecipientDto } from "@/lib/email-campaigns/dto";
import { parseCampaignCsv } from "@/lib/email-campaigns/csv-import";
import { bulkSendConsentGate } from "@/lib/email-campaigns/marketing-consent";

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
  from,
  summary,
  recipients,
  htmlEn,
  htmlEt,
}: {
  campaignId: string;
  name: string;
  status: string;
  from: string;
  summary: Summary;
  recipients: CampaignRecipientDto[];
  htmlEn: string;
  htmlEt: string;
}) {
  const router = useRouter();
  const [previewLang, setPreviewLang] = useState<"en" | "et">(() =>
    recipients.length > 0 && recipients.every((row) => row.language.toLowerCase() === "et") ? "et" : "en",
  );
  const [activity, setActivity] = useState<{ recipient: CampaignRecipientDto; events: CampaignEventDto[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<"all" | "et" | "en">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "sending" | "sent" | "failed">("all");
  const [csvText, setCsvText] = useState("");
  const [registeredFilter, setRegisteredFilter] = useState<"none" | "all" | "et" | "en">("none");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
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

  const csvPreview = useMemo(() => (csvText.trim() ? parseCampaignCsv(csvText) : null), [csvText]);
  const languageCounts = useMemo(() => {
    const estonian = recipients.filter((row) => row.language.toLowerCase() === "et").length;
    return { estonian, english: recipients.length - estonian };
  }, [recipients]);
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

  useEffect(() => {
    if (registeredFilter === "none") {
      setAudienceCount(null);
      return;
    }
    void fetch(`/api/admin/email-campaigns/audience?filter=${registeredFilter}`)
      .then((res) => res.json())
      .then((json) => setAudienceCount(typeof json.selected === "number" ? json.selected : null))
      .catch(() => undefined);
  }, [registeredFilter]);

  async function sendTest() {
    const confirmed = window.confirm(
      "This will send the campaign email through SpaceMail to every recipient on this campaign.\n\nOnly continue if you intend to send real email now.",
    );
    if (!confirmed) return;
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
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
    setMessage(`Send test finished. Sent ${json.sent}, failed ${json.failed}. Refresh to see status.`);
    router.refresh();
  }

  async function addRecipients() {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csvText: csvText.trim() || undefined,
        registeredFilter: registeredFilter === "none" ? undefined : registeredFilter,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Could not add recipients");
      return;
    }
    setMessage(`Added ${json.added} recipients (skipped ${json.skipped}, invalid ${json.invalid ?? 0}, duplicates ${json.duplicatesRemoved ?? 0}). No email sent.`);
    setCsvText("");
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
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.blocked ?? json.error ?? "Bulk send failed");
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
        setConfirmOpen(false);
        setMessage(
          `Campaign sent. Recipients: ${progress?.recipients ?? summary.recipients}. Sent: ${json.sent + (progress?.sent ?? 0)}. Failed: ${json.failed + (progress?.failed ?? 0)}.`,
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

  const cards: Array<[string, number]> = [
    ["Recipients", live?.recipients ?? summary.recipients],
    ["Sent", live?.sent ?? summary.sent],
    ["Opened", live?.opened ?? summary.opened],
    ["Unique clicks", live?.clicked ?? summary.uniqueClicks],
    ["Failed", live?.failed ?? summary.failed],
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">From: {from} · Status: {live?.status ?? status}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <AdminCard key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2E6B3F]">{label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
          </AdminCard>
        ))}
      </div>
      <p className="text-sm">
        Language split · Estonian: {live?.estonian ?? languageCounts.estonian} · English: {live?.english ?? languageCounts.english}
      </p>
      <p className="text-xs text-muted">{OPEN_TRACKING_DISCLAIMER}</p>
      {bulkLocked ? (
        <p className="text-sm text-red-700">
          Production Bulk Send is locked. {consentGate.missingConsent} pending recipient(s) are not on the newsletter list or have unsubscribed.
          Cookie marketing consent is not email consent. Transactional mail is separate.
        </p>
      ) : null}
      {sendingLive || (live?.status === "sending" && live.remaining > 0) ? (
        <AdminCard>
          <p className="font-semibold">Sending campaign...</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#E5E2D8]">
            <div className="h-full bg-[#2E6B3F]" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-sm">
            {live?.processed ?? 0} / {live?.recipients ?? 0} processed · Sent: {live?.sent ?? 0} · Failed: {live?.failed ?? 0} · Remaining:{" "}
            {live?.remaining ?? 0}
          </p>
        </AdminCard>
      ) : null}
      {live && live.remaining === 0 && live.sent + live.failed > 0 && live.status !== "sending" ? (
        <AdminCard>
          <h3 className="font-heading text-lg font-semibold">Campaign sent{live.failed > 0 ? ` with ${live.failed} failures` : ""}</h3>
          <p className="mt-2 text-sm">
            Recipients: {live.recipients} · Sent: {live.sent} · Failed: {live.failed}
          </p>
          <p className="text-sm">Estonian: {live.estonian} · English: {live.english}</p>
          <p className="text-sm">Opened: {live.opened} · Clicked: {live.clicked}</p>
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
        <p className="font-semibold">Add recipients</p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 font-mono text-xs"
          placeholder="First Name,Last Name,E-mail address,Keel"
        />
        {csvPreview ? (
          <p className="mt-2 text-sm">
            Recipients: {csvPreview.recipients.length} · Estonian: {csvPreview.estonian} · English: {csvPreview.english} · Invalid:{" "}
            {csvPreview.invalid.length} · Duplicates removed: {csvPreview.duplicatesRemoved}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {(["all", "et", "en"] as const).map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={registeredFilter === value}
                onChange={() => setRegisteredFilter((current) => (current === value ? "none" : value))}
              />
              {value === "all" ? "All registered users" : value === "et" ? "Estonian" : "English"}
            </label>
          ))}
        </div>
        {audienceCount != null ? <p className="mt-2 text-sm">Will add {audienceCount} registered users (before save).</p> : null}
        <button type="button" onClick={() => void addRecipients()} className="mt-3 rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]">
          Add to campaign (no send)
        </button>
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
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-lg font-semibold">Preview · {name}</h2>
          <select value={previewLang} onChange={(e) => setPreviewLang(e.target.value as "en" | "et")} className="rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm">
            <option value="en">English</option>
            <option value="et">Estonian</option>
          </select>
          <button type="button" onClick={() => void sendTest()} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F]">
            Send test
          </button>
          <button
            type="button"
            disabled={bulkLocked || pending === 0}
            onClick={() => {
              setSendMode("pending");
              setConfirmChecked(false);
              setConfirmOpen(true);
            }}
            className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#E5E2D8] disabled:text-muted"
          >
            {bulkLocked ? "Send campaign (locked — consent required)" : "Send campaign"}
          </button>
          {remainingUnsent > 0 && (status === "partially_sent" || status === "sending" || alreadySent > 0) ? (
            <button
              type="button"
              disabled={bulkLocked}
              onClick={() => {
                setSendMode("resume");
                setConfirmChecked(false);
                setConfirmOpen(true);
              }}
              className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50"
            >
              Resume sending
            </button>
          ) : null}
          {failedCount > 0 ? (
            <button
              type="button"
              disabled={bulkLocked}
              onClick={() => {
                setSendMode("failed");
                setConfirmChecked(false);
                setConfirmOpen(true);
              }}
              className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50"
            >
              Retry failed ({failedCount})
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted">
          Send test is separate from marketing bulk send. Preview uses `selectCampaignContent()` the same way SMTP does. Tracking origin is https://www.staywithmypet.ee.
        </p>
        {message ? <p className="mt-2 text-sm">{message}</p> : null}
        <iframe title="Campaign preview" className="mt-4 h-[720px] w-full rounded-xl border border-[#E5E2D8] bg-[#f7f5f0]" srcDoc={previewLang === "et" ? htmlEt : htmlEn} />
      </AdminCard>
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-heading text-xl font-semibold">SEND CAMPAIGN</h3>
            <p className="mt-3 text-sm">Campaign: {name}</p>
            <p className="text-sm">Total recipients: {recipients.length}</p>
            <p className="text-sm">Estonian: {languageCounts.estonian}</p>
            <p className="text-sm">English: {languageCounts.english}</p>
            <p className="text-sm">Pending: {pending}</p>
            <p className="text-sm">Already sent: {alreadySent}</p>
            <p className="mt-2 text-sm">From: {from}</p>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} />
              I confirm the recipient list and campaign content
            </label>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-full border px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmChecked || sendingLive}
                onClick={() => void runSendLoop(sendMode, leaseId ?? undefined)}
                className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                SEND {sendMode === "failed" ? failedCount : sendMode === "resume" ? remainingUnsent : pending} EMAILS
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
