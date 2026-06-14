import "server-only";

import { Resend } from "resend";
import { escapeHtml } from "@/lib/emails/layout";

export const CONTACT_FORM_RECIPIENT = "info@staywithmypet.ee";

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

function emailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "StayWithMyPet <hello@staywithmypet.ee>";
}

export async function sendContactFormEmail(
  payload: ContactFormPayload,
): Promise<SendContactFormResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not set — cannot send contact form");
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
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFromAddress(),
      to: CONTACT_FORM_RECIPIENT,
      replyTo: payload.email,
      subject: mailSubject,
      html,
      text,
    });

    if (error) {
      console.error("[contact] Resend error", error);
      return { ok: false, reason: "send_failed" };
    }

    return { ok: true };
  } catch (err) {
    console.error("[contact] send failed", err);
    return { ok: false, reason: "send_failed" };
  }
}
