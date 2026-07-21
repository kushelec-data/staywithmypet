import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOAuthReturnCookie,
  getOAuthCallbackUrl,
  OAUTH_RETURN_COOKIE,
} from "@/lib/auth";

describe("Google OAuth redirect helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses bare /auth/callback without query params", () => {
    expect(getOAuthCallbackUrl()).toBe("http://localhost:3000/auth/callback");
    expect(getOAuthCallbackUrl()).not.toContain("?");
  });

  it("stores post-login path in a short-lived cookie", () => {
    expect(buildOAuthReturnCookie("/dashboard")).toBe(
      `${OAUTH_RETURN_COOKIE}=%2Fdashboard; path=/; max-age=600; SameSite=Lax`,
    );
  });

  it("throws for unsafe oauth return paths", () => {
    expect(() => buildOAuthReturnCookie("//evil.example")).toThrow("Invalid OAuth return path");
  });
});
