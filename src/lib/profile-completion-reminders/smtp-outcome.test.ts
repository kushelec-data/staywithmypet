import { describe, expect, it } from "vitest";
import { classifySmtpFailure, interpretSendMailInfo } from "./smtp-outcome";

describe("profile reminder SMTP outcome classification", () => {
  it("treats accepted recipients as accepted", () => {
    expect(
      interpretSendMailInfo({
        to: "parent@example.com",
        accepted: ["parent@example.com"],
        rejected: [],
      }),
    ).toEqual({ outcome: "accepted" });
    expect(
      interpretSendMailInfo({
        to: "parent@example.com",
        accepted: ["Parent <parent@example.com>"],
        rejected: [],
      }),
    ).toEqual({ outcome: "accepted" });
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
});
