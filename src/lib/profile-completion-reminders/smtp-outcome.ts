export type ReminderSmtpAcceptedMeta = {
  messageId: string | null;
  response: string | null;
  acceptedCount: number;
  rejectedCount: number;
};

export type ReminderSmtpOutcome =
  | ({ outcome: "accepted" } & ReminderSmtpAcceptedMeta)
  | {
      outcome: "failed_before_acceptance";
      reason: "no_smtp" | "rejected" | "connection";
      error?: string;
    }
  | { outcome: "outcome_unknown"; error?: string };

const PRE_ACCEPTANCE_CODES = new Set([
  "ECONNECTION",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ENODATA",
  "EAUTH",
  "EENVELOPE",
  "EDNS",
  "EAI_AGAIN",
]);

const UNKNOWN_CODES = new Set([
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "ESOCKET",
  "ECONNRESET",
  "EPIPE",
  "ECONNABORTED",
]);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SECRET_RE = /(pass(?:word)?|pwd|secret|token|api[_-]?key|authorization)\s*[=:]\s*\S+/gi;

function errorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code.toUpperCase() : "";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? "");
}

function smtpCommand(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const command = (err as { command?: unknown }).command;
  return typeof command === "string" ? command.toUpperCase() : "";
}

function smtpResponseCode(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as { responseCode?: unknown }).responseCode;
  return typeof code === "number" && Number.isFinite(code) ? code : null;
}

function extractAddress(value: string): string {
  const trimmed = value.trim();
  const angled = trimmed.match(/<([^>]+)>/);
  return (angled?.[1] ?? trimmed).trim().toLowerCase();
}

function addressList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return extractAddress(item);
      if (item && typeof item === "object" && "address" in item) {
        const address = (item as { address?: unknown }).address;
        if (typeof address === "string") return extractAddress(address);
      }
      return extractAddress(String(item));
    })
    .filter(Boolean);
}

/** Strip emails, credentials, and overlong text so SMTP logs stay operational. */
export function sanitizeSmtpLogValue(value: unknown, max = 300): string {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  return raw.replace(EMAIL_RE, "[redacted-email]").replace(SECRET_RE, "$1=[redacted]").slice(0, max);
}

export function sanitizeSmtpMessageId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 200);
  return trimmed || null;
}

export function formatAcceptedSmtpLastError(meta: ReminderSmtpAcceptedMeta): string {
  return [
    "smtp_accepted",
    `messageId=${meta.messageId ?? ""}`,
    `accepted=${meta.acceptedCount}`,
    `rejected=${meta.rejectedCount}`,
    `response=${meta.response ?? ""}`,
  ]
    .join(" ")
    .slice(0, 500);
}

export function reminderSendShouldAbortBatch(outcome: ReminderSmtpOutcome): boolean {
  if (outcome.outcome === "outcome_unknown") return true;
  if (outcome.outcome === "failed_before_acceptance") {
    return outcome.reason === "connection" || outcome.reason === "no_smtp";
  }
  return false;
}

/** Confirmed the SMTP server never accepted the message. Otherwise outcome is unknown. */
export function classifySmtpFailure(err: unknown): "failed_before_acceptance" | "outcome_unknown" {
  const code = errorCode(err);
  const message = errorMessage(err);
  const combined = `${code} ${message}`;
  const command = smtpCommand(err);
  const responseCode = smtpResponseCode(err);

  if (UNKNOWN_CODES.has(code) || /timed?\s*out|etimedout|esocket/i.test(combined)) {
    return "outcome_unknown";
  }
  if (/econnreset|econnaborted|\bepipe\b/i.test(combined)) {
    return "outcome_unknown";
  }
  if (PRE_ACCEPTANCE_CODES.has(code)) {
    return "failed_before_acceptance";
  }
  if (/eauth|invalid login|authentication failed|econnrefused|enotfound|getaddrinfo/i.test(combined)) {
    return "failed_before_acceptance";
  }
  if (typeof responseCode === "number" && responseCode >= 400) {
    return "failed_before_acceptance";
  }
  if (/DATA/i.test(command)) return "outcome_unknown";
  return "outcome_unknown";
}

export function interpretSendMailInfo(input: {
  to: string;
  accepted?: unknown;
  rejected?: unknown;
  messageId?: unknown;
  response?: unknown;
}): ReminderSmtpOutcome {
  const to = extractAddress(input.to);
  const accepted = addressList(input.accepted);
  const rejected = addressList(input.rejected);
  const meta: ReminderSmtpAcceptedMeta = {
    messageId: sanitizeSmtpMessageId(input.messageId),
    response: input.response == null || input.response === "" ? null : sanitizeSmtpLogValue(input.response),
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
  };
  if (accepted.some((address) => address === to || address.includes(to) || to.includes(address))) {
    return { outcome: "accepted", ...meta };
  }
  if (accepted.length > 0) return { outcome: "accepted", ...meta };
  if (rejected.length > 0) {
    return {
      outcome: "failed_before_acceptance",
      reason: "rejected",
      error: `rejected_count:${rejected.length}`,
    };
  }
  return { outcome: "outcome_unknown", error: "smtp_response_missing_accepted" };
}
