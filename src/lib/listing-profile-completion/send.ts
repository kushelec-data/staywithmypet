import "server-only";

import { sendProfileReminderSmtp } from "@/lib/profile-completion-reminders/send";
import type { ReminderSmtpOutcome } from "@/lib/profile-completion-reminders/smtp-outcome";

export async function sendListingCampaignSmtp(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  uniqueKey: string;
}): Promise<ReminderSmtpOutcome> {
  return sendProfileReminderSmtp(input);
}
