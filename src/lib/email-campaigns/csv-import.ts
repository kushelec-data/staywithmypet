import { campaignLanguageFromPreferredLocale, type CampaignLanguage } from "@/lib/email-campaigns/locale";

export type CsvRecipient = {
  displayName: string;
  email: string;
  language: CampaignLanguage;
};

export type CsvImportResult = {
  recipients: CsvRecipient[];
  invalid: Array<{ row: number; email: string; reason: string }>;
  duplicatesRemoved: number;
  estonian: number;
  english: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCampaignEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function mapCampaignCsvLanguage(raw: string | null | undefined): CampaignLanguage {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "et" || value === "et-ee" || value === "estonian" || value === "eesti") return "et";
  return "en";
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function headerIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseCampaignCsv(text: string): CsvImportResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  const invalid: CsvImportResult["invalid"] = [];
  const recipients: CsvRecipient[] = [];
  if (lines.length === 0) {
    return { recipients, invalid, duplicatesRemoved: 0, estonian: 0, english: 0 };
  }

  const first = splitCsvLine(lines[0]);
  const looksLikeHeader = first.some((cell) => /name|e-?mail|keel|language/i.test(cell));
  const rows = looksLikeHeader ? lines.slice(1) : lines;
  const headers = looksLikeHeader ? first : ["first name", "last name", "e-mail address", "keel"];
  const firstIdx = headerIndex(headers, ["first name", "firstname", "eesnimi"]);
  const lastIdx = headerIndex(headers, ["last name", "lastname", "perekonnanimi"]);
  const nameIdx = headerIndex(headers, ["name", "display name", "nimi"]);
  const emailIdx = headerIndex(headers, ["e-mail address", "email", "e-mail", "email address"]);
  const langIdx = headerIndex(headers, ["keel", "language", "locale"]);

  const seen = new Set<string>();
  let duplicatesRemoved = 0;

  rows.forEach((line, index) => {
    const cells = splitCsvLine(line);
    const rowNumber = looksLikeHeader ? index + 2 : index + 1;
    const email = String(cells[emailIdx >= 0 ? emailIdx : 2] ?? "").trim().toLowerCase();
    const firstName = String(cells[firstIdx >= 0 ? firstIdx : 0] ?? "").trim();
    const lastName = String(cells[lastIdx >= 0 ? lastIdx : 1] ?? "").trim();
    const fullName = nameIdx >= 0 ? String(cells[nameIdx] ?? "").trim() : "";
    const displayName = (fullName || `${firstName} ${lastName}`.trim()).replace(/\s+/g, " ");
    const language = mapCampaignCsvLanguage(cells[langIdx >= 0 ? langIdx : 3]);
    if (!isValidCampaignEmail(email)) {
      invalid.push({ row: rowNumber, email, reason: "invalid_email" });
      return;
    }
    const name = displayName || email;
    if (seen.has(email)) {
      duplicatesRemoved += 1;
      return;
    }
    seen.add(email);
    recipients.push({ displayName: name, email, language });
  });

  return {
    recipients,
    invalid,
    duplicatesRemoved,
    estonian: recipients.filter((row) => row.language === "et").length,
    english: recipients.filter((row) => row.language === "en").length,
  };
}

export function summarizeRecipientLanguages(rows: Array<{ language: string }>): { total: number; estonian: number; english: number } {
  return {
    total: rows.length,
    estonian: rows.filter((row) => campaignLanguageFromPreferredLocale(row.language) === "et").length,
    english: rows.filter((row) => campaignLanguageFromPreferredLocale(row.language) !== "et").length,
  };
}
