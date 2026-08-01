import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getEmailInternalSecret,
  getInternalCronSecret,
  isInternalSecretAuthorized,
} from "@/lib/security/internal-secret-auth";

describe("internal secret authorization", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.CRON_SECRET;
    delete process.env.EMAIL_INTERNAL_SECRET;
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("fails closed when server secret is missing", () => {
    const request = new Request("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer anything" },
    });
    expect(isInternalSecretAuthorized(request)).toBe(false);
  });

  it("fails closed when supplied secret is missing", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    const request = new Request("https://example.com/api/cron/test");
    expect(isInternalSecretAuthorized(request)).toBe(false);
  });

  it("accepts Authorization Bearer with timing-safe comparison", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    const request = new Request("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer cron-secret-value" },
    });
    expect(isInternalSecretAuthorized(request)).toBe(true);
  });

  it("accepts x-cron-secret header", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    const request = new Request("https://example.com/api/cron/test", {
      headers: { "x-cron-secret": "cron-secret-value" },
    });
    expect(isInternalSecretAuthorized(request)).toBe(true);
  });

  it("rejects incorrect secrets without disclosing configuration", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    const request = new Request("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(isInternalSecretAuthorized(request)).toBe(false);
  });

  it("email internal route accepts only EMAIL_INTERNAL_SECRET via x-email-internal-secret", () => {
    process.env.EMAIL_INTERNAL_SECRET = "email-internal-secret";
    process.env.CRON_SECRET = "cron-secret-value";

    const authorized = new Request("https://example.com/api/emails/send", {
      headers: { "x-email-internal-secret": "email-internal-secret" },
    });
    const cronOnly = new Request("https://example.com/api/emails/send", {
      headers: { "x-cron-secret": "cron-secret-value" },
    });

    expect(
      isInternalSecretAuthorized(authorized, { emailInternalOnly: true }),
    ).toBe(true);
    expect(isInternalSecretAuthorized(cronOnly, { emailInternalOnly: true })).toBe(false);
  });

  it("resolves configured secrets", () => {
    process.env.CRON_SECRET = " cron ";
    expect(getInternalCronSecret()).toBe("cron");
    process.env.EMAIL_INTERNAL_SECRET = " email ";
    expect(getEmailInternalSecret()).toBe("email");
  });
});
