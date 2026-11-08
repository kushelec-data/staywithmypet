import { describe, expect, it } from "vitest";
import {
  classifySmtpFailure,
  formatAcceptedSmtpLastError,
  interpretSendMailInfo,
  reminderSendShouldAbortBatch,
  sanitizeSmtpLogValue,
} from "./smtp-outcome";

describe("profile reminder SMTP outcome classification", () => {
  it("treats accepted recipients as accepted and records SMTP metadata", () => {
    expect(
      interpretSendMailInfo({
        to: "parent@example.com",
        accepted: ["parent@example.com"],
        rejected: [],
        messageId: "<abc123@mail.spacemail.com>",
        response: "250 2.0.0 Ok: queued as ABC",
      }),
    ).toEqual({
      outcome: "accepted",
      messageId: "<abc123@mail.spacemail.com>",
      response: "250 2.0.0 Ok: queued as ABC",
      acceptedCount: 1,
      rejectedCount: 0,
    });
    expect(
      interpretSendMailInfo({
        to: "parent@example.com",
        accepted: ["Parent <parent@example.com>"],
        rejected: [],
      }),
    ).toMatchObject({
      outcome: "accepted",
      acceptedCount: 1,
      rejectedCount: 0,
    });
  });

  it("redacts recipient emails from SMTP response text and reject errors", () => {
    const accepted = interpretSendMailInfo({
      to: "parent@example.com",
      accepted: ["parent@example.com"],
      rejected: [],
      response: "250 Ok queued for parent@example.com password=supersecret",
    });
    expect(accepted.outcome).toBe("accepted");
    if (accepted.outcome === "accepted") {
      expect(accepted.response).not.toContain("parent@example.com");
      expect(accepted.response).not.toContain("supersecret");
      expect(accepted.response).toContain("[redacted-email]");
    }
    const rejected = interpretSendMailInfo({
      to: "parent@example.com",
      accepted: [],
      rejected: ["parent@example.com"],
    });
    expect(rejected.outcome).toBe("failed_before_acceptance");
    if (rejected.outcome === "failed_before_acceptance") {
      expect(rejected.error).toBe("rejected_count:1");
      expect(rejected.error).not.toContain("@");
    }
    expect(sanitizeSmtpLogValue("fail parent@example.com token=abcd")).toBe(
      "fail [redacted-email] token=[redacted]",
    );
    expect(
      formatAcceptedSmtpLastError({
        messageId: "<id@mail.spacemail.com>",
        response: "250 Ok",
        acceptedCount: 1,
        rejectedCount: 0,
      }),
    ).toContain("smtp_accepted");
  });

  it("treats confirmed pre-acceptance failures as retryable", () => {
    expect(classifySmtpFailure({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" })).toBe(
      "failed_before_acceptance",
    );
    expect(classifySmtpFailure({ code: "EAUTH", message: "Invalid login" })).toBe(
      "failed_before_acceptance",
    );
    expect(classifySmtpFailure({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND" })).toBe(
      "failed_before_acceptance",
    );
    expect(
      interpretSendMailInfo({
        to: "parent@example.com",
        accepted: [],
        rejected: ["parent@example.com"],
      }).outcome,
    ).toBe("failed_before_acceptance");
  });

  it("treats SMTP timeouts and connection drops as unknown", () => {
    expect(classifySmtpFailure({ code: "ETIMEDOUT", message: "Connection timeout" })).toBe(
      "outcome_unknown",
    );
    expect(classifySmtpFailure(new Error("Greeting never received"))).toBe("outcome_unknown");
    expect(classifySmtpFailure({ code: "ECONNRESET", message: "socket hang up" })).toBe(
      "outcome_unknown",
    );
    expect(classifySmtpFailure({ code: "ESOCKET", message: "read ECONNRESET" })).toBe(
      "outcome_unknown",
    );
    expect(
      interpretSendMailInfo({
        to: "parent@example.com",
        accepted: [],
        rejected: [],
      }),
    ).toEqual({ outcome: "outcome_unknown", error: "smtp_response_missing_accepted" });
  });

  it("aborts the batch on unknown outcomes and connection failures, not single rejects", () => {
    expect(
      reminderSendShouldAbortBatch({ outcome: "outcome_unknown", error: "timeout" }),
    ).toBe(true);
    expect(
      reminderSendShouldAbortBatch({
        outcome: "failed_before_acceptance",
        reason: "connection",
        error: "ECONNREFUSED",
      }),
    ).toBe(true);
    expect(
      reminderSendShouldAbortBatch({
        outcome: "failed_before_acceptance",
        reason: "rejected",
        error: "rejected_count:1",
      }),
    ).toBe(false);
    expect(
      reminderSendShouldAbortBatch({
        outcome: "accepted",
        messageId: "<id@mail.spacemail.com>",
        response: "250 Ok",
        acceptedCount: 1,
        rejectedCount: 0,
      }),
    ).toBe(false);
  });
});
