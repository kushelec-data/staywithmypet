"use client";

import { useMemo, useRef, useState } from "react";
import { parseCampaignCsv } from "@/lib/email-campaigns/csv-import";

export function CampaignCsvImport({
  csvText,
  onCsvTextChange,
}: {
  csvText: string;
  onCsvTextChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const preview = useMemo(() => (csvText.trim() ? parseCampaignCsv(csvText) : null), [csvText]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    onCsvTextChange(text);
  }

  return (
    <div>
      <p className="text-xs text-muted">Upload a CSV exported from Excel or Supabase. Import does not send email.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
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
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-[#2E6B3F] px-4 py-1.5 text-sm font-semibold text-[#2E6B3F]"
        >
          Upload CSV
        </button>
      </div>
      {fileName ? <p className="mt-2 text-sm">Selected file: {fileName}</p> : null}
      {preview ? (
        <p className="mt-2 text-sm">
          Recipients: {preview.recipients.length}
          <br />
          Estonian: {preview.estonian}
          <br />
          English: {preview.english}
          <br />
          Invalid: {preview.invalid.length}
          <br />
          Duplicates: {preview.duplicatesRemoved}
        </p>
      ) : null}
      <label className="mt-3 block text-sm">
        Paste CSV
        <textarea
          value={csvText}
          onChange={(e) => onCsvTextChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 font-mono text-xs"
          placeholder="Kush,Chadha,kusheducation@gmail.com,Estonian"
        />
      </label>
    </div>
  );
}
