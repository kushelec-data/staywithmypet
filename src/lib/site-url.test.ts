import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthRedirectOrigin, getRequestOrigin, getSiteOrigin } from "@/lib/site-url";

describe("getRequestOrigin", () => {
  it("uses the incoming request URL origin", () => {
    const request = new Request(
      "https://staywithmypet-git-development-kushelec-datas-projects.vercel.app/membership",
    );
    expect(getRequestOrigin(request)).toBe(
      "https://staywithmypet-git-development-kushelec-datas-projects.vercel.app",
    );
  });
});

describe("getAuthRedirectOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers the current browser origin on the client", () => {
    vi.stubGlobal("window", {
      location: { origin: "https://staywithmypet-git-preview.vercel.app" },
    });
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staywithmypet.ee");

    expect(getAuthRedirectOrigin()).toBe("https://staywithmypet-git-preview.vercel.app");
  });

  it("uses VERCEL_URL on Preview when window is unavailable", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "staywithmypet-git-preview.vercel.app");

    expect(getAuthRedirectOrigin()).toBe("https://staywithmypet-git-preview.vercel.app");
  });

  it("falls back to localhost in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getAuthRedirectOrigin()).toBe("http://localhost:3000");
  });

  it("uses the canonical production fallback when unset on the server", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(getAuthRedirectOrigin()).toBe("https://staywithmypet.ee");
  });
});

describe("getSiteOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers NEXT_PUBLIC_SITE_URL for canonical links", () => {
    vi.stubGlobal("window", {
      location: { origin: "https://staywithmypet-git-preview.vercel.app" },
    });
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staywithmypet.ee");

    expect(getSiteOrigin()).toBe("https://staywithmypet.ee");
  });
});
