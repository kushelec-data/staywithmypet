import "server-only";

import nodemailer from "nodemailer";
import { escapeHtml } from "@/lib/emails/layout";

export const CONTACT_FORM_RECIPIENT = "info@staywithmypet.ee";
const CONTACT_FORM_FROM = "info@staywithmypet.ee";

export type ContactFormPayload = {
  fullName: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
};

export type SendContactFormResult =
  | { ok: true }
  | { ok: false; reason: "no_api_key" | "send_failed" };

function readSmtpConfig():
  | {
      host: string;
      port: number;
      user: string;
      password: string;
    }
  | null {
  const host = process.env.SMTP_HOST?.trim() || "mail.spacemail.com";
  const portRaw = process.env.SMTP_PORT?.trim() || "465";
  const port = Number.parseInt(portRaw, 10);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();

  if (!user || !password || !Number.isFinite(port)) {
    return null;
  }

  return { host, port, user, password };
}

export async function sendContactFormEmail(
  payload: ContactFormPayload,
): Promise<SendContactFormResult> {
  const smtp = readSmtpConfig();
  if (!smtp) {
    console.warn("[contact] SMTP credentials not set — cannot send contact form");
    return { ok: false, reason: "no_api_key" };
  }

  const timestamp = new Date().toISOString();
  const phoneDisplay = payload.phone?.trim() || "—";
  const mailSubject = `[Contact form] ${payload.subject}`;

  const text = [
    "New contact form submission",
    "",
    `Full name: ${payload.fullName}`,
    `Email: ${payload.email}`,
    `Phone: ${phoneDisplay}`,
    `Subject: ${payload.subject}`,
    `Page/source: Contact form`,
    `Timestamp: ${timestamp}`,
    "",
    "Message:",
    payload.message,
  ].join("\n");

  const html = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;"><strong>New contact form submission</strong></p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333;"><strong>Full name:</strong> ${escapeHtml(payload.fullName)}</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333;"><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333;"><strong>Phone:</strong> ${escapeHtml(phoneDisplay)}</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333;"><strong>Subject:</strong> ${escapeHtml(payload.subject)}</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333;"><strong>Page/source:</strong> Contact form</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#333;"><strong>Timestamp:</strong> ${escapeHtml(timestamp)}</p>
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#333;">Message</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap;">${escapeHtml(payload.message)}</p>
  `.trim();

  try {
    const { host, port, user, password } = smtp;
    const secure = port === 465;

    console.log("[contact:smtp] config", {
      host,
      port,
      secure,
      user,
      hasPassword: Boolean(password),
    });

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
    });

    console.log("[contact] from", CONTACT_FORM_FROM);
    console.log("[contact] recipient", CONTACT_FORM_RECIPIENT);

    const info = await transporter.sendMail({
      from: CONTACT_FORM_FROM,
      to: CONTACT_FORM_RECIPIENT,
      replyTo: payload.email,
      subject: mailSubject,
      html,
      text,
    });

    console.log("[contact] smtp response", info);

    return { ok: true };
  } catch (err) {
    console.error("[contact:smtp] error", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      hasPassword: Boolean(process.env.SMTP_PASSWORD),
      message: err instanceof Error ? err.message : String(err),
      code: (err as { code?: string })?.code,
      command: (err as { command?: string })?.command,
      response: (err as { response?: string })?.response,
      responseCode: (err as { responseCode?: number })?.responseCode,
    });
    return { ok: false, reason: "send_failed" };
  }
}
