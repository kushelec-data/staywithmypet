"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard } from "@/components/admin/AdminUi";
import { CampaignCsvImport } from "@/components/admin/CampaignCsvImport";
import { DEFAULT_TEST_RECIPIENTS, ESTONIAN_TEST_RECIPIENTS, SEPTEMBER_EVENT_LINKS, SEPTEMBER_SUBJECT_EN, SEPTEMBER_SUBJECT_ET } from "@/lib/email-campaigns/events";
import { SEPTEMBER_SPONSOR_LINE, type CampaignTemplateConfig } from "@/lib/email-campaigns/template-config";
import {
  DEFAULT_CAMPAIGN_BODY_EN,
  DEFAULT_CAMPAIGN_BODY_ET,
  DEFAULT_PREHEADER_EN,
  DEFAULT_PREHEADER_ET,
} from "@/lib/email-campaigns/html";

export function EmailCampaignComposer() {
  const router = useRouter();
  const [name, setName] = useState("September community events (test)");
  const [subjectEn, setSubjectEn] = useState(SEPTEMBER_SUBJECT_EN);
  const [subjectEt, setSubjectEt] = useState(SEPTEMBER_SUBJECT_ET);
  const [preheaderEn, setPreheaderEn] = useState(DEFAULT_PREHEADER_EN);
  const [preheaderEt, setPreheaderEt] = useState(DEFAULT_PREHEADER_ET);
  const [bodyEn, setBodyEn] = useState(DEFAULT_CAMPAIGN_BODY_EN);
  const [bodyEt, setBodyEt] = useState(DEFAULT_CAMPAIGN_BODY_ET);
  const [language, setLanguage] = useState<"en" | "et">("en");
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [registeredFilter, setRegisteredFilter] = useState<"none" | "all" | "et" | "en">("none");
  const [audience, setAudience] = useState<{
    all: number;
    estonian: number;
    english: number;
    selected: number;
    selectedConsented: number;
  } | null>(null);
  const [sponsorUrls, setSponsorUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries(SEPTEMBER_SPONSOR_LINE.map((item) => [item.key, item.destinationUrl ?? ""])),
  );

  useEffect(() => {
    const filter = registeredFilter === "none" ? "all" : registeredFilter;
    void fetch(`/api/admin/email-campaigns/audience?filter=${filter}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.all != null) {
          setAudience({
            all: json.all,
            estonian: json.estonian,
            english: json.english,
            selected: json.selected,
            selectedConsented: json.selectedConsented,
          });
        }
      })
      .catch(() => undefined);
  }, [registeredFilter]);

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
      body: JSON.stringify({
        language,
        templateConfig,
        bodyEn,
        bodyEt,
        preheaderEn,
        preheaderEt,
        subjectEn,
        subjectEt,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Preview failed");
      return;
    }
    setPreviewHtml(json.html ?? "");
  }

  async function createEstonianDraft() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/email-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedSeptemberEstonianTest: true, templateConfig }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not create Estonian campaign");
      return;
    }
    router.push(`/admin/email-campaigns/${json.id}`);
    router.refresh();
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

  async function createFromImport() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/email-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subjectEn,
        subjectEt,
        preheaderEn,
        preheaderEt,
        bodyEn,
        bodyEt,
        templateConfig,
        csvText: csvText.trim() || undefined,
        registeredFilter: registeredFilter === "none" ? undefined : registeredFilter,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save campaign");
      return;
    }
    router.push(`/admin/email-campaigns/${json.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Campaign details</h2>
        <label className="mt-3 block text-sm">
          Campaign name
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>

        <h3 className="mt-5 font-heading text-base font-semibold">English email</h3>
        <label className="mt-2 block text-sm">
          Subject
          <input value={subjectEn} onChange={(e) => setSubjectEn(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
        <label className="mt-2 block text-sm">
          Preview text
          <input value={preheaderEn} onChange={(e) => setPreheaderEn(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
        <label className="mt-2 block text-sm">
          Email body
          <textarea
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            rows={12}
            className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Paste or write the main email content here. Keep the closing paragraphs in this field — they are placed after the event buttons. Sponsor links are added below that.
        </p>

        <h3 className="mt-5 font-heading text-base font-semibold">Estonian email</h3>
        <label className="mt-2 block text-sm">
          Subject
          <input value={subjectEt} onChange={(e) => setSubjectEt(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
        <label className="mt-2 block text-sm">
          Preview text
          <input value={preheaderEt} onChange={(e) => setPreheaderEt(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2" />
        </label>
        <label className="mt-2 block text-sm">
          Email body
          <textarea
            value={bodyEt}
            onChange={(e) => setBodyEt(e.target.value)}
            rows={12}
            className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Paste or write the main email content here. Keep the closing paragraphs in this field — they are placed after the event buttons. Sponsor links are added below that.
        </p>
      </AdminCard>

      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Recipients</h2>
        <p className="mt-1 text-xs text-muted">Language uses stored locale for registered users (swmp_locale), or CSV Keel.</p>
        <div className="mt-3">
          <CampaignCsvImport csvText={csvText} onCsvTextChange={setCsvText} />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#2E6B3F]">Add registered users</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
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
        {audience ? (
          <p className="mt-2 text-sm">
            Registered: {audience.all} (ET {audience.estonian} / EN {audience.english}). This selection: {audience.selected} ({audience.selectedConsented} with newsletter consent).
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted">English test: {DEFAULT_TEST_RECIPIENTS.map((row) => row.email).join(", ")}</p>
        <p className="text-xs text-muted">Estonian test: {ESTONIAN_TEST_RECIPIENTS.map((row) => row.email).join(", ")}</p>
      </AdminCard>

      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Event links</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {SEPTEMBER_EVENT_LINKS.map((link) => (
            <li key={link.key}>
              <span className="font-medium">{link.label}</span>
              <span className="mt-0.5 block break-all text-xs text-muted">{link.destinationUrl}</span>
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Sponsor links</h2>
        <p className="mt-1 text-xs text-muted">Used for click tracking. New campaigns load these URLs automatically.</p>
        <div className="mt-3 grid gap-2">
          {SEPTEMBER_SPONSOR_LINE.map((item) => (
            <label key={item.key} className="text-sm">
              {item.label}
              <input
                value={sponsorUrls[item.key] ?? ""}
                onChange={(e) => setSponsorUrls((prev) => ({ ...prev, [item.key]: e.target.value }))}
                placeholder={item.destinationUrl ?? "No URL yet"}
                className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-1.5"
              />
            </label>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <h2 className="font-heading text-lg font-semibold">Send / test</h2>
        <p className="mt-1 text-xs text-muted">Saving a draft does not send email.</p>
        <label className="mt-2 block text-sm">
          Preview language
          <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "et")} className="mt-1 w-full max-w-xs rounded-xl border border-[#E5E2D8] px-3 py-2">
            <option value="en">English</option>
            <option value="et">Estonian</option>
          </select>
        </label>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void preview()} disabled={busy} className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Preview
          </button>
          <button type="button" onClick={() => void createFromImport()} disabled={busy} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50">
            Save with imported recipients
          </button>
          <button type="button" onClick={() => void createDraft()} disabled={busy} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50">
            Save English test draft
          </button>
          <button type="button" onClick={() => void createEstonianDraft()} disabled={busy} className="rounded-full border border-[#2E6B3F] px-4 py-2 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50">
            Save Estonian test draft
          </button>
        </div>
        {previewHtml ? (
          <iframe title="Email preview" className="mt-4 h-[480px] w-full rounded-xl border border-[#E5E2D8] bg-[#f7f5f0]" srcDoc={previewHtml} />
        ) : null}
      </AdminCard>
    </div>
  );
}
