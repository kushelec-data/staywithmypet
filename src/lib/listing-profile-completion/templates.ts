import { DAY5_COPY } from "@/lib/profile-completion-reminders/copy";
import {
  buildProfileCompletionReminderEmail,
  INTERNAL_TEST_BANNER,
} from "@/lib/profile-completion-reminders/templates";
import { escapeHtml } from "@/lib/emails/layout";
import type { EmailTemplate } from "@/lib/emails/types";
import type { ReminderEmailRole, ReminderLocale } from "@/lib/profile-completion-reminders/types";
import { LISTING_INTERNAL_TEST_SUBJECT_PREFIX, listingCampaignCtaPath } from "./config";

export function buildListingProfileCompletionEmail(input: {
  role: ReminderEmailRole;
  locale: ReminderLocale;
  firstName: string | null;
  petCount: number;
}): EmailTemplate {
  return buildProfileCompletionReminderEmail({
    stage: "day_5",
    role: input.role,
    locale: input.locale,
    firstName: input.firstName,
    ctaPath: listingCampaignCtaPath(input.role, input.petCount),
  });
}

export function markListingInternalTestEmail(template: EmailTemplate): EmailTemplate {
  const bannerHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td bgcolor="#fff3cd" style="background-color:#fff3cd;padding:12px 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.4;color:#664d03;font-weight:700;">${escapeHtml(INTERNAL_TEST_BANNER)}</td></tr></table>`;
  return {
    subject: `${LISTING_INTERNAL_TEST_SUBJECT_PREFIX} ${template.subject}`,
    html: template.html.replace(/<body([^>]*)>/i, `<body$1>${bannerHtml}`),
    text: `${INTERNAL_TEST_BANNER}\n\n${template.text}`,
  };
}

export const LISTING_CAMPAIGN_COPY = DAY5_COPY;
