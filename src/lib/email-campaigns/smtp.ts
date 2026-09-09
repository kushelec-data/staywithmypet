import "server-only";

import nodemailer from "nodemailer";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { readSmtpConfig } from "@/lib/smtp-config";

export type CampaignSendResult =
  | { ok: true }
  | { ok: false; reason: "smtp_not_configured" | "send_failed"; detail?: string };

/**
 * SpaceMail mailbox hourly limits are a provider constraint, not a campaign business rule.
 * Tune EMAIL_CAMPAIGN_BATCH_SIZE and EMAIL_CAMPAIGN_BATCH_DELAY_MS instead of hard-coding a cap.
 */
export const CAMPAIGN_BATCH_SIZE = 10;
export const CAMPAIGN_BATCH_PAUSE_MS = 80_000;

export async function sendCampaignSmtpEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<CampaignSendResult> {
  const smtp = readSmtpConfig();
  if (!smtp) {
    return { ok: false, reason: "smtp_not_configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });
    await transporter.sendMail({
      from: CAMPAIGN_FROM_HEADER,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "send_failed";
    return { ok: false, reason: "send_failed", detail };
  }
}
