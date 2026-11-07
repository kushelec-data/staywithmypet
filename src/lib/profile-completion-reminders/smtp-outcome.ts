export type ReminderSmtpOutcome =
  | { outcome: "accepted" }
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
}): ReminderSmtpOutcome {
  const to = extractAddress(input.to);
  const accepted = addressList(input.accepted);
  const rejected = addressList(input.rejected);
  if (accepted.some((address) => address === to || address.includes(to) || to.includes(address))) {
    return { outcome: "accepted" };
  }
  if (accepted.length > 0) return { outcome: "accepted" };
  if (rejected.length > 0) {
    return {
      outcome: "failed_before_acceptance",
      reason: "rejected",
      error: `rejected:${rejected.join(",")}`,
    };
  }
  return { outcome: "outcome_unknown", error: "smtp_response_missing_accepted" };
}
