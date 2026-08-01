import { describe, expect, it } from "vitest";
import { getRequestHost, isSameOriginRequest } from "@/lib/security/same-origin";

describe("same-origin request validation", () => {
  it("accepts matching Origin and Host", () => {
    const request = new Request("https://example.com/api/user/locale", {
      method: "POST",
      headers: {
        origin: "https://example.com",
        host: "example.com",
      },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts forwarded host when Origin matches", () => {
    const request = new Request("https://example.com/api/user/locale", {
      method: "POST",
      headers: {
        origin: "https://preview.example.com",
        "x-forwarded-host": "preview.example.com",
      },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects foreign origins", () => {
    const request = new Request("https://example.com/api/user/locale", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        host: "example.com",
      },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects malformed Origin values", () => {
    const request = new Request("https://example.com/api/user/locale", {
      method: "POST",
      headers: {
        origin: "not-a-valid-origin",
        host: "example.com",
      },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects missing Origin header", () => {
    const request = new Request("https://example.com/api/user/locale", {
      method: "POST",
      headers: { host: "example.com" },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("resolves request host from forwarded header", () => {
    const request = new Request("https://example.com/api/user/locale", {
      headers: { "x-forwarded-host": "preview.example.com, internal.local" },
    });
    expect(getRequestHost(request)).toBe("preview.example.com");
  });
});
