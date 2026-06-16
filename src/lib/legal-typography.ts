export type LegalParagraphRole =
  | "section"
  | "subsection"
  | "group"
  | "label"
  | "list-item"
  | "body";

const SUBSECTION_RE = /^\d+\.\d+\s/;
const SECTION_RE = /^\d+\.\s/;
const GROUP_RE = /^\([a-e]\)\s/i;
const RIGHTS_RE =
  /^(Access|Rectification|Erasure|Restriction|Portability|Objection|Withdraw consent)\s*[–-]/;
const PURPOSE_RE = /^To (register|provide|process|ensure|enable|maintain|send|improve|comply)\b/i;

/** Classify a legal paragraph for typography without changing content. */
export function classifyLegalParagraph(text: string): LegalParagraphRole {
  const t = text.trim();
  if (!t) return "body";

  if (SUBSECTION_RE.test(t)) return "subsection";
  if (SECTION_RE.test(t) && t.length < 110) return "section";
  if (GROUP_RE.test(t)) return "group";
  if (RIGHTS_RE.test(t) || PURPOSE_RE.test(t)) return "list-item";
  if (/^(Legal Basis|Purpose)$/i.test(t)) return "label";
  if (t.endsWith(":") && t.length < 90) return "label";
  if (/^For (Pet Parents|Pet Friends)\b/i.test(t)) return "group";

  if (
    t.length <= 88 &&
    !/[.!?]$/.test(t) &&
    !t.includes(". ") &&
    !SECTION_RE.test(t) &&
    !SUBSECTION_RE.test(t) &&
    !/^Stay With My Pet$/i.test(t)
  ) {
    const wordCount = t.split(/\s+/).length;
    if (wordCount <= 12 && (t.includes(",") || wordCount <= 6)) {
      return "list-item";
    }
  }

  if (
    t.length < 72 &&
    !/[.!?]$/.test(t) &&
    /^[A-Z0-9(]/.test(t) &&
    !t.includes(" – ") &&
    !SECTION_RE.test(t)
  ) {
    return "label";
  }

  return "body";
}

export type LegalContentBlock =
  | { type: "paragraph"; text: string; role: LegalParagraphRole }
  | { type: "list"; items: string[] };

/** Group consecutive list items for semantic lists. */
export function buildLegalContentBlocks(paragraphs: string[]): LegalContentBlock[] {
  const blocks: LegalContentBlock[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: "list", items: listItems });
    listItems = [];
  };

  for (const text of paragraphs) {
    const role = classifyLegalParagraph(text);
    if (role === "list-item") {
      listItems.push(text);
      continue;
    }
    flushList();
    blocks.push({ type: "paragraph", text, role });
  }

  flushList();
  return blocks;
}
