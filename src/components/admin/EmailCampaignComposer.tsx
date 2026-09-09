"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard } from "@/components/admin/AdminUi";
import { DEFAULT_TEST_RECIPIENTS, SEPTEMBER_SUBJECT_EN, SEPTEMBER_SUBJECT_ET } from "@/lib/email-campaigns/events";
import { SEPTEMBER_SPONSOR_LINE, type CampaignTemplateConfig } from "@/lib/email-campaigns/template-config";

export function EmailCampaignComposer() {
  const router = useRouter();
  const [name, setName] = useState("September community events (test)");
  const [subjectEn, setSubjectEn] = useState(SEPTEMBER_SUBJECT_EN);
  const [subjectEt, setSubjectEt] = useState(SEPTEMBER_SUBJECT_ET);
  const [language, setLanguage] = useState<"en" | "et">("en");
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sponsorUrls, setSponsorUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries(SEPTEMBER_SPONSOR_LINE.map((item) => [item.key, item.destinationUrl ?? ""])),
  );

  const templateConfig: CampaignTemplateConfig = useMemo(
    () => ({
      sponsors: SEPTEMBER_SPONSOR_LINE.map((item) => ({
        key: item.key,
        label: item.label,
        destinationUrl: sponsorUrls[item.key]?.trim() || null,
      })),
    }),
    [sponsorUrls],
  );

  async function preview() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/email-campaigns/new/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, templateConfig }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Preview failed");
      return;
    }
    setPreviewHtml(json.html ?? "");
  }

  async function createDraft() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/email-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedSeptemberTest: true, templateConfig }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not create campaign");
      return;
    }
    router.push(`/admin/email-campaigns/${json.id}`);
    router.refresh();
  }

  return (
    <AdminCard>
      <h2 className="font-heading text-lg font-semibold">Composer</h2>
      <p className="mt-1 text-sm text-muted">
        First test uses the English September events email. Recipients are explicit — we will not email every registered user.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Campaign name
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
        <label className="text-sm">
          Preview language
          <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "et")} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2">
            <option value="en">English</option>
            <option value="et">Estonian</option>
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Subject EN
          <input value={subjectEn} onChange={(e) => setSubjectEn(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
        <label className="text-sm md:col-span-2">
          Subject ET
          <input value={subjectEt} onChange={(e) => setSubjectEt(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
      </div>
      <p className="mt-4 text-sm font-semibold text-[#2E6B3F]">Sponsor homepages</p>
      <p className="mt-1 text-xs text-muted">
        Names stay in the email; URLs are stored on the campaign and used only for click tracking. Leave ViWell and Semu empty until official URLs are confirmed.
      </p>
      <div className="mt-3 grid gap-3">
        {SEPTEMBER_SPONSOR_LINE.map((item) => (
          <label key={item.key} className="text-sm">
            {item.label}
            <input
              value={sponsorUrls[item.key] ?? ""}
              onChange={(e) => setSponsorUrls((prev) => ({ ...prev, [item.key]: e.target.value }))}
              placeholder={item.destinationUrl ? item.destinationUrl : "URL not confirmed"}
              className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
            />
          </label>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-[#2E6B3F]">Test recipients</p>
      <ul className="mt-1 text-sm text-foreground">
        {DEFAULT_TEST_RECIPIENTS.map((row) => (
          <li key={row.email}>
            {row.displayName} · {row.email} · {row.language.toUpperCase()}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Registered users can be added later by explicit selection. Locale ET uses the Estonian template; anything else uses English.
      </p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => void preview()} disabled={busy} className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Preview
        </button>
        <button type="button" onClick={() => void createDraft()} disabled={busy} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50">
          Save test campaign (no send)
        </button>
      </div>
      {previewHtml ? (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#2E6B3F]">Rendered email</p>
          <iframe title="Email preview" className="h-[720px] w-full rounded-xl border border-[#E5E2D8] bg-[#f7f5f0]" srcDoc={previewHtml} />
        </div>
      ) : null}
    </AdminCard>
  );
}
