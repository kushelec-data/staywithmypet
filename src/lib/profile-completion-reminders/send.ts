import "server-only";

import nodemailer from "nodemailer";
import { readSmtpConfig } from "@/lib/smtp-config";
import { PROFILE_REMINDER_FROM } from "./config";
import {
  classifySmtpFailure,
  interpretSendMailInfo,
  type ReminderSmtpOutcome,
} from "./smtp-outcome";

export type { ReminderSmtpOutcome };

export async function sendProfileReminderSmtp(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  uniqueKey: string;
}): Promise<ReminderSmtpOutcome> {
  const smtp = readSmtpConfig();
  if (!smtp) {
    return { outcome: "failed_before_acceptance", reason: "no_smtp", error: "no_smtp" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.password },
    });
    const info = await transporter.sendMail({
      from: PROFILE_REMINDER_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: { "X-SWMP-Reminder-Key": input.uniqueKey },
    });
    return interpretSendMailInfo({
      to: input.to,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (err) {
    const classified = classifySmtpFailure(err);
    const error = err instanceof Error ? err.message : String(err);
    if (classified === "failed_before_acceptance") {
      return { outcome: "failed_before_acceptance", reason: "connection", error };
    }
    return { outcome: "outcome_unknown", error };
  }
}
