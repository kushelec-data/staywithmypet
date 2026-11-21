import { ROLE_ONBOARDING_PATH } from "@/lib/auth-routing";
import { absoluteUrl, ctaButton, escapeHtml, paragraph, wrapEmail } from "@/lib/emails/layout";
import type { EmailTemplate } from "@/lib/emails/types";
import { INTERNAL_TEST_BANNER } from "@/lib/profile-completion-reminders/templates";
import type { ReminderLocale } from "@/lib/profile-completion-reminders/types";
import { roleSelectionInternalTestPrefix } from "./config";
import { roleSelectionReminder1Copy, roleSelectionReminder2Copy } from "./copy";
import type { RoleSelectionStage } from "./types";

function headingHtml(text: string): string {
  return `<p style="margin:20px 0 12px;font-size:16px;line-height:1.5;color:#1a6b5c;font-weight:700;"><strong>${escapeHtml(text)}</strong></p>`;
}

function roleBlockHtml(title: string, body: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;"><strong>${escapeHtml(title)}</strong><br />${escapeHtml(body)}</p>`;
}

function roleLineHtml(title: string, body: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;"><strong>${escapeHtml(title)}</strong> – ${escapeHtml(body)}</p>`;
}

export function roleSelectionCtaUrl(): string {
  return absoluteUrl(ROLE_ONBOARDING_PATH);
}

export function buildRoleSelectionReminder1Email(locale: ReminderLocale): EmailTemplate {
  const copy = roleSelectionReminder1Copy(locale);
  const ctaHref = roleSelectionCtaUrl();
  const siteLink = absoluteUrl("/");

  const parts: string[] = [
    paragraph(escapeHtml(copy.greeting)),
    ...copy.intro.map((line) => paragraph(escapeHtml(line))),
    headingHtml(copy.howHeading),
    roleBlockHtml(copy.parentTitle, copy.parentBody),
    roleBlockHtml(copy.friendTitle, copy.friendBody),
    paragraph(`<strong>${escapeHtml(copy.closer)}</strong>`),
    ctaButton(copy.cta, ctaHref),
    paragraph(escapeHtml(copy.membership)),
    paragraph(escapeHtml(copy.tagline)),
  ];

  const signature = copy.signOff
    .map((line) => {
      if (line === "staywithmypet.ee") {
        return `<a href="${escapeHtml(siteLink)}" style="color:#1a6b5c;text-decoration:none;">staywithmypet.ee</a>`;
      }
      return escapeHtml(line);
    })
    .join("<br />");
  parts.push(`<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#666;">${signature}</p>`);

  const html = wrapEmail(parts.join(""), copy.subject, {
    includeFooter: false,
    preheader: copy.preheader,
  });

  const text = [
    copy.greeting,
    "",
    ...copy.intro,
    "",
    copy.howHeading,
    `${copy.parentTitle} ${copy.parentBody}`,
    `${copy.friendTitle} ${copy.friendBody}`,
    copy.closer,
    "",
    `${copy.cta}: ${ctaHref}`,
    copy.membership,
    copy.tagline,
    "",
    ...copy.signOff,
  ].join("\n");

  return {
    subject: copy.subject,
    html,
    text,
  };
}

export function buildRoleSelectionReminder2Email(locale: ReminderLocale): EmailTemplate {
  const copy = roleSelectionReminder2Copy(locale);
  const ctaHref = roleSelectionCtaUrl();
  const siteLink = absoluteUrl("/");

  const parts: string[] = [
    paragraph(escapeHtml(copy.greeting)),
    paragraph(escapeHtml(copy.intro)),
    paragraph(escapeHtml(copy.question)),
    headingHtml(copy.closer),
    roleLineHtml(copy.parentTitle, copy.parentBody),
    roleLineHtml(copy.friendTitle, copy.friendBody),
    ctaButton(copy.cta, ctaHref),
    paragraph(escapeHtml(copy.membership)),
    paragraph(escapeHtml(copy.tagline)),
  ];

  const signature = copy.signOff
    .map((line) => {
      if (line === "staywithmypet.ee") {
        return `<a href="${escapeHtml(siteLink)}" style="color:#1a6b5c;text-decoration:none;">staywithmypet.ee</a>`;
      }
      return escapeHtml(line);
    })
    .join("<br />");
  parts.push(`<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#666;">${signature}</p>`);

  const html = wrapEmail(parts.join(""), copy.subject, {
    includeFooter: false,
    preheader: copy.preheader,
  });

  const text = [
    copy.greeting,
    "",
    copy.intro,
    copy.question,
    "",
    copy.closer,
    `${copy.parentTitle} – ${copy.parentBody}`,
    `${copy.friendTitle} – ${copy.friendBody}`,
    "",
    `${copy.cta}: ${ctaHref}`,
    copy.membership,
    copy.tagline,
    "",
    ...copy.signOff,
  ].join("\n");

  return {
    subject: copy.subject,
    html,
    text,
  };
}

export function buildRoleSelectionReminderEmail(
  locale: ReminderLocale,
  stage: RoleSelectionStage,
): EmailTemplate {
  return stage === 2 ? buildRoleSelectionReminder2Email(locale) : buildRoleSelectionReminder1Email(locale);
}

export function markRoleSelectionInternalTestEmail(
  template: EmailTemplate,
  stage: RoleSelectionStage = 1,
): EmailTemplate {
  const bannerHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td bgcolor="#fff3cd" style="background-color:#fff3cd;padding:12px 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.4;color:#664d03;font-weight:700;">${escapeHtml(INTERNAL_TEST_BANNER)}</td></tr></table>`;
  return {
    subject: `${roleSelectionInternalTestPrefix(stage)} ${template.subject}`,
    html: template.html.replace(/<body([^>]*)>/i, `<body$1>${bannerHtml}`),
    text: `${INTERNAL_TEST_BANNER}\n\n${template.text}`,
  };
}
