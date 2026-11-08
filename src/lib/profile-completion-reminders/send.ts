import "server-only";

import nodemailer from "nodemailer";
import { readSmtpConfig } from "@/lib/smtp-config";
import { PROFILE_REMINDER_FROM } from "./config";
import {
  classifySmtpFailure,
  interpretSendMailInfo,
  sanitizeSmtpLogValue,
  type ReminderSmtpOutcome,
} from "./smtp-outcome";

export type { ReminderSmtpOutcome };

function logReminderSmtp(uniqueKey: string, outcome: ReminderSmtpOutcome) {
  if (outcome.outcome === "accepted") {
    console.info(
      JSON.stringify({
        event: "profile_reminder_smtp",
        uniqueKey,
        outcome: outcome.outcome,
        messageId: outcome.messageId,
        response: outcome.response,
        acceptedCount: outcome.acceptedCount,
        rejectedCount: outcome.rejectedCount,
      }),
    );
    return;
  }
  console.info(
    JSON.stringify({
      event: "profile_reminder_smtp",
      uniqueKey,
      outcome: outcome.outcome,
      reason: outcome.outcome === "failed_before_acceptance" ? outcome.reason : undefined,
      error: sanitizeSmtpLogValue(outcome.error),
    }),
  );
}

export async function sendProfileReminderSmtp(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  uniqueKey: string;
}): Promise<ReminderSmtpOutcome> {
  const smtp = readSmtpConfig();
  if (!smtp) {
    const outcome: ReminderSmtpOutcome = {
      outcome: "failed_before_acceptance",
      reason: "no_smtp",
      error: "no_smtp",
    };
    logReminderSmtp(input.uniqueKey, outcome);
    return outcome;
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
    const outcome = interpretSendMailInfo({
      to: input.to,
      accepted: info.accepted,
      rejected: info.rejected,
      messageId: info.messageId,
      response: info.response,
    });
    logReminderSmtp(input.uniqueKey, outcome);
    return outcome;
  } catch (err) {
    const classified = classifySmtpFailure(err);
    const error = sanitizeSmtpLogValue(err instanceof Error ? err.message : String(err));
    const outcome: ReminderSmtpOutcome =
      classified === "failed_before_acceptance"
        ? { outcome: "failed_before_acceptance", reason: "connection", error }
        : { outcome: "outcome_unknown", error };
    logReminderSmtp(input.uniqueKey, outcome);
    return outcome;
  }
}
