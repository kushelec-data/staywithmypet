import { describe, expect, it, vi, afterEach } from "vitest";
import { getAuthRedirectOrigin, getRequestOrigin } from "@/lib/site-url";

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

  it("prefers the browser origin on the client", () => {
    vi.stubGlobal("window", { location: { origin: "https://www.staywithmypet.ee" } });
    expect(getAuthRedirectOrigin()).toBe("https://www.staywithmypet.ee");
  });

  it("strips wrapping quotes from NEXT_PUBLIC_SITE_URL on the server", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", '"https://staywithmypet.ee"');
    expect(getAuthRedirectOrigin()).toBe("https://staywithmypet.ee");
  });

  it("removes duplicate protocols from env origins", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://https://staywithmypet.ee");
    expect(getAuthRedirectOrigin()).toBe("https://staywithmypet.ee");
  });
});
