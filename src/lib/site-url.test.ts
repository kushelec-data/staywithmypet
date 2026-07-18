import { describe, expect, it } from "vitest";
import { getRequestOrigin } from "@/lib/site-url";

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
