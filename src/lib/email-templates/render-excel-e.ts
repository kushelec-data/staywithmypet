import excelContent from "@/lib/email-templates/excel-e-content.json";
import { buildEmailTemplateVars, type EmailTemplateVars } from "@/lib/email-templates/vars";
import type { EmailLocale } from "@/lib/email-templates/locale";
import {
  ctaButton,
  escapeHtml,
  paragraph,
  wrapEmail,
} from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

const BILINGUAL_BODY_SEPARATOR = "────────────────────────────";

type ExcelEntry = { row: number; text: string };

export type ExcelTemplateKey = keyof typeof excelContent;

function entry(key: ExcelTemplateKey): ExcelEntry {
  return excelContent[key] as ExcelEntry;
}

/** Excel Column E — bilingual subject: `ET | EN` */
export function splitBilingualSubject(line: string): { et: string; en: string } {
  const trimmed = line.trim();
  const idx = trimmed.indexOf(" | ");
  if (idx === -1) return { et: trimmed, en: trimmed };
  return {
    et: trimmed.slice(0, idx).trim(),
    en: trimmed.slice(idx + 3).trim(),
  };
}

/** Excel Column E — bilingual body split by divider line */
export function splitBilingualBody(text: string): { et: string; en: string } {
  const trimmed = text.trim();
  const idx = trimmed.indexOf(BILINGUAL_BODY_SEPARATOR);
  if (idx === -1) return { et: trimmed, en: trimmed };
  return {
    et: trimmed.slice(0, idx).trim(),
    en: trimmed.slice(idx + BILINGUAL_BODY_SEPARATOR.length).trim(),
  };
}

function replacePlaceholders(text: string, vars: EmailTemplateVars, ctx: EmailTemplateContext): string {
  const senderName = ctx.senderName?.trim() || vars.otherPartyName || "Member";
  const membershipDate = vars.endDate !== "—" ? vars.endDate : vars.startDate;

  const pairs: Array<[string, string]> = [
    ["[Name]", vars.name],
    ["[Nimi]", vars.name],
    ["[Pet Parent Name]", vars.petParentName],
    ["[Pet Parent's Name]", vars.petParentName],
    ["[Pet Paren Name]", vars.petParentName],
    ["[Pet Paren´s Name]", vars.petParentName],
    ["[Pet Friend Name]", vars.petFriendName],
    ["[Pet Friend's Name]", vars.petFriendName],
    ["[Pet Friend´s Name]", vars.petFriendName],
    ["[Pet Freiend Name]", vars.petFriendName],
    ["[Pet Name]", vars.petName],
    ["[Pet's Name]", vars.petName],
    ["[Pet’s Name]", vars.petName],
    ["[Pet Type]", vars.petType],
    ["[Pet type]", vars.petType],
    ["[Pet's type]", vars.petType],
    ["[Pet’s type]", vars.petType],
    ["[Start Date]", vars.startDate],
    ["[End Date]", vars.endDate],
    ["[Date]", membershipDate],
    ["[Kuupäev]", membershipDate],
    ["[Package Name]", vars.packageName],
    ["[Auto Renewal]", vars.autoRenew],
    ["[Saatja nimi]", senderName],
    ["[Sender Name]", senderName],
    ["[Review link]", vars.reviewLink],
    ["[Message link]", vars.messageLinkWithConversation],
    ["[Booking details]", vars.viewBookingUrl],
  ];

  let out = text;
  for (const [token, value] of pairs) {
    out = out.split(token).join(value);
  }
  return out;
}

function ctaHrefForLabel(label: string, vars: EmailTemplateVars): string {
  const lower = label.toLowerCase();
  if (lower.includes("sõnum") || lower.includes("message")) return vars.messageLinkWithConversation;
  if (lower.includes("broneering") || lower.includes("booking")) return vars.viewBookingUrl;
  if (lower.includes("taotl") || lower.includes("request")) return vars.viewIncomingRequestUrl;
  if (lower.includes("profiil") || lower.includes("profile") || lower.includes("lemmiku"))
    return vars.managePetProfileUrl;
  if (lower.includes("lemmikuid") || lower.includes("other pets") || lower.includes("matches"))
    return vars.browseMatchesUrl;
  if (lower.includes("loomasõbr") || lower.includes("pet friend")) return vars.browseMatchesUrl;
  if (lower.includes("paket") || lower.includes("plan") || lower.includes("liikmelisus") || lower.includes("membership"))
    return vars.membershipUrl;
  if (lower.includes("kont") || lower.includes("account")) return vars.membershipUrl;
  if (lower.includes("tagasiside") || lower.includes("review")) return vars.reviewLink;
  return vars.membershipUrl;
}

function blockToHtml(block: string, vars: EmailTemplateVars): string {
  const trimmed = block.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("👉")) {
    const label = trimmed.replace(/^👉\s*/, "").trim();
    return ctaButton(label, ctaHrefForLabel(label, vars));
  }

  const html = escapeHtml(trimmed).replace(/\n/g, "<br />");
  return paragraph(html);
}

function bodyToHtml(body: string, vars: EmailTemplateVars): string {
  return body
    .split(/\n\n+/)
    .map((block) => blockToHtml(block, vars))
    .filter(Boolean)
    .join("");
}

/** Build email from Excel Column E subject + body keys. */
export function buildEmailFromExcelColumnE(
  subjectKey: ExcelTemplateKey,
  bodyKey: ExcelTemplateKey,
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  const subjectRaw = entry(subjectKey).text;
  const bodyRaw = entry(bodyKey).text;
  const vars = buildEmailTemplateVars({ ...ctx, locale });

  const subjects = splitBilingualSubject(subjectRaw);
  const bodies = splitBilingualBody(bodyRaw);

  const subjectTemplate = locale === "et" ? subjects.et : subjects.en;
  const bodyTemplate = locale === "et" ? bodies.et : bodies.en;

  const subject = replacePlaceholders(subjectTemplate, vars, ctx);
  const bodyText = replacePlaceholders(bodyTemplate, vars, ctx);
  const bodyHtml = bodyToHtml(bodyText, vars);
  const html = wrapEmail(bodyHtml, subject, { includeFooter: false });

  const plainBody = bodyText.replace(/\n\n+/g, "\n\n");
  return {
    subject,
    html,
    text: [subject, "", plainBody].join("\n"),
  };
}

export function excelRowComment(subjectKey: ExcelTemplateKey): string {
  const row = entry(subjectKey).row;
  return `Excel Column E row ${row}`;
}

export { excelContent };
