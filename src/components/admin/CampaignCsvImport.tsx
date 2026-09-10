"use client";

import { useRef, useState } from "react";
import { parseCampaignCsv } from "@/lib/email-campaigns/csv-import";

export function CampaignCsvImport({
  onCsvReady,
  busy,
  showSummary = true,
}: {
  onCsvReady: (text: string) => void;
  busy?: boolean;
  showSummary?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ people: number; english: number; estonian: number; invalid: number } | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCampaignCsv(text);
    setFileName(file.name);
    setSummary({
      people: parsed.recipients.length,
      english: parsed.english,
      estonian: parsed.estonian,
      invalid: parsed.invalid.length,
    });
    onCsvReady(text);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            void onFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-[#2E6B3F] px-4 py-1.5 text-sm font-semibold text-[#2E6B3F] disabled:opacity-50"
        >
          Upload CSV
        </button>
      </div>
      {showSummary && fileName ? <p className="mt-2 text-sm">File: {fileName}</p> : null}
      {showSummary && summary ? (
        <div className="mt-3 text-sm">
          <p className="font-semibold">Recipients</p>
          <p>{summary.people} {summary.people === 1 ? "person" : "people"}</p>
          <p>
            {summary.english} English · {summary.estonian} Estonian
          </p>
          <p className="mt-1 text-muted">Languages are automatically selected from the CSV.</p>
          {summary.invalid > 0 ? <p className="mt-1 text-red-700">{summary.invalid} row(s) could not be imported.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
