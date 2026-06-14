import { getSiteOrigin } from "@/lib/site-url";

export function siteBaseUrl(): string {
  return getSiteOrigin();
}

export function absoluteUrl(path: string): string {
  const base = siteBaseUrl();
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function safeName(name: string | undefined, fallback = "there"): string {
  const trimmed = name?.trim();
  return trimmed ? escapeHtml(trimmed) : fallback;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">${text}</p>`;
}

export function checklistItem(text: string): string {
  return `<li style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#444;">${text}</li>`;
}

export function checklist(title: string, items: string[]): string {
  const list = items.map((item) => checklistItem(item)).join("");
  return `
<p style="margin:20px 0 8px;font-size:14px;font-weight:600;color:#1a6b5c;">${escapeHtml(title)}</p>
<ul style="margin:0 0 16px;padding-left:20px;">${list}</ul>`;
}

export function ctaButton(label: string, href: string): string {
  const url = escapeHtml(href);
  return `<p style="margin:20px 0 8px;"><a href="${url}" style="display:inline-block;background:#1a6b5c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:999px;">${escapeHtml(label)}</a></p>`;
}

export function wrapEmail(
  bodyHtml: string,
  headline: string,
  options?: { includeFooter?: boolean },
): string {
  const logoUrl = escapeHtml(absoluteUrl("/logo.png"));
  const footer =
    options?.includeFooter === false
      ? ""
      : `<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#666;">
                Warm regards,<br />The Stay With My Pet Team
              </p>`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#d4ede4 0%,#f7f5f0 100%);padding:28px 32px 20px;">
              <img src="${logoUrl}" alt="Stay With My Pet" width="120" style="display:block;max-width:120px;height:auto;margin-bottom:16px;" />
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a6b5c;letter-spacing:0.04em;text-transform:uppercase;">Stay With My Pet</p>
              <h1 style="margin:12px 0 0;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;">${escapeHtml(headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              ${bodyHtml}
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function buildTemplate(
  headline: string,
  paragraphs: string[],
  options?: {
    cta?: { label: string; href: string } | null;
    checklist?: { title: string; items: string[] } | null;
  },
): { subject: string; html: string; text: string } {
  const bodyParts = paragraphs.map((p) => paragraph(p));
  if (options?.checklist) {
    bodyParts.push(checklist(options.checklist.title, options.checklist.items));
  }
  if (options?.cta) {
    bodyParts.push(ctaButton(options.cta.label, options.cta.href));
  }
  const html = wrapEmail(bodyParts.join(""), headline);
  const textParts = [
    headline,
    "",
    ...paragraphs.map((p) => p.replace(/<[^>]+>/g, "")),
    ...(options?.checklist
      ? [options.checklist.title, ...options.checklist.items.map((i) => `• ${i}`)]
      : []),
    options?.cta ? `${options.cta.label}: ${options.cta.href}` : "",
    "",
    "Warm regards,",
    "The Stay With My Pet Team",
  ].filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== ""));
  return {
    subject: headline,
    html,
    text: textParts.join("\n"),
  };
}
