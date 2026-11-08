import { absoluteUrl, ctaButton, escapeHtml, paragraph, wrapEmail } from "@/lib/emails/layout";
import type { EmailTemplate } from "@/lib/emails/types";
import { PROFILE_REMINDER_CTA_PATH } from "./config";
import { profileReminderCopy } from "./copy";
import { reminderGreeting } from "./first-name";
import type { ReminderEmailRole, ReminderLocale, ReminderTemplateStage } from "./types";

function benefitHtml(emoji: string, title: string, rest: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">${escapeHtml(emoji)} <strong>${escapeHtml(title)}</strong> ${escapeHtml(rest)}</p>`;
}

function headingHtml(text: string): string {
  return `<p style="margin:20px 0 12px;font-size:16px;line-height:1.5;color:#1a6b5c;font-weight:700;"><strong>${escapeHtml(text)}</strong></p>`;
}

export function profileCompletionDeepLink(): string {
  return absoluteUrl(PROFILE_REMINDER_CTA_PATH);
}

export function buildProfileCompletionReminderEmail(input: {
  stage: ReminderTemplateStage;
  role: ReminderEmailRole;
  locale: ReminderLocale;
  firstName: string | null;
}): EmailTemplate {
  const copy = profileReminderCopy(input.stage, input.role, input.locale);
  const greeting = reminderGreeting(input.locale, input.firstName);
  const ctaHref = profileCompletionDeepLink();
  const siteLink = absoluteUrl("/");

  const parts: string[] = [paragraph(escapeHtml(greeting))];
  for (const intro of copy.intro) {
    parts.push(paragraph(escapeHtml(intro)));
  }
  if (copy.whyHeading) {
    parts.push(headingHtml(copy.whyHeading));
  }
  for (const benefit of copy.benefits) {
    parts.push(benefitHtml(benefit.emoji, benefit.title, benefit.rest));
  }
  if (copy.closer) {
    parts.push(paragraph(escapeHtml(copy.closer)));
  }
  parts.push(ctaButton(copy.cta, ctaHref));
  if (copy.membership) {
    parts.push(paragraph(escapeHtml(copy.membership)));
  }
  if (copy.tagline) {
    parts.push(paragraph(escapeHtml(copy.tagline)));
  }
  const signature = copy.signOff
    .map((line, index) => {
      if (line === "staywithmypet.ee") {
        return `<a href="${escapeHtml(siteLink)}" style="color:#1a6b5c;text-decoration:none;">staywithmypet.ee</a>`;
      }
      return escapeHtml(line) + (index === 0 ? "" : "");
    })
    .join("<br />");
  parts.push(`<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#666;">${signature}</p>`);

  const html = wrapEmail(parts.join(""), copy.heading, {
    includeFooter: false,
    preheader: copy.preheader,
  });

  const text = [
    greeting,
    "",
    ...copy.intro,
    copy.whyHeading,
    ...copy.benefits.map((item) => `${item.emoji} ${item.title} ${item.rest}`),
    copy.closer,
    "",
    `${copy.cta}: ${ctaHref}`,
    copy.membership,
    copy.tagline,
    "",
    ...copy.signOff,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject: copy.subject,
    html,
    text,
  };
}

export const INTERNAL_TEST_BANNER =
  "INTERNAL TEST ONLY — rendering check. This is not a customer reminder and contains no customer personal information.";

/** Marks a Day 5 copy for Kush/Gerly QA. Does not change approved customer copy. */
export function markInternalTestReminder(template: EmailTemplate): EmailTemplate {
  const bannerHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td bgcolor="#fff3cd" style="background-color:#fff3cd;padding:12px 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.4;color:#664d03;font-weight:700;">${escapeHtml(INTERNAL_TEST_BANNER)}</td></tr></table>`;
  return {
    subject: `[INTERNAL TEST] ${template.subject}`,
    html: template.html.replace(/<body([^>]*)>/i, `<body$1>${bannerHtml}`),
    text: `${INTERNAL_TEST_BANNER}\n\n${template.text}`,
  };
}
