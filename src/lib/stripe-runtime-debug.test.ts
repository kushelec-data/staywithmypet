import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  envStringFingerprint,
  envVarForPlanId,
  stripeSecretKeyFingerprint,
} from "@/lib/stripe-runtime-debug";

describe("stripe runtime debug fingerprints", () => {
  beforeEach(() => {
    process.env.STRIPE_PARENT_ONE_TIME_PRICE_ID = "  price_abc123xyz789  ";
    process.env.STRIPE_SECRET_KEY = "sk_test_1234567890abcd";
  });

  afterEach(() => {
    delete process.env.STRIPE_PARENT_ONE_TIME_PRICE_ID;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("reports trimmed env fingerprints", () => {
    const fp = envStringFingerprint("STRIPE_PARENT_ONE_TIME_PRICE_ID");
    expect(fp.exists).toBe(true);
    expect(fp.first10).toBe("price_abc1");
    expect(fp.last6).toBe("xyz789");
    expect(fp.length).toBe("price_abc123xyz789".length);
    expect(fp.hadOuterWhitespace).toBe(true);
  });

  it("masks secret key prefix and last 4 only", () => {
    const fp = stripeSecretKeyFingerprint();
    expect(fp.exists).toBe(true);
    expect(fp.prefix).toBe("sk_test_");
    expect(fp.last4).toBe("abcd");
  });

  it("maps clicked plan to env var name", () => {
    expect(envVarForPlanId("one-time-owner")).toBe("STRIPE_PARENT_ONE_TIME_PRICE_ID");
    expect(envVarForPlanId("3-month-owner")).toBe("STRIPE_PARENT_PRICE_ID");
    expect(envVarForPlanId("1-year-owner")).toBe("STRIPE_PARENT_ONE_YEAR_PRICE_ID");
  });
});
