import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isSafeDebugLoggingEnabled,
  sanitizeLogFields,
} from "@/lib/security/safe-log";

describe("safe production logging", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.APP_SAFE_DEBUG_LOG;
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("requires APP_SAFE_DEBUG_LOG=1 for detailed logging", () => {
    process.env.NODE_ENV = "development";
    expect(isSafeDebugLoggingEnabled()).toBe(false);

    process.env.APP_SAFE_DEBUG_LOG = "1";
    expect(isSafeDebugLoggingEnabled()).toBe(true);
  });

  it("never enables detailed logging in production", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_SAFE_DEBUG_LOG = "1";
    expect(isSafeDebugLoggingEnabled()).toBe(false);
  });

  it("masks IDs and emails in production logs", () => {
    const sanitized = sanitizeLogFields({
      userId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      email: "person@example.com",
      eventType: "checkout.session.completed",
      stack: "Error: boom\n    at handler",
      details: "internal detail",
      webhookSecretPrefix: "whsec_ab",
      priceFingerprint: { first10: "price_abc", last6: "xyz123" },
    });

    expect(sanitized.userId).toBe("aaaaaa…");
    expect(sanitized.email).toBe("p***@example.com");
    expect(sanitized.eventType).toBe("checkout.session.completed");
    expect(sanitized.stack).toBeUndefined();
    expect(sanitized.details).toBeUndefined();
    expect(sanitized.webhookSecretPrefix).toBeUndefined();
    expect(sanitized.priceFingerprint).toBeUndefined();
  });
});
