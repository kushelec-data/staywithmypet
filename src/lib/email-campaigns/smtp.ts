import "server-only";

import nodemailer from "nodemailer";
import { CAMPAIGN_FROM_HEADER } from "@/lib/email-campaigns/from";
import { readSmtpConfig } from "@/lib/smtp-config";

export type CampaignSendResult =
  | { ok: true }
  | { ok: false; reason: "smtp_not_configured" | "send_failed"; detail?: string };

/**
 * SpaceMail (Spaceship) documented mailbox limits — not stored in our env:
 * trial 20/hour/mailbox, paid 500/hour/mailbox, max 50 recipients per message.
 * Campaigns send one recipient per message. Large sends must batch below 500/hour.
 */
export const SPACEMAIL_PAID_HOURLY_LIMIT = 500;
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
