"use client";

import { useState } from "react";
import { AdminCard, AdminTable } from "@/components/admin/AdminUi";
import { OPEN_TRACKING_DISCLAIMER } from "@/lib/email-campaigns/dto";
import type { CampaignEventDto, CampaignRecipientDto } from "@/lib/email-campaigns/dto";

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
  const [previewLang, setPreviewLang] = useState<"en" | "et">("en");
  const [activity, setActivity] = useState<{ recipient: CampaignRecipientDto; events: CampaignEventDto[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadActivity(recipientId: string) {
    const res = await fetch(`/api/admin/email-campaigns/${campaignId}/recipients/${recipientId}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Could not load activity");
      return;
    }
    setActivity(json);
  }

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
      setMessage(json.error ?? "Send test failed");
      return;
    }
    setMessage(`Send test finished. Sent ${json.sent}, failed ${json.failed}. Refresh to see status.`);
  }

  const cards: Array<[string, number]> = [
    ["Recipients", summary.recipients],
    ["Sent", summary.sent],
    ["Opened", summary.opened],
    ["Unique clicks", summary.uniqueClicks],
    ["Failed", summary.failed],
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">From: {from} · Status: {status}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <AdminCard key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2E6B3F]">{label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
          </AdminCard>
        ))}
      </div>
      <p className="text-xs text-muted">{OPEN_TRACKING_DISCLAIMER}</p>
      <AdminTable
        headers={["Name", "Email", "Language", "Sent", "Opened", "Clicked", "Last activity", "Status", ""]}
        empty="No recipients yet."
        rows={recipients.map((row) => [
          row.name,
          row.email,
          row.language.toUpperCase(),
          row.sentAt ? "✓" : "—",
          row.openedAt ? "✓" : "—",
          row.clicked ? `✓${row.clickedLinkKey ? ` ${row.clickedLinkKey.replace("event_", "").replace("_", " ")}` : ""}` : "—",
          row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString() : "—",
          row.status,
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
                {event.type === "sent" ? "Email sent" : event.type === "opened" ? "Email opened" : event.type === "clicked" ? "Event button clicked" : "Send failed"}
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
          <button type="button" disabled className="cursor-not-allowed rounded-full bg-[#E5E2D8] px-4 py-2 text-sm font-semibold text-muted">
            Send campaign (locked)
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Send campaign stays locked until you approve a real send after this preview. Send test asks for confirmation and then uses SpaceMail.
        </p>
        {message ? <p className="mt-2 text-sm">{message}</p> : null}
        <iframe title="Campaign preview" className="mt-4 h-[720px] w-full rounded-xl border border-[#E5E2D8] bg-[#f7f5f0]" srcDoc={previewLang === "et" ? htmlEt : htmlEn} />
      </AdminCard>
    </div>
  );
}
